import { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axios';
import { extractRoleFromToken } from '../utils/auth';

const NAV_SECTIONS = [
  {
    heading: 'Overview',
    items: [{ id: 'dashboard', label: 'Dashboard', icon: 'grid' }],
  },
  {
    heading: 'Management',
    items: [
      { id: 'appointments', label: 'Appointments', icon: 'calendar' },
      { id: 'users', label: 'Users', icon: 'patients' },
    ],
  },
  {
    heading: 'Operations',
    items: [
      { id: 'medicines', label: 'Medicines', icon: 'flask' },
      { id: 'inventory', label: 'Inventory', icon: 'folder' },
      { id: 'invoices', label: 'Invoices', icon: 'document' },
    ],
  },
];

const COLOR_MAP = {
  blue:   { bg: 'bg-blue-50',   icon: 'bg-blue-100 text-blue-600',     ring: 'ring-blue-200'   },
  violet: { bg: 'bg-violet-50', icon: 'bg-violet-100 text-violet-600', ring: 'ring-violet-200' },
  teal:   { bg: 'bg-teal-50',   icon: 'bg-teal-100 text-teal-600',     ring: 'ring-teal-200'   },
  amber:  { bg: 'bg-amber-50',  icon: 'bg-amber-100 text-amber-600',   ring: 'ring-amber-200'  },
  green:  { bg: 'bg-green-50',  icon: 'bg-green-100 text-green-600',   ring: 'ring-green-200'  },
  rose:   { bg: 'bg-rose-50',   icon: 'bg-rose-100 text-rose-600',     ring: 'ring-rose-200'   },
  indigo: { bg: 'bg-indigo-50', icon: 'bg-indigo-100 text-indigo-600', ring: 'ring-indigo-200' },
};

const Icon = ({ name, className = 'w-5 h-5' }) => {
  const paths = {
    grid:       'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z',
    calendar:   'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
    patients:   'M17 20h5v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2h5M12 12a4 4 0 100-8 4 4 0 000 8z',
    folder:     'M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z',
    document:   'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    flask:      'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z',
    logout:     'M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1',
    menu:       'M4 6h16M4 12h16M4 18h16',
    close:      'M6 18L18 6M6 6l12 12',
    bell:       'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9',
    search:     'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
  };
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d={paths[name] ?? paths.grid} />
    </svg>
  );
};

const formatDateTime = (date, time) => {
  if (!date) return '-';
  const dateText = new Date(date).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
  const timeText = time ? String(time).slice(0, 5) : '';
  return timeText ? `${dateText} ${timeText}` : dateText;
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const role = extractRoleFromToken(token);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeNav, setActiveNav] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
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
    const todaysAppointments = appointments.filter((a) => a.appointmentDate === todayIso);
    const pendingInvoices = invoices.filter((i) => ['Unpaid', 'Overdue', 'Partial'].includes(i.status));
    const pendingLabRequests = labRequests.filter((item) => ['Pending', 'InProgress'].includes(item.status));
    const pendingAmount = pendingInvoices.reduce((sum, item) => sum + Math.max(Number(item.totalAmount || 0) - Number(item.paidAmount || 0), 0), 0);

    return [
      { label: 'Total Patients', value: String(patients.length), delta: 'Active accounts', color: 'blue', icon: 'patients' },
      { label: 'Active Doctors', value: String(doctors.length), delta: 'Registered doctors', color: 'violet', icon: 'folder' },
      { label: "Today's Appointments", value: String(todaysAppointments.length), delta: `${todaysAppointments.filter((a) => a.status === 'Pending').length} pending`, color: 'teal', icon: 'calendar' },
      { label: 'Pending Invoices', value: String(pendingInvoices.length), delta: `LKR ${pendingAmount.toLocaleString()}`, color: 'amber', icon: 'document' },
      { label: 'Medicines in Stock', value: String(medicines.length), delta: `${medicines.filter((m) => Number(m.stockQuantity || 0) <= 10).length} low stock`, color: 'green', icon: 'flask' },
      { label: 'Lab Requests Pending', value: String(pendingLabRequests.length), delta: `${pendingLabRequests.filter((r) => r.priority === 'Urgent').length} urgent`, color: 'rose', icon: 'grid' },
    ];
  }, [users, doctors, appointments, invoices, medicines, labRequests, todayIso]);

  const recentAppointments = useMemo(() => appointments.slice().sort((a, b) => `${b.appointmentDate} ${b.appointmentTime}`.localeCompare(`${a.appointmentDate} ${a.appointmentTime}`)).slice(0, 8), [appointments]);
  const pendingInvoicesList = useMemo(() => invoices.filter((i) => ['Unpaid', 'Overdue', 'Partial'].includes(i.status)).slice(0, 8), [invoices]);
  const recentUsers = useMemo(() => users.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 8), [users]);

  if (!token) return <Navigate to="/login" replace />;
  if (role !== 'admin') return <Navigate to="/dashboard" replace />;

  const handleNav = (id) => {
    setActiveNav(id);
    if (id === 'dashboard') return;
    navigate(`/admin/${id}`);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    navigate('/login');
  };

  const headerDate = new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="flex h-screen glass-page font-sans overflow-hidden">
      
      {/* Sidebar */}
      <aside className={`flex flex-col bg-gradient-to-b from-blue-900 via-blue-800 to-blue-900 text-white transition-all duration-300 shrink-0 ${sidebarOpen ? 'w-60' : 'w-16'}`}>
        <div className="flex items-center justify-center h-16 border-b border-white/10 shrink-0">
          <img src="/logo.png" alt="HEALIX" className="h-8 w-8 object-contain shrink-0" />
          {sidebarOpen && <span className="font-extrabold text-lg tracking-tight ml-3 truncate">HEALIX</span>}
        </div>

        {sidebarOpen && (
          <div className="mx-4 mt-5 mb-2 p-3 bg-white/10 rounded-xl shadow-inner border border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-500 shadow-md flex items-center justify-center text-sm font-extrabold shrink-0 border border-blue-400">AD</div>
              <div className="min-w-0">
                <p className="text-sm font-extrabold truncate">Administrator</p>
                <p className="text-[10px] uppercase tracking-widest text-blue-200 mt-0.5">System Ops</p>
              </div>
            </div>
          </div>
        )}

        <nav className="flex-1 overflow-y-auto py-3 scrollbar-thin">
          {NAV_SECTIONS.map(({ heading, items }) => (
            <div key={heading} className="mb-2 mt-2">
              {sidebarOpen && <p className="px-5 text-[10px] font-extrabold uppercase tracking-widest text-blue-300 mb-2">{heading}</p>}
              {items.map(({ id, label, icon }) => (
                <button key={id} onClick={() => handleNav(id)}
                  className={`w-full flex items-center gap-3 px-5 py-3 text-sm font-semibold transition-all ${activeNav === id ? 'bg-white/15 text-white border-r-4 border-white shadow-inner' : 'text-blue-100 hover:bg-white/10 hover:text-white'}`}>
                  <Icon name={icon} className="w-5 h-5 shrink-0" />
                  {sidebarOpen && <span className="truncate">{label}</span>}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="border-t border-white/10 p-3 flex flex-col gap-1 shrink-0">
          <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2 text-sm font-semibold text-red-300 hover:bg-red-500/20 hover:text-red-200 rounded-lg transition-all">
            <Icon name="logout" className="w-5 h-5 shrink-0" />
            {sidebarOpen && <span>Logout</span>}
          </button>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="flex items-center gap-3 px-3 py-2 text-sm font-semibold text-blue-200 hover:bg-white/10 rounded-lg transition-all">
            <Icon name={sidebarOpen ? 'close' : 'menu'} className="w-5 h-5 shrink-0" />
            {sidebarOpen && <span>Collapse</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-col flex-1 overflow-hidden bg-gray-50/50">
        {/* Header */}
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-gray-200 flex items-center justify-between px-6 shrink-0 shadow-sm z-10">
          <div>
            <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">Admin Dashboard</h1>
            <p className="text-xs font-medium text-gray-500 mt-0.5">{headerDate} — Operations Overview</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 bg-gray-100/80 rounded-full px-4 py-2 text-sm text-gray-500 border border-gray-200 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
              <Icon name="search" className="w-4 h-4" />
              <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search records..." className="bg-transparent text-sm focus:outline-none w-48" />
            </div>
            <button className="relative p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors">
              <Icon name="bell" className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
            </button>
            <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-sm font-bold text-white shadow-md cursor-pointer hover:bg-blue-700 transition-colors">AD</div>
          </div>
        </header>

        {/* Scroll Area */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 scrollbar-thin">
          <div className="max-w-screen-2xl mx-auto">
            {error && <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 font-medium shadow-sm flex items-center gap-3"><Icon name="close" className="w-5 h-5" />{error}</div>}
            {loading && <div className="mb-6 rounded-xl border border-blue-100 bg-blue-50/50 p-4 text-sm text-blue-700 font-medium shadow-sm flex items-center gap-3 animate-pulse"><div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />Syncing data from live systems...</div>}

            {/* Hero Banner */}
            <div className="mb-8 bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-900 rounded-3xl p-8 text-white flex flex-col lg:flex-row lg:items-center justify-between shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl mix-blend-screen" />
              <div className="absolute bottom-0 left-20 -mb-10 w-40 h-40 bg-blue-400 opacity-20 rounded-full blur-2xl mix-blend-screen" />
              <div className="relative z-10 max-w-lg">
                <p className="text-blue-200 text-sm font-bold uppercase tracking-widest mb-1 shadow-sm">Good afternoon, Administrator</p>
                <p className="text-3xl lg:text-4xl font-extrabold mt-1 leading-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-blue-100">Hospital Operations are Running Smoothly</p>
                <p className="text-sm text-blue-100/90 mt-3 leading-relaxed font-medium">All {doctors.length} doctors and {users.length} registered users successfully synchronized with the central database.</p>
              </div>
              <div className="relative z-10 flex flex-wrap gap-4 mt-6 lg:mt-0">
                <div className="text-center bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 shadow-inner flex-1 min-w-[120px]">
                  <p className="text-4xl font-extrabold text-white">{appointments.filter(a => a.appointmentDate === todayIso).length}</p>
                  <p className="text-[10px] text-blue-200 uppercase tracking-widest font-bold mt-1">Today Appts</p>
                </div>
                <div className="text-center bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 shadow-inner flex-1 min-w-[120px]">
                  <p className="text-4xl font-extrabold text-red-100">{labRequests.filter(l => l.priority === 'Urgent').length}</p>
                  <p className="text-[10px] text-red-300 uppercase tracking-widest font-bold mt-1">Urgent Labs</p>
                </div>
              </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-5 mb-8">
              {kpis.map((card) => {
                const { bg, icon, ring } = COLOR_MAP[card.color];
                return (
                  <div key={card.label} className={`${bg} rounded-3xl p-5 ring-1 ${ring} transition-all duration-300 hover:-translate-y-1 hover:shadow-lg shadow-sm bg-opacity-70 backdrop-blur-sm group`}>
                    <div className={`w-10 h-10 rounded-2xl ${icon} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}><Icon name={card.icon} /></div>
                    <p className="text-3xl font-extrabold text-gray-900 group-hover:text-blue-900 transition-colors">{card.value}</p>
                    <p className="text-xs font-bold text-gray-700 mt-1">{card.label}</p>
                    <p className="text-[10px] text-gray-500 mt-1 truncate font-medium">{card.delta}</p>
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
              {/* Appointments */}
              <div className="xl:col-span-2 glass-card p-6 md:p-8 rounded-3xl shadow-lg border border-white/60 bg-white/60 backdrop-blur-xl">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="font-extrabold text-xl text-gray-900">Recent Appointments</h2>
                    <p className="text-xs text-gray-500 font-medium mt-1">Latest patient consultations</p>
                  </div>
                  <button onClick={() => navigate('/admin/appointments')} className="text-blue-600 text-sm font-extrabold bg-blue-50 px-4 py-2 rounded-xl hover:bg-blue-100 transition-colors">Manage All</button>
                </div>
                {!recentAppointments.length ? <p className="text-sm text-gray-500 font-medium bg-gray-50 p-4 rounded-xl text-center border border-gray-100">No appointments recorded.</p> : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left border-collapse">
                      <thead>
                        <tr className="text-gray-400 border-b-2 border-gray-100">
                          <th className="pb-3 px-2 font-bold uppercase tracking-wider text-[10px]">Patient</th>
                          <th className="pb-3 px-2 font-bold uppercase tracking-wider text-[10px]">Doctor</th>
                          <th className="pb-3 px-2 font-bold uppercase tracking-wider text-[10px]">Time</th>
                          <th className="pb-3 px-2 font-bold uppercase tracking-wider text-[10px] text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {recentAppointments.map(a => (
                          <tr key={a.appointmentId} className="hover:bg-white/50 transition-colors">
                            <td className="py-4 px-2 font-bold text-gray-900">{a.patientName}</td>
                            <td className="py-4 px-2 text-gray-600 font-medium flex items-center gap-2"><div className="w-6 h-6 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[8px] font-bold text-indigo-700">DR</div>{a.doctorName}</td>
                            <td className="py-4 px-2 text-gray-500 font-medium">{formatDateTime(a.appointmentDate, a.appointmentTime)}</td>
                            <td className="py-4 px-2 text-right">
                              <span className={`inline-flex px-3 py-1 rounded-full text-xs font-extrabold ${a.status === 'Completed' ? 'bg-green-100 text-green-700' : a.status === 'Pending' ? 'bg-amber-100 text-amber-700' : a.status === 'Cancelled' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{a.status}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Invoices */}
              <div className="glass-card p-6 md:p-8 rounded-3xl shadow-lg border border-white/60 bg-white/60 backdrop-blur-xl flex flex-col">
                <div className="mb-6">
                  <h2 className="font-extrabold text-xl text-gray-900">Pending Invoices</h2>
                  <p className="text-xs text-gray-500 font-medium mt-1">Outstanding billing queue</p>
                </div>
                {!pendingInvoicesList.length ? <p className="text-sm text-gray-500 font-medium bg-gray-50 p-4 rounded-xl text-center border border-gray-100 mt-auto mb-auto">No pending invoices.</p> : (
                  <div className="space-y-4 flex-1 overflow-y-auto pr-2 scrollbar-thin">
                    {pendingInvoicesList.map(i => (
                      <div key={i.invoiceId} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-shadow group">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-extrabold text-sm text-gray-900 group-hover:text-blue-600 transition-colors">{i.patientName || `Patient #${i.patientId}`}</span>
                          <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md ${i.status === 'Overdue' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{i.status}</span>
                        </div>
                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">INV-{i.invoiceId}</p>
                        <div className="bg-gray-50 rounded-xl p-3 flex justify-between items-center border border-gray-100/50">
                          <p className="text-xs font-semibold text-gray-500">Due Amount</p>
                          <p className="text-sm font-extrabold text-gray-900">LKR {Math.max(Number(i.totalAmount||0) - Number(i.paidAmount||0), 0).toLocaleString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Users */}
            <div className="mt-8 glass-card p-6 md:p-8 rounded-3xl shadow-lg border border-white/60 bg-white/60 backdrop-blur-xl">
               <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="font-extrabold text-xl text-gray-900">Recently Registered Users</h2>
                    <p className="text-xs text-gray-500 font-medium mt-1">Latest system enrolments</p>
                  </div>
                  <button onClick={() => navigate('/admin/users')} className="text-blue-600 text-sm font-extrabold bg-blue-50 px-4 py-2 rounded-xl hover:bg-blue-100 transition-colors">Manage Users</button>
               </div>
               {!recentUsers.length ? <p className="text-sm text-gray-500 bg-gray-50 p-4 rounded-xl text-center border border-gray-100">No users found.</p> : (
                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                   {recentUsers.map(u => (
                     <div key={u.userId} className="p-4 border border-gray-100 rounded-2xl bg-white shadow-sm hover:shadow-md transition-shadow flex items-center gap-4 group">
                       <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-100 to-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center font-extrabold text-sm uppercase shadow-inner group-hover:scale-110 transition-transform">
                         {u.username.slice(0,2)}
                       </div>
                       <div className="overflow-hidden flex-1">
                         <p className="text-sm font-bold text-gray-900 truncate group-hover:text-blue-600 transition-colors">{u.username}</p>
                         <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-0.5">{u.role}</p>
                       </div>
                     </div>
                   ))}
                 </div>
               )}
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}
