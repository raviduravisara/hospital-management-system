using HospitalAPI.Models;

namespace HospitalAPI.Services;

public static class PaymentRules
{
    public static string? ValidateCreateRequest(PaymentCreateRequest request)
    {
        if (request.InvoiceId <= 0)
        {
            return "Invoice ID is required.";
        }

        if (request.Amount <= 0)
        {
            return "Payment amount must be greater than zero.";
        }

        if (request.PaymentDate == default)
        {
            return "Payment date is required.";
        }

        if (string.IsNullOrWhiteSpace(request.PaymentMethod))
        {
            return "Payment method is required.";
        }

        if (request.PaymentMethod.Trim().Length > 100)
        {
            return "Payment method cannot exceed 100 characters.";
        }

        if (!string.IsNullOrWhiteSpace(request.TransactionReference) && request.TransactionReference.Trim().Length > 120)
        {
            return "Transaction reference cannot exceed 120 characters.";
        }

        return null;
    }

    public static string? ValidateInvoiceApplication(decimal totalAmount, decimal paidAmount, decimal paymentAmount)
    {
        if (totalAmount < 0)
        {
            return "Invoice total amount cannot be negative.";
        }

        if (paidAmount < 0)
        {
            return "Invoice paid amount cannot be negative.";
        }

        if (paymentAmount <= 0)
        {
            return "Payment amount must be greater than zero.";
        }

        if (paidAmount + paymentAmount > totalAmount)
        {
            return "Payment amount cannot exceed the invoice total.";
        }

        return null;
    }
}
