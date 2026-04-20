using System.Data.Common;
using HospitalAPI.Data;
using HospitalAPI.Models;
using MySql.Data.MySqlClient;

namespace HospitalAPI.Services;

public sealed class LabRequestService(MySqlConnectionFactory connectionFactory) : ILabRequestService
{
    public async Task<LabRequestOperationResult> CreateAsync(int doctorId, LabRequestCreateRequest request, CancellationToken cancellationToken)
    {
        var validationError = ValidateCreateRequest(request);
        if (validationError is not null)
        {
            return new LabRequestOperationResult(false, validationError, null);
        }

        try
        {
            await using var connection = connectionFactory.CreateConnection();
            await connection.OpenAsync(cancellationToken);

            await using (var patientCheck = connection.CreateCommand())
            {
                patientCheck.CommandText = "SELECT patient_id FROM Patients WHERE patient_id = @patientId LIMIT 1;";
                patientCheck.Parameters.AddWithValue("@patientId", request.PatientId);
                var patientExists = await patientCheck.ExecuteScalarAsync(cancellationToken);
                if (patientExists is null)
                {
                    return new LabRequestOperationResult(false, "Patient not found.", null);
                }
            }

            if (request.AppointmentId.HasValue)
            {
                await using var appointmentCheck = connection.CreateCommand();
                appointmentCheck.CommandText = """
                    SELECT appointment_id
                    FROM Appointments
                    WHERE appointment_id = @appointmentId
                      AND patient_id = @patientId
                      AND doctor_id = @doctorId
                    LIMIT 1;
                    """;
                appointmentCheck.Parameters.AddWithValue("@appointmentId", request.AppointmentId.Value);
                appointmentCheck.Parameters.AddWithValue("@patientId", request.PatientId);
                appointmentCheck.Parameters.AddWithValue("@doctorId", doctorId);
                var appointmentExists = await appointmentCheck.ExecuteScalarAsync(cancellationToken);
                if (appointmentExists is null)
                {
                    return new LabRequestOperationResult(false, "Appointment not found for selected doctor and patient.", null);
                }
            }

            await using var insert = connection.CreateCommand();
            insert.CommandText = """
                INSERT INTO Lab_Requests (
                    patient_id,
                    doctor_id,
                    appointment_id,
                    test_name,
                    priority,
                    status,
                    notes)
                VALUES (
                    @patientId,
                    @doctorId,
                    @appointmentId,
                    @testName,
                    @priority,
                    'Pending',
                    @notes);
                SELECT LAST_INSERT_ID();
                """;
            insert.Parameters.AddWithValue("@patientId", request.PatientId);
            insert.Parameters.AddWithValue("@doctorId", doctorId);
            insert.Parameters.AddWithValue("@appointmentId", request.AppointmentId.HasValue ? request.AppointmentId.Value : DBNull.Value);
            insert.Parameters.AddWithValue("@testName", request.TestName.Trim());
            insert.Parameters.AddWithValue("@priority", NormalizePriority(request.Priority));
            insert.Parameters.AddWithValue("@notes", string.IsNullOrWhiteSpace(request.Notes) ? DBNull.Value : request.Notes.Trim());

            var createdId = Convert.ToInt32(await insert.ExecuteScalarAsync(cancellationToken));
            var created = await GetByIdAsync(createdId, cancellationToken);
            return new LabRequestOperationResult(true, "Lab request created successfully.", created);
        }
        catch (MySqlException ex) when (ex.Number == 1146)
        {
            return new LabRequestOperationResult(false, "Lab request table is missing. Run database/005_create_lab_requests.sql.", null);
        }
        catch (MySqlException ex) when (ex.Number == 1452)
        {
            return new LabRequestOperationResult(false, "Invalid patient or appointment reference for this doctor.", null);
        }
        catch (MySqlException)
        {
            return new LabRequestOperationResult(false, "Database error while creating lab request.", null);
        }
    }

    public async Task<LabRequestResponse?> GetByIdAsync(int requestId, CancellationToken cancellationToken)
    {
        await using var connection = connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);

        await using var command = connection.CreateCommand();
        command.CommandText = BuildSelectQuery("lr.request_id = @requestId") + " LIMIT 1;";
        command.Parameters.AddWithValue("@requestId", requestId);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
        {
            return null;
        }

        return MapLabRequest(reader);
    }

    public async Task<IReadOnlyList<LabRequestResponse>> GetByDoctorIdAsync(int doctorId, string? status, CancellationToken cancellationToken)
    {
        var requests = new List<LabRequestResponse>();

        await using var connection = connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);

        await using var command = connection.CreateCommand();
        command.CommandText = BuildSelectQuery("lr.doctor_id = @doctorId" + BuildStatusClause(status));
        command.Parameters.AddWithValue("@doctorId", doctorId);
        AddStatusParameter(command, status);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            requests.Add(MapLabRequest(reader));
        }

        return requests;
    }

    public async Task<IReadOnlyList<LabRequestResponse>> GetByPatientIdAsync(int patientId, CancellationToken cancellationToken)
    {
        var requests = new List<LabRequestResponse>();

        await using var connection = connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);

        await using var command = connection.CreateCommand();
        command.CommandText = BuildSelectQuery("lr.patient_id = @patientId");
        command.Parameters.AddWithValue("@patientId", patientId);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            requests.Add(MapLabRequest(reader));
        }

        return requests;
    }

    public async Task<IReadOnlyList<LabRequestResponse>> GetAllAsync(string? status, CancellationToken cancellationToken)
    {
        var requests = new List<LabRequestResponse>();

        await using var connection = connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);

        await using var command = connection.CreateCommand();
        command.CommandText = BuildSelectQuery("1 = 1" + BuildStatusClause(status));
        AddStatusParameter(command, status);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            requests.Add(MapLabRequest(reader));
        }

        return requests;
    }

    public async Task<LabRequestOperationResult> UpdateStatusAsync(int requestId, string status, CancellationToken cancellationToken)
    {
        var normalizedStatus = NormalizeStatus(status);
        if (normalizedStatus is null)
        {
            return new LabRequestOperationResult(false, "Status must be one of: Pending, InProgress, Completed, Cancelled.", null);
        }

        await using var connection = connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);

        await using var command = connection.CreateCommand();
        command.CommandText = """
            UPDATE Lab_Requests
            SET status = @status,
                updated_at = CURRENT_TIMESTAMP
            WHERE request_id = @requestId;
            """;
        command.Parameters.AddWithValue("@status", normalizedStatus);
        command.Parameters.AddWithValue("@requestId", requestId);

        var rows = await command.ExecuteNonQueryAsync(cancellationToken);
        if (rows == 0)
        {
            return new LabRequestOperationResult(false, "Lab request not found.", null);
        }

        var updated = await GetByIdAsync(requestId, cancellationToken);
        return new LabRequestOperationResult(true, "Lab request status updated successfully.", updated);
    }

    public async Task<LabRequestOperationResult> UploadReportAsync(int requestId, int patientId, string fileUrl, string fileName, CancellationToken cancellationToken)
    {
        var existing = await GetByIdAsync(requestId, cancellationToken);
        if (existing is null)
        {
            return new LabRequestOperationResult(false, "Lab request not found.", null);
        }

        if (existing.PatientId != patientId)
        {
            return new LabRequestOperationResult(false, "You can only upload reports for your own lab requests.", null);
        }

        await using var connection = connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);

        await using var command = connection.CreateCommand();
        command.CommandText = """
            UPDATE Lab_Requests
            SET report_file_url = @fileUrl,
                report_file_name = @fileName,
                report_uploaded_at = CURRENT_TIMESTAMP,
                status = 'Completed',
                updated_at = CURRENT_TIMESTAMP
            WHERE request_id = @requestId;
            """;
        command.Parameters.AddWithValue("@fileUrl", fileUrl);
        command.Parameters.AddWithValue("@fileName", fileName);
        command.Parameters.AddWithValue("@requestId", requestId);

        var rows = await command.ExecuteNonQueryAsync(cancellationToken);
        if (rows == 0)
        {
            return new LabRequestOperationResult(false, "Lab request not found.", null);
        }

        var updatedRequest = await GetByIdAsync(requestId, cancellationToken);
        return new LabRequestOperationResult(true, "Report uploaded successfully.", updatedRequest);
    }

    private static string BuildSelectQuery(string condition)
    {
        return $"""
            SELECT
                lr.request_id,
                lr.patient_id,
                CONCAT(COALESCE(p.first_name, ''), ' ', COALESCE(p.last_name, '')) AS patient_name,
                lr.doctor_id,
                CONCAT(COALESCE(d.first_name, ''), ' ', COALESCE(d.last_name, '')) AS doctor_name,
                lr.appointment_id,
                lr.test_name,
                lr.priority,
                lr.status,
                lr.notes,
                lr.report_file_url,
                lr.report_file_name,
                lr.report_uploaded_at,
                lr.requested_at,
                lr.updated_at
            FROM Lab_Requests lr
            JOIN Patients p ON p.patient_id = lr.patient_id
            JOIN Doctors d ON d.doctor_id = lr.doctor_id
            WHERE {condition}
            ORDER BY lr.requested_at DESC, lr.request_id DESC
            """;
    }

    private static string BuildStatusClause(string? status)
    {
        var normalizedStatus = NormalizeStatus(status);
        return normalizedStatus is null ? string.Empty : " AND lr.status = @status";
    }

    private static void AddStatusParameter(DbCommand command, string? status)
    {
        var normalizedStatus = NormalizeStatus(status);
        if (normalizedStatus is not null)
        {
            var parameter = command.CreateParameter();
            parameter.ParameterName = "@status";
            parameter.Value = normalizedStatus;
            command.Parameters.Add(parameter);
        }
    }

    private static LabRequestResponse MapLabRequest(DbDataReader reader)
    {
        var patientId = reader.GetInt32(reader.GetOrdinal("patient_id"));
        var doctorId = reader.GetInt32(reader.GetOrdinal("doctor_id"));
        var reportFileUrlOrd = reader.GetOrdinal("report_file_url");
        var reportFileNameOrd = reader.GetOrdinal("report_file_name");
        var reportUploadedAtOrd = reader.GetOrdinal("report_uploaded_at");

        return new LabRequestResponse(
            RequestId: reader.GetInt32(reader.GetOrdinal("request_id")),
            PatientId: patientId,
            PatientFormattedId: $"PAT-{patientId:D4}",
            PatientName: reader.GetString(reader.GetOrdinal("patient_name")).Trim(),
            DoctorId: doctorId,
            DoctorFormattedId: $"DOC-{doctorId:D4}",
            DoctorName: reader.GetString(reader.GetOrdinal("doctor_name")).Trim(),
            AppointmentId: reader.IsDBNull(reader.GetOrdinal("appointment_id")) ? null : reader.GetInt32(reader.GetOrdinal("appointment_id")),
            TestName: reader.GetString(reader.GetOrdinal("test_name")),
            Priority: reader.GetString(reader.GetOrdinal("priority")),
            Status: reader.GetString(reader.GetOrdinal("status")),
            Notes: reader.IsDBNull(reader.GetOrdinal("notes")) ? null : reader.GetString(reader.GetOrdinal("notes")),
            ReportFileUrl: reader.IsDBNull(reportFileUrlOrd) ? null : reader.GetString(reportFileUrlOrd),
            ReportFileName: reader.IsDBNull(reportFileNameOrd) ? null : reader.GetString(reportFileNameOrd),
            ReportUploadedAt: reader.IsDBNull(reportUploadedAtOrd) ? null : reader.GetDateTime(reportUploadedAtOrd),
            RequestedAt: reader.GetDateTime(reader.GetOrdinal("requested_at")),
            UpdatedAt: reader.GetDateTime(reader.GetOrdinal("updated_at")));
    }

    private static string? ValidateCreateRequest(LabRequestCreateRequest request)
    {
        if (request.PatientId <= 0)
        {
            return "Patient ID is required.";
        }

        if (string.IsNullOrWhiteSpace(request.TestName))
        {
            return "Test name is required.";
        }

        if (request.TestName.Trim().Length > 150)
        {
            return "Test name cannot exceed 150 characters.";
        }

        if (NormalizePriority(request.Priority) is null)
        {
            return "Priority must be either Routine or Urgent.";
        }

        return null;
    }

    private static string? NormalizePriority(string? priority)
    {
        if (string.IsNullOrWhiteSpace(priority)) return null;
        return priority.Trim().Equals("Urgent", StringComparison.OrdinalIgnoreCase)
            ? "Urgent"
            : priority.Trim().Equals("Routine", StringComparison.OrdinalIgnoreCase)
                ? "Routine"
                : null;
    }

    private static string? NormalizeStatus(string? status)
    {
        if (string.IsNullOrWhiteSpace(status)) return null;

        var value = status.Trim();
        if (value.Equals("Pending", StringComparison.OrdinalIgnoreCase)) return "Pending";
        if (value.Equals("InProgress", StringComparison.OrdinalIgnoreCase) || value.Equals("In Progress", StringComparison.OrdinalIgnoreCase)) return "InProgress";
        if (value.Equals("Completed", StringComparison.OrdinalIgnoreCase)) return "Completed";
        if (value.Equals("Cancelled", StringComparison.OrdinalIgnoreCase)) return "Cancelled";
        return null;
    }
}
