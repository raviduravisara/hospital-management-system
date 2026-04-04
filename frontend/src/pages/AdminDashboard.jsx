import { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axios';
import { extractRoleFromToken } from '../utils/auth';

const COLOR_MAP = {
  blue: 'bg-blue-50 ring-blue-200 bg-blue-100 text-blue-700',
  teal: 'bg-teal-50 ring-teal-200 bg-teal-100 text-teal-700',
  violet: 'bg-violet-50 ring-violet-200 bg-violet-100 text-violet-700',
  amber: 'bg-amber-50 ring-amber-200 bg-amber-100 text-amber-700',
  green: 'bg-green-50 ring-green-200 bg-green-100 text-green-700',
  rose: 'bg-rose-50 ring-rose-200 bg-rose-100 text-rose-700',
};

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'appointments', label: 'Appointments' },
  { id: 'users', label: 'Users' },
  { id: 'medicines', label: 'Medicines' },
  { id: 'inventory', label: 'Inventory' },
  { id: 'invoices', label: 'Invoices' },
];

const formatDateTime = (date, time) => {
  if (!date) return '-';
  const dateText = new Date(date).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const timeText = time ? String(time).slice(0, 5) : '';
  return timeText ? `${dateText} ${timeText}` : dateText;
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const role = extractRoleFromToken(token);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [users, setUsers] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [labRequests, setLabRequests] = useState([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');

      try {
        const [usersRes, doctorsRes, invoicesRes, medicinesRes, labRequestsRes] = await Promise.all([
          axiosInstance.get('/api/users'),
          axiosInstance.get('/api/doctors'),
          axiosInstance.get('/api/invoices'),
          axiosInstance.get('/api/medicines'),
          axiosInstance.get('/api/lab-requests').catch(() => ({ data: [] })),
        ]);

        const allDoctors = Array.isArray(doctorsRes.data) ? doctorsRes.data : [];

        const appointmentsByDoctor = await Promise.all(
          allDoctors.map((doctor) =>
            axiosInstance
              .get(`/api/appointments/doctor/${doctor.doctorId}`)
              .then((res) => (Array.isArray(res.data) ? res.data : []))
              .catch(() => [])
          )
        );

        const appointmentMap = new Map();
        appointmentsByDoctor.flat().forEach((item) => {
          appointmentMap.set(item.appointmentId, item);
        });

        setUsers(Array.isArray(usersRes.data) ? usersRes.data : []);
        setDoctors(allDoctors);
        setInvoices(Array.isArray(invoicesRes.data) ? invoicesRes.data : []);
        setMedicines(Array.isArray(medicinesRes.data) ? medicinesRes.data : []);
        setAppointments(Array.from(appointmentMap.values()));
        setLabRequests(Array.isArray(labRequestsRes.data) ? labRequestsRes.data : []);
      } catch (requestError) {
        setError(requestError.response?.data?.message || 'Unable to load admin dashboard data.');
      } finally {
        setLoading(false);
      }
    };

    if (token && role === 'admin') {
      load();
    }
  }, [token, role]);

  const todayIso = new Date().toISOString().slice(0, 10);

  const kpis = useMemo(() => {
    const patients = users.filter((u) => String(u.role).toLowerCase() === 'patient');
    const admins = users.filter((u) => String(u.role).toLowerCase() === 'admin');
    const todaysAppointments = appointments.filter((a) => a.appointmentDate === todayIso);
    const pendingInvoices = invoices.filter((i) => ['Unpaid', 'Overdue', 'Partial'].includes(i.status));
    const pendingLabRequests = labRequests.filter((item) => ['Pending', 'InProgress'].includes(item.status));
    const pendingAmount = pendingInvoices.reduce(
      (sum, item) => sum + Math.max(Number(item.totalAmount || 0) - Number(item.paidAmount || 0), 0),
      0,
    );

    return [
      { label: 'Total Patients', value: String(patients.length), delta: `Admins: ${admins.length}`, color: 'blue' },
      { label: 'Active Doctors', value: String(doctors.length), delta: 'Registered doctors', color: 'violet' },
      { label: "Today's Appointments", value: String(todaysAppointments.length), delta: `${todaysAppointments.filter((a) => a.status === 'Pending').length} pending`, color: 'teal' },
      { label: 'Pending Invoices', value: String(pendingInvoices.length), delta: `LKR ${pendingAmount.toLocaleString()}`, color: 'amber' },
      { label: 'Medicines in Stock', value: String(medicines.length), delta: `${medicines.filter((m) => Number(m.stockQuantity || 0) <= 10).length} low stock`, color: 'green' },
      { label: 'Lab Requests Pending', value: String(pendingLabRequests.length), delta: `${pendingLabRequests.filter((r) => r.priority === 'Urgent').length} urgent`, color: 'rose' },
    ];
  }, [users, doctors, appointments, invoices, medicines, labRequests, todayIso]);

  const recentAppointments = useMemo(
    () =>
      appointments
        .slice()
        .sort((a, b) => `${b.appointmentDate} ${b.appointmentTime}`.localeCompare(`${a.appointmentDate} ${a.appointmentTime}`))
        .slice(0, 8),
    [appointments],
  );

  const pendingInvoices = useMemo(
    () => invoices.filter((i) => ['Unpaid', 'Overdue', 'Partial'].includes(i.status)).slice(0, 8),
    [invoices],
  );

  const recentUsers = useMemo(
    () => users.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 8),
    [users],
  );

  if (!token) return <Navigate to="/login" replace />;
  if (role !== 'admin') return <Navigate to="/dashboard" replace />;

  const handleNav = (id) => {
    if (id === 'dashboard') navigate('/admin/dashboard');
    if (id === 'appointments') navigate('/admin/appointments');
    if (id === 'users') navigate('/admin/users');
    if (id === 'medicines') navigate('/admin/medicines');
    if (id === 'inventory') navigate('/admin/inventory');
    if (id === 'invoices') navigate('/admin/invoices');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    navigate('/login');
  };

  return (
    <div className="min-h-screen glass-page p-6 md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="mt-1 text-sm text-gray-500">Real-time operational overview from current system data.</p>
          </div>
          <div className="flex gap-2">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNav(item.id)}
                className="rounded-lg border border-white/50 bg-white/60 backdrop-blur px-3 py-2 text-sm font-medium text-gray-700 hover:bg-white/75"
              >
                {item.label}
              </button>
            ))}
            <button
              onClick={handleLogout}
              className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
            >
              Logout
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {loading && (
          <div className="mb-4 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-600">Loading admin metrics...</div>
        )}

        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
          {kpis.map((card) => {
            const [bg, ring, iconBg, iconText] = COLOR_MAP[card.color].split(' ');
            return (
              <div key={card.label} className={`${bg} rounded-2xl p-4 ring-1 ${ring}`}>
                <div className={`mb-3 inline-flex rounded-xl ${iconBg} px-2 py-1 text-xs font-bold ${iconText}`}>KPI</div>
                <p className="text-2xl font-extrabold text-gray-900">{card.value}</p>
                <p className="mt-1 text-xs font-semibold text-gray-600">{card.label}</p>
                <p className="mt-1 text-[11px] text-gray-500">{card.delta}</p>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          <section className="rounded-2xl glass-card p-5 xl:col-span-2">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Recent Appointments</h2>
              <button onClick={() => navigate('/admin/appointments')} className="text-sm font-semibold text-blue-600 hover:underline">Manage all</button>
            </div>
            {!recentAppointments.length ? (
              <p className="text-sm text-gray-500">No appointment data available.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-left text-gray-500">
                      <th className="py-2 pr-4">Patient</th>
                      <th className="py-2 pr-4">Doctor</th>
                      <th className="py-2 pr-4">When</th>
                      <th className="py-2 pr-0">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentAppointments.map((item) => (
                      <tr key={item.appointmentId} className="border-b border-gray-50">
                        <td className="py-2 pr-4 font-medium text-gray-900">{item.patientName}</td>
                        <td className="py-2 pr-4 text-gray-700">{item.doctorName}</td>
                        <td className="py-2 pr-4 text-gray-600">{formatDateTime(item.appointmentDate, item.appointmentTime)}</td>
                        <td className="py-2 pr-0">
                          <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700">{item.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="rounded-2xl glass-card p-5">
            <h2 className="mb-3 text-lg font-bold text-gray-900">Pending Invoices</h2>
            {!pendingInvoices.length ? (
              <p className="text-sm text-gray-500">No pending invoices.</p>
            ) : (
              <div className="space-y-3">
                {pendingInvoices.map((item) => (
                  <div key={item.invoiceId} className="rounded-xl bg-gray-50 px-3 py-2">
                    <p className="text-sm font-semibold text-gray-900">{item.patientName || `Patient #${item.patientId}`}</p>
                    <p className="text-xs text-gray-500">Invoice #{item.invoiceId} • {item.status}</p>
                    <p className="text-xs text-gray-600">Outstanding: LKR {Math.max(Number(item.totalAmount || 0) - Number(item.paidAmount || 0), 0).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <section className="mt-5 rounded-2xl glass-card p-5">
          <h2 className="mb-3 text-lg font-bold text-gray-900">Recently Registered Users</h2>
          {!recentUsers.length ? (
            <p className="text-sm text-gray-500">No user data available.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-gray-500">
                    <th className="py-2 pr-4">Username</th>
                    <th className="py-2 pr-4">Role</th>
                    <th className="py-2 pr-4">Email</th>
                    <th className="py-2 pr-0">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentUsers.map((item) => (
                    <tr key={item.userId} className="border-b border-gray-50">
                      <td className="py-2 pr-4 font-medium text-gray-900">{item.username}</td>
                      <td className="py-2 pr-4 text-gray-700">{item.role}</td>
                      <td className="py-2 pr-4 text-gray-600">{item.email}</td>
                      <td className="py-2 pr-0">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${item.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {item.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
