namespace HospitalAPI.Models;

public sealed record DoctorScheduleUpsertRequest(
    string DayOfWeek,
    string? StartTime,
    string? EndTime,
    bool IsAvailable,
    int SlotDurationMinutes,
    string? Notes);

public sealed record DoctorScheduleBulkUpsertRequest(IReadOnlyList<DoctorScheduleUpsertRequest> Schedules);

public sealed record DoctorScheduleResponse(
    int DoctorScheduleId,
    int DoctorId,
    string DayOfWeek,
    TimeSpan? StartTime,
    TimeSpan? EndTime,
    bool IsAvailable,
    int SlotDurationMinutes,
    string? Notes,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public sealed record DoctorScheduleOperationResult(
    bool Success,
    string Message,
    IReadOnlyList<DoctorScheduleResponse>? Schedules);
