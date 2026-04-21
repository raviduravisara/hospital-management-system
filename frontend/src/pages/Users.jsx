import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import axios from '../api/axios';
import { extractRoleFromToken } from '../utils/auth';

const initialForm = {
  username: '',
  email: '',
  password: '',
  role: 'Patient',
  isActive: true,
};

export default function Users() {
  const token = localStorage.getItem('token');
  const role = extractRoleFromToken(token);

  const [users, setUsers] = useState([]);
  const [activeTab, setActiveTab] = useState('Doctor');//sutha
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadUsers = async () => {
    const isActive = activeFilter === 'all' ? null : activeFilter === 'active';

    const response = await axios.get('/api/users', {
      params: {
        role: roleFilter || null,
        isActive,
        search: search || null,
      },
    });

    setUsers(response.data ?? []);
  };

  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      try {
        await loadUsers();
      } catch (requestError) {
        if (isMounted) {
          setError(requestError.response?.data?.message || 'Unable to load users.');
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

  const activeCount = useMemo(() => users.filter((user) => user.isActive).length, [users]);
  const tabUsers = useMemo(() => {
  return users.filter((user) => user.role === activeTab);
}, [users, activeTab]);


  const resetForm = () => {
    setEditingId(null);
    setForm(initialForm);
    setError('');
    setSuccess('');
  };

  const startEdit = (user) => {
    setEditingId(user.userId);
    setForm({
      username: user.username,
      email: user.email,
      password: '',
      role: user.role,
      isActive: user.isActive,
    });
    setError('');
    setSuccess('');
  };

  const applyFilters = async (event) => {
    event.preventDefault();
    setError('');

    try {
      await loadUsers();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to filter users.');
    }
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setIsSaving(true);

    try {
      if (editingId) {
        await axios.put(`/api/users/${editingId}`, {
          username: form.username,
          email: form.email,
          password: form.password || null,
          role: form.role,
          isActive: form.isActive,
        });
        setSuccess('User updated successfully.');
      } else {
        await axios.post('/api/users', {
          username: form.username,
          email: form.email,
          password: form.password,
          role: form.role,
          isActive: form.isActive,
        });
        setSuccess('User created successfully.');
        setForm(initialForm);
      }

      await loadUsers();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to save user.');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleStatus = async (user) => {
    setError('');

    try {
      await axios.put(`/api/users/${user.userId}/status`, { isActive: !user.isActive });
      await loadUsers();
      setSuccess(`User ${!user.isActive ? 'activated' : 'deactivated'} successfully.`);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to update status.');
    }
  };

  const handleDelete = async (userId) => {
    setError('');
    setSuccess('');

    try {
      await axios.delete(`/api/users/${userId}`);
      setSuccess('User deleted successfully.');
      if (editingId === userId) {
        resetForm();
      }
      await loadUsers();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to delete user.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">User Account Management</h1>
            <p className="text-sm text-slate-500">Admin-only user CRUD with role and activation control.</p>
          </div>
          <Link
            to="/admin/dashboard"
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            Back to Dashboard
          </Link>
        </div>

        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
            <p className="text-xs uppercase tracking-wide text-slate-500">Total Users</p>
            <p className="text-2xl font-bold text-slate-900">{users.length}</p>
          </div>
          <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
            <p className="text-xs uppercase tracking-wide text-slate-500">Active Users</p>
            <p className="text-2xl font-bold text-green-700">{activeCount}</p>
          </div>
          <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
            <p className="text-xs uppercase tracking-wide text-slate-500">Inactive Users</p>
            <p className="text-2xl font-bold text-amber-700">{users.length - activeCount}</p>
          </div>
        </div>

        {error && <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        {success && <div className="mb-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">{success}</div>}

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <section className="xl:col-span-2 overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
            <div className="border-b border-slate-100 p-4">
              <form onSubmit={applyFilters} className="flex flex-wrap items-end gap-2">
                <div className="min-w-[220px] flex-1">
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Search</label>
                  <input
                    type="text"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Username or email"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Role</label>
                  <select
                    value={roleFilter}
                    onChange={(event) => setRoleFilter(event.target.value)}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="">All</option>
                    <option value="Admin">Admin</option>
                    <option value="Doctor">Doctor</option>
                    <option value="Patient">Patient</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Status</label>
                  <select
                    value={activeFilter}
                    onChange={(event) => setActiveFilter(event.target.value)}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="all">All</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                <button type="submit" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-black">
                  Apply
                </button>
              </form>
            </div>
<div className="border-b border-slate-100 px-4 pt-4">
  <div className="flex flex-wrap gap-2">
    {['Doctor', 'Patient', 'Admin'].map((tab) => (
      <button
        key={tab}
        type="button"
        onClick={() => setActiveTab(tab)}
        className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
          activeTab === tab
            ? 'bg-slate-900 text-white'
            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
        }`}
      >
        {tab}s
      </button>
    ))}
  </div>
</div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-sm">
                <thead className="bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Created</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoading && (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-slate-500">Loading users...</td>
                    </tr>
                  )}
                  {!isLoading && tabUsers.length === 0 && (
  <tr>
    <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
      No {activeTab.toLowerCase()}s found.
    </td>
  </tr>
)}{tabUsers.map((user) => (
                    <tr key={user.userId} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-800">{user.username}</p>
                        <p className="text-xs text-slate-500">{user.email}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{user.role}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${user.isActive ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-800'}`}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{new Date(user.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button type="button" onClick={() => startEdit(user)} className="rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100">
                            Edit
                          </button>
                          <button type="button" onClick={() => toggleStatus(user)} className="rounded-md border border-teal-200 bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-700 hover:bg-teal-100">
                            {user.isActive ? 'Deactivate' : 'Activate'}
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
            <h2 className="mb-3 text-base font-bold text-slate-800">{editingId ? 'Edit User' : 'Create User'}</h2>
            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Username</label>
                <input
                  type="text"
                  value={form.username}
                  onChange={(event) => setForm((prev) => ({ ...prev, username: event.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Password {editingId ? '(optional)' : ''}</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  required={!editingId}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Role</label>
                  <select
                    value={form.role}
                    onChange={(event) => setForm((prev) => ({ ...prev, role: event.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="Admin">Admin</option>
                    <option value="Doctor">Doctor</option>
                    <option value="Patient">Patient</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Status</label>
                  <select
                    value={form.isActive ? 'active' : 'inactive'}
                    onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.target.value === 'active' }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
                >
                  {isSaving ? 'Saving...' : editingId ? 'Update User' : 'Create User'}
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
