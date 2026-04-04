namespace HospitalAPI.Models;

public sealed record AppointmentCreateRequest(
    int PatientId,
    int DoctorId,
    DateOnly AppointmentDate,
    TimeOnly AppointmentTime,
    string? Reason);

public sealed record AppointmentUpdateRequest(
    int DoctorId,
    DateOnly AppointmentDate,
    TimeOnly AppointmentTime,
    string? Reason);

public sealed record AppointmentStatusUpdateRequest(
    string Status);

public sealed record AppointmentResponse(
    int AppointmentId,
    int PatientId,
    int DoctorId,
    string PatientName,
    string DoctorName,
    DateOnly AppointmentDate,
    TimeOnly AppointmentTime,
    string Status,
    string? Reason,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public sealed record AppointmentOperationResult(
    bool Success,
    string Message,
    AppointmentResponse? Appointment);

public sealed record AppointmentListResponse(
    IReadOnlyList<AppointmentResponse> Appointments);

public sealed record AppointmentDeleteResult(
    bool Success,
    string Message,
    bool NotFound = false);

public sealed record DoctorSlotAvailabilityResponse(
    int DoctorId,
    DateOnly AppointmentDate,
    IReadOnlyList<TimeOnly> AvailableSlots);