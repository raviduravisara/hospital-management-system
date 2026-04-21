using HospitalAPI.Models;

namespace HospitalAPI.Services;

public interface IPrescriptionService
{
    Task<PrescriptionOperationResult> CreateAsync(PrescriptionCreateRequest request, CancellationToken cancellationToken = default);
    Task<PrescriptionOperationResult> UpdateAsync(int prescriptionId, PrescriptionUpdateRequest request, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(int prescriptionId, CancellationToken cancellationToken = default);
    Task<PrescriptionResponse?> GetByIdAsync(int prescriptionId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<PrescriptionResponse>> GetByPatientIdAsync(int patientId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<PrescriptionResponse>> GetByDoctorIdAsync(int doctorId, CancellationToken cancellationToken = default);
}
