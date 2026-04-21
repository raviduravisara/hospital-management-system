import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import axios from '../api/axios';
import { extractRoleFromToken } from '../utils/auth';

const initialForm = {
  medicineName: '',
  description: '',
  manufacturer: '',
  unitPrice: '0',
  stockQuantity: '0',
};

export default function Medicines() {
  const token = localStorage.getItem('token');
  const role = extractRoleFromToken(token);

  const [medicines, setMedicines] = useState([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadMedicines = async (searchTerm = '') => {
    const response = await axios.get('/api/medicines', {
      params: searchTerm ? { search: searchTerm } : {},
    });
    setMedicines(response.data ?? []);
  };

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        await loadMedicines();
      } catch (requestError) {
        if (isMounted) {
          setError(requestError.response?.data?.message || 'Unable to load medicines.');
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

  const lowStockCount = useMemo(() => medicines.filter((item) => item.stockQuantity <= 20).length, [medicines]);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  const startCreate = () => {
    setEditingId(null);
    setForm(initialForm);
    setError('');
    setSuccess('');
  };

  const startEdit = (medicine) => {
    setEditingId(medicine.medicineId);
    setForm({
      medicineName: medicine.medicineName,
      description: medicine.description ?? '',
      manufacturer: medicine.manufacturer ?? '',
      unitPrice: String(medicine.unitPrice),
      stockQuantity: String(medicine.stockQuantity),
    });
    setError('');
    setSuccess('');
  };

  const handleSearch = async (event) => {
    event.preventDefault();
    setError('');

    try {
      await loadMedicines(search.trim());
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Search failed.');
    }
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setIsSaving(true);

    try {
      const payload = {
        medicineName: form.medicineName,
        description: form.description || null,
        manufacturer: form.manufacturer || null,
        unitPrice: Number(form.unitPrice),
        stockQuantity: Number(form.stockQuantity),
      };

      if (editingId) {
        await axios.put(`/api/medicines/${editingId}`, payload);
        setSuccess('Medicine updated successfully.');
      } else {
        await axios.post('/api/medicines', payload);
        setSuccess('Medicine created successfully.');
      }

      await loadMedicines(search.trim());
      if (!editingId) {
        setForm(initialForm);
      }
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to save medicine.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (medicineId) => {
    setError('');
    setSuccess('');

    try {
      await axios.delete(`/api/medicines/${medicineId}`);
      setSuccess('Medicine deleted successfully.');
      if (editingId === medicineId) {
        startCreate();
      }
      await loadMedicines(search.trim());
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to delete medicine.');
    }
  };

  const handleStockAdjust = async (medicine, delta) => {
    const nextValue = Math.max(0, (medicine.stockQuantity ?? 0) + delta);
    setError('');

    try {
      await axios.put(`/api/medicines/${medicine.medicineId}/stock`, { stockQuantity: nextValue });
      await loadMedicines(search.trim());
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to update stock.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Medicine Management</h1>
            <p className="text-sm text-slate-500">Manage medicine records, inventory, and low-stock alerts.</p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/admin/inventory"
              className="rounded-lg border border-teal-200 bg-white px-4 py-2 text-sm font-semibold text-teal-700 hover:bg-teal-50"
            >
              Inventory View
            </Link>
            <Link
              to="/admin/dashboard"
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>

        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
            <p className="text-xs uppercase tracking-wide text-slate-500">Total Medicines</p>
            <p className="text-2xl font-bold text-slate-900">{medicines.length}</p>
          </div>
          <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
            <p className="text-xs uppercase tracking-wide text-slate-500">Low Stock Items</p>
            <p className="text-2xl font-bold text-amber-600">{lowStockCount}</p>
          </div>
          <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
            <p className="text-xs uppercase tracking-wide text-slate-500">Low Stock Threshold</p>
            <p className="text-2xl font-bold text-slate-900">20</p>
          </div>
        </div>

        {error && <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        {success && <div className="mb-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">{success}</div>}

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <section className="xl:col-span-2 overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
            <div className="border-b border-slate-100 p-4">
              <form onSubmit={handleSearch} className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by medicine or manufacturer"
                  className="w-full flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm sm:min-w-[320px]"
                />
                <button type="submit" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-black">
                  Search
                </button>
                <button type="button" onClick={startCreate} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">
                  New
                </button>
              </form>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-sm">
                <thead className="bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Medicine</th>
                    <th className="px-4 py-3">Manufacturer</th>
                    <th className="px-4 py-3">Unit Price</th>
                    <th className="px-4 py-3">Stock</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoading && (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-center text-slate-500">Loading medicines...</td>
                    </tr>
                  )}
                  {!isLoading && medicines.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-center text-slate-500">No medicines found.</td>
                    </tr>
                  )}
                  {medicines.map((medicine) => {
                    const isLowStock = medicine.stockQuantity <= 20;

                    return (
                      <tr key={medicine.medicineId} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-slate-800">{medicine.medicineName}</p>
                          {medicine.description && <p className="text-xs text-slate-500">{medicine.description}</p>}
                        </td>
                        <td className="px-4 py-3 text-slate-700">{medicine.manufacturer || '-'}</td>
                        <td className="px-4 py-3 text-slate-700">${Number(medicine.unitPrice).toFixed(2)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleStockAdjust(medicine, -1)}
                              className="h-7 w-7 rounded-md border border-slate-300 text-slate-700 hover:bg-slate-100"
                            >
                              -
                            </button>
                            <span className="min-w-8 text-center font-semibold text-slate-800">{medicine.stockQuantity}</span>
                            <button
                              type="button"
                              onClick={() => handleStockAdjust(medicine, 1)}
                              className="h-7 w-7 rounded-md border border-slate-300 text-slate-700 hover:bg-slate-100"
                            >
                              +
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${isLowStock ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-700'}`}>
                            {isLowStock ? 'Low stock' : 'In stock'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button type="button" onClick={() => startEdit(medicine)} className="rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100">
                              Edit
                            </button>
                            <button type="button" onClick={() => handleDelete(medicine.medicineId)} className="rounded-md border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-100">
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
            <h2 className="mb-3 text-base font-bold text-slate-800">{editingId ? 'Edit Medicine' : 'Add Medicine'}</h2>
            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Medicine Name</label>
                <input
                  type="text"
                  value={form.medicineName}
                  onChange={(event) => setForm((prev) => ({ ...prev, medicineName: event.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Description</label>
                <textarea
                  value={form.description}
                  onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                  rows={3}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Manufacturer</label>
                <input
                  type="text"
                  value={form.manufacturer}
                  onChange={(event) => setForm((prev) => ({ ...prev, manufacturer: event.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Unit Price</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.unitPrice}
                    onChange={(event) => setForm((prev) => ({ ...prev, unitPrice: event.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Stock Quantity</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={form.stockQuantity}
                    onChange={(event) => setForm((prev) => ({ ...prev, stockQuantity: event.target.value }))}
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
                  {isSaving ? 'Saving...' : editingId ? 'Update Medicine' : 'Create Medicine'}
                </button>
                <button
                  type="button"
                  onClick={startCreate}
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
