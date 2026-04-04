namespace HospitalAPI.Models;

public sealed record PaymentCreateRequest(
    int InvoiceId,
    DateOnly PaymentDate,
    decimal Amount,
    string PaymentMethod,
    string? TransactionReference);

public sealed record PaymentResponse(
    int PaymentId,
    int InvoiceId,
    DateOnly PaymentDate,
    decimal Amount,
    string PaymentMethod,
    string? TransactionReference,
    int? ReceivedByUserId,
    DateTime CreatedAt);

public sealed record PaymentOperationResult(bool Success, string Message, PaymentResponse? Payment);
