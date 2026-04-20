using HospitalAPI.Data;
using HospitalAPI.Models;
using MySql.Data.MySqlClient;
using System.Data.Common;

namespace HospitalAPI.Services;

public sealed class PatientService(MySqlConnectionFactory connectionFactory) : IPatientService
{
    public async Task<PatientOperationResult> CreateAsync(PatientUpsertRequest request, int userId, CancellationToken cancellationToken)
    {
        var validationError = ValidateUpsertRequest(request);
        if (validationError is not null)
        {
            return new PatientOperationResult(false, validationError, null);
        }

        await using var connection = connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);

        await using (var existsCommand = connection.CreateCommand())
        {
            existsCommand.CommandText = "SELECT patient_id FROM Patients WHERE user_id = @userId LIMIT 1;";
            existsCommand.Parameters.AddWithValue("@userId", userId);

            var existingPatientId = await existsCommand.ExecuteScalarAsync(cancellationToken);
            if (existingPatientId is not null)
            {
                return new PatientOperationResult(false, "Patient profile already exists for this user.", null);
            }
        }

        await using var insertCommand = connection.CreateCommand();
        insertCommand.CommandText = """
            INSERT INTO Patients (
                user_id,
                first_name,
                last_name,
                date_of_birth,
                gender,
                phone,
                address,
                blood_group,
                emergency_contact)
            VALUES (
                @userId,
                @firstName,
                @lastName,
                @dateOfBirth,
                @gender,
                @phone,
                @address,
                @bloodGroup,
                @emergencyContact);
            SELECT LAST_INSERT_ID();
            """;

        insertCommand.Parameters.AddWithValue("@userId", userId);
        insertCommand.Parameters.AddWithValue("@firstName", request.FirstName.Trim());
        insertCommand.Parameters.AddWithValue("@lastName", request.LastName.Trim());
        insertCommand.Parameters.AddWithValue("@dateOfBirth", request.DateOfBirth?.ToDateTime(TimeOnly.MinValue));
        insertCommand.Parameters.AddWithValue("@gender", NormalizeNullable(request.Gender));
        insertCommand.Parameters.AddWithValue("@phone", NormalizeNullable(request.Phone));
        insertCommand.Parameters.AddWithValue("@address", NormalizeNullable(request.Address));
        insertCommand.Parameters.AddWithValue("@bloodGroup", NormalizeNullable(request.BloodGroup));
        insertCommand.Parameters.AddWithValue("@emergencyContact", NormalizeNullable(request.EmergencyContact));

        var createdIdObj = await insertCommand.ExecuteScalarAsync(cancellationToken);
        var createdId = Convert.ToInt32(createdIdObj);
        var patient = await GetByIdAsync(createdId, cancellationToken);

        return new PatientOperationResult(true, "Patient profile created successfully.", patient);
    }

    public async Task<PatientProfileResponse?> GetByIdAsync(int patientId, CancellationToken cancellationToken)
    {
        await using var connection = connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);

        await using var command = connection.CreateCommand();
        command.CommandText = """
            SELECT
                patient_id,
                user_id,
                first_name,
                last_name,
                date_of_birth,
                gender,
                phone,
                address,
                blood_group,
                emergency_contact,
                created_at,
                updated_at
            FROM Patients
            WHERE patient_id = @patientId;
            """;
        command.Parameters.AddWithValue("@patientId", patientId);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
        {
            return null;
        }

        return MapPatient(reader);
    }

    public async Task<PatientProfileResponse?> GetByUserIdAsync(int userId, CancellationToken cancellationToken)
    {
        await using var connection = connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);

        await using var command = connection.CreateCommand();
        command.CommandText = """
            SELECT
                patient_id,
                user_id,
                first_name,
                last_name,
                date_of_birth,
                gender,
                phone,
                address,
                blood_group,
                emergency_contact,
                created_at,
                updated_at
            FROM Patients
            WHERE user_id = @userId;
            """;
        command.Parameters.AddWithValue("@userId", userId);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
        {
            return null;
        }

        return MapPatient(reader);
    }

    public async Task<PatientOperationResult> UpdateByIdAsync(int patientId, PatientUpsertRequest request, CancellationToken cancellationToken)
    {
        var validationError = ValidateUpsertRequest(request);
        if (validationError is not null)
        {
            return new PatientOperationResult(false, validationError, null);
        }

        await using var connection = connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);

        await using var updateCommand = connection.CreateCommand();
        updateCommand.CommandText = """
            UPDATE Patients
            SET first_name = @firstName,
                last_name = @lastName,
                date_of_birth = @dateOfBirth,
                gender = @gender,
                phone = @phone,
                address = @address,
                blood_group = @bloodGroup,
                emergency_contact = @emergencyContact
            WHERE patient_id = @patientId;
            """;

        updateCommand.Parameters.AddWithValue("@patientId", patientId);
        updateCommand.Parameters.AddWithValue("@firstName", request.FirstName.Trim());
        updateCommand.Parameters.AddWithValue("@lastName", request.LastName.Trim());
        updateCommand.Parameters.AddWithValue("@dateOfBirth", request.DateOfBirth?.ToDateTime(TimeOnly.MinValue));
        updateCommand.Parameters.AddWithValue("@gender", NormalizeNullable(request.Gender));
        updateCommand.Parameters.AddWithValue("@phone", NormalizeNullable(request.Phone));
        updateCommand.Parameters.AddWithValue("@address", NormalizeNullable(request.Address));
        updateCommand.Parameters.AddWithValue("@bloodGroup", NormalizeNullable(request.BloodGroup));
        updateCommand.Parameters.AddWithValue("@emergencyContact", NormalizeNullable(request.EmergencyContact));

        var affected = await updateCommand.ExecuteNonQueryAsync(cancellationToken);
        if (affected == 0)
        {
            return new PatientOperationResult(false, "Patient not found.", null);
        }

        var patient = await GetByIdAsync(patientId, cancellationToken);
        return new PatientOperationResult(true, "Patient profile updated successfully.", patient);
    }

    public async Task<PatientOperationResult> UpdateByUserIdAsync(int userId, PatientUpsertRequest request, CancellationToken cancellationToken)
    {
        var profile = await GetByUserIdAsync(userId, cancellationToken);
        if (profile is null)
        {
            return new PatientOperationResult(false, "Patient profile not found.", null);
        }

        return await UpdateByIdAsync(profile.PatientId, request, cancellationToken);
    }

    public async Task<bool> DeleteAsync(int patientId, CancellationToken cancellationToken)
    {
        await using var connection = connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);

        // Check if patient has relational records
        await using (var checkCmd = connection.CreateCommand())
        {
            checkCmd.CommandText = """
                SELECT 
                  (SELECT COUNT(*) FROM Appointments WHERE patient_id = @patientId) +
                  (SELECT COUNT(*) FROM Prescriptions WHERE patient_id = @patientId) +
                  (SELECT COUNT(*) FROM Invoices WHERE patient_id = @patientId) +
                  (SELECT COUNT(*) FROM Lab_Reports WHERE patient_id = @patientId) AS total_links;
            """;
            checkCmd.Parameters.AddWithValue("@patientId", patientId);
            var count = Convert.ToInt32(await checkCmd.ExecuteScalarAsync(cancellationToken));
            if (count > 0)
            {
                throw new InvalidOperationException("Cannot delete patient. They have active appointments, prescriptions, lab reports, or invoices.");
            }
        }

        await using var command = connection.CreateCommand();
        command.CommandText = "DELETE FROM Patients WHERE patient_id = @patientId;";
        command.Parameters.AddWithValue("@patientId", patientId);

        var affected = await command.ExecuteNonQueryAsync(cancellationToken);
        return affected > 0;
    }

    public async Task<PatientDashboardSummaryResponse?> GetDashboardSummaryByUserIdAsync(int userId, CancellationToken cancellationToken)
    {
        var patient = await GetByUserIdAsync(userId, cancellationToken);
        if (patient is null)
        {
            return null;
        }

        await using var connection = connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);

        var today = DateOnly.FromDateTime(DateTime.UtcNow).ToDateTime(TimeOnly.MinValue);

        var upcomingAppointments = await ExecuteCountAsync(connection, """
            SELECT COUNT(*)
            FROM Appointments
            WHERE patient_id = @patientId
              AND appointment_date >= @today
              AND status IN ('Pending', 'Confirmed');
            """, patient.PatientId, today, cancellationToken);

        var activePrescriptions = await ExecuteCountAsync(connection, """
            SELECT COUNT(*)
            FROM Prescriptions
            WHERE patient_id = @patientId;
            """, patient.PatientId, today, cancellationToken);

        var labReports = await ExecuteCountAsync(connection, """
            SELECT COUNT(*)
            FROM Lab_Reports
            WHERE patient_id = @patientId;
            """, patient.PatientId, today, cancellationToken);

        var pendingPayments = await ExecuteDecimalAsync(connection, """
            SELECT COALESCE(SUM(total_amount - paid_amount), 0)
            FROM Invoices
            WHERE patient_id = @patientId
              AND status IN ('Unpaid', 'Partial');
            """, patient.PatientId, cancellationToken);

        return new PatientDashboardSummaryResponse(
            upcomingAppointments,
            activePrescriptions,
            labReports,
            pendingPayments,
            ProfileIsComplete(patient));
    }

    public async Task<PatientDashboardDetailsResponse?> GetDashboardDetailsByUserIdAsync(int userId, CancellationToken cancellationToken)
    {
        var patient = await GetByUserIdAsync(userId, cancellationToken);
        if (patient is null)
        {
            return null;
        }

        await using var connection = connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);

        var upcomingAppointments = await GetUpcomingAppointmentsAsync(connection, patient.PatientId, cancellationToken);
        var recentPrescriptions = await GetRecentPrescriptionsAsync(connection, patient.PatientId, cancellationToken);
        var recentLabReports = await GetRecentLabReportsAsync(connection, patient.PatientId, cancellationToken);
        var pendingInvoices = await GetPendingInvoicesAsync(connection, patient.PatientId, cancellationToken);

        return new PatientDashboardDetailsResponse(upcomingAppointments, recentPrescriptions, recentLabReports, pendingInvoices);
    }

    public async Task<int> GetTotalCountAsync(CancellationToken cancellationToken = default)
    {
        await using var connection = connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await using var cmd = connection.CreateCommand();
        cmd.CommandText = "SELECT COUNT(*) FROM Patients;";
        var count = await cmd.ExecuteScalarAsync(cancellationToken);
        return Convert.ToInt32(count);
    }

    private static async Task<IReadOnlyList<PatientAppointmentOverview>> GetUpcomingAppointmentsAsync(
        MySqlConnection connection,
        int patientId,
        CancellationToken cancellationToken)
    {
        await using var command = connection.CreateCommand();
        command.CommandText = """
            SELECT
                a.appointment_id,
                a.appointment_date,
                a.appointment_time,
                a.status,
                a.reason,
                a.doctor_id,
                CONCAT(COALESCE(d.first_name, ''), ' ', COALESCE(d.last_name, '')) AS doctor_name
            FROM Appointments a
            LEFT JOIN Doctors d ON d.doctor_id = a.doctor_id
            WHERE a.patient_id = @patientId
              AND a.status IN ('Pending', 'Confirmed')
            ORDER BY a.appointment_date ASC, a.appointment_time ASC
            LIMIT 5;
            """;
        command.Parameters.AddWithValue("@patientId", patientId);

        var items = new List<PatientAppointmentOverview>();
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            var doctorId = reader.IsDBNull(reader.GetOrdinal("doctor_id")) ? (int?)null : reader.GetInt32(reader.GetOrdinal("doctor_id"));
            items.Add(new PatientAppointmentOverview(
                AppointmentId: reader.GetInt32(reader.GetOrdinal("appointment_id")),
                AppointmentDate: DateOnly.FromDateTime(reader.GetDateTime(reader.GetOrdinal("appointment_date"))),
                AppointmentTime: TimeOnly.FromTimeSpan(reader.GetFieldValue<TimeSpan>(reader.GetOrdinal("appointment_time"))),
                Status: reader.GetString(reader.GetOrdinal("status")),
                Reason: GetNullableString(reader, "reason"),
                DoctorId: doctorId,
                DoctorFormattedId: doctorId.HasValue ? $"DOC-{doctorId.Value:D4}" : null,
                DoctorName: NormalizeNullable(GetNullableString(reader, "doctor_name"))));
        }

        return items;
    }

    private static async Task<IReadOnlyList<PatientPrescriptionOverview>> GetRecentPrescriptionsAsync(
        MySqlConnection connection,
        int patientId,
        CancellationToken cancellationToken)
    {
        await using var command = connection.CreateCommand();
        command.CommandText = """
            SELECT
                p.prescription_id,
                p.prescription_date,
                p.diagnosis,
                p.doctor_id,
                CONCAT(COALESCE(d.first_name, ''), ' ', COALESCE(d.last_name, '')) AS doctor_name
            FROM Prescriptions p
            LEFT JOIN Doctors d ON d.doctor_id = p.doctor_id
            WHERE p.patient_id = @patientId
            ORDER BY p.prescription_date DESC, p.prescription_id DESC
            LIMIT 5;
            """;
        command.Parameters.AddWithValue("@patientId", patientId);

        var items = new List<PatientPrescriptionOverview>();
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            var doctorId = reader.IsDBNull(reader.GetOrdinal("doctor_id")) ? (int?)null : reader.GetInt32(reader.GetOrdinal("doctor_id"));
            items.Add(new PatientPrescriptionOverview(
                PrescriptionId: reader.GetInt32(reader.GetOrdinal("prescription_id")),
                PrescriptionDate: DateOnly.FromDateTime(reader.GetDateTime(reader.GetOrdinal("prescription_date"))),
                Diagnosis: GetNullableString(reader, "diagnosis"),
                DoctorId: doctorId,
                DoctorFormattedId: doctorId.HasValue ? $"DOC-{doctorId.Value:D4}" : null,
                DoctorName: NormalizeNullable(GetNullableString(reader, "doctor_name"))));
        }

        return items;
    }

    private static async Task<IReadOnlyList<PatientLabReportOverview>> GetRecentLabReportsAsync(
        MySqlConnection connection,
        int patientId,
        CancellationToken cancellationToken)
    {
        await using var command = connection.CreateCommand();
        command.CommandText = """
            SELECT
                lr.report_id,
                lr.test_name,
                lr.test_date,
                lr.result_summary,
                lr.doctor_id,
                CONCAT(COALESCE(d.first_name, ''), ' ', COALESCE(d.last_name, '')) AS doctor_name
            FROM Lab_Reports lr
            LEFT JOIN Doctors d ON d.doctor_id = lr.doctor_id
            WHERE lr.patient_id = @patientId
            ORDER BY lr.test_date DESC, lr.report_id DESC
            LIMIT 5;
            """;
        command.Parameters.AddWithValue("@patientId", patientId);

        var items = new List<PatientLabReportOverview>();
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            var doctorId = reader.IsDBNull(reader.GetOrdinal("doctor_id")) ? (int?)null : reader.GetInt32(reader.GetOrdinal("doctor_id"));
            items.Add(new PatientLabReportOverview(
                ReportId: reader.GetInt32(reader.GetOrdinal("report_id")),
                TestName: reader.GetString(reader.GetOrdinal("test_name")),
                TestDate: DateOnly.FromDateTime(reader.GetDateTime(reader.GetOrdinal("test_date"))),
                ResultSummary: GetNullableString(reader, "result_summary"),
                DoctorId: doctorId,
                DoctorFormattedId: doctorId.HasValue ? $"DOC-{doctorId.Value:D4}" : null,
                DoctorName: NormalizeNullable(GetNullableString(reader, "doctor_name"))));
        }

        return items;
    }

    private static async Task<IReadOnlyList<PatientInvoiceOverview>> GetPendingInvoicesAsync(
        MySqlConnection connection,
        int patientId,
        CancellationToken cancellationToken)
    {
        await using var command = connection.CreateCommand();
        command.CommandText = """
            SELECT
                invoice_id,
                invoice_date,
                total_amount,
                paid_amount,
                status
            FROM Invoices
            WHERE patient_id = @patientId
              AND status IN ('Unpaid', 'Partial')
            ORDER BY invoice_date DESC, invoice_id DESC
            LIMIT 5;
            """;
        command.Parameters.AddWithValue("@patientId", patientId);

        var items = new List<PatientInvoiceOverview>();
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            items.Add(new PatientInvoiceOverview(
                InvoiceId: reader.GetInt32(reader.GetOrdinal("invoice_id")),
                InvoiceDate: DateOnly.FromDateTime(reader.GetDateTime(reader.GetOrdinal("invoice_date"))),
                TotalAmount: reader.GetDecimal(reader.GetOrdinal("total_amount")),
                PaidAmount: reader.GetDecimal(reader.GetOrdinal("paid_amount")),
                Status: reader.GetString(reader.GetOrdinal("status"))));
        }

        return items;
    }

    private static async Task<int> ExecuteCountAsync(
        MySqlConnection connection,
        string sql,
        int patientId,
        DateTime today,
        CancellationToken cancellationToken)
    {
        await using var command = connection.CreateCommand();
        command.CommandText = sql;
        command.Parameters.AddWithValue("@patientId", patientId);
        if (sql.Contains("@today", StringComparison.Ordinal))
        {
            command.Parameters.AddWithValue("@today", today);
        }

        var result = await command.ExecuteScalarAsync(cancellationToken);
        return Convert.ToInt32(result);
    }

    private static async Task<decimal> ExecuteDecimalAsync(
        MySqlConnection connection,
        string sql,
        int patientId,
        CancellationToken cancellationToken)
    {
        await using var command = connection.CreateCommand();
        command.CommandText = sql;
        command.Parameters.AddWithValue("@patientId", patientId);

        var result = await command.ExecuteScalarAsync(cancellationToken);
        return result is null ? 0m : Convert.ToDecimal(result);
    }

    private static PatientProfileResponse MapPatient(DbDataReader reader)
    {
        var userIdOrdinal = reader.GetOrdinal("user_id");
        var dobOrdinal = reader.GetOrdinal("date_of_birth");

        var patientId = reader.GetInt32(reader.GetOrdinal("patient_id"));
        return new PatientProfileResponse(
            PatientId: patientId,
            FormattedId: $"PAT-{patientId:D4}",
            UserId: reader.IsDBNull(userIdOrdinal) ? null : reader.GetInt32(userIdOrdinal),
            FirstName: reader.GetString(reader.GetOrdinal("first_name")),
            LastName: reader.GetString(reader.GetOrdinal("last_name")),
            DateOfBirth: reader.IsDBNull(dobOrdinal) ? null : DateOnly.FromDateTime(reader.GetDateTime(dobOrdinal)),
            Gender: GetNullableString(reader, "gender"),
            Phone: GetNullableString(reader, "phone"),
            Address: GetNullableString(reader, "address"),
            BloodGroup: GetNullableString(reader, "blood_group"),
            EmergencyContact: GetNullableString(reader, "emergency_contact"),
            CreatedAt: reader.GetDateTime(reader.GetOrdinal("created_at")),
            UpdatedAt: reader.GetDateTime(reader.GetOrdinal("updated_at")));
    }

    private static string? GetNullableString(DbDataReader reader, string columnName)
    {
        var ordinal = reader.GetOrdinal(columnName);
        return reader.IsDBNull(ordinal) ? null : reader.GetString(ordinal);
    }

    private static string? ValidateUpsertRequest(PatientUpsertRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.FirstName) || string.IsNullOrWhiteSpace(request.LastName))
        {
            return "First name and last name are required.";
        }

        if (request.Gender is not null)
        {
            var gender = request.Gender.Trim();
            if (!string.Equals(gender, "Male", StringComparison.OrdinalIgnoreCase)
                && !string.Equals(gender, "Female", StringComparison.OrdinalIgnoreCase)
                && !string.Equals(gender, "Other", StringComparison.OrdinalIgnoreCase))
            {
                return "Invalid gender. Allowed values: Male, Female, Other.";
            }
        }

        return null;
    }

    private static string? NormalizeNullable(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        return value.Trim();
    }

    private static bool ProfileIsComplete(PatientProfileResponse patient)
    {
        return !string.IsNullOrWhiteSpace(patient.Phone)
               && patient.DateOfBirth is not null
               && !string.IsNullOrWhiteSpace(patient.Gender)
               && !string.IsNullOrWhiteSpace(patient.Address);
    }
}
