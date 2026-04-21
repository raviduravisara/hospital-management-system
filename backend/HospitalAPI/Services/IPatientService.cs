using HospitalAPI.Models;

namespace HospitalAPI.Services;

public interface IPatientService
{
    Task<PatientOperationResult> CreateAsync(PatientUpsertRequest request, int userId, CancellationToken cancellationToken);

    Task<PatientProfileResponse?> GetByIdAsync(int patientId, CancellationToken cancellationToken);

    Task<PatientProfileResponse?> GetByUserIdAsync(int userId, CancellationToken cancellationToken);

    Task<PatientOperationResult> UpdateByIdAsync(int patientId, PatientUpsertRequest request, CancellationToken cancellationToken);

    Task<PatientOperationResult> UpdateByUserIdAsync(int userId, PatientUpsertRequest request, CancellationToken cancellationToken);

    Task<bool> DeleteAsync(int patientId, CancellationToken cancellationToken);

    Task<PatientDashboardSummaryResponse?> GetDashboardSummaryByUserIdAsync(int userId, CancellationToken cancellationToken);

    Task<PatientDashboardDetailsResponse?> GetDashboardDetailsByUserIdAsync(int userId, CancellationToken cancellationToken);

    Task<int> GetTotalCountAsync(CancellationToken cancellationToken);
}
