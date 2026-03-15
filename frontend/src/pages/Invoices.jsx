import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import axios from '../api/axios';
import { extractRoleFromToken } from '../utils/auth';

const initialForm = {
  patientId: '',
  appointmentId: '',
  invoiceDate: new Date().toISOString().slice(0, 10),
  totalAmount: '0',
  paidAmount: '0',
};

export default function Invoices() {
  const token = localStorage.getItem('token');
  const role = extractRoleFromToken(token);

  const [invoices, setInvoices] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadInvoices = async (status = statusFilter) => {
    const response = await axios.get('/api/invoices', {
      params: status ? { status } : {},
    });

    setInvoices(response.data ?? []);
  };

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        await loadInvoices('');
      } catch (requestError) {
        if (isMounted) {
          setError(requestError.response?.data?.message || 'Unable to load invoices.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, []);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  const summary = useMemo(() => {
    const total = invoices.reduce((sum, item) => sum + Number(item.totalAmount), 0);
    const paid = invoices.reduce((sum, item) => sum + Number(item.paidAmount), 0);
    const outstanding = total - paid;
    const unpaidCount = invoices.filter((item) => item.status === 'Unpaid').length;

    return { total, paid, outstanding, unpaidCount };
  }, [invoices]);

  const statusBadgeClass = (status) => {
    if (status === 'Paid') return 'bg-green-100 text-green-700';
    if (status === 'Partial') return 'bg-amber-100 text-amber-800';
    return 'bg-red-100 text-red-700';
  };

  const resetForm = () => {
    setEditingId(null);
    setForm(initialForm);
    setError('');
    setSuccess('');
  };

  const startEdit = (invoice) => {
    setEditingId(invoice.invoiceId);
    setForm({
      patientId: String(invoice.patientId),
      appointmentId: invoice.appointmentId ? String(invoice.appointmentId) : '',
      invoiceDate: invoice.invoiceDate,
      totalAmount: String(invoice.totalAmount),
      paidAmount: String(invoice.paidAmount),
    });
    setError('');
    setSuccess('');
  };

  const handleFilterSubmit = async (event) => {
    event.preventDefault();
    setError('');

    try {
      await loadInvoices(statusFilter);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to filter invoices.');
    }
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setIsSaving(true);

    try {
      const payload = {
        patientId: Number(form.patientId),
        appointmentId: form.appointmentId ? Number(form.appointmentId) : null,
        invoiceDate: form.invoiceDate,
        totalAmount: Number(form.totalAmount),
        paidAmount: Number(form.paidAmount),
      };

      if (editingId) {
        await axios.put(`/api/invoices/${editingId}`, payload);
        setSuccess('Invoice updated successfully.');
      } else {
        await axios.post('/api/invoices', payload);
        setSuccess('Invoice created successfully.');
      }

      await loadInvoices(statusFilter);
      if (!editingId) {
        setForm(initialForm);
      }
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to save invoice.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (invoiceId) => {
    setError('');
    setSuccess('');

    try {
      await axios.delete(`/api/invoices/${invoiceId}`);
      setSuccess('Invoice deleted successfully.');
      if (editingId === invoiceId) {
        resetForm();
      }
      await loadInvoices(statusFilter);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to delete invoice.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Invoice Generation</h1>
            <p className="text-sm text-slate-500">Create and manage billing records for patient appointments.</p>
          </div>
          <Link
            to="/admin/dashboard"
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            Back to Dashboard
          </Link>
        </div>

        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-4">
          <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
            <p className="text-xs uppercase tracking-wide text-slate-500">Total Invoices</p>
            <p className="text-2xl font-bold text-slate-900">{invoices.length}</p>
          </div>
          <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
            <p className="text-xs uppercase tracking-wide text-slate-500">Total Amount</p>
            <p className="text-2xl font-bold text-slate-900">${summary.total.toFixed(2)}</p>
          </div>
          <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
            <p className="text-xs uppercase tracking-wide text-slate-500">Collected</p>
            <p className="text-2xl font-bold text-green-700">${summary.paid.toFixed(2)}</p>
          </div>
          <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
            <p className="text-xs uppercase tracking-wide text-slate-500">Outstanding</p>
            <p className="text-2xl font-bold text-amber-700">${summary.outstanding.toFixed(2)}</p>
          </div>
        </div>

        {error && <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        {success && <div className="mb-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">{success}</div>}

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <section className="xl:col-span-2 overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
            <div className="border-b border-slate-100 p-4">
              <form onSubmit={handleFilterSubmit} className="flex items-end gap-2">
                <div className="w-full max-w-xs">
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Status Filter</label>
                  <select
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="">All</option>
                    <option value="Unpaid">Unpaid</option>
                    <option value="Partial">Partial</option>
                    <option value="Paid">Paid</option>
                  </select>
                </div>
                <button type="submit" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-black">
                  Apply
                </button>
                <button type="button" onClick={resetForm} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">
                  New Invoice
                </button>
              </form>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-sm">
                <thead className="bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Invoice</th>
                    <th className="px-4 py-3">Patient</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Total</th>
                    <th className="px-4 py-3">Paid</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoading && (
                    <tr>
                      <td colSpan={7} className="px-4 py-6 text-center text-slate-500">Loading invoices...</td>
                    </tr>
                  )}
                  {!isLoading && invoices.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-6 text-center text-slate-500">No invoices found.</td>
                    </tr>
                  )}
                  {invoices.map((invoice) => (
                    <tr key={invoice.invoiceId} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-800">INV-{String(invoice.invoiceId).padStart(4, '0')}</p>
                        <p className="text-xs text-slate-500">Patient ID: {invoice.patientId}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{invoice.patientName || '-'}</td>
                      <td className="px-4 py-3 text-slate-700">{invoice.invoiceDate}</td>
                      <td className="px-4 py-3 text-slate-700">${Number(invoice.totalAmount).toFixed(2)}</td>
                      <td className="px-4 py-3 text-slate-700">${Number(invoice.paidAmount).toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${statusBadgeClass(invoice.status)}`}>
                          {invoice.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button type="button" onClick={() => startEdit(invoice)} className="rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100">
                            Edit
                          </button>
                          <button type="button" onClick={() => handleDelete(invoice.invoiceId)} className="rounded-md border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-100">
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
            <h2 className="mb-3 text-base font-bold text-slate-800">{editingId ? 'Edit Invoice' : 'Generate Invoice'}</h2>
            <form onSubmit={handleSave} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Patient ID</label>
                  <input
                    type="number"
                    min="1"
                    value={form.patientId}
                    onChange={(event) => setForm((prev) => ({ ...prev, patientId: event.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Appointment ID</label>
                  <input
                    type="number"
                    min="1"
                    value={form.appointmentId}
                    onChange={(event) => setForm((prev) => ({ ...prev, appointmentId: event.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    placeholder="Optional"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Invoice Date</label>
                <input
                  type="date"
                  value={form.invoiceDate}
                  onChange={(event) => setForm((prev) => ({ ...prev, invoiceDate: event.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Total Amount</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.totalAmount}
                    onChange={(event) => setForm((prev) => ({ ...prev, totalAmount: event.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Paid Amount</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.paidAmount}
                    onChange={(event) => setForm((prev) => ({ ...prev, paidAmount: event.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
                >
                  {isSaving ? 'Saving...' : editingId ? 'Update Invoice' : 'Create Invoice'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Reset
                </button>
              </div>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
