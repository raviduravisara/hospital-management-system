namespace HospitalAPI.Models;

public sealed record DoctorUpsertRequest(
    int? UserId,
    string FirstName,
    string LastName,
    string? Specialization,
    string LicenseNumber,
    string? Phone,
    decimal ConsultationFee);

public sealed record DoctorProfileResponse(
    int DoctorId,
    string FormattedId,
    int? UserId,
    string FirstName,
    string LastName,
    string? Specialization,
    string LicenseNumber,
    string? Phone,
    decimal ConsultationFee,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public sealed record DoctorOperationResult(bool Success, string Message, DoctorProfileResponse? Doctor);

public sealed record DoctorDeleteResult(bool Success, string Message, bool NotFound = false);
