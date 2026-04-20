namespace HospitalAPI.Models;

public sealed record LabReportCreateRequest(
    string TestName,
    DateOnly TestDate,
    string? ResultSummary);

public sealed record PatientLabReportListResponse(
    int ReportId,
    int PatientId,
    string PatientFormattedId,
    string TestName,
    DateOnly TestDate,
    string? ResultSummary,
    bool HasFile,
    string? FileName,
    string? FileUrl,
    string? DoctorName,
    string? DoctorFormattedId,
    DateTime CreatedAt);

public sealed record PatientLabReportDetailResponse(
    int ReportId,
    int PatientId,
    string PatientFormattedId,
    int? DoctorId,
    string TestName,
    DateOnly TestDate,
    string? ResultSummary,
    bool HasFile,
    string? FileName,
    string? FileUrl,
    string? DoctorName,
    string? DoctorFormattedId,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public sealed record LabReportOperationResult(bool Success, string Message, PatientLabReportDetailResponse? Report);

public sealed record LabReportDeleteResult(bool Success, string Message, bool NotFound = false);
