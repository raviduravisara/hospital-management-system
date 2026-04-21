using HospitalAPI.Models;

namespace HospitalAPI.Services;

public interface IDoctorScheduleService
{
    Task<IReadOnlyList<DoctorScheduleResponse>> GetByDoctorIdAsync(int doctorId, CancellationToken cancellationToken);

    Task<IReadOnlyList<DoctorScheduleResponse>> GetByUserIdAsync(int userId, CancellationToken cancellationToken);

    Task<DoctorScheduleOperationResult> ReplaceByDoctorIdAsync(
        int doctorId,
        IReadOnlyList<DoctorScheduleUpsertRequest> schedules,
        CancellationToken cancellationToken);

    Task<DoctorScheduleOperationResult> ReplaceByUserIdAsync(
        int userId,
        IReadOnlyList<DoctorScheduleUpsertRequest> schedules,
        CancellationToken cancellationToken);
}
