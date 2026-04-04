namespace HospitalAPI.Models;

public sealed record LabRequestCreateRequest(
    int PatientId,
    int? AppointmentId,
    string TestName,
    string Priority,
    string? Notes);

public sealed record LabRequestStatusUpdateRequest(string Status);

public sealed record LabRequestResponse(
    int RequestId,
    int PatientId,
    string PatientName,
    int DoctorId,
    string DoctorName,
    int? AppointmentId,
    string TestName,
    string Priority,
    string Status,
    string? Notes,
    DateTime RequestedAt,
    DateTime UpdatedAt);

public sealed record LabRequestOperationResult(bool Success, string Message, LabRequestResponse? Request);
