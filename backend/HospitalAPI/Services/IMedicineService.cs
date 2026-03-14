using HospitalAPI.Models;

namespace HospitalAPI.Services;

public interface IMedicineService
{
    Task<MedicineOperationResult> CreateAsync(MedicineUpsertRequest request, CancellationToken cancellationToken);

    Task<IReadOnlyList<MedicineResponse>> GetAllAsync(string? search, CancellationToken cancellationToken);

    Task<MedicineResponse?> GetByIdAsync(int medicineId, CancellationToken cancellationToken);

    Task<MedicineOperationResult> UpdateAsync(int medicineId, MedicineUpsertRequest request, CancellationToken cancellationToken);

    Task<MedicineOperationResult> UpdateStockAsync(int medicineId, int stockQuantity, CancellationToken cancellationToken);

    Task<MedicineInventoryReportResponse> GetInventoryReportAsync(int? lowStockThreshold, string? status, CancellationToken cancellationToken);

    Task<bool> DeleteAsync(int medicineId, CancellationToken cancellationToken);
}
