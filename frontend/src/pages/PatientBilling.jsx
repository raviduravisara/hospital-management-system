import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import axiosInstance from '../api/axios';
import { extractRoleFromToken } from '../utils/auth';

export default function PatientBilling() {
  const token = localStorage.getItem('token');
  const role = extractRoleFromToken(token);

  const [details, setDetails] = useState(null);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [payments, setPayments] = useState([]);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('Cash');
  const [date, setDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const fetchDetails = async () => {
      if (!token || role !== 'patient') {
        setLoading(false);
        return;
      }

      setError('');
      setLoading(true);

      try {
        const res = await axiosInstance.get('/api/patients/me/details');
        setDetails(res.data);
      } catch (err) {
        setError(err.response?.data?.message ?? 'Unable to load billing details.');
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [token, role]);

  useEffect(() => {
    const fetchPayments = async () => {
      if (!selectedInvoiceId) {
        setPayments([]);
        return;
      }

      try {
        const paymentRes = await axiosInstance.get(`/api/invoices/${selectedInvoiceId}/payments`);
        setPayments(paymentRes.data || []);
      } catch (err) {
        setPayments([]);
      }
    };

    fetchPayments();
  }, [selectedInvoiceId]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    const invoiceId = Number(selectedInvoiceId);
    const paymentAmount = Number(amount);

    if (!invoiceId || paymentAmount <= 0) {
      setError('Please select an invoice and enter a valid payment amount.');
      return;
    }

    if (!date) {
      setError('Please select a payment date.');
      return;
    }

    setSaving(true);

    try {
      await axiosInstance.post('/api/payments', {
        invoiceId,
        amount: paymentAmount,
        paymentDate: date,
        paymentMethod: method,
      });

      setSuccess('Payment recorded successfully.');
      setAmount('');
      setMethod('Cash');
      setDate('');
      setPayments([]);
      setSelectedInvoiceId('');
      const res = await axiosInstance.get('/api/patients/me/details');
      setDetails(res.data);
    } catch (err) {
      setError(err.response?.data?.message ?? 'Unable to record payment.');
    } finally {
      setSaving(false);
    }
  };

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (role !== 'patient') {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Billing & Payments</h1>
            <p className="text-sm text-gray-500 mt-1">
              View outstanding invoices and record your payments securely.
            </p>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {success}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[0.95fr_0.85fr]">
          <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Pending Invoices</h2>
            {loading ? (
              <p className="text-sm text-gray-500">Loading invoices...</p>
            ) : details?.pendingInvoices?.length ? (
              <div className="space-y-4">
                {details.pendingInvoices.map((invoice) => (
                  <button
                    key={invoice.invoiceId}
                    type="button"
                    onClick={() => setSelectedInvoiceId(String(invoice.invoiceId))}
                    className={`w-full rounded-3xl border px-4 py-4 text-left transition ${
                      String(invoice.invoiceId) === selectedInvoiceId
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Invoice #{invoice.invoiceId}</p>
                        <p className="text-sm text-gray-500 mt-1">Date: {invoice.invoiceDate}</p>
                      </div>
                      <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                        {invoice.status}
                      </span>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-gray-600">
                      <div>
                        <p className="font-semibold text-gray-800">Total</p>
                        <p>LKR {Number(invoice.totalAmount).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">Paid</p>
                        <p>LKR {Number(invoice.paidAmount).toLocaleString()}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-6 text-sm text-gray-600">
                You have no pending invoices at this time.
              </div>
            )}
          </section>

          <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Record a Payment</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Choose Invoice</label>
                <select
                  value={selectedInvoiceId}
                  onChange={(event) => setSelectedInvoiceId(event.target.value)}
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none"
                >
                  <option value="">Select invoice</option>
                  {details?.pendingInvoices?.map((invoice) => (
                    <option key={invoice.invoiceId} value={invoice.invoiceId}>
                      {invoice.invoiceId} — LKR {Number(invoice.totalAmount).toLocaleString()} ({invoice.status})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Payment Amount</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none"
                  placeholder="Enter amount"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Payment Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Payment Method</label>
                <select
                  value={method}
                  onChange={(event) => setMethod(event.target.value)}
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none"
                >
                  <option value="Cash">Cash</option>
                  <option value="Card">Card</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Mobile Payment">Mobile Payment</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center justify-center rounded-2xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
              >
                {saving ? 'Saving payment...' : 'Submit Payment'}
              </button>
            </form>
          </section>
        </div>

        {selectedInvoiceId && (
          <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Payment History</h2>
              <p className="text-sm text-gray-500">Invoice #{selectedInvoiceId}</p>
            </div>

            {payments.length === 0 ? (
              <p className="text-sm text-gray-500">No payments recorded yet for this invoice.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Amount</th>
                      <th className="px-4 py-3">Method</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {payments.map((payment) => (
                      <tr key={payment.paymentId} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-700">{payment.paymentDate}</td>
                        <td className="px-4 py-3 text-gray-700">LKR {Number(payment.amount).toLocaleString()}</td>
                        <td className="px-4 py-3 text-gray-700">{payment.paymentMethod}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
