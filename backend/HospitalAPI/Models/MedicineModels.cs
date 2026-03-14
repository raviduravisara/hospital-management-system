namespace HospitalAPI.Models;

public sealed record MedicineUpsertRequest(
    string MedicineName,
    string? Description,
    string? Manufacturer,
    decimal UnitPrice,
    int StockQuantity);

public sealed record MedicineStockUpdateRequest(int StockQuantity);

public sealed record MedicineResponse(
    int MedicineId,
    string MedicineName,
    string? Description,
    string? Manufacturer,
    decimal UnitPrice,
    int StockQuantity,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public sealed record MedicineOperationResult(bool Success, string Message, MedicineResponse? Medicine);
