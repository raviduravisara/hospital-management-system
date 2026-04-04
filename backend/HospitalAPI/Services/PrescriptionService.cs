using System.Data.Common;
using HospitalAPI.Data;
using HospitalAPI.Models;
using MySql.Data.MySqlClient;

namespace HospitalAPI.Services;

public sealed class PrescriptionService(MySqlConnectionFactory connectionFactory) : IPrescriptionService
{
    private readonly MySqlConnectionFactory _connectionFactory = connectionFactory;

    public async Task<PrescriptionOperationResult> CreateAsync(PrescriptionCreateRequest request, CancellationToken cancellationToken = default)
    {
        var validationError = ValidateRequest(request);
        if (validationError is not null)
        {
            return new PrescriptionOperationResult(false, validationError, null);
        }

        await using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await using var transaction = await connection.BeginTransactionAsync(cancellationToken);

        try
        {
            var relationError = await ValidateForeignReferencesAsync(connection, request, cancellationToken);
            if (relationError is not null)
            {
                await transaction.RollbackAsync(cancellationToken);
                return new PrescriptionOperationResult(false, relationError, null);
            }

            await using var insertCmd = connection.CreateCommand();
            insertCmd.Transaction = transaction;
            insertCmd.CommandText = """
                INSERT INTO Prescriptions (
                    appointment_id,
                    patient_id,
                    doctor_id,
                    prescription_date,
                    diagnosis,
                    notes)
                VALUES (
                    @appointmentId,
                    @patientId,
                    @doctorId,
                    @prescriptionDate,
                    @diagnosis,
                    @notes);
                SELECT LAST_INSERT_ID();
                """;

            insertCmd.Parameters.AddWithValue("@appointmentId", request.AppointmentId.HasValue ? request.AppointmentId.Value : null);
            insertCmd.Parameters.AddWithValue("@patientId", request.PatientId);
            insertCmd.Parameters.AddWithValue("@doctorId", request.DoctorId);
            insertCmd.Parameters.AddWithValue("@prescriptionDate", request.PrescriptionDate.ToDateTime(TimeOnly.MinValue));
            insertCmd.Parameters.AddWithValue("@diagnosis", NormalizeNullable(request.Diagnosis));
            insertCmd.Parameters.AddWithValue("@notes", NormalizeNullable(request.Notes));

            var createdIdObj = await insertCmd.ExecuteScalarAsync(cancellationToken);
            var createdId = Convert.ToInt32(createdIdObj);

            await InsertPrescriptionItemsAsync(connection, transaction, createdId, request.Items, cancellationToken);
            await transaction.CommitAsync(cancellationToken);

            var prescription = await GetByIdAsync(createdId, cancellationToken);
            return new PrescriptionOperationResult(true, "Prescription created successfully.", prescription);
        }
        catch
        {
            await transaction.RollbackAsync(cancellationToken);
            throw;
        }
    }

    public async Task<PrescriptionOperationResult> UpdateAsync(int prescriptionId, PrescriptionUpdateRequest request, CancellationToken cancellationToken = default)
    {
        var validationError = ValidateRequest(request);
        if (validationError is not null)
        {
            return new PrescriptionOperationResult(false, validationError, null);
        }

        await using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await using var transaction = await connection.BeginTransactionAsync(cancellationToken);

        try
        {
            var existing = await GetByIdAsync(prescriptionId, cancellationToken);
            if (existing is null)
            {
                await transaction.RollbackAsync(cancellationToken);
                return new PrescriptionOperationResult(false, "Prescription not found.", null);
            }

            var relationError = await ValidateForeignReferencesAsync(connection, request, cancellationToken);
            if (relationError is not null)
            {
                await transaction.RollbackAsync(cancellationToken);
                return new PrescriptionOperationResult(false, relationError, null);
            }

            await using var updateCmd = connection.CreateCommand();
            updateCmd.Transaction = transaction;
            updateCmd.CommandText = """
                UPDATE Prescriptions
                SET appointment_id = @appointmentId,
                    patient_id = @patientId,
                    doctor_id = @doctorId,
                    prescription_date = @prescriptionDate,
                    diagnosis = @diagnosis,
                    notes = @notes,
                    updated_at = CURRENT_TIMESTAMP
                WHERE prescription_id = @prescriptionId;
                """;
            updateCmd.Parameters.AddWithValue("@prescriptionId", prescriptionId);
            updateCmd.Parameters.AddWithValue("@appointmentId", request.AppointmentId.HasValue ? request.AppointmentId.Value : null);
            updateCmd.Parameters.AddWithValue("@patientId", request.PatientId);
            updateCmd.Parameters.AddWithValue("@doctorId", request.DoctorId);
            updateCmd.Parameters.AddWithValue("@prescriptionDate", request.PrescriptionDate.ToDateTime(TimeOnly.MinValue));
            updateCmd.Parameters.AddWithValue("@diagnosis", NormalizeNullable(request.Diagnosis));
            updateCmd.Parameters.AddWithValue("@notes", NormalizeNullable(request.Notes));

            var affected = await updateCmd.ExecuteNonQueryAsync(cancellationToken);
            if (affected == 0)
            {
                await transaction.RollbackAsync(cancellationToken);
                return new PrescriptionOperationResult(false, "Prescription not found.", null);
            }

            await using var deleteItemsCmd = connection.CreateCommand();
            deleteItemsCmd.Transaction = transaction;
            deleteItemsCmd.CommandText = "DELETE FROM Prescription_Items WHERE prescription_id = @prescriptionId;";
            deleteItemsCmd.Parameters.AddWithValue("@prescriptionId", prescriptionId);
            await deleteItemsCmd.ExecuteNonQueryAsync(cancellationToken);

            await InsertPrescriptionItemsAsync(connection, transaction, prescriptionId, request.Items, cancellationToken);
            await transaction.CommitAsync(cancellationToken);

            var prescription = await GetByIdAsync(prescriptionId, cancellationToken);
            return new PrescriptionOperationResult(true, "Prescription updated successfully.", prescription);
        }
        catch
        {
            await transaction.RollbackAsync(cancellationToken);
            throw;
        }
    }

    public async Task<bool> DeleteAsync(int prescriptionId, CancellationToken cancellationToken = default)
    {
        await using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await using var transaction = await connection.BeginTransactionAsync(cancellationToken);

        try
        {
            await using var deleteItemsCmd = connection.CreateCommand();
            deleteItemsCmd.Transaction = transaction;
            deleteItemsCmd.CommandText = "DELETE FROM Prescription_Items WHERE prescription_id = @prescriptionId;";
            deleteItemsCmd.Parameters.AddWithValue("@prescriptionId", prescriptionId);
            await deleteItemsCmd.ExecuteNonQueryAsync(cancellationToken);

            await using var command = connection.CreateCommand();
            command.Transaction = transaction;
            command.CommandText = "DELETE FROM Prescriptions WHERE prescription_id = @prescriptionId;";
            command.Parameters.AddWithValue("@prescriptionId", prescriptionId);

            var affected = await command.ExecuteNonQueryAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
            return affected > 0;
        }
        catch
        {
            await transaction.RollbackAsync(cancellationToken);
            throw;
        }
    }

    public async Task<PrescriptionResponse?> GetByIdAsync(int prescriptionId, CancellationToken cancellationToken = default)
    {
        var prescriptions = await GetListAsync("p.prescription_id = @prescriptionId", new (string Name, object Value)[] { ("@prescriptionId", prescriptionId) }, cancellationToken);
        return prescriptions.FirstOrDefault();
    }

    public Task<IReadOnlyList<PrescriptionResponse>> GetByPatientIdAsync(int patientId, CancellationToken cancellationToken = default)
    {
        return GetListAsync("p.patient_id = @patientId", new (string Name, object Value)[] { ("@patientId", patientId) }, cancellationToken);
    }

    public Task<IReadOnlyList<PrescriptionResponse>> GetByDoctorIdAsync(int doctorId, CancellationToken cancellationToken = default)
    {
        return GetListAsync("p.doctor_id = @doctorId", new (string Name, object Value)[] { ("@doctorId", doctorId) }, cancellationToken);
    }

    private async Task<IReadOnlyList<PrescriptionResponse>> GetListAsync(string filterClause, (string Name, object Value)[] parameters, CancellationToken cancellationToken)
    {
        await using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);

        await using var command = connection.CreateCommand();
        command.CommandText = $"""
            SELECT
                p.prescription_id,
                p.appointment_id,
                p.patient_id,
                p.doctor_id,
                p.prescription_date,
                p.diagnosis,
                p.notes,
                p.created_at,
                p.updated_at,
                CONCAT(pa.first_name, ' ', pa.last_name) AS patient_name,
                CONCAT(d.first_name, ' ', d.last_name) AS doctor_name,
                pi.prescription_item_id,
                pi.medicine_id,
                m.medicine_name,
                pi.dosage,
                pi.frequency,
                pi.duration,
                pi.quantity
            FROM Prescriptions p
            JOIN Patients pa ON pa.patient_id = p.patient_id
            JOIN Doctors d ON d.doctor_id = p.doctor_id
            LEFT JOIN Prescription_Items pi ON pi.prescription_id = p.prescription_id
            LEFT JOIN Medicines m ON m.medicine_id = pi.medicine_id
            WHERE {filterClause}
            ORDER BY p.prescription_date DESC, p.prescription_id DESC, pi.prescription_item_id ASC;
            """;

        foreach (var parameter in parameters)
        {
            command.Parameters.AddWithValue(parameter.Name, parameter.Value);
        }

        var prescriptions = new Dictionary<int, (PrescriptionResponse Response, List<PrescriptionItemResponse> Items)>();
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);

        while (await reader.ReadAsync(cancellationToken))
        {
            var prescriptionId = reader.GetInt32(reader.GetOrdinal("prescription_id"));
            if (!prescriptions.TryGetValue(prescriptionId, out var entry))
            {
                entry = (new PrescriptionResponse(
                    PrescriptionId: prescriptionId,
                    AppointmentId: reader.IsDBNull(reader.GetOrdinal("appointment_id")) ? null : reader.GetInt32(reader.GetOrdinal("appointment_id")),
                    PatientId: reader.GetInt32(reader.GetOrdinal("patient_id")),
                    DoctorId: reader.GetInt32(reader.GetOrdinal("doctor_id")),
                    PrescriptionDate: DateOnly.FromDateTime(reader.GetDateTime(reader.GetOrdinal("prescription_date"))),
                    Diagnosis: GetNullableString(reader, "diagnosis"),
                    Notes: GetNullableString(reader, "notes"),
                    PatientName: reader.GetString(reader.GetOrdinal("patient_name")),
                    DoctorName: reader.GetString(reader.GetOrdinal("doctor_name")),
                    Items: Array.Empty<PrescriptionItemResponse>(),
                    CreatedAt: reader.GetDateTime(reader.GetOrdinal("created_at")),
                    UpdatedAt: reader.GetDateTime(reader.GetOrdinal("updated_at"))),
                    new List<PrescriptionItemResponse>());

                prescriptions.Add(prescriptionId, entry);
            }

            if (!reader.IsDBNull(reader.GetOrdinal("prescription_item_id")))
            {
                entry.Items.Add(new PrescriptionItemResponse(
                    PrescriptionItemId: reader.GetInt32(reader.GetOrdinal("prescription_item_id")),
                    MedicineId: reader.GetInt32(reader.GetOrdinal("medicine_id")),
                    MedicineName: reader.GetString(reader.GetOrdinal("medicine_name")),
                    Dosage: GetNullableString(reader, "dosage"),
                    Frequency: GetNullableString(reader, "frequency"),
                    Duration: GetNullableString(reader, "duration"),
                    Quantity: reader.GetInt32(reader.GetOrdinal("quantity"))));
            }
        }

        return prescriptions.Values
            .Select(x => x.Response with { Items = x.Items })
            .ToList();
    }

    private static async Task InsertPrescriptionItemsAsync(
        MySqlConnection connection,
        MySqlTransaction transaction,
        int prescriptionId,
        IReadOnlyList<PrescriptionItemCreateRequest> items,
        CancellationToken cancellationToken)
    {
        foreach (var item in items)
        {
            if (item.MedicineId <= 0)
            {
                throw new InvalidOperationException("Prescription item medicine ID must be valid.");
            }

            await using var medicineCmd = connection.CreateCommand();
            medicineCmd.Transaction = transaction;
            medicineCmd.CommandText = "SELECT medicine_id FROM Medicines WHERE medicine_id = @medicineId LIMIT 1;";
            medicineCmd.Parameters.AddWithValue("@medicineId", item.MedicineId);
            var medicineExists = await medicineCmd.ExecuteScalarAsync(cancellationToken);
            if (medicineExists is null)
            {
                throw new InvalidOperationException($"Medicine with ID {item.MedicineId} was not found.");
            }

            await using var insertItemCmd = connection.CreateCommand();
            insertItemCmd.Transaction = transaction;
            insertItemCmd.CommandText = """
                INSERT INTO Prescription_Items (
                    prescription_id,
                    medicine_id,
                    dosage,
                    frequency,
                    duration,
                    quantity)
                VALUES (
                    @prescriptionId,
                    @medicineId,
                    @dosage,
                    @frequency,
                    @duration,
                    @quantity);
                """;
            insertItemCmd.Parameters.AddWithValue("@prescriptionId", prescriptionId);
            insertItemCmd.Parameters.AddWithValue("@medicineId", item.MedicineId);
            insertItemCmd.Parameters.AddWithValue("@dosage", NormalizeNullable(item.Dosage));
            insertItemCmd.Parameters.AddWithValue("@frequency", NormalizeNullable(item.Frequency));
            insertItemCmd.Parameters.AddWithValue("@duration", NormalizeNullable(item.Duration));
            insertItemCmd.Parameters.AddWithValue("@quantity", item.Quantity);

            await insertItemCmd.ExecuteNonQueryAsync(cancellationToken);
        }
    }

    private static string? ValidateRequest(PrescriptionCreateRequest request)
    {
        if (request.PatientId <= 0)
        {
            return "Patient ID is required.";
        }

        if (request.DoctorId <= 0)
        {
            return "Doctor ID is required.";
        }

        if (request.AppointmentId.HasValue && request.AppointmentId.Value <= 0)
        {
            return "Appointment ID must be a positive value when provided.";
        }

        if (request.Items is null || request.Items.Count == 0)
        {
            return "At least one prescription medicine item is required.";
        }

        foreach (var item in request.Items)
        {
            if (item.MedicineId <= 0)
            {
                return "Prescription medicine ID must be valid.";
            }

            if (item.Quantity <= 0)
            {
                return "Prescription item quantity must be at least 1.";
            }
        }

        return null;
    }

    private static PrescriptionCreateRequest ConvertToCreateRequest(PrescriptionUpdateRequest request)
        => new(
            request.PatientId,
            request.DoctorId,
            request.AppointmentId,
            request.PrescriptionDate,
            request.Diagnosis,
            request.Notes,
            request.Items);

    private static string? ValidateRequest(PrescriptionUpdateRequest request)
    {
        return ValidateRequest(ConvertToCreateRequest(request));
    }

    private static async Task<string?> ValidateForeignReferencesAsync(
        MySqlConnection connection,
        PrescriptionCreateRequest request,
        CancellationToken cancellationToken)
    {
        await using var patientCommand = connection.CreateCommand();
        patientCommand.CommandText = "SELECT patient_id FROM Patients WHERE patient_id = @patientId LIMIT 1;";
        patientCommand.Parameters.AddWithValue("@patientId", request.PatientId);
        var patientExists = await patientCommand.ExecuteScalarAsync(cancellationToken);
        if (patientExists is null)
        {
            return "Patient not found.";
        }

        await using var doctorCommand = connection.CreateCommand();
        doctorCommand.CommandText = "SELECT doctor_id FROM Doctors WHERE doctor_id = @doctorId LIMIT 1;";
        doctorCommand.Parameters.AddWithValue("@doctorId", request.DoctorId);
        var doctorExists = await doctorCommand.ExecuteScalarAsync(cancellationToken);
        if (doctorExists is null)
        {
            return "Doctor not found.";
        }

        if (request.AppointmentId.HasValue)
        {
            await using var appointmentCommand = connection.CreateCommand();
            appointmentCommand.CommandText = """
                SELECT appointment_id
                FROM Appointments
                WHERE appointment_id = @appointmentId
                  AND patient_id = @patientId
                  AND doctor_id = @doctorId
                LIMIT 1;
                """;
            appointmentCommand.Parameters.AddWithValue("@appointmentId", request.AppointmentId.Value);
            appointmentCommand.Parameters.AddWithValue("@patientId", request.PatientId);
            appointmentCommand.Parameters.AddWithValue("@doctorId", request.DoctorId);
            var appointmentExists = await appointmentCommand.ExecuteScalarAsync(cancellationToken);
            if (appointmentExists is null)
            {
                return "Appointment not found for the selected patient and doctor.";
            }
        }

        return null;
    }

    private static async Task<string?> ValidateForeignReferencesAsync(
        MySqlConnection connection,
        PrescriptionUpdateRequest request,
        CancellationToken cancellationToken)
    {
        return await ValidateForeignReferencesAsync(connection, ConvertToCreateRequest(request), cancellationToken);
    }

    private static string? NormalizeNullable(string? value)
        => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static string? GetNullableString(DbDataReader reader, string fieldName)
        => reader.IsDBNull(reader.GetOrdinal(fieldName)) ? null : reader.GetString(reader.GetOrdinal(fieldName));
}
