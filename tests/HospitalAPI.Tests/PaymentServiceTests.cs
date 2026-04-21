using HospitalAPI.Models;
using HospitalAPI.Services;

namespace HospitalAPI.Tests;

public sealed class PaymentServiceTests
{
    [Fact]
    public void ValidateCreateRequest_RequiresInvoiceId()
    {
        var request = new PaymentCreateRequest(
            InvoiceId: 0,
            PaymentDate: new DateOnly(2026, 4, 3),
            Amount: 1000,
            PaymentMethod: "Card",
            TransactionReference: null);

        var message = PaymentRules.ValidateCreateRequest(request);

        message.Should().Be("Invoice ID is required.");
    }

    [Fact]
    public void ValidateCreateRequest_RequiresPositiveAmount()
    {
        var request = new PaymentCreateRequest(
            InvoiceId: 10,
            PaymentDate: new DateOnly(2026, 4, 3),
            Amount: 0,
            PaymentMethod: "Card",
            TransactionReference: null);

        var message = PaymentRules.ValidateCreateRequest(request);

        message.Should().Be("Payment amount must be greater than zero.");
    }

    [Fact]
    public void ValidateCreateRequest_RequiresPaymentMethod()
    {
        var request = new PaymentCreateRequest(
            InvoiceId: 10,
            PaymentDate: new DateOnly(2026, 4, 3),
            Amount: 500,
            PaymentMethod: "  ",
            TransactionReference: null);

        var message = PaymentRules.ValidateCreateRequest(request);

        message.Should().Be("Payment method is required.");
    }

    [Fact]
    public void ValidateInvoiceApplication_RejectsOverpayment()
    {
        var message = PaymentRules.ValidateInvoiceApplication(totalAmount: 5000, paidAmount: 4500, paymentAmount: 1000);

        message.Should().Be("Payment amount cannot exceed the invoice total.");
    }

    [Fact]
    public void ValidateInvoiceApplication_ReturnsNullForValidAmounts()
    {
        var message = PaymentRules.ValidateInvoiceApplication(totalAmount: 5000, paidAmount: 4500, paymentAmount: 500);

        message.Should().BeNull();
    }
}
