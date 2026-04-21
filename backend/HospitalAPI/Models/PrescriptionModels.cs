namespace HospitalAPI.Models;

public sealed record PrescriptionItemCreateRequest(
    int MedicineId,
    string? Dosage,
    string? Frequency,
    string? Duration,
    int Quantity);

public sealed record PrescriptionCreateRequest(
    int PatientId,
    int DoctorId,
    int? AppointmentId,
    DateOnly PrescriptionDate,
    string? Diagnosis,
    string? Notes,
    IReadOnlyList<PrescriptionItemCreateRequest> Items);

public sealed record PrescriptionUpdateRequest(
    int PatientId,
    int DoctorId,
    int? AppointmentId,
    DateOnly PrescriptionDate,
    string? Diagnosis,
    string? Notes,
    IReadOnlyList<PrescriptionItemCreateRequest> Items);

public sealed record PrescriptionItemResponse(
    int PrescriptionItemId,
    int MedicineId,
    string MedicineName,
    string? Dosage,
    string? Frequency,
    string? Duration,
    int Quantity);

public sealed record PrescriptionResponse(
    int PrescriptionId,
    int? AppointmentId,
    int PatientId,
    string PatientFormattedId,
    int DoctorId,
    string DoctorFormattedId,
    DateOnly PrescriptionDate,
    string? Diagnosis,
    string? Notes,
    string PatientName,
    string DoctorName,
    IReadOnlyList<PrescriptionItemResponse> Items,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public sealed record PrescriptionOperationResult(bool Success, string Message, PrescriptionResponse? Prescription);
