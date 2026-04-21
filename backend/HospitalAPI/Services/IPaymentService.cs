using HospitalAPI.Models;

namespace HospitalAPI.Services;

public interface IPaymentService
{
    Task<PaymentOperationResult> CreateAsync(PaymentCreateRequest request, int receivedByUserId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<PaymentResponse>> GetByInvoiceIdAsync(int invoiceId, CancellationToken cancellationToken = default);
    Task<PaymentResponse?> GetByIdAsync(int paymentId, CancellationToken cancellationToken = default);
}
