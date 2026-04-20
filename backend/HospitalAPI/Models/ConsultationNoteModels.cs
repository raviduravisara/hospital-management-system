namespace HospitalAPI.Models;

public sealed record ConsultationNoteCreateRequest(
    int PatientId,
    int? AppointmentId,
    DateOnly ConsultationDate,
    string? ChiefComplaint,
    string? Diagnosis,
    string? TreatmentPlan,
    string? Notes);

public sealed record ConsultationNoteUpdateRequest(
    int PatientId,
    int? AppointmentId,
    DateOnly ConsultationDate,
    string? ChiefComplaint,
    string? Diagnosis,
    string? TreatmentPlan,
    string? Notes);

public sealed record ConsultationNoteResponse(
    int NoteId,
    int PatientId,
    string PatientFormattedId,
    string PatientName,
    int DoctorId,
    string DoctorFormattedId,
    string DoctorName,
    int? AppointmentId,
    DateOnly? AppointmentDate,
    TimeOnly? AppointmentTime,
    DateOnly ConsultationDate,
    string? ChiefComplaint,
    string? Diagnosis,
    string? TreatmentPlan,
    string? Notes,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public sealed record ConsultationNoteOperationResult(
    bool Success,
    string Message,
    ConsultationNoteResponse? Note);

public sealed record ConsultationNoteDeleteResult(
    bool Success,
    string Message,
    bool NotFound = false);
