using System.Data.Common;
using HospitalAPI.Data;
using HospitalAPI.Models;

namespace HospitalAPI.Services;

public sealed class MedicineService(MySqlConnectionFactory connectionFactory) : IMedicineService
{
    public async Task<MedicineOperationResult> CreateAsync(MedicineUpsertRequest request, CancellationToken cancellationToken)
    {
        var validationError = ValidateUpsertRequest(request);
        if (validationError is not null)
        {
            return new MedicineOperationResult(false, validationError, null);
        }

        await using var connection = connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);

        await using var insertCommand = connection.CreateCommand();
        insertCommand.CommandText = """
            INSERT INTO Medicines (
                medicine_name,
                description,
                manufacturer,
                unit_price,
                stock_quantity)
            VALUES (
                @medicineName,
                @description,
                @manufacturer,
                @unitPrice,
                @stockQuantity);
            SELECT LAST_INSERT_ID();
            """;
        insertCommand.Parameters.AddWithValue("@medicineName", request.MedicineName.Trim());
        insertCommand.Parameters.AddWithValue("@description", NormalizeNullable(request.Description));
        insertCommand.Parameters.AddWithValue("@manufacturer", NormalizeNullable(request.Manufacturer));
        insertCommand.Parameters.AddWithValue("@unitPrice", request.UnitPrice);
        insertCommand.Parameters.AddWithValue("@stockQuantity", request.StockQuantity);

        var createdIdObj = await insertCommand.ExecuteScalarAsync(cancellationToken);
        var createdId = Convert.ToInt32(createdIdObj);
        var medicine = await GetByIdAsync(createdId, cancellationToken);

        return new MedicineOperationResult(true, "Medicine created successfully.", medicine);
    }

    public async Task<IReadOnlyList<MedicineResponse>> GetAllAsync(string? search, CancellationToken cancellationToken)
    {
        await using var connection = connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);

        var hasSearch = !string.IsNullOrWhiteSpace(search);

        await using var command = connection.CreateCommand();
        command.CommandText = hasSearch
            ? """
                SELECT medicine_id, medicine_name, description, manufacturer, unit_price, stock_quantity, created_at, updated_at
                FROM Medicines
                WHERE medicine_name LIKE @search
                   OR manufacturer LIKE @search
                ORDER BY medicine_name ASC;
                """
            : """
                SELECT medicine_id, medicine_name, description, manufacturer, unit_price, stock_quantity, created_at, updated_at
                FROM Medicines
                ORDER BY medicine_name ASC;
                """;

        if (hasSearch)
        {
            command.Parameters.AddWithValue("@search", $"%{search!.Trim()}%");
        }

        var medicines = new List<MedicineResponse>();
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            medicines.Add(MapMedicine(reader));
        }

        return medicines;
    }

    public async Task<MedicineResponse?> GetByIdAsync(int medicineId, CancellationToken cancellationToken)
    {
        await using var connection = connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);

        await using var command = connection.CreateCommand();
        command.CommandText = """
            SELECT medicine_id, medicine_name, description, manufacturer, unit_price, stock_quantity, created_at, updated_at
            FROM Medicines
            WHERE medicine_id = @medicineId;
            """;
        command.Parameters.AddWithValue("@medicineId", medicineId);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
        {
            return null;
        }

        return MapMedicine(reader);
    }

    public async Task<MedicineOperationResult> UpdateAsync(int medicineId, MedicineUpsertRequest request, CancellationToken cancellationToken)
    {
        var validationError = ValidateUpsertRequest(request);
        if (validationError is not null)
        {
            return new MedicineOperationResult(false, validationError, null);
        }

        await using var connection = connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);

        await using var updateCommand = connection.CreateCommand();
        updateCommand.CommandText = """
            UPDATE Medicines
            SET medicine_name = @medicineName,
                description = @description,
                manufacturer = @manufacturer,
                unit_price = @unitPrice,
                stock_quantity = @stockQuantity
            WHERE medicine_id = @medicineId;
            """;
        updateCommand.Parameters.AddWithValue("@medicineId", medicineId);
        updateCommand.Parameters.AddWithValue("@medicineName", request.MedicineName.Trim());
        updateCommand.Parameters.AddWithValue("@description", NormalizeNullable(request.Description));
        updateCommand.Parameters.AddWithValue("@manufacturer", NormalizeNullable(request.Manufacturer));
        updateCommand.Parameters.AddWithValue("@unitPrice", request.UnitPrice);
        updateCommand.Parameters.AddWithValue("@stockQuantity", request.StockQuantity);

        var affected = await updateCommand.ExecuteNonQueryAsync(cancellationToken);
        if (affected == 0)
        {
            return new MedicineOperationResult(false, "Medicine not found.", null);
        }

        var medicine = await GetByIdAsync(medicineId, cancellationToken);
        return new MedicineOperationResult(true, "Medicine updated successfully.", medicine);
    }

    public async Task<MedicineOperationResult> UpdateStockAsync(int medicineId, int stockQuantity, CancellationToken cancellationToken)
    {
        if (stockQuantity < 0)
        {
            return new MedicineOperationResult(false, "Stock quantity cannot be negative.", null);
        }

        await using var connection = connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);

        await using var updateCommand = connection.CreateCommand();
        updateCommand.CommandText = """
            UPDATE Medicines
            SET stock_quantity = @stockQuantity
            WHERE medicine_id = @medicineId;
            """;
        updateCommand.Parameters.AddWithValue("@medicineId", medicineId);
        updateCommand.Parameters.AddWithValue("@stockQuantity", stockQuantity);

        var affected = await updateCommand.ExecuteNonQueryAsync(cancellationToken);
        if (affected == 0)
        {
            return new MedicineOperationResult(false, "Medicine not found.", null);
        }

        var medicine = await GetByIdAsync(medicineId, cancellationToken);
        return new MedicineOperationResult(true, "Medicine stock updated successfully.", medicine);
    }

    public async Task<bool> DeleteAsync(int medicineId, CancellationToken cancellationToken)
    {
        await using var connection = connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);

        await using var command = connection.CreateCommand();
        command.CommandText = "DELETE FROM Medicines WHERE medicine_id = @medicineId;";
        command.Parameters.AddWithValue("@medicineId", medicineId);

        var affected = await command.ExecuteNonQueryAsync(cancellationToken);
        return affected > 0;
    }

    private static MedicineResponse MapMedicine(DbDataReader reader)
    {
        var descriptionOrdinal = reader.GetOrdinal("description");
        var manufacturerOrdinal = reader.GetOrdinal("manufacturer");

        return new MedicineResponse(
            MedicineId: reader.GetInt32(reader.GetOrdinal("medicine_id")),
            MedicineName: reader.GetString(reader.GetOrdinal("medicine_name")),
            Description: reader.IsDBNull(descriptionOrdinal) ? null : reader.GetString(descriptionOrdinal),
            Manufacturer: reader.IsDBNull(manufacturerOrdinal) ? null : reader.GetString(manufacturerOrdinal),
            UnitPrice: reader.GetDecimal(reader.GetOrdinal("unit_price")),
            StockQuantity: reader.GetInt32(reader.GetOrdinal("stock_quantity")),
            CreatedAt: reader.GetDateTime(reader.GetOrdinal("created_at")),
            UpdatedAt: reader.GetDateTime(reader.GetOrdinal("updated_at")));
    }

    private static string? ValidateUpsertRequest(MedicineUpsertRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.MedicineName))
        {
            return "Medicine name is required.";
        }

        if (request.UnitPrice < 0)
        {
            return "Unit price cannot be negative.";
        }

        if (request.StockQuantity < 0)
        {
            return "Stock quantity cannot be negative.";
        }

        return null;
    }

    private static string? NormalizeNullable(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        return value.Trim();
    }
}
