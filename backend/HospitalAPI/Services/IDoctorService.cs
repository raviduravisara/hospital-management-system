using HospitalAPI.Models;

namespace HospitalAPI.Services;

public interface IDoctorService
{
    Task<DoctorOperationResult> CreateAsync(DoctorUpsertRequest request, int userId, CancellationToken cancellationToken);

    Task<DoctorProfileResponse?> GetByIdAsync(int doctorId, CancellationToken cancellationToken);

    Task<DoctorProfileResponse?> GetByUserIdAsync(int userId, CancellationToken cancellationToken);

    Task<IReadOnlyList<DoctorProfileResponse>> GetAllAsync(CancellationToken cancellationToken);

    Task<DoctorOperationResult> UpdateByIdAsync(int doctorId, DoctorUpsertRequest request, CancellationToken cancellationToken);

    Task<DoctorOperationResult> UpdateByUserIdAsync(int userId, DoctorUpsertRequest request, CancellationToken cancellationToken);

    Task<bool> DeleteAsync(int doctorId, CancellationToken cancellationToken);
}
