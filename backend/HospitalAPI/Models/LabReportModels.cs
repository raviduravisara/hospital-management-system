namespace HospitalAPI.Models;

public sealed record LabReportCreateRequest(
    string TestName,
    DateOnly TestDate,
    string? ResultSummary);

public sealed record PatientLabReportListResponse(
    int ReportId,
    string TestName,
    DateOnly TestDate,
    string? ResultSummary,
    bool HasFile,
    string? FileName,
    string? DoctorName,
    DateTime CreatedAt);

public sealed record PatientLabReportDetailResponse(
    int ReportId,
    int PatientId,
    int? DoctorId,
    string TestName,
    DateOnly TestDate,
    string? ResultSummary,
    bool HasFile,
    string? FileName,
    string? DoctorName,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public sealed record LabReportOperationResult(bool Success, string Message, PatientLabReportDetailResponse? Report);

public sealed record LabReportDeleteResult(bool Success, string Message, bool NotFound = false);
