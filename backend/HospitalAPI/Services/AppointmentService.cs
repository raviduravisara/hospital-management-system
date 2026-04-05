using HospitalAPI.Data;
using HospitalAPI.Models;

namespace HospitalAPI.Services;

public sealed class AppointmentService(MySqlConnectionFactory connectionFactory) : IAppointmentService
{
    public async Task<AppointmentOperationResult> CreateAsync(AppointmentCreateRequest request, CancellationToken cancellationToken = default)
    {
        await using var connection = connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await using var transaction = await connection.BeginTransactionAsync(System.Data.IsolationLevel.Serializable, cancellationToken);

        await using (var check = connection.CreateCommand())
        {
            check.Transaction = (MySql.Data.MySqlClient.MySqlTransaction)transaction;
            check.CommandText = """
                SELECT COUNT(*)
                FROM Appointments
                WHERE doctor_id = @doctorId
                  AND appointment_date = @date
                  AND appointment_time = @time
            """;

            check.Parameters.AddWithValue("@doctorId", request.DoctorId);
            check.Parameters.AddWithValue("@date", request.AppointmentDate);
            check.Parameters.AddWithValue("@time", request.AppointmentTime);

            var count = Convert.ToInt32(await check.ExecuteScalarAsync(cancellationToken));
            if (count > 0)
            {
                return new(false, "Time slot already booked.", null);
            }
        }

        await using var cmd = connection.CreateCommand();
        cmd.Transaction = (MySql.Data.MySqlClient.MySqlTransaction)transaction;
cmd.CommandText = """
    INSERT INTO Appointments
    (patient_id, doctor_id, appointment_date, appointment_time, status, reason)
    VALUES (@patientId, @doctorId, @date, @time, 'Pending', @reason);

    SELECT LAST_INSERT_ID();
""";

cmd.Parameters.AddWithValue("@patientId", request.PatientId);
cmd.Parameters.AddWithValue("@doctorId", request.DoctorId);
cmd.Parameters.AddWithValue("@date", request.AppointmentDate);
cmd.Parameters.AddWithValue("@time", request.AppointmentTime);
cmd.Parameters.AddWithValue("@reason", request.Reason);

var id = Convert.ToInt32(await cmd.ExecuteScalarAsync(cancellationToken));
await transaction.CommitAsync(cancellationToken);
var appointment = await GetByIdAsync(id, cancellationToken);

return new(true, "Appointment created successfully.", appointment);
    }

    public async Task<AppointmentResponse?> GetByIdAsync(int appointmentId, CancellationToken cancellationToken = default)
    {
        await using var connection = connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);

        await using var cmd = connection.CreateCommand();
        cmd.CommandText = """
            SELECT a.*,
                   CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
                   CONCAT(d.first_name, ' ', d.last_name) AS doctor_name
            FROM Appointments a
            JOIN Patients p ON a.patient_id = p.patient_id
            JOIN Doctors d ON a.doctor_id = d.doctor_id
            WHERE a.appointment_id = @id
        """;

        cmd.Parameters.AddWithValue("@id", appointmentId);

        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);

        if (!await reader.ReadAsync(cancellationToken))
            return null;

        return Map(reader);
    }

    public async Task<IReadOnlyList<AppointmentResponse>> GetByPatientIdAsync(int patientId, CancellationToken cancellationToken = default)
    {
        return await GetListAsync("a.patient_id = @id", patientId, cancellationToken);
    }

    public async Task<IReadOnlyList<AppointmentResponse>> GetByDoctorIdAsync(int doctorId, CancellationToken cancellationToken = default)
    {
        return await GetListAsync("a.doctor_id = @id", doctorId, cancellationToken);
    }

    private async Task<IReadOnlyList<AppointmentResponse>> GetListAsync(string condition, int id, CancellationToken cancellationToken)
    {
        var list = new List<AppointmentResponse>();

        await using var connection = connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);

        await using var cmd = connection.CreateCommand();
        cmd.CommandText = $"""
            SELECT a.*,
                   CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
                   CONCAT(d.first_name, ' ', d.last_name) AS doctor_name
            FROM Appointments a
            JOIN Patients p ON a.patient_id = p.patient_id
            JOIN Doctors d ON a.doctor_id = d.doctor_id
            WHERE {condition}
            ORDER BY a.appointment_date DESC, a.appointment_time DESC
        """;

        cmd.Parameters.AddWithValue("@id", id);

        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);

        while (await reader.ReadAsync(cancellationToken))
        {
            list.Add(Map(reader));
        }

        return list;
    }

    public async Task<AppointmentOperationResult> UpdateAsync(int appointmentId, AppointmentUpdateRequest request, CancellationToken cancellationToken = default)
    {
        await using var connection = connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await using var transaction = await connection.BeginTransactionAsync(System.Data.IsolationLevel.Serializable, cancellationToken);

        await using (var check = connection.CreateCommand())
        {
            check.Transaction = (MySql.Data.MySqlClient.MySqlTransaction)transaction;
            check.CommandText = """
                SELECT COUNT(*)
                FROM Appointments
                WHERE doctor_id = @doctorId
                  AND appointment_date = @date
                  AND appointment_time = @time
                  AND appointment_id <> @id
            """;

            check.Parameters.AddWithValue("@doctorId", request.DoctorId);
            check.Parameters.AddWithValue("@date", request.AppointmentDate);
            check.Parameters.AddWithValue("@time", request.AppointmentTime);
            check.Parameters.AddWithValue("@id", appointmentId);

            var count = Convert.ToInt32(await check.ExecuteScalarAsync(cancellationToken));
            if (count > 0)
            {
                return new(false, "Time slot already booked.", null);
            }
        }

        await using var cmd = connection.CreateCommand();
        cmd.Transaction = (MySql.Data.MySqlClient.MySqlTransaction)transaction;
        cmd.CommandText = """
            UPDATE Appointments
            SET doctor_id = @doctorId,
                appointment_date = @date,
                appointment_time = @time,
                reason = @reason,
                updated_at = CURRENT_TIMESTAMP
            WHERE appointment_id = @id
        """;

        cmd.Parameters.AddWithValue("@doctorId", request.DoctorId);
        cmd.Parameters.AddWithValue("@date", request.AppointmentDate);
        cmd.Parameters.AddWithValue("@time", request.AppointmentTime);
        cmd.Parameters.AddWithValue("@reason", request.Reason);
        cmd.Parameters.AddWithValue("@id", appointmentId);

        var rows = await cmd.ExecuteNonQueryAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        if (rows == 0)
            return new(false, "Appointment not found.", null);

        var updated = await GetByIdAsync(appointmentId, cancellationToken);
        return new(true, "Updated successfully.", updated);
    }

    public async Task<AppointmentDeleteResult> DeleteAsync(int appointmentId, CancellationToken cancellationToken = default)
    {
        await using var connection = connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);

        await using var cmd = connection.CreateCommand();
        cmd.CommandText = "DELETE FROM Appointments WHERE appointment_id = @id";
        cmd.Parameters.AddWithValue("@id", appointmentId);

        var rows = await cmd.ExecuteNonQueryAsync(cancellationToken);

        return rows == 0
            ? new(false, "Appointment not found.", true)
            : new(true, "Appointment deleted successfully.");
    }

    public async Task<AppointmentOperationResult> UpdateStatusAsync(int appointmentId, AppointmentStatusUpdateRequest request, CancellationToken cancellationToken = default)
    {
        var current = await GetByIdAsync(appointmentId, cancellationToken);
        if (current == null) return new(false, "Appointment not found.", null);

        // Prevent ghost updates (State Machine Enforcement)
        var validTransitions = new Dictionary<string, string[]>
        {
            ["Pending"] = ["Confirmed", "Cancelled"],
            ["Confirmed"] = ["Completed", "Cancelled"],
            ["Completed"] = [], // Terminal state, cannot be changed
            ["Cancelled"] = []  // Terminal state, cannot be changed
        };

        if (validTransitions.TryGetValue(current.Status, out var allowed) && !allowed.Contains(request.Status))
        {
            return new(false, $"Cannot transition appointment status from '{current.Status}' to '{request.Status}'.", null);
        }

        await using var connection = connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);

        await using var cmd = connection.CreateCommand();
        cmd.CommandText = """
            UPDATE Appointments
            SET status = @status,
                updated_at = CURRENT_TIMESTAMP
            WHERE appointment_id = @id
        """;

        cmd.Parameters.AddWithValue("@status", request.Status);
        cmd.Parameters.AddWithValue("@id", appointmentId);

        var rows = await cmd.ExecuteNonQueryAsync(cancellationToken);

        if (rows == 0)
            return new(false, "Appointment not found.", null);

        var updated = await GetByIdAsync(appointmentId, cancellationToken);
        return new(true, "Appointment status updated successfully.", updated);
    }

    public async Task<IReadOnlyList<TimeOnly>> GetAvailableSlotsAsync(int doctorId, DateOnly appointmentDate, CancellationToken cancellationToken = default)
    {
        var booked = new HashSet<TimeOnly>();

        await using var connection = connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);

        await using var cmd = connection.CreateCommand();
        cmd.CommandText = """
            SELECT appointment_time
            FROM Appointments
            WHERE doctor_id = @doctorId
              AND appointment_date = @date
        """;

        cmd.Parameters.AddWithValue("@doctorId", doctorId);
        cmd.Parameters.AddWithValue("@date", appointmentDate);

        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);

        var appointmentTimeOrdinal = reader.GetOrdinal("appointment_time");

        while (await reader.ReadAsync(cancellationToken))
        {
            var timeSpan = reader.GetFieldValue<TimeSpan>(appointmentTimeOrdinal);
            booked.Add(TimeOnly.FromTimeSpan(timeSpan));
        }

        var allSlots = Enumerable.Range(9, 8)
            .Select(hour => new TimeOnly(hour, 0))
            .ToList();

        return allSlots.Where(slot => !booked.Contains(slot)).ToList();
    }

    private static AppointmentResponse Map(System.Data.Common.DbDataReader reader)
    {
        var appointmentIdOrdinal = reader.GetOrdinal("appointment_id");
        var patientIdOrdinal = reader.GetOrdinal("patient_id");
        var doctorIdOrdinal = reader.GetOrdinal("doctor_id");
        var patientNameOrdinal = reader.GetOrdinal("patient_name");
        var doctorNameOrdinal = reader.GetOrdinal("doctor_name");
        var appointmentDateOrdinal = reader.GetOrdinal("appointment_date");
        var appointmentTimeOrdinal = reader.GetOrdinal("appointment_time");
        var statusOrdinal = reader.GetOrdinal("status");
        var reasonOrdinal = reader.GetOrdinal("reason");
        var createdAtOrdinal = reader.GetOrdinal("created_at");
        var updatedAtOrdinal = reader.GetOrdinal("updated_at");

        return new AppointmentResponse(
            reader.GetInt32(appointmentIdOrdinal),
            reader.GetInt32(patientIdOrdinal),
            reader.GetInt32(doctorIdOrdinal),
            reader.GetString(patientNameOrdinal),
            reader.GetString(doctorNameOrdinal),
            DateOnly.FromDateTime(reader.GetDateTime(appointmentDateOrdinal)),
            TimeOnly.FromTimeSpan(reader.GetFieldValue<TimeSpan>(appointmentTimeOrdinal)),
            reader.GetString(statusOrdinal),
            reader.IsDBNull(reasonOrdinal) ? null : reader.GetString(reasonOrdinal),
            reader.GetDateTime(createdAtOrdinal),
            reader.GetDateTime(updatedAtOrdinal)
        );
    }
}