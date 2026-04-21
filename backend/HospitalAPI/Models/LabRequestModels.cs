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
    string PatientFormattedId,
    string PatientName,
    int DoctorId,
    string DoctorFormattedId,
    string DoctorName,
    int? AppointmentId,
    string TestName,
    string Priority,
    string Status,
    string? Notes,
    string? ReportFileUrl,
    string? ReportFileName,
    DateTime? ReportUploadedAt,
    DateTime RequestedAt,
    DateTime UpdatedAt)
{
    public bool HasReport => !string.IsNullOrWhiteSpace(ReportFileUrl);
}

public sealed record LabRequestOperationResult(bool Success, string Message, LabRequestResponse? Request);

public sealed record LabReportUrlRequest(string FileUrl, string FileName);
