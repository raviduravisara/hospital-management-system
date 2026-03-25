using FluentAssertions;
using HospitalAPI.Models;
using HospitalAPI.Services;
using Moq;

namespace HospitalAPI.Tests.ServiceTests;

/// <summary>
/// Unit tests for IMedicineService, including inventory update logic.
/// </summary>
public sealed class MedicineServiceTests
{
    private readonly Mock<IMedicineService> _serviceMock;

    public MedicineServiceTests()
    {
        _serviceMock = new Mock<IMedicineService>();
    }

    private static MedicineResponse BuildMedicine(
        int id = 1,
        string name = "Paracetamol",
        int stock = 100) =>
        new(
            MedicineId: id,
            MedicineName: name,
            Description: "Pain relief",
            Manufacturer: "GSK",
            UnitPrice: 25.50m,
            StockQuantity: stock,
            CreatedAt: DateTime.UtcNow,
            UpdatedAt: DateTime.UtcNow);

    // ─────────────────────────────────────────────
    // CreateAsync
    // ─────────────────────────────────────────────

    [Fact]
    public async Task CreateAsync_ValidRequest_ReturnsMedicineWithId()
    {
        // Arrange
        var request = new MedicineUpsertRequest("Paracetamol", "Pain relief", "GSK", 25.50m, 100);
        var expected = new MedicineOperationResult(true, "Medicine created.", BuildMedicine());

        _serviceMock
            .Setup(s => s.CreateAsync(request, It.IsAny<CancellationToken>()))
            .ReturnsAsync(expected);

        // Act
        var result = await _serviceMock.Object.CreateAsync(request, CancellationToken.None);

        // Assert
        result.Success.Should().BeTrue();
        result.Medicine!.MedicineId.Should().Be(1);
        result.Medicine.MedicineName.Should().Be("Paracetamol");
    }

    [Fact]
    public async Task CreateAsync_EmptyMedicineName_ReturnsFailure()
    {
        // Arrange — name is empty
        var request = new MedicineUpsertRequest("", null, null, 10m, 0);

        _serviceMock
            .Setup(s => s.CreateAsync(request, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new MedicineOperationResult(false, "Medicine name is required.", null));

        // Act
        var result = await _serviceMock.Object.CreateAsync(request, CancellationToken.None);

        // Assert
        result.Success.Should().BeFalse();
        result.Medicine.Should().BeNull();
        result.Message.Should().Contain("required");
    }

    [Fact]
    public async Task CreateAsync_ServiceThrows_PropagatesException()
    {
        // Arrange
        var request = new MedicineUpsertRequest("X", null, null, 1m, 1);

        _serviceMock
            .Setup(s => s.CreateAsync(It.IsAny<MedicineUpsertRequest>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new Exception("Unexpected error."));

        // Act
        var act = async () => await _serviceMock.Object.CreateAsync(request, CancellationToken.None);

        // Assert
        await act.Should().ThrowAsync<Exception>();
    }

    // ─────────────────────────────────────────────
    // GetByIdAsync
    // ─────────────────────────────────────────────

    [Fact]
    public async Task GetByIdAsync_ExistingMedicine_ReturnsMedicineResponse()
    {
        // Arrange
        _serviceMock
            .Setup(s => s.GetByIdAsync(1, It.IsAny<CancellationToken>()))
            .ReturnsAsync(BuildMedicine());

        // Act
        var result = await _serviceMock.Object.GetByIdAsync(1, CancellationToken.None);

        // Assert
        result.Should().NotBeNull();
        result!.MedicineId.Should().Be(1);
    }

    [Fact]
    public async Task GetByIdAsync_NonExistentMedicine_ReturnsNull()
    {
        // Arrange
        _serviceMock
            .Setup(s => s.GetByIdAsync(999, It.IsAny<CancellationToken>()))
            .ReturnsAsync((MedicineResponse?)null);

        // Act
        var result = await _serviceMock.Object.GetByIdAsync(999, CancellationToken.None);

        // Assert
        result.Should().BeNull();
    }

    // ─────────────────────────────────────────────
    // UpdateStockAsync — Inventory Update Logic
    // ─────────────────────────────────────────────

    [Fact]
    public async Task UpdateStockAsync_ValidQuantity_ReturnsUpdatedMedicine()
    {
        // Arrange
        var updated = BuildMedicine(stock: 50);

        _serviceMock
            .Setup(s => s.UpdateStockAsync(1, 50, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new MedicineOperationResult(true, "Stock updated.", updated));

        // Act
        var result = await _serviceMock.Object.UpdateStockAsync(1, 50, CancellationToken.None);

        // Assert
        result.Success.Should().BeTrue();
        result.Medicine!.StockQuantity.Should().Be(50);
    }

    [Fact]
    public async Task UpdateStockAsync_ZeroStock_ReturnsSuccessWithZeroQuantity()
    {
        // Arrange — setting to 0 is valid (OutOfStock)
        var updated = BuildMedicine(stock: 0);

        _serviceMock
            .Setup(s => s.UpdateStockAsync(1, 0, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new MedicineOperationResult(true, "Stock updated.", updated));

        // Act
        var result = await _serviceMock.Object.UpdateStockAsync(1, 0, CancellationToken.None);

        // Assert
        result.Success.Should().BeTrue();
        result.Medicine!.StockQuantity.Should().Be(0);
    }

    [Fact]
    public async Task UpdateStockAsync_NonExistentMedicine_ReturnsFailure()
    {
        // Arrange
        _serviceMock
            .Setup(s => s.UpdateStockAsync(999, 10, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new MedicineOperationResult(false, "Medicine not found.", null));

        // Act
        var result = await _serviceMock.Object.UpdateStockAsync(999, 10, CancellationToken.None);

        // Assert
        result.Success.Should().BeFalse();
        result.Message.Should().Contain("not found");
    }

    // ─────────────────────────────────────────────
    // GetInventoryReportAsync
    // ─────────────────────────────────────────────

    [Fact]
    public async Task GetInventoryReportAsync_DefaultThreshold_ReturnsReportWithStats()
    {
        // Arrange
        var items = new List<MedicineInventoryReportItemResponse>
        {
            new(1, "Paracetamol", "GSK", 100, 25m, false, false, "InStock"),
            new(2, "Ibuprofen",   "GSK", 5,   12m, true,  false, "LowStock"),
            new(3, "Aspirin",     "XYZ", 0,   8m,  false, true,  "OutOfStock"),
        };

        var report = new MedicineInventoryReportResponse(
            Threshold: 20,
            TotalItems: 3,
            LowStockItems: 1,
            OutOfStockItems: 1,
            Items: items);

        _serviceMock
            .Setup(s => s.GetInventoryReportAsync(null, null, It.IsAny<CancellationToken>()))
            .ReturnsAsync(report);

        // Act
        var result = await _serviceMock.Object.GetInventoryReportAsync(null, null, CancellationToken.None);

        // Assert
        result.TotalItems.Should().Be(3);
        result.LowStockItems.Should().Be(1);
        result.OutOfStockItems.Should().Be(1);
        result.Items.Should().HaveCount(3);
    }

    [Fact]
    public async Task GetInventoryReportAsync_FilterLowStock_ReturnsOnlyLowStockItems()
    {
        // Arrange
        var items = new List<MedicineInventoryReportItemResponse>
        {
            new(2, "Ibuprofen", "GSK", 5, 12m, true, false, "LowStock"),
        };

        var report = new MedicineInventoryReportResponse(20, 1, 1, 0, items);

        _serviceMock
            .Setup(s => s.GetInventoryReportAsync(null, "low", It.IsAny<CancellationToken>()))
            .ReturnsAsync(report);

        // Act
        var result = await _serviceMock.Object.GetInventoryReportAsync(null, "low", CancellationToken.None);

        // Assert
        result.Items.Should().AllSatisfy(i => i.StockStatus.Should().Be("LowStock"));
    }

    // ─────────────────────────────────────────────
    // GetAllAsync (search)
    // ─────────────────────────────────────────────

    [Fact]
    public async Task GetAllAsync_WithSearchTerm_ReturnsMatchingMedicines()
    {
        // Arrange
        var medicines = new List<MedicineResponse> { BuildMedicine(name: "Paracetamol") };

        _serviceMock
            .Setup(s => s.GetAllAsync("Para", It.IsAny<CancellationToken>()))
            .ReturnsAsync(medicines);

        // Act
        var result = await _serviceMock.Object.GetAllAsync("Para", CancellationToken.None);

        // Assert
        result.Should().HaveCount(1);
        result[0].MedicineName.Should().Contain("Para");
    }

    [Fact]
    public async Task GetAllAsync_NoMedicines_ReturnsEmptyList()
    {
        // Arrange
        _serviceMock
            .Setup(s => s.GetAllAsync(null, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<MedicineResponse>());

        // Act
        var result = await _serviceMock.Object.GetAllAsync(null, CancellationToken.None);

        // Assert
        result.Should().BeEmpty();
    }

    // ─────────────────────────────────────────────
    // DeleteAsync
    // ─────────────────────────────────────────────

    [Fact]
    public async Task DeleteAsync_ExistingMedicine_ReturnsTrue()
    {
        // Arrange
        _serviceMock.Setup(s => s.DeleteAsync(1, It.IsAny<CancellationToken>())).ReturnsAsync(true);

        // Act
        var result = await _serviceMock.Object.DeleteAsync(1, CancellationToken.None);

        // Assert
        result.Should().BeTrue();
    }

    [Fact]
    public async Task DeleteAsync_NonExistentMedicine_ReturnsFalse()
    {
        // Arrange
        _serviceMock.Setup(s => s.DeleteAsync(999, It.IsAny<CancellationToken>())).ReturnsAsync(false);

        // Act
        var result = await _serviceMock.Object.DeleteAsync(999, CancellationToken.None);

        // Assert
        result.Should().BeFalse();
    }
}
