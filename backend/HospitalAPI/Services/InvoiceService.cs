using System.Data.Common;
using HospitalAPI.Data;
using HospitalAPI.Models;
using MySql.Data.MySqlClient;

namespace HospitalAPI.Services;

public sealed class InvoiceService(MySqlConnectionFactory connectionFactory) : IInvoiceService
{
    public async Task<InvoiceOperationResult> CreateAsync(InvoiceUpsertRequest request, int createdByUserId, CancellationToken cancellationToken)
    {
        var validationError = ValidateUpsertRequest(request);
        if (validationError is not null)
        {
            return new InvoiceOperationResult(false, validationError, null);
        }

        await using var connection = connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);

        var relationError = await ValidateForeignReferencesAsync(connection, request, cancellationToken);
        if (relationError is not null)
        {
            return new InvoiceOperationResult(false, relationError, null);
        }

        var status = InvoiceRules.CalculateStatus(request.TotalAmount, request.PaidAmount);

        await using var insertCommand = connection.CreateCommand();
        insertCommand.CommandText = """
            INSERT INTO Invoices (
                patient_id,
                appointment_id,
                invoice_date,
                total_amount,
                paid_amount,
                status,
                created_by_user_id)
            VALUES (
                @patientId,
                @appointmentId,
                @invoiceDate,
                @totalAmount,
                @paidAmount,
                @status,
                @createdByUserId);
            SELECT LAST_INSERT_ID();
            """;

        insertCommand.Parameters.AddWithValue("@patientId", request.PatientId);
        insertCommand.Parameters.AddWithValue("@appointmentId", request.AppointmentId);
        insertCommand.Parameters.AddWithValue("@invoiceDate", request.InvoiceDate.ToDateTime(TimeOnly.MinValue));
        insertCommand.Parameters.AddWithValue("@totalAmount", request.TotalAmount);
        insertCommand.Parameters.AddWithValue("@paidAmount", request.PaidAmount);
        insertCommand.Parameters.AddWithValue("@status", status);
        insertCommand.Parameters.AddWithValue("@createdByUserId", createdByUserId);

        var createdIdObj = await insertCommand.ExecuteScalarAsync(cancellationToken);
        var createdId = Convert.ToInt32(createdIdObj);
        var invoice = await GetByIdAsync(createdId, cancellationToken);

        return new InvoiceOperationResult(true, "Invoice created successfully.", invoice);
    }

    public async Task<IReadOnlyList<InvoiceResponse>> GetAllAsync(string? status, CancellationToken cancellationToken)
    {
        await using var connection = connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);

        await using var command = connection.CreateCommand();

        if (string.IsNullOrWhiteSpace(status))
        {
            command.CommandText = SelectBaseSql + " ORDER BY i.invoice_date DESC, i.invoice_id DESC;";
        }
        else
        {
            command.CommandText = SelectBaseSql + " WHERE i.status = @status ORDER BY i.invoice_date DESC, i.invoice_id DESC;";
            command.Parameters.AddWithValue("@status", status.Trim());
        }

        var invoices = new List<InvoiceResponse>();
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            invoices.Add(MapInvoice(reader));
        }

        return invoices;
    }

    public async Task<InvoiceResponse?> GetByIdAsync(int invoiceId, CancellationToken cancellationToken)
    {
        await using var connection = connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);

        await using var command = connection.CreateCommand();
        command.CommandText = SelectBaseSql + " WHERE i.invoice_id = @invoiceId;";
        command.Parameters.AddWithValue("@invoiceId", invoiceId);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
        {
            return null;
        }

        return MapInvoice(reader);
    }

    public async Task<InvoiceOperationResult> UpdateAsync(int invoiceId, InvoiceUpsertRequest request, int updatedByUserId, CancellationToken cancellationToken)
    {
        var validationError = ValidateUpsertRequest(request);
        if (validationError is not null)
        {
            return new InvoiceOperationResult(false, validationError, null);
        }

        await using var connection = connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);

        var relationError = await ValidateForeignReferencesAsync(connection, request, cancellationToken);
        if (relationError is not null)
        {
            return new InvoiceOperationResult(false, relationError, null);
        }

        var status = InvoiceRules.CalculateStatus(request.TotalAmount, request.PaidAmount);

        await using var updateCommand = connection.CreateCommand();
        updateCommand.CommandText = """
            UPDATE Invoices
            SET patient_id = @patientId,
                appointment_id = @appointmentId,
                invoice_date = @invoiceDate,
                total_amount = @totalAmount,
                paid_amount = @paidAmount,
                status = @status,
                created_by_user_id = @updatedByUserId
            WHERE invoice_id = @invoiceId;
            """;

        updateCommand.Parameters.AddWithValue("@invoiceId", invoiceId);
        updateCommand.Parameters.AddWithValue("@patientId", request.PatientId);
        updateCommand.Parameters.AddWithValue("@appointmentId", request.AppointmentId);
        updateCommand.Parameters.AddWithValue("@invoiceDate", request.InvoiceDate.ToDateTime(TimeOnly.MinValue));
        updateCommand.Parameters.AddWithValue("@totalAmount", request.TotalAmount);
        updateCommand.Parameters.AddWithValue("@paidAmount", request.PaidAmount);
        updateCommand.Parameters.AddWithValue("@status", status);
        updateCommand.Parameters.AddWithValue("@updatedByUserId", updatedByUserId);

        var affected = await updateCommand.ExecuteNonQueryAsync(cancellationToken);
        if (affected == 0)
        {
            return new InvoiceOperationResult(false, "Invoice not found.", null);
        }

        var invoice = await GetByIdAsync(invoiceId, cancellationToken);
        return new InvoiceOperationResult(true, "Invoice updated successfully.", invoice);
    }

    public async Task<bool> DeleteAsync(int invoiceId, CancellationToken cancellationToken)
    {
        await using var connection = connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);

        await using (var check = connection.CreateCommand())
        {
            check.CommandText = "SELECT COUNT(*) FROM Payments WHERE invoice_id = @id";
            check.Parameters.AddWithValue("@id", invoiceId);
            var paymentsCount = Convert.ToInt32(await check.ExecuteScalarAsync(cancellationToken));
            if (paymentsCount > 0)
            {
                throw new InvalidOperationException("Cannot delete invoice because it has recorded payments. Please void or refund the payments first.");
            }
        }

        await using var command = connection.CreateCommand();
        command.CommandText = "DELETE FROM Invoices WHERE invoice_id = @invoiceId;";
        command.Parameters.AddWithValue("@invoiceId", invoiceId);

        var affected = await command.ExecuteNonQueryAsync(cancellationToken);
        return affected > 0;
    }

    private static string? ValidateUpsertRequest(InvoiceUpsertRequest request)
    {
        if (request.PatientId <= 0)
        {
            return "Patient ID is required.";
        }

        if (request.AppointmentId.HasValue && request.AppointmentId.Value <= 0)
        {
            return "Appointment ID must be a positive value when provided.";
        }

        return InvoiceRules.ValidateAmounts(request.TotalAmount, request.PaidAmount);
    }

    private static async Task<string?> ValidateForeignReferencesAsync(
        MySqlConnection connection,
        InvoiceUpsertRequest request,
        CancellationToken cancellationToken)
    {
        await using (var patientCheck = connection.CreateCommand())
        {
            patientCheck.CommandText = "SELECT patient_id FROM Patients WHERE patient_id = @patientId LIMIT 1;";
            patientCheck.Parameters.AddWithValue("@patientId", request.PatientId);
            var patient = await patientCheck.ExecuteScalarAsync(cancellationToken);
            if (patient is null)
            {
                return "Patient not found.";
            }
        }

        if (!request.AppointmentId.HasValue)
        {
            return null;
        }

        await using var appointmentCheck = connection.CreateCommand();
        appointmentCheck.CommandText = """
            SELECT appointment_id
            FROM Appointments
            WHERE appointment_id = @appointmentId
              AND patient_id = @patientId
            LIMIT 1;
            """;
        appointmentCheck.Parameters.AddWithValue("@appointmentId", request.AppointmentId.Value);
        appointmentCheck.Parameters.AddWithValue("@patientId", request.PatientId);

        var appointment = await appointmentCheck.ExecuteScalarAsync(cancellationToken);
        return appointment is null ? "Appointment not found for the selected patient." : null;
    }

    private static InvoiceResponse MapInvoice(DbDataReader reader)
    {
        var appointmentIdOrdinal = reader.GetOrdinal("appointment_id");
        var createdByOrdinal = reader.GetOrdinal("created_by_user_id");
        var patientNameOrdinal = reader.GetOrdinal("patient_name");

        return new InvoiceResponse(
            InvoiceId: reader.GetInt32(reader.GetOrdinal("invoice_id")),
            PatientId: reader.GetInt32(reader.GetOrdinal("patient_id")),
            AppointmentId: reader.IsDBNull(appointmentIdOrdinal) ? null : reader.GetInt32(appointmentIdOrdinal),
            InvoiceDate: DateOnly.FromDateTime(reader.GetDateTime(reader.GetOrdinal("invoice_date"))),
            TotalAmount: reader.GetDecimal(reader.GetOrdinal("total_amount")),
            PaidAmount: reader.GetDecimal(reader.GetOrdinal("paid_amount")),
            Status: reader.GetString(reader.GetOrdinal("status")),
            CreatedByUserId: reader.IsDBNull(createdByOrdinal) ? null : reader.GetInt32(createdByOrdinal),
            PatientName: reader.IsDBNull(patientNameOrdinal) ? null : reader.GetString(patientNameOrdinal),
            CreatedAt: reader.GetDateTime(reader.GetOrdinal("created_at")),
            UpdatedAt: reader.GetDateTime(reader.GetOrdinal("updated_at")));
    }

    private const string SelectBaseSql = """
        SELECT
            i.invoice_id,
            i.patient_id,
            i.appointment_id,
            i.invoice_date,
            i.total_amount,
            i.paid_amount,
            i.status,
            i.created_by_user_id,
            i.created_at,
            i.updated_at,
            CONCAT(p.first_name, ' ', p.last_name) AS patient_name
        FROM Invoices i
        LEFT JOIN Patients p ON p.patient_id = i.patient_id
        """;
}
