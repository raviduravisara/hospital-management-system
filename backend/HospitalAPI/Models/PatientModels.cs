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

public sealed record PatientAppointmentOverview(
    int AppointmentId,
    DateOnly AppointmentDate,
    TimeOnly AppointmentTime,
    string Status,
    string? Reason,
    string? DoctorName);

public sealed record PatientPrescriptionOverview(
    int PrescriptionId,
    DateOnly PrescriptionDate,
    string? Diagnosis,
    string? DoctorName);

public sealed record PatientLabReportOverview(
    int ReportId,
    string TestName,
    DateOnly TestDate,
    string? ResultSummary,
    string? DoctorName);

public sealed record PatientInvoiceOverview(
    int InvoiceId,
    DateOnly InvoiceDate,
    decimal TotalAmount,
    decimal PaidAmount,
    string Status);

public sealed record PatientDashboardDetailsResponse(
    IReadOnlyList<PatientAppointmentOverview> UpcomingAppointments,
    IReadOnlyList<PatientPrescriptionOverview> RecentPrescriptions,
    IReadOnlyList<PatientLabReportOverview> RecentLabReports,
    IReadOnlyList<PatientInvoiceOverview> PendingInvoices);

public sealed record PatientOperationResult(bool Success, string Message, PatientProfileResponse? Patient);
