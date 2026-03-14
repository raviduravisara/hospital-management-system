namespace HospitalAPI.Models;

public sealed record PatientUpsertRequest(
    int? UserId,
    string FirstName,
    string LastName,
    DateOnly? DateOfBirth,
    string? Gender,
    string? Phone,
    string? Address,
    string? BloodGroup,
    string? EmergencyContact);

public sealed record PatientProfileResponse(
    int PatientId,
    int? UserId,
    string FirstName,
    string LastName,
    DateOnly? DateOfBirth,
    string? Gender,
    string? Phone,
    string? Address,
    string? BloodGroup,
    string? EmergencyContact,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public sealed record PatientDashboardSummaryResponse(
    int UpcomingAppointments,
    int ActivePrescriptions,
    int LabReports,
    decimal PendingPayments,
    bool ProfileCompleted);

public sealed record PatientOperationResult(bool Success, string Message, PatientProfileResponse? Patient);
