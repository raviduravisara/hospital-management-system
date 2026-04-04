using HospitalAPI.Models;

namespace HospitalAPI.Services;

public interface ILabRequestService
{
    Task<LabRequestOperationResult> CreateAsync(int doctorId, LabRequestCreateRequest request, CancellationToken cancellationToken);

    Task<LabRequestResponse?> GetByIdAsync(int requestId, CancellationToken cancellationToken);

    Task<IReadOnlyList<LabRequestResponse>> GetByDoctorIdAsync(int doctorId, string? status, CancellationToken cancellationToken);

    Task<IReadOnlyList<LabRequestResponse>> GetAllAsync(string? status, CancellationToken cancellationToken);

    Task<LabRequestOperationResult> UpdateStatusAsync(int requestId, string status, CancellationToken cancellationToken);
}
