namespace HospitalAPI.Services;

public static class InvoiceRules
{
    public static string CalculateStatus(decimal totalAmount, decimal paidAmount)
    {
        if (paidAmount <= 0)
        {
            return "Unpaid";
        }

        return paidAmount >= totalAmount ? "Paid" : "Partial";
    }

    public static string? ValidateAmounts(decimal totalAmount, decimal paidAmount)
    {
        if (totalAmount < 0)
        {
            return "Total amount cannot be negative.";
        }

        if (paidAmount < 0)
        {
            return "Paid amount cannot be negative.";
        }

        if (paidAmount > totalAmount)
        {
            return "Paid amount cannot exceed total amount.";
        }

        return null;
    }
}
