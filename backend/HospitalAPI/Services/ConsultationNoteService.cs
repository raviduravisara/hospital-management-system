using System.Data.Common;
using HospitalAPI.Data;
using HospitalAPI.Models;
using MySql.Data.MySqlClient;

namespace HospitalAPI.Services;

public sealed class ConsultationNoteService(MySqlConnectionFactory connectionFactory) : IConsultationNoteService
{
    public async Task<ConsultationNoteOperationResult> CreateAsync(int doctorId, ConsultationNoteCreateRequest request, CancellationToken cancellationToken = default)
    {
        var validationError = ConsultationNoteRules.ValidateCreateRequest(request);
        if (validationError is not null)
        {
            return new ConsultationNoteOperationResult(false, validationError, null);
        }

        await using var connection = connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);

        if (!await PatientExistsAsync(connection, request.PatientId, cancellationToken))
        {
            return new ConsultationNoteOperationResult(false, "Patient not found.", null);
        }

        if (request.AppointmentId.HasValue)
        {
            var isOwnedAppointment = await AppointmentBelongsToDoctorAndPatientAsync(
                connection,
                request.AppointmentId.Value,
                doctorId,
                request.PatientId,
                cancellationToken);

            if (!isOwnedAppointment)
            {
                return new ConsultationNoteOperationResult(false, "Appointment not found for selected doctor and patient.", null);
            }
        }

        await using var insert = connection.CreateCommand();
        insert.CommandText = """
            INSERT INTO Consultation_Notes (
                patient_id,
                doctor_id,
                appointment_id,
                consultation_date,
                chief_complaint,
                diagnosis,
                treatment_plan,
                notes)
            VALUES (
                @patientId,
                @doctorId,
                @appointmentId,
                @consultationDate,
                @chiefComplaint,
                @diagnosis,
                @treatmentPlan,
                @notes);
            SELECT LAST_INSERT_ID();
            """;

        insert.Parameters.AddWithValue("@patientId", request.PatientId);
        insert.Parameters.AddWithValue("@doctorId", doctorId);
        insert.Parameters.AddWithValue("@appointmentId", request.AppointmentId.HasValue ? request.AppointmentId.Value : DBNull.Value);
        insert.Parameters.AddWithValue("@consultationDate", request.ConsultationDate.ToDateTime(TimeOnly.MinValue));
        insert.Parameters.AddWithValue("@chiefComplaint", ConsultationNoteRules.NormalizeNullable(request.ChiefComplaint, 500) ?? (object)DBNull.Value);
        insert.Parameters.AddWithValue("@diagnosis", ConsultationNoteRules.NormalizeNullable(request.Diagnosis, 1000) ?? (object)DBNull.Value);
        insert.Parameters.AddWithValue("@treatmentPlan", ConsultationNoteRules.NormalizeNullable(request.TreatmentPlan, 1000) ?? (object)DBNull.Value);
        insert.Parameters.AddWithValue("@notes", ConsultationNoteRules.NormalizeNullable(request.Notes, 2000) ?? (object)DBNull.Value);

        var createdId = Convert.ToInt32(await insert.ExecuteScalarAsync(cancellationToken));
        var created = await GetByIdAsync(createdId, doctorId, cancellationToken);

        return new ConsultationNoteOperationResult(true, "Consultation note created successfully.", created);
    }

    public async Task<ConsultationNoteOperationResult> UpdateAsync(int noteId, int doctorId, ConsultationNoteUpdateRequest request, CancellationToken cancellationToken = default)
    {
        var validationError = ConsultationNoteRules.ValidateUpdateRequest(request);
        if (validationError is not null)
        {
            return new ConsultationNoteOperationResult(false, validationError, null);
        }

        await using var connection = connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);

        if (!await NoteExistsForDoctorAsync(connection, noteId, doctorId, cancellationToken))
        {
            return new ConsultationNoteOperationResult(false, "Consultation note not found.", null);
        }

        if (!await PatientExistsAsync(connection, request.PatientId, cancellationToken))
        {
            return new ConsultationNoteOperationResult(false, "Patient not found.", null);
        }

        if (request.AppointmentId.HasValue)
        {
            var isOwnedAppointment = await AppointmentBelongsToDoctorAndPatientAsync(
                connection,
                request.AppointmentId.Value,
                doctorId,
                request.PatientId,
                cancellationToken);

            if (!isOwnedAppointment)
            {
                return new ConsultationNoteOperationResult(false, "Appointment not found for selected doctor and patient.", null);
            }
        }

        await using var update = connection.CreateCommand();
        update.CommandText = """
            UPDATE Consultation_Notes
            SET patient_id = @patientId,
                appointment_id = @appointmentId,
                consultation_date = @consultationDate,
                chief_complaint = @chiefComplaint,
                diagnosis = @diagnosis,
                treatment_plan = @treatmentPlan,
                notes = @notes,
                updated_at = CURRENT_TIMESTAMP
            WHERE note_id = @noteId
              AND doctor_id = @doctorId;
            """;

        update.Parameters.AddWithValue("@patientId", request.PatientId);
        update.Parameters.AddWithValue("@appointmentId", request.AppointmentId.HasValue ? request.AppointmentId.Value : DBNull.Value);
        update.Parameters.AddWithValue("@consultationDate", request.ConsultationDate.ToDateTime(TimeOnly.MinValue));
        update.Parameters.AddWithValue("@chiefComplaint", ConsultationNoteRules.NormalizeNullable(request.ChiefComplaint, 500) ?? (object)DBNull.Value);
        update.Parameters.AddWithValue("@diagnosis", ConsultationNoteRules.NormalizeNullable(request.Diagnosis, 1000) ?? (object)DBNull.Value);
        update.Parameters.AddWithValue("@treatmentPlan", ConsultationNoteRules.NormalizeNullable(request.TreatmentPlan, 1000) ?? (object)DBNull.Value);
        update.Parameters.AddWithValue("@notes", ConsultationNoteRules.NormalizeNullable(request.Notes, 2000) ?? (object)DBNull.Value);
        update.Parameters.AddWithValue("@noteId", noteId);
        update.Parameters.AddWithValue("@doctorId", doctorId);

        var rows = await update.ExecuteNonQueryAsync(cancellationToken);
        if (rows == 0)
        {
            return new ConsultationNoteOperationResult(false, "Consultation note not found.", null);
        }

        var updated = await GetByIdAsync(noteId, doctorId, cancellationToken);
        return new ConsultationNoteOperationResult(true, "Consultation note updated successfully.", updated);
    }

    public async Task<ConsultationNoteDeleteResult> DeleteAsync(int noteId, int doctorId, CancellationToken cancellationToken = default)
    {
        await using var connection = connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);

        await using var delete = connection.CreateCommand();
        delete.CommandText = """
            DELETE FROM Consultation_Notes
            WHERE note_id = @noteId
              AND doctor_id = @doctorId;
            """;

        delete.Parameters.AddWithValue("@noteId", noteId);
        delete.Parameters.AddWithValue("@doctorId", doctorId);

        var rows = await delete.ExecuteNonQueryAsync(cancellationToken);
        return rows == 0
            ? new ConsultationNoteDeleteResult(false, "Consultation note not found.", true)
            : new ConsultationNoteDeleteResult(true, "Consultation note deleted successfully.");
    }

    public async Task<ConsultationNoteResponse?> GetByIdAsync(int noteId, int doctorId, CancellationToken cancellationToken = default)
    {
        await using var connection = connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);

        await using var command = connection.CreateCommand();
        command.CommandText = BuildSelectQuery("cn.note_id = @noteId AND cn.doctor_id = @doctorId") + " LIMIT 1;";
        command.Parameters.AddWithValue("@noteId", noteId);
        command.Parameters.AddWithValue("@doctorId", doctorId);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
        {
            return null;
        }

        return Map(reader);
    }

    public async Task<IReadOnlyList<ConsultationNoteResponse>> GetByDoctorIdAsync(int doctorId, int? patientId, CancellationToken cancellationToken = default)
    {
        await using var connection = connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);

        await using var command = connection.CreateCommand();
        var condition = "cn.doctor_id = @doctorId";
        if (patientId.HasValue)
        {
            condition += " AND cn.patient_id = @patientId";
        }

        command.CommandText = BuildSelectQuery(condition) + ";";
        command.Parameters.AddWithValue("@doctorId", doctorId);
        if (patientId.HasValue)
        {
            command.Parameters.AddWithValue("@patientId", patientId.Value);
        }

        var items = new List<ConsultationNoteResponse>();
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            items.Add(Map(reader));
        }

        return items;
    }

    public async Task<IReadOnlyList<ConsultationNoteResponse>> GetByPatientIdAsync(int doctorId, int patientId, CancellationToken cancellationToken = default)
    {
        return await GetByDoctorIdAsync(doctorId, patientId, cancellationToken);
    }

    private static string BuildSelectQuery(string condition)
    {
        return $"""
            SELECT
                cn.note_id,
                cn.patient_id,
                CONCAT(COALESCE(p.first_name, ''), ' ', COALESCE(p.last_name, '')) AS patient_name,
                cn.doctor_id,
                CONCAT(COALESCE(d.first_name, ''), ' ', COALESCE(d.last_name, '')) AS doctor_name,
                cn.appointment_id,
                a.appointment_date,
                a.appointment_time,
                cn.consultation_date,
                cn.chief_complaint,
                cn.diagnosis,
                cn.treatment_plan,
                cn.notes,
                cn.created_at,
                cn.updated_at
            FROM Consultation_Notes cn
            JOIN Patients p ON p.patient_id = cn.patient_id
            JOIN Doctors d ON d.doctor_id = cn.doctor_id
            LEFT JOIN Appointments a ON a.appointment_id = cn.appointment_id
            WHERE {condition}
            ORDER BY cn.consultation_date DESC, cn.note_id DESC
            """;
    }

    private static ConsultationNoteResponse Map(DbDataReader reader)
    {
        var appointmentDateOrdinal = reader.GetOrdinal("appointment_date");
        var appointmentTimeOrdinal = reader.GetOrdinal("appointment_time");
        var chiefComplaintOrdinal = reader.GetOrdinal("chief_complaint");
        var diagnosisOrdinal = reader.GetOrdinal("diagnosis");
        var treatmentPlanOrdinal = reader.GetOrdinal("treatment_plan");
        var notesOrdinal = reader.GetOrdinal("notes");

        return new ConsultationNoteResponse(
            NoteId: reader.GetInt32(reader.GetOrdinal("note_id")),
            PatientId: reader.GetInt32(reader.GetOrdinal("patient_id")),
            PatientName: reader.GetString(reader.GetOrdinal("patient_name")).Trim(),
            DoctorId: reader.GetInt32(reader.GetOrdinal("doctor_id")),
            DoctorName: reader.GetString(reader.GetOrdinal("doctor_name")).Trim(),
            AppointmentId: reader.IsDBNull(reader.GetOrdinal("appointment_id")) ? null : reader.GetInt32(reader.GetOrdinal("appointment_id")),
            AppointmentDate: reader.IsDBNull(appointmentDateOrdinal) ? null : DateOnly.FromDateTime(reader.GetDateTime(appointmentDateOrdinal)),
            AppointmentTime: reader.IsDBNull(appointmentTimeOrdinal) ? null : TimeOnly.FromTimeSpan(reader.GetFieldValue<TimeSpan>(appointmentTimeOrdinal)),
            ConsultationDate: DateOnly.FromDateTime(reader.GetDateTime(reader.GetOrdinal("consultation_date"))),
            ChiefComplaint: reader.IsDBNull(chiefComplaintOrdinal) ? null : reader.GetString(chiefComplaintOrdinal),
            Diagnosis: reader.IsDBNull(diagnosisOrdinal) ? null : reader.GetString(diagnosisOrdinal),
            TreatmentPlan: reader.IsDBNull(treatmentPlanOrdinal) ? null : reader.GetString(treatmentPlanOrdinal),
            Notes: reader.IsDBNull(notesOrdinal) ? null : reader.GetString(notesOrdinal),
            CreatedAt: reader.GetDateTime(reader.GetOrdinal("created_at")),
            UpdatedAt: reader.GetDateTime(reader.GetOrdinal("updated_at"))
        );
    }

    private static async Task<bool> PatientExistsAsync(MySqlConnection connection, int patientId, CancellationToken cancellationToken)
    {
        await using var command = connection.CreateCommand();
        command.CommandText = "SELECT patient_id FROM Patients WHERE patient_id = @patientId LIMIT 1;";
        command.Parameters.AddWithValue("@patientId", patientId);
        var result = await command.ExecuteScalarAsync(cancellationToken);
        return result is not null;
    }

    private static async Task<bool> AppointmentBelongsToDoctorAndPatientAsync(
        MySqlConnection connection,
        int appointmentId,
        int doctorId,
        int patientId,
        CancellationToken cancellationToken)
    {
        await using var command = connection.CreateCommand();
        command.CommandText = """
            SELECT appointment_id
            FROM Appointments
            WHERE appointment_id = @appointmentId
              AND doctor_id = @doctorId
              AND patient_id = @patientId
            LIMIT 1;
            """;

        command.Parameters.AddWithValue("@appointmentId", appointmentId);
        command.Parameters.AddWithValue("@doctorId", doctorId);
        command.Parameters.AddWithValue("@patientId", patientId);

        var result = await command.ExecuteScalarAsync(cancellationToken);
        return result is not null;
    }

    private static async Task<bool> NoteExistsForDoctorAsync(MySqlConnection connection, int noteId, int doctorId, CancellationToken cancellationToken)
    {
        await using var command = connection.CreateCommand();
        command.CommandText = """
            SELECT note_id
            FROM Consultation_Notes
            WHERE note_id = @noteId
              AND doctor_id = @doctorId
            LIMIT 1;
            """;

        command.Parameters.AddWithValue("@noteId", noteId);
        command.Parameters.AddWithValue("@doctorId", doctorId);

        var result = await command.ExecuteScalarAsync(cancellationToken);
        return result is not null;
    }
}
