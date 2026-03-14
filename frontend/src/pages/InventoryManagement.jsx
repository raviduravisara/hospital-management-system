import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import axios from '../api/axios';
import { extractRoleFromToken } from '../utils/auth';

export default function InventoryManagement() {
  const token = localStorage.getItem('token');
  const role = extractRoleFromToken(token);

  const [thresholdInput, setThresholdInput] = useState('20');
  const [statusFilter, setStatusFilter] = useState('all');
  const [report, setReport] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadReport = async (thresholdValue = thresholdInput, statusValue = statusFilter) => {
    const parsedThreshold = Number(thresholdValue);
    const safeThreshold = Number.isFinite(parsedThreshold) && parsedThreshold > 0 ? parsedThreshold : 20;

    const response = await axios.get('/api/medicines/inventory/report', {
      params: {
        threshold: safeThreshold,
        status: statusValue,
      },
    });

    setReport(response.data);
  };

  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      try {
        await loadReport('20', 'all');
      } catch (requestError) {
        if (isMounted) {
          setError(requestError.response?.data?.message || 'Unable to load inventory report.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    init();

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

  const currentThreshold = report?.threshold ?? (Number(thresholdInput) || 20);

  const totalStockValue = useMemo(() => {
    if (!report?.items?.length) {
      return 0;
    }

    return report.items.reduce((sum, item) => sum + item.stockQuantity * Number(item.unitPrice), 0);
  }, [report]);

  const handleApplyFilters = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    try {
      await loadReport(thresholdInput, statusFilter);
      setSuccess('Inventory filters applied.');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to refresh inventory report.');
    }
  };

  const handleStockAdjust = async (medicineId, currentStock, delta) => {
    const nextStock = Math.max(0, currentStock + delta);
    setError('');

    try {
      await axios.put(`/api/medicines/${medicineId}/stock`, { stockQuantity: nextStock });
      await loadReport(thresholdInput, statusFilter);
      setSuccess('Stock updated.');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to update stock quantity.');
    }
  };

  const statusBadge = (status) => {
    if (status === 'OutOfStock') return 'bg-red-100 text-red-700';
    if (status === 'LowStock') return 'bg-amber-100 text-amber-800';
    return 'bg-green-100 text-green-700';
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Inventory Management</h1>
            <p className="text-sm text-slate-500">Track low stock levels and update inventory quickly.</p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/admin/medicines"
              className="rounded-lg border border-teal-200 bg-white px-4 py-2 text-sm font-semibold text-teal-700 hover:bg-teal-50"
            >
              Medicine CRUD
            </Link>
            <Link
              to="/admin/dashboard"
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>

        {error && <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        {success && <div className="mb-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">{success}</div>}

        <form onSubmit={handleApplyFilters} className="mb-4 rounded-xl bg-white p-4 ring-1 ring-slate-200">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Low Stock Threshold</label>
              <input
                type="number"
                min="1"
                value={thresholdInput}
                onChange={(event) => setThresholdInput(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Status Filter</label>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="all">All</option>
                <option value="low">Low stock</option>
                <option value="out">Out of stock</option>
                <option value="in">In stock</option>
              </select>
            </div>
            <div className="md:col-span-2 flex items-end">
              <button type="submit" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-black">
                Apply Filters
              </button>
            </div>
          </div>
        </form>

        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-4">
          <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
            <p className="text-xs uppercase tracking-wide text-slate-500">Threshold</p>
            <p className="text-2xl font-bold text-slate-900">{currentThreshold}</p>
          </div>
          <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
            <p className="text-xs uppercase tracking-wide text-slate-500">Total Medicines</p>
            <p className="text-2xl font-bold text-slate-900">{report?.totalItems ?? 0}</p>
          </div>
          <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
            <p className="text-xs uppercase tracking-wide text-slate-500">Low Stock</p>
            <p className="text-2xl font-bold text-amber-700">{report?.lowStockItems ?? 0}</p>
          </div>
          <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
            <p className="text-xs uppercase tracking-wide text-slate-500">Out of Stock</p>
            <p className="text-2xl font-bold text-red-700">{report?.outOfStockItems ?? 0}</p>
          </div>
        </div>

        <div className="mb-4 rounded-xl bg-white p-4 ring-1 ring-slate-200">
          <p className="text-xs uppercase tracking-wide text-slate-500">Estimated Inventory Value</p>
          <p className="text-2xl font-bold text-teal-700">${totalStockValue.toFixed(2)}</p>
        </div>

        <section className="overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Medicine</th>
                  <th className="px-4 py-3">Manufacturer</th>
                  <th className="px-4 py-3">Unit Price</th>
                  <th className="px-4 py-3">Stock Qty</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Adjust</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading && (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-slate-500">Loading inventory...</td>
                  </tr>
                )}
                {!isLoading && (report?.items?.length ?? 0) === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-slate-500">No inventory items match the selected filters.</td>
                  </tr>
                )}
                {!isLoading && report?.items?.map((item) => (
                  <tr key={item.medicineId} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-slate-800">{item.medicineName}</td>
                    <td className="px-4 py-3 text-slate-700">{item.manufacturer || '-'}</td>
                    <td className="px-4 py-3 text-slate-700">${Number(item.unitPrice).toFixed(2)}</td>
                    <td className="px-4 py-3 font-bold text-slate-800">{item.stockQuantity}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${statusBadge(item.stockStatus)}`}>
                        {item.stockStatus === 'OutOfStock' ? 'Out of stock' : item.stockStatus === 'LowStock' ? 'Low stock' : 'In stock'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleStockAdjust(item.medicineId, item.stockQuantity, -1)}
                          className="h-7 w-7 rounded-md border border-slate-300 text-slate-700 hover:bg-slate-100"
                        >
                          -
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStockAdjust(item.medicineId, item.stockQuantity, 1)}
                          className="h-7 w-7 rounded-md border border-slate-300 text-slate-700 hover:bg-slate-100"
                        >
                          +
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
