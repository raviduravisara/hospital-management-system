using HospitalAPI.Models;

namespace HospitalAPI.Services;

public interface IAppointmentService
{
    Task<AppointmentOperationResult> CreateAsync(AppointmentCreateRequest request, CancellationToken cancellationToken = default);
    Task<AppointmentOperationResult> UpdateAsync(int appointmentId, AppointmentUpdateRequest request, CancellationToken cancellationToken = default);
    Task<AppointmentDeleteResult> DeleteAsync(int appointmentId, CancellationToken cancellationToken = default);
    Task<AppointmentOperationResult> UpdateStatusAsync(int appointmentId, AppointmentStatusUpdateRequest request, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<AppointmentResponse>> GetByPatientIdAsync(int patientId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<AppointmentResponse>> GetByDoctorIdAsync(int doctorId, CancellationToken cancellationToken = default);
    Task<AppointmentResponse?> GetByIdAsync(int appointmentId, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<TimeOnly>> GetAvailableSlotsAsync(int doctorId, DateOnly appointmentDate, CancellationToken cancellationToken = default);
}