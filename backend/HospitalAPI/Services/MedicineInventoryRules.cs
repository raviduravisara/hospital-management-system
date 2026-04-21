namespace HospitalAPI.Services;

public static class MedicineInventoryRules
{
    public static bool IsLowStock(int stockQuantity, int threshold)
    {
        if (stockQuantity <= 0)
        {
            return false;
        }

        return stockQuantity <= threshold;
    }

    public static bool IsOutOfStock(int stockQuantity)
    {
        return stockQuantity <= 0;
    }

    public static string GetStockStatus(int stockQuantity, int threshold)
    {
        if (IsOutOfStock(stockQuantity))
        {
            return "OutOfStock";
        }

        return IsLowStock(stockQuantity, threshold) ? "LowStock" : "InStock";
    }

    public static int NormalizeThreshold(int? threshold)
    {
        var value = threshold ?? 20;
        if (value < 1)
        {
            return 1;
        }

        return value;
    }

    public static bool IsStatusMatch(string stockStatus, string? filter)
    {
        if (string.IsNullOrWhiteSpace(filter) || string.Equals(filter, "all", StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        if (string.Equals(filter, "low", StringComparison.OrdinalIgnoreCase))
        {
            return string.Equals(stockStatus, "LowStock", StringComparison.OrdinalIgnoreCase);
        }

        if (string.Equals(filter, "out", StringComparison.OrdinalIgnoreCase))
        {
            return string.Equals(stockStatus, "OutOfStock", StringComparison.OrdinalIgnoreCase);
        }

        if (string.Equals(filter, "in", StringComparison.OrdinalIgnoreCase))
        {
            return string.Equals(stockStatus, "InStock", StringComparison.OrdinalIgnoreCase);
        }

        return true;
    }
}
