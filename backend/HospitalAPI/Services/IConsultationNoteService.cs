using HospitalAPI.Models;

namespace HospitalAPI.Services;

public interface IConsultationNoteService
{
    Task<ConsultationNoteOperationResult> CreateAsync(int doctorId, ConsultationNoteCreateRequest request, CancellationToken cancellationToken = default);

    Task<ConsultationNoteOperationResult> UpdateAsync(int noteId, int doctorId, ConsultationNoteUpdateRequest request, CancellationToken cancellationToken = default);

    Task<ConsultationNoteDeleteResult> DeleteAsync(int noteId, int doctorId, CancellationToken cancellationToken = default);

    Task<ConsultationNoteResponse?> GetByIdAsync(int noteId, int doctorId, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<ConsultationNoteResponse>> GetByDoctorIdAsync(int doctorId, int? patientId, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<ConsultationNoteResponse>> GetByPatientIdAsync(int doctorId, int patientId, CancellationToken cancellationToken = default);
}
