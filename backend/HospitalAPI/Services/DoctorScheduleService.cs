using System.Data.Common;
using HospitalAPI.Data;
using HospitalAPI.Models;
using MySql.Data.MySqlClient;

namespace HospitalAPI.Services;

public sealed class DoctorScheduleService(MySqlConnectionFactory connectionFactory) : IDoctorScheduleService
{
    private static readonly HashSet<string> ValidDays =
    [
        "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"
    ];

    public async Task<IReadOnlyList<DoctorScheduleResponse>> GetByDoctorIdAsync(int doctorId, CancellationToken cancellationToken)
    {
        await using var connection = connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);

        await using var command = connection.CreateCommand();
        command.CommandText = """
            SELECT
                doctor_schedule_id,
                doctor_id,
                day_of_week,
                start_time,
                end_time,
                is_available,
                slot_duration_minutes,
                notes,
                created_at,
                updated_at
            FROM DoctorSchedule
            WHERE doctor_id = @doctorId
            ORDER BY FIELD(day_of_week, 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'), start_time;
            """;
        command.Parameters.AddWithValue("@doctorId", doctorId);

        var results = new List<DoctorScheduleResponse>();
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            results.Add(MapSchedule(reader));
        }

        return results;
    }

    public async Task<IReadOnlyList<DoctorScheduleResponse>> GetByUserIdAsync(int userId, CancellationToken cancellationToken)
    {
        var doctorId = await GetDoctorIdByUserIdAsync(userId, cancellationToken);
        if (doctorId is null)
        {
            return [];
        }

        return await GetByDoctorIdAsync(doctorId.Value, cancellationToken);
    }

    public async Task<DoctorScheduleOperationResult> ReplaceByDoctorIdAsync(
        int doctorId,
        IReadOnlyList<DoctorScheduleUpsertRequest> schedules,
        CancellationToken cancellationToken)
    {
        var validationError = ValidateSchedules(schedules);
        if (validationError is not null)
        {
            return new DoctorScheduleOperationResult(false, validationError, null);
        }

        await using var connection = connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);

        await using (var doctorCheck = connection.CreateCommand())
        {
            doctorCheck.CommandText = "SELECT doctor_id FROM Doctors WHERE doctor_id = @doctorId LIMIT 1;";
            doctorCheck.Parameters.AddWithValue("@doctorId", doctorId);
            var existingDoctor = await doctorCheck.ExecuteScalarAsync(cancellationToken);
            if (existingDoctor is null)
            {
                return new DoctorScheduleOperationResult(false, "Doctor profile not found.", null);
            }
        }

        await using var transaction = await connection.BeginTransactionAsync(cancellationToken);

        await using (var deleteCommand = connection.CreateCommand())
        {
            deleteCommand.Transaction = (MySqlTransaction)transaction;
            deleteCommand.CommandText = "DELETE FROM DoctorSchedule WHERE doctor_id = @doctorId;";
            deleteCommand.Parameters.AddWithValue("@doctorId", doctorId);
            await deleteCommand.ExecuteNonQueryAsync(cancellationToken);
        }

        foreach (var schedule in schedules)
        {
            if (!schedule.IsAvailable)
            {
                continue;
            }

            await using var insertCommand = connection.CreateCommand();
            insertCommand.Transaction = (MySqlTransaction)transaction;
            insertCommand.CommandText = """
                INSERT INTO DoctorSchedule (
                    doctor_id,
                    day_of_week,
                    start_time,
                    end_time,
                    is_available,
                    slot_duration_minutes,
                    notes)
                VALUES (
                    @doctorId,
                    @dayOfWeek,
                    @startTime,
                    @endTime,
                    @isAvailable,
                    @slotDurationMinutes,
                    @notes);
                """;
            insertCommand.Parameters.AddWithValue("@doctorId", doctorId);
            insertCommand.Parameters.AddWithValue("@dayOfWeek", NormalizeDay(schedule.DayOfWeek));
            insertCommand.Parameters.AddWithValue("@startTime", TimeSpan.Parse(schedule.StartTime!));
            insertCommand.Parameters.AddWithValue("@endTime", TimeSpan.Parse(schedule.EndTime!));
            insertCommand.Parameters.AddWithValue("@isAvailable", true);
            insertCommand.Parameters.AddWithValue("@slotDurationMinutes", schedule.SlotDurationMinutes);
            insertCommand.Parameters.AddWithValue("@notes", NormalizeNullable(schedule.Notes));
            await insertCommand.ExecuteNonQueryAsync(cancellationToken);
        }

        await transaction.CommitAsync(cancellationToken);

        var updated = await GetByDoctorIdAsync(doctorId, cancellationToken);
        return new DoctorScheduleOperationResult(true, "Doctor schedule updated successfully.", updated);
    }

    public async Task<DoctorScheduleOperationResult> ReplaceByUserIdAsync(
        int userId,
        IReadOnlyList<DoctorScheduleUpsertRequest> schedules,
        CancellationToken cancellationToken)
    {
        var doctorId = await GetDoctorIdByUserIdAsync(userId, cancellationToken);
        if (doctorId is null)
        {
            return new DoctorScheduleOperationResult(false, "Doctor profile not found.", null);
        }

        return await ReplaceByDoctorIdAsync(doctorId.Value, schedules, cancellationToken);
    }

    private async Task<int?> GetDoctorIdByUserIdAsync(int userId, CancellationToken cancellationToken)
    {
        await using var connection = connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);

        await using var command = connection.CreateCommand();
        command.CommandText = "SELECT doctor_id FROM Doctors WHERE user_id = @userId LIMIT 1;";
        command.Parameters.AddWithValue("@userId", userId);

        var doctorIdObj = await command.ExecuteScalarAsync(cancellationToken);
        if (doctorIdObj is null)
        {
            return null;
        }

        return Convert.ToInt32(doctorIdObj);
    }

    private static DoctorScheduleResponse MapSchedule(DbDataReader reader)
    {
        var startTimeOrdinal = reader.GetOrdinal("start_time");
        var endTimeOrdinal = reader.GetOrdinal("end_time");
        var notesOrdinal = reader.GetOrdinal("notes");

        return new DoctorScheduleResponse(
            DoctorScheduleId: reader.GetInt32(reader.GetOrdinal("doctor_schedule_id")),
            DoctorId: reader.GetInt32(reader.GetOrdinal("doctor_id")),
            DayOfWeek: reader.GetString(reader.GetOrdinal("day_of_week")),
            StartTime: reader.IsDBNull(startTimeOrdinal) ? null : reader.GetFieldValue<TimeSpan>(startTimeOrdinal),
            EndTime: reader.IsDBNull(endTimeOrdinal) ? null : reader.GetFieldValue<TimeSpan>(endTimeOrdinal),
            IsAvailable: reader.GetBoolean(reader.GetOrdinal("is_available")),
            SlotDurationMinutes: reader.GetInt32(reader.GetOrdinal("slot_duration_minutes")),
            Notes: reader.IsDBNull(notesOrdinal) ? null : reader.GetString(notesOrdinal),
            CreatedAt: reader.GetDateTime(reader.GetOrdinal("created_at")),
            UpdatedAt: reader.GetDateTime(reader.GetOrdinal("updated_at")));
    }

    private static string? ValidateSchedules(IReadOnlyList<DoctorScheduleUpsertRequest> schedules)
    {
        if (schedules.Count == 0)
        {
            return "At least one schedule entry is required.";
        }

        var duplicateGuard = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var item in schedules)
        {
            var day = NormalizeDay(item.DayOfWeek);
            if (day is null)
            {
                return "Invalid day of week provided in schedule.";
            }

            if (!duplicateGuard.Add(day))
            {
                return "Each day can only appear once in the schedule setup.";
            }

            if (item.SlotDurationMinutes < 5 || item.SlotDurationMinutes > 240)
            {
                return "Slot duration must be between 5 and 240 minutes.";
            }

            if (!item.IsAvailable)
            {
                continue;
            }

            if (!TimeSpan.TryParse(item.StartTime, out var startTime)
                || !TimeSpan.TryParse(item.EndTime, out var endTime))
            {
                return "Available days must include valid start and end times.";
            }

            if (endTime <= startTime)
            {
                return "End time must be later than start time for available days.";
            }
        }

        return null;
    }

    private static string? NormalizeDay(string? day)
    {
        if (string.IsNullOrWhiteSpace(day))
        {
            return null;
        }

        var normalized = day.Trim();
        if (!ValidDays.Contains(normalized))
        {
            normalized = char.ToUpperInvariant(normalized[0]) + normalized[1..].ToLowerInvariant();
        }

        return ValidDays.Contains(normalized) ? normalized : null;
    }

    private static string? NormalizeNullable(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        return value.Trim();
    }
}
