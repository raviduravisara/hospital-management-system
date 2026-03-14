using HospitalAPI.Services;

namespace HospitalAPI.Tests;

public sealed class InvoiceServiceTests
{
    [Theory]
    [InlineData(100, 0, "Unpaid")]
    [InlineData(100, 40, "Partial")]
    [InlineData(100, 100, "Paid")]
    public void CalculateStatus_ReturnsExpectedValue(decimal total, decimal paid, string expected)
    {
        var status = InvoiceRules.CalculateStatus(total, paid);
        status.Should().Be(expected);
    }

    [Fact]
    public void ValidateAmounts_ReturnsErrorForNegativeTotal()
    {
        var message = InvoiceRules.ValidateAmounts(-1, 0);
        message.Should().Be("Total amount cannot be negative.");
    }

    [Fact]
    public void ValidateAmounts_ReturnsErrorForNegativePaid()
    {
        var message = InvoiceRules.ValidateAmounts(100, -1);
        message.Should().Be("Paid amount cannot be negative.");
    }

    [Fact]
    public void ValidateAmounts_ReturnsErrorWhenPaidExceedsTotal()
    {
        var message = InvoiceRules.ValidateAmounts(100, 120);
        message.Should().Be("Paid amount cannot exceed total amount.");
    }

    [Fact]
    public void ValidateAmounts_ReturnsNullForValidAmounts()
    {
        var message = InvoiceRules.ValidateAmounts(100, 90);
        message.Should().BeNull();
    }
}
