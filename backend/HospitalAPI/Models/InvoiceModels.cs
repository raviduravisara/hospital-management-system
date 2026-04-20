namespace HospitalAPI.Models;

public sealed record InvoiceUpsertRequest(
    int PatientId,
    int? AppointmentId,
    DateOnly InvoiceDate,
    decimal TotalAmount,
    decimal PaidAmount);

public sealed record InvoiceResponse(
    int InvoiceId,
    int PatientId,
    string PatientFormattedId,
    int? AppointmentId,
    DateOnly InvoiceDate,
    decimal TotalAmount,
    decimal PaidAmount,
    string Status,
    int? CreatedByUserId,
    string? PatientName,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public sealed record InvoiceOperationResult(bool Success, string Message, InvoiceResponse? Invoice);
