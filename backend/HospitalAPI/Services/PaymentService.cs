using System.Data.Common;
using HospitalAPI.Data;
using HospitalAPI.Models;
using MySql.Data.MySqlClient;

namespace HospitalAPI.Services;

public sealed class PaymentService(MySqlConnectionFactory connectionFactory) : IPaymentService
{
    private readonly MySqlConnectionFactory _connectionFactory = connectionFactory;

    public async Task<PaymentOperationResult> CreateAsync(PaymentCreateRequest request, int receivedByUserId, CancellationToken cancellationToken = default)
    {
        var validationError = PaymentRules.ValidateCreateRequest(request);
        if (validationError is not null)
        {
            return new PaymentOperationResult(false, validationError, null);
        }

        await using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await using var transaction = await connection.BeginTransactionAsync(cancellationToken);

        try
        {
            await using var invoiceCommand = connection.CreateCommand();
            invoiceCommand.Transaction = transaction;
            invoiceCommand.CommandText = """
                SELECT total_amount, paid_amount
                FROM Invoices
                WHERE invoice_id = @invoiceId
                LIMIT 1;
                """;
            invoiceCommand.Parameters.AddWithValue("@invoiceId", request.InvoiceId);

            await using var invoiceReader = await invoiceCommand.ExecuteReaderAsync(cancellationToken);
            if (!await invoiceReader.ReadAsync(cancellationToken))
            {
                await transaction.RollbackAsync(cancellationToken);
                return new PaymentOperationResult(false, "Invoice not found.", null);
            }

            var totalAmount = invoiceReader.GetDecimal(invoiceReader.GetOrdinal("total_amount"));
            var paidAmount = invoiceReader.GetDecimal(invoiceReader.GetOrdinal("paid_amount"));
            await invoiceReader.CloseAsync();

            var invoiceValidationError = PaymentRules.ValidateInvoiceApplication(totalAmount, paidAmount, request.Amount);
            if (invoiceValidationError is not null)
            {
                await transaction.RollbackAsync(cancellationToken);
                return new PaymentOperationResult(false, invoiceValidationError, null);
            }

            var newPaidAmount = paidAmount + request.Amount;
            var status = InvoiceRules.CalculateStatus(totalAmount, newPaidAmount);

            await using var insertCommand = connection.CreateCommand();
            insertCommand.Transaction = transaction;
            insertCommand.CommandText = """
                INSERT INTO Payments (
                    invoice_id,
                    payment_date,
                    amount,
                    payment_method,
                    transaction_reference,
                    received_by_user_id)
                VALUES (
                    @invoiceId,
                    @paymentDate,
                    @amount,
                    @paymentMethod,
                    @transactionReference,
                    @receivedByUserId);
                SELECT LAST_INSERT_ID();
                """;
            insertCommand.Parameters.AddWithValue("@invoiceId", request.InvoiceId);
            insertCommand.Parameters.AddWithValue("@paymentDate", request.PaymentDate.ToDateTime(TimeOnly.MinValue));
            insertCommand.Parameters.AddWithValue("@amount", request.Amount);
            insertCommand.Parameters.AddWithValue("@paymentMethod", request.PaymentMethod.Trim());
            insertCommand.Parameters.AddWithValue("@transactionReference", NormalizeNullable(request.TransactionReference));
            insertCommand.Parameters.AddWithValue("@receivedByUserId", receivedByUserId);

            var paymentIdObj = await insertCommand.ExecuteScalarAsync(cancellationToken);
            var paymentId = Convert.ToInt32(paymentIdObj);

            await using var updateInvoiceCommand = connection.CreateCommand();
            updateInvoiceCommand.Transaction = transaction;
            updateInvoiceCommand.CommandText = """
                UPDATE Invoices
                SET paid_amount = @paidAmount,
                    status = @status,
                    updated_at = CURRENT_TIMESTAMP
                WHERE invoice_id = @invoiceId;
                """;
            updateInvoiceCommand.Parameters.AddWithValue("@paidAmount", newPaidAmount);
            updateInvoiceCommand.Parameters.AddWithValue("@status", status);
            updateInvoiceCommand.Parameters.AddWithValue("@invoiceId", request.InvoiceId);

            await updateInvoiceCommand.ExecuteNonQueryAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);

            var payment = await GetByIdAsync(paymentId, cancellationToken);
            return new PaymentOperationResult(true, "Payment recorded successfully.", payment);
        }
        catch
        {
            await transaction.RollbackAsync(cancellationToken);
            throw;
        }
    }

    public async Task<IReadOnlyList<PaymentResponse>> GetByInvoiceIdAsync(int invoiceId, CancellationToken cancellationToken = default)
    {
        await using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);

        await using var command = connection.CreateCommand();
        command.CommandText = """
            SELECT
                payment_id,
                invoice_id,
                payment_date,
                amount,
                payment_method,
                transaction_reference,
                received_by_user_id,
                created_at
            FROM Payments
            WHERE invoice_id = @invoiceId
            ORDER BY payment_date DESC, payment_id DESC;
            """;
        command.Parameters.AddWithValue("@invoiceId", invoiceId);

        var payments = new List<PaymentResponse>();
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            payments.Add(MapPayment(reader));
        }

        return payments;
    }

    public async Task<PaymentResponse?> GetByIdAsync(int paymentId, CancellationToken cancellationToken = default)
    {
        await using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);

        await using var command = connection.CreateCommand();
        command.CommandText = """
            SELECT
                payment_id,
                invoice_id,
                payment_date,
                amount,
                payment_method,
                transaction_reference,
                received_by_user_id,
                created_at
            FROM Payments
            WHERE payment_id = @paymentId
            LIMIT 1;
            """;
        command.Parameters.AddWithValue("@paymentId", paymentId);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
        {
            return null;
        }

        return MapPayment(reader);
    }

    private static PaymentResponse MapPayment(DbDataReader reader)
    {
        var receivedByOrdinal = reader.GetOrdinal("received_by_user_id");

        return new PaymentResponse(
            PaymentId: reader.GetInt32(reader.GetOrdinal("payment_id")),
            InvoiceId: reader.GetInt32(reader.GetOrdinal("invoice_id")),
            PaymentDate: DateOnly.FromDateTime(reader.GetDateTime(reader.GetOrdinal("payment_date"))),
            Amount: reader.GetDecimal(reader.GetOrdinal("amount")),
            PaymentMethod: reader.GetString(reader.GetOrdinal("payment_method")),
            TransactionReference: reader.IsDBNull(reader.GetOrdinal("transaction_reference")) ? null : reader.GetString(reader.GetOrdinal("transaction_reference")),
            ReceivedByUserId: reader.IsDBNull(receivedByOrdinal) ? null : reader.GetInt32(receivedByOrdinal),
            CreatedAt: reader.GetDateTime(reader.GetOrdinal("created_at")));
    }

    private static string? NormalizeNullable(string? value)
        => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
