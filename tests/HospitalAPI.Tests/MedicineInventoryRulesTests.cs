using HospitalAPI.Services;

namespace HospitalAPI.Tests;

public sealed class MedicineInventoryRulesTests
{
    [Fact]
    public void IsLowStock_ReturnsTrue_WhenStockIsWithinThresholdAndPositive()
    {
        MedicineInventoryRules.IsLowStock(10, 20).Should().BeTrue();
        MedicineInventoryRules.IsLowStock(20, 20).Should().BeTrue();
    }

    [Fact]
    public void IsLowStock_ReturnsFalse_ForZeroOrNegativeStock()
    {
        MedicineInventoryRules.IsLowStock(0, 20).Should().BeFalse();
        MedicineInventoryRules.IsLowStock(-1, 20).Should().BeFalse();
    }

    [Fact]
    public void GetStockStatus_ReturnsExpectedValues()
    {
        MedicineInventoryRules.GetStockStatus(0, 20).Should().Be("OutOfStock");
        MedicineInventoryRules.GetStockStatus(12, 20).Should().Be("LowStock");
        MedicineInventoryRules.GetStockStatus(35, 20).Should().Be("InStock");
    }

    [Fact]
    public void NormalizeThreshold_UsesDefaultAndMinimumRules()
    {
        MedicineInventoryRules.NormalizeThreshold(null).Should().Be(20);
        MedicineInventoryRules.NormalizeThreshold(0).Should().Be(1);
        MedicineInventoryRules.NormalizeThreshold(8).Should().Be(8);
    }

    [Fact]
    public void IsStatusMatch_HandlesKnownFilters()
    {
        MedicineInventoryRules.IsStatusMatch("LowStock", "low").Should().BeTrue();
        MedicineInventoryRules.IsStatusMatch("OutOfStock", "out").Should().BeTrue();
        MedicineInventoryRules.IsStatusMatch("InStock", "in").Should().BeTrue();
        MedicineInventoryRules.IsStatusMatch("InStock", "all").Should().BeTrue();
        MedicineInventoryRules.IsStatusMatch("InStock", null).Should().BeTrue();
    }
}
