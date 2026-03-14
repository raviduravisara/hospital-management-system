using HospitalAPI.Models;

namespace HospitalAPI.Services;

public interface IInvoiceService
{
    Task<InvoiceOperationResult> CreateAsync(InvoiceUpsertRequest request, int createdByUserId, CancellationToken cancellationToken);

    Task<IReadOnlyList<InvoiceResponse>> GetAllAsync(string? status, CancellationToken cancellationToken);

    Task<InvoiceResponse?> GetByIdAsync(int invoiceId, CancellationToken cancellationToken);

    Task<InvoiceOperationResult> UpdateAsync(int invoiceId, InvoiceUpsertRequest request, int updatedByUserId, CancellationToken cancellationToken);

    Task<bool> DeleteAsync(int invoiceId, CancellationToken cancellationToken);
}
