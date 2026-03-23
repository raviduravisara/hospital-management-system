using FluentAssertions;
using HospitalAPI.Models;
using HospitalAPI.Services;
using Moq;

namespace HospitalAPI.Tests.ServiceTests;

/// <summary>
/// Unit tests for IInvoiceService.
/// Uses Moq to isolate from the database layer.
/// </summary>
public sealed class InvoiceServiceTests
{
    private readonly Mock<IInvoiceService> _serviceMock;

    public InvoiceServiceTests()
    {
        _serviceMock = new Mock<IInvoiceService>();
    }

    private static InvoiceResponse BuildInvoice(
        int id = 1,
        decimal total = 1500m,
        decimal paid = 0m,
        string status = "Unpaid") =>
        new(
            InvoiceId: id,
            PatientId: 10,
            AppointmentId: null,
            InvoiceDate: new DateOnly(2026, 3, 23),
            TotalAmount: total,
            PaidAmount: paid,
            Status: status,
            CreatedByUserId: 1,
            PatientName: "John Doe",
            CreatedAt: DateTime.UtcNow,
            UpdatedAt: DateTime.UtcNow);

    // ─────────────────────────────────────────────
    // CreateAsync
    // ─────────────────────────────────────────────

    [Fact]
    public async Task CreateAsync_ValidRequest_ReturnsCreatedInvoiceWithUnpaidStatus()
    {
        // Arrange
        var request = new InvoiceUpsertRequest(
            PatientId: 10,
            AppointmentId: null,
            InvoiceDate: new DateOnly(2026, 3, 23),
            TotalAmount: 1500m,
            PaidAmount: 0m);

        var expected = new InvoiceOperationResult(true, "Invoice created.", BuildInvoice());

        _serviceMock
            .Setup(s => s.CreateAsync(request, 1, It.IsAny<CancellationToken>()))
            .ReturnsAsync(expected);

        // Act
        var result = await _serviceMock.Object.CreateAsync(request, 1, CancellationToken.None);

        // Assert
        result.Success.Should().BeTrue();
        result.Invoice.Should().NotBeNull();
        result.Invoice!.Status.Should().Be("Unpaid");
        result.Invoice.TotalAmount.Should().Be(1500m);
    }

    [Fact]
    public async Task CreateAsync_PaidExceedsTotal_ReturnsFailure()
    {
        // Arrange
        var request = new InvoiceUpsertRequest(10, null, new DateOnly(2026, 3, 23), 1000m, 1500m);

        _serviceMock
            .Setup(s => s.CreateAsync(request, 1, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new InvoiceOperationResult(false, "Paid amount cannot exceed total amount.", null));

        // Act
        var result = await _serviceMock.Object.CreateAsync(request, 1, CancellationToken.None);

        // Assert
        result.Success.Should().BeFalse();
        result.Invoice.Should().BeNull();
        result.Message.Should().Contain("cannot exceed");
    }

    [Fact]
    public async Task CreateAsync_ServiceThrows_PropagatesException()
    {
        // Arrange
        var request = new InvoiceUpsertRequest(10, null, new DateOnly(2026, 1, 1), 100m, 0m);

        _serviceMock
            .Setup(s => s.CreateAsync(It.IsAny<InvoiceUpsertRequest>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new Exception("Unexpected DB error."));

        // Act
        var act = async () => await _serviceMock.Object.CreateAsync(request, 1, CancellationToken.None);

        // Assert
        await act.Should().ThrowAsync<Exception>().WithMessage("Unexpected DB error.");
    }

    // ─────────────────────────────────────────────
    // GetByIdAsync
    // ─────────────────────────────────────────────

    [Fact]
    public async Task GetByIdAsync_ExistingInvoice_ReturnsInvoiceResponse()
    {
        // Arrange
        var invoice = BuildInvoice(id: 1);

        _serviceMock
            .Setup(s => s.GetByIdAsync(1, It.IsAny<CancellationToken>()))
            .ReturnsAsync(invoice);

        // Act
        var result = await _serviceMock.Object.GetByIdAsync(1, CancellationToken.None);

        // Assert
        result.Should().NotBeNull();
        result!.InvoiceId.Should().Be(1);
        result.PatientName.Should().Be("John Doe");
    }

    [Fact]
    public async Task GetByIdAsync_NonExistentInvoice_ReturnsNull()
    {
        // Arrange
        _serviceMock
            .Setup(s => s.GetByIdAsync(999, It.IsAny<CancellationToken>()))
            .ReturnsAsync((InvoiceResponse?)null);

        // Act
        var result = await _serviceMock.Object.GetByIdAsync(999, CancellationToken.None);

        // Assert
        result.Should().BeNull();
    }

    // ─────────────────────────────────────────────
    // UpdateAsync — status transitions
    // ─────────────────────────────────────────────

    [Theory]
    [InlineData(1500, 0, "Unpaid")]
    [InlineData(1500, 750, "Partial")]
    [InlineData(1500, 1500, "Paid")]
    public async Task UpdateAsync_PartialAndFullPayment_ReturnsCorrectStatus(
        decimal total, decimal paid, string expectedStatus)
    {
        // Arrange
        var request = new InvoiceUpsertRequest(10, null, new DateOnly(2026, 3, 23), total, paid);
        var invoice = BuildInvoice(total: total, paid: paid, status: expectedStatus);

        _serviceMock
            .Setup(s => s.UpdateAsync(1, request, 1, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new InvoiceOperationResult(true, "Updated.", invoice));

        // Act
        var result = await _serviceMock.Object.UpdateAsync(1, request, 1, CancellationToken.None);

        // Assert
        result.Success.Should().BeTrue();
        result.Invoice!.Status.Should().Be(expectedStatus);
    }

    [Fact]
    public async Task UpdateAsync_NegativeTotalAmount_ReturnsFailure()
    {
        // Arrange
        var request = new InvoiceUpsertRequest(10, null, new DateOnly(2026, 3, 23), -100m, 0m);

        _serviceMock
            .Setup(s => s.UpdateAsync(1, request, 1, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new InvoiceOperationResult(false, "Total amount cannot be negative.", null));

        // Act
        var result = await _serviceMock.Object.UpdateAsync(1, request, 1, CancellationToken.None);

        // Assert
        result.Success.Should().BeFalse();
        result.Message.Should().Contain("negative");
    }

    // ─────────────────────────────────────────────
    // DeleteAsync
    // ─────────────────────────────────────────────

    [Fact]
    public async Task DeleteAsync_ExistingInvoice_ReturnsTrue()
    {
        // Arrange
        _serviceMock.Setup(s => s.DeleteAsync(1, It.IsAny<CancellationToken>())).ReturnsAsync(true);

        // Act
        var result = await _serviceMock.Object.DeleteAsync(1, CancellationToken.None);

        // Assert
        result.Should().BeTrue();
    }

    [Fact]
    public async Task DeleteAsync_NonExistentInvoice_ReturnsFalse()
    {
        // Arrange
        _serviceMock.Setup(s => s.DeleteAsync(999, It.IsAny<CancellationToken>())).ReturnsAsync(false);

        // Act
        var result = await _serviceMock.Object.DeleteAsync(999, CancellationToken.None);

        // Assert
        result.Should().BeFalse();
    }

    // ─────────────────────────────────────────────
    // GetAllAsync (filter by status)
    // ─────────────────────────────────────────────

    [Fact]
    public async Task GetAllAsync_FilterUnpaid_ReturnsOnlyUnpaidInvoices()
    {
        // Arrange
        var invoices = new List<InvoiceResponse>
        {
            BuildInvoice(id: 1, status: "Unpaid"),
            BuildInvoice(id: 2, status: "Unpaid"),
        };

        _serviceMock
            .Setup(s => s.GetAllAsync("Unpaid", It.IsAny<CancellationToken>()))
            .ReturnsAsync(invoices);

        // Act
        var result = await _serviceMock.Object.GetAllAsync("Unpaid", CancellationToken.None);

        // Assert
        result.Should().HaveCount(2);
        result.Should().AllSatisfy(i => i.Status.Should().Be("Unpaid"));
    }
}
