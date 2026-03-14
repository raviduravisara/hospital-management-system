import { Navigate, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { extractRoleFromToken } from '../utils/auth';

/* ─── Mock Data ──────────────────────────────────────────── */
const KPI_CARDS = [
  { label: 'Total Patients',       value: '1,284', delta: '+12 this week',  positive: true,  icon: 'patients',    color: 'blue'   },
  { label: 'Active Doctors',       value: '32',    delta: '+2 this month',  positive: true,  icon: 'doctors',     color: 'violet' },
  { label: "Today's Appointments", value: '48',    delta: '6 pending',      positive: null,  icon: 'calendar',    color: 'teal'   },
  { label: 'Pending Invoices',     value: '14',    delta: '$8,420 total',   positive: null,  icon: 'billing',     color: 'amber'  },
  { label: 'Monthly Revenue',      value: '$48,250', delta: '+8.3% vs last',positive: true,  icon: 'revenue',     color: 'green'  },
  { label: 'Medicines in Stock',   value: '342',   delta: '18 low stock',   positive: false, icon: 'medicine',    color: 'cyan'   },
  { label: 'Lab Reports Pending',  value: '23',    delta: '5 urgent',       positive: false, icon: 'lab',         color: 'rose'   },
  { label: 'Registered Users',     value: '67',    delta: '3 unverified',   positive: null,  icon: 'users',       color: 'indigo' },
];

const RECENT_APPOINTMENTS = [
  { id: 'APT-4421', patient: 'Emily Johnson',  doctor: 'Dr. Sarah Mitchell',    dept: 'Cardiology',  time: '09:00 AM', status: 'Confirmed' },
  { id: 'APT-4420', patient: 'Robert Davies',  doctor: 'Dr. James Harrington',  dept: 'Neurology',   time: '09:30 AM', status: 'Waiting'   },
  { id: 'APT-4419', patient: 'Priya Nair',     doctor: 'Dr. Anika Patel',       dept: 'Pediatrics',  time: '10:00 AM', status: 'Confirmed' },
  { id: 'APT-4418', patient: 'James Carter',   doctor: 'Dr. Michael Torres',    dept: 'Orthopedics', time: '10:30 AM', status: 'Completed' },
  { id: 'APT-4417', patient: 'Sara Williams',  doctor: 'Dr. Sarah Mitchell',    dept: 'Cardiology',  time: '11:00 AM', status: 'Cancelled' },
  { id: 'APT-4416', patient: 'Tom Nguyen',     doctor: 'Dr. James Harrington',  dept: 'Neurology',   time: '11:30 AM', status: 'Waiting'   },
];

const RECENT_USERS = [
  { name: 'Emily Johnson',  role: 'Patient',  email: 'emily@example.com',   joined: '2 Mar 2026',  status: 'Active'   },
  { name: 'Dr. Anika Patel',role: 'Doctor',   email: 'anika@healix.health', joined: '28 Feb 2026', status: 'Active'   },
  { name: 'Robert Davies',  role: 'Patient',  email: 'rdavies@example.com', joined: '25 Feb 2026', status: 'Active'   },
  { name: 'Sara Williams',  role: 'Patient',  email: 'sara.w@example.com',  joined: '20 Feb 2026', status: 'Pending'  },
  { name: 'Dr. Kevin Marsh',role: 'Doctor',   email: 'kmarsh@healix.health',joined: '18 Feb 2026', status: 'Active'   },
];

const PENDING_INVOICES = [
  { id: 'INV-0881', patient: 'Emily Johnson',  amount: '$1,200', date: '02 Mar 2026', due: '09 Mar 2026', status: 'Unpaid'    },
  { id: 'INV-0880', patient: 'James Carter',   amount: '$850',   date: '01 Mar 2026', due: '08 Mar 2026', status: 'Unpaid'    },
  { id: 'INV-0879', patient: 'Priya Nair',     amount: '$310',   date: '28 Feb 2026', due: '06 Mar 2026', status: 'Overdue'   },
  { id: 'INV-0878', patient: 'Tom Nguyen',     amount: '$640',   date: '27 Feb 2026', due: '05 Mar 2026', status: 'Partial'   },
];

const DEPT_STATS = [
  { dept: 'Cardiology',   patients: 312, pct: 78 },
  { dept: 'Neurology',    patients: 248, pct: 62 },
  { dept: 'Pediatrics',   patients: 198, pct: 50 },
  { dept: 'Orthopedics',  patients: 176, pct: 44 },
  { dept: 'Radiology',    patients: 145, pct: 36 },
  { dept: 'Emergency',    patients: 205, pct: 51 },
];

/* ─── Sidebar nav items ──────────────────────────────────── */
const NAV_SECTIONS = [
  {
    heading: 'Overview',
    items: [{ id: 'dashboard', label: 'Dashboard',  icon: 'grid' }],
  },
  {
    heading: 'User Management',
    items: [
      { id: 'users',    label: 'All Users',     icon: 'users'    },
      { id: 'doctors',  label: 'Doctors',       icon: 'stethoscope' },
      { id: 'patients', label: 'Patients',      icon: 'user-circle' },
      { id: 'roles',    label: 'Roles & Perms', icon: 'shield'   },
    ],
  },
  {
    heading: 'Clinical',
    items: [
      { id: 'appointments',  label: 'Appointments',  icon: 'calendar'  },
      { id: 'prescriptions', label: 'Prescriptions', icon: 'document'  },
      { id: 'medicines',     label: 'Medicines',     icon: 'pill'      },
      { id: 'lab',           label: 'Lab Reports',   icon: 'flask'     },
    ],
  },
  {
    heading: 'Finance',
    items: [
      { id: 'billing',  label: 'Billing',   icon: 'cash'  },
      { id: 'invoices', label: 'Invoices',  icon: 'receipt' },
      { id: 'payments', label: 'Payments',  icon: 'credit' },
    ],
  },
  {
    heading: 'System',
    items: [
      { id: 'reports',  label: 'Reports',         icon: 'chart'    },
      { id: 'audit',    label: 'Audit Logs',      icon: 'history'  },
      { id: 'settings', label: 'System Settings', icon: 'cog'      },
    ],
  },
];

/* ─── Color helpers ──────────────────────────────────────── */
const COLOR_MAP = {
  blue:   { bg: 'bg-blue-50',   icon: 'bg-blue-100 text-blue-600',   ring: 'ring-blue-200'   },
  violet: { bg: 'bg-violet-50', icon: 'bg-violet-100 text-violet-600', ring: 'ring-violet-200' },
  teal:   { bg: 'bg-teal-50',   icon: 'bg-teal-100 text-teal-600',   ring: 'ring-teal-200'   },
  amber:  { bg: 'bg-amber-50',  icon: 'bg-amber-100 text-amber-600', ring: 'ring-amber-200'  },
  green:  { bg: 'bg-green-50',  icon: 'bg-green-100 text-green-600', ring: 'ring-green-200'  },
  cyan:   { bg: 'bg-cyan-50',   icon: 'bg-cyan-100 text-cyan-600',   ring: 'ring-cyan-200'   },
  rose:   { bg: 'bg-rose-50',   icon: 'bg-rose-100 text-rose-600',   ring: 'ring-rose-200'   },
  indigo: { bg: 'bg-indigo-50', icon: 'bg-indigo-100 text-indigo-600', ring: 'ring-indigo-200' },
};

const STATUS_BADGE = {
  Confirmed: 'bg-green-100 text-green-700',
  Waiting:   'bg-amber-100 text-amber-700',
  Completed: 'bg-blue-100 text-blue-700',
  Cancelled: 'bg-red-100 text-red-700',
  Active:    'bg-green-100 text-green-700',
  Pending:   'bg-amber-100 text-amber-700',
  Unpaid:    'bg-red-100 text-red-700',
  Overdue:   'bg-rose-100 text-rose-800',
  Partial:   'bg-orange-100 text-orange-700',
};

/* ─── SVG Icons ──────────────────────────────────────────── */
const Icon = ({ name, className = 'w-5 h-5' }) => {
  const paths = {
    grid:         'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z',
    users:        'M17 20h5v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2h5M12 12a4 4 0 100-8 4 4 0 000 8z',
    stethoscope:  'M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18',
    'user-circle':'M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z',
    shield:       'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
    calendar:     'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
    document:     'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    pill:         'M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z',
    flask:        'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z',
    cash:         'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z',
    receipt:      'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01',
    credit:       'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z',
    chart:        'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
    history:      'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
    cog:          'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
    menu:         'M4 6h16M4 12h16M4 18h16',
    close:        'M6 18L18 6M6 6l12 12',
    logout:       'M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1',
    bell:         'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9',
    search:       'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
    // KPI icons
    patients:     'M17 20h5v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2h5M12 12a4 4 0 100-8 4 4 0 000 8z',
    doctors:      'M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18',
    billing:      'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
    revenue:      'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    medicine:     'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z',
    lab:          'M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2z',
    up:           'M5 10l7-7m0 0l7 7m-7-7v18',
    down:         'M19 14l-7 7m0 0l-7-7m7 7V3',
  };
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d={paths[name] ?? paths.grid} />
    </svg>
  );
};

/* ─── Admin Dashboard ────────────────────────────────────── */
export default function AdminDashboard() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const role = extractRoleFromToken(token);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeNav, setActiveNav] = useState('dashboard');
  const [toast, setToast] = useState(null);

  if (!token) return <Navigate to="/login" replace />;
  if (role !== 'admin') return <Navigate to="/dashboard" replace />;

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    navigate('/login');
  };

  const showToast = (label) => {
    setToast(label);
    setTimeout(() => setToast(null), 3000);
  };

  const handleNav = (id, label) => {
    if (id === 'dashboard') {
      setActiveNav('dashboard');
    } else {
      setActiveNav(id);
      showToast(label);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 font-sans overflow-hidden">

      {/* ── Sidebar ──────────────────────────────────────── */}
      <aside
        className={`flex flex-col bg-gradient-to-b from-blue-900 via-blue-800 to-blue-900 text-white transition-all duration-300 shrink-0 ${
          sidebarOpen ? 'w-60' : 'w-16'
        }`}
      >
        {/* Logo area */}
        <div className="flex items-center gap-3 px-4 h-16 border-b border-white/10 shrink-0">
          <img src="/logo.png" alt="HEALIX" className="h-8 w-8 object-contain shrink-0" />
          {sidebarOpen && <span className="font-extrabold text-lg tracking-tight truncate">HEALIX</span>}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 scrollbar-thin">
          {NAV_SECTIONS.map(({ heading, items }) => (
            <div key={heading} className="mb-2">
              {sidebarOpen && (
                <p className="px-4 text-[10px] font-bold uppercase tracking-widest text-blue-300 mb-1 mt-3">{heading}</p>
              )}
              {items.map(({ id, label, icon }) => (
                <button
                  key={id}
                  onClick={() => handleNav(id, label)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-all rounded-none ${
                    activeNav === id
                      ? 'bg-white/15 text-white border-r-2 border-white'
                      : 'text-blue-100 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Icon name={icon} className="w-4.5 h-4.5 shrink-0 w-[18px] h-[18px]" />
                  {sidebarOpen && <span className="truncate">{label}</span>}
                </button>
              ))}
            </div>
          ))}
        </nav>

        {/* Bottom: toggle + logout */}
        <div className="border-t border-white/10 p-3 flex flex-col gap-1 shrink-0">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-red-300 hover:bg-red-500/20 hover:text-red-200 rounded-lg transition-all"
          >
            <Icon name="logout" className="w-[18px] h-[18px] shrink-0" />
            {sidebarOpen && <span>Logout</span>}
          </button>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-blue-200 hover:bg-white/10 rounded-lg transition-all"
          >
            <Icon name={sidebarOpen ? 'close' : 'menu'} className="w-[18px] h-[18px] shrink-0" />
            {sidebarOpen && <span>Collapse</span>}
          </button>
        </div>
      </aside>

      {/* ── Main ─────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 overflow-hidden">

        {/* Top bar */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0 shadow-sm">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-xs text-gray-400">Welcome back — here&apos;s your system overview</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="hidden md:flex items-center gap-2 bg-gray-100 rounded-full px-3 py-1.5 text-sm text-gray-400">
              <Icon name="search" className="w-4 h-4" />
              <span>Search…</span>
            </div>
            {/* Notification bell */}
            <button className="relative p-2 rounded-full hover:bg-gray-100 transition-colors" onClick={() => showToast('Notifications')}>
              <Icon name="bell" className="w-5 h-5 text-gray-500" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            </button>
            {/* Avatar */}
            <div className="flex items-center gap-2 bg-blue-600 text-white rounded-full pl-2 pr-3 py-1">
              <div className="w-7 h-7 rounded-full bg-blue-400 flex items-center justify-center text-xs font-bold">AD</div>
              <span className="text-sm font-semibold hidden sm:block">Admin</span>
            </div>
          </div>
        </header>

        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto p-6">

          {/* ── KPI Cards ──────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
            {KPI_CARDS.map(({ label, value, delta, positive, icon, color }) => {
              const c = COLOR_MAP[color];
              return (
                <div key={label} className={`${c.bg} rounded-2xl p-4 ring-1 ${c.ring} hover:shadow-md transition-shadow`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className={`w-10 h-10 rounded-xl ${c.icon} flex items-center justify-center`}>
                      <Icon name={icon} className="w-5 h-5" />
                    </div>
                    {positive !== null && (
                      <span className={`text-xs font-semibold flex items-center gap-0.5 ${positive ? 'text-green-600' : 'text-red-500'}`}>
                        <Icon name={positive ? 'up' : 'down'} className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                  <p className="text-2xl font-extrabold text-gray-900 leading-tight">{value}</p>
                  <p className="text-xs font-semibold text-gray-600 mt-0.5">{label}</p>
                  <p className={`text-[11px] mt-1 font-medium ${positive === true ? 'text-green-600' : positive === false ? 'text-red-500' : 'text-gray-400'}`}>{delta}</p>
                </div>
              );
            })}
          </div>

          {/* ── Middle row ─────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">

            {/* Department Load */}
            <div className="bg-white rounded-2xl p-5 shadow-sm ring-1 ring-gray-100">
              <h2 className="text-sm font-bold text-gray-800 mb-4">Department Patient Load</h2>
              <div className="flex flex-col gap-3">
                {DEPT_STATS.map(({ dept, patients, pct }) => (
                  <div key={dept}>
                    <div className="flex justify-between text-xs text-gray-600 mb-1">
                      <span className="font-medium">{dept}</span>
                      <span className="font-bold text-gray-800">{patients}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Revenue trend (mock bar chart) */}
            <div className="bg-white rounded-2xl p-5 shadow-sm ring-1 ring-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-gray-800">Monthly Revenue</h2>
                <span className="text-xs text-green-600 font-semibold bg-green-50 px-2 py-0.5 rounded-full">+8.3%</span>
              </div>
              {/* Simple mock bar chart */}
              {(() => {
                const bars = [
                  { month: 'Sep', val: 62 },{ month: 'Oct', val: 74 },
                  { month: 'Nov', val: 68 },{ month: 'Dec', val: 80 },
                  { month: 'Jan', val: 71 },{ month: 'Feb', val: 85 },
                  { month: 'Mar', val: 92 },
                ];
                return (
                  <div className="flex items-end gap-2 h-28">
                    {bars.map(({ month, val }, i) => (
                      <div key={month} className="flex-1 flex flex-col items-center gap-1">
                        <div
                          className={`w-full rounded-t-md transition-all duration-500 ${i === bars.length - 1 ? 'bg-blue-600' : 'bg-blue-200'}`}
                          style={{ height: `${val}%` }}
                        />
                        <span className="text-[10px] text-gray-400 font-medium">{month}</span>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* Appointment status breakdown (donut mock) */}
            <div className="bg-white rounded-2xl p-5 shadow-sm ring-1 ring-gray-100">
              <h2 className="text-sm font-bold text-gray-800 mb-4">Appointment Status</h2>
              <div className="flex flex-col gap-2.5">
                {[
                  { label: 'Confirmed',  count: 28, pct: 58, color: 'bg-green-500'  },
                  { label: 'Waiting',    count: 12, pct: 25, color: 'bg-amber-400'  },
                  { label: 'Completed',  count: 6,  pct: 13, color: 'bg-blue-500'   },
                  { label: 'Cancelled',  count: 2,  pct: 4,  color: 'bg-red-400'    },
                ].map(({ label, count, pct, color }) => (
                  <div key={label} className="flex items-center gap-3">
                    <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${color}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between text-xs mb-0.5">
                        <span className="text-gray-600 font-medium">{label}</span>
                        <span className="text-gray-800 font-bold">{count}</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-gray-400 mt-4">Today&apos;s 48 appointments</p>
            </div>
          </div>

          {/* ── Bottom row ─────────────────────────────── */}
          <div className="grid grid-cols-1 xl:grid-cols-5 gap-4 mb-6">

            {/* Recent Appointments table */}
            <div className="xl:col-span-3 bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <h2 className="text-sm font-bold text-gray-800">Today&apos;s Appointments</h2>
                <button
                  onClick={() => showToast('Appointments')}
                  className="text-xs text-blue-600 font-semibold hover:underline"
                >
                  View all →
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    <tr>
                      <th className="text-left px-5 py-2.5">ID</th>
                      <th className="text-left px-3 py-2.5">Patient</th>
                      <th className="text-left px-3 py-2.5 hidden md:table-cell">Doctor</th>
                      <th className="text-left px-3 py-2.5 hidden lg:table-cell">Dept.</th>
                      <th className="text-left px-3 py-2.5">Time</th>
                      <th className="text-left px-3 py-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {RECENT_APPOINTMENTS.map(({ id, patient, doctor, dept, time, status }) => (
                      <tr key={id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="px-5 py-3 text-xs text-gray-400 font-mono">{id}</td>
                        <td className="px-3 py-3 font-medium text-gray-800 whitespace-nowrap">{patient}</td>
                        <td className="px-3 py-3 text-gray-500 hidden md:table-cell whitespace-nowrap">{doctor}</td>
                        <td className="px-3 py-3 text-gray-500 hidden lg:table-cell">{dept}</td>
                        <td className="px-3 py-3 text-gray-500 whitespace-nowrap">{time}</td>
                        <td className="px-3 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_BADGE[status]}`}>{status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pending Invoices */}
            <div className="xl:col-span-2 bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <h2 className="text-sm font-bold text-gray-800">Pending Invoices</h2>
                <button onClick={() => showToast('Billing')} className="text-xs text-blue-600 font-semibold hover:underline">View all →</button>
              </div>
              <div className="divide-y divide-gray-50">
                {PENDING_INVOICES.map(({ id, patient, amount, due, status }) => (
                  <div key={id} className="px-5 py-3 flex items-center gap-3 hover:bg-gray-50/60 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{patient}</p>
                      <p className="text-xs text-gray-400 font-mono">{id} · Due {due}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-gray-900">{amount}</p>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_BADGE[status]}`}>{status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Bottom: Recent Users + Quick Actions ───── */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

            {/* Recent Users */}
            <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <h2 className="text-sm font-bold text-gray-800">Recently Registered Users</h2>
                <button onClick={() => showToast('User Management')} className="text-xs text-blue-600 font-semibold hover:underline">Manage →</button>
              </div>
              <div className="divide-y divide-gray-50">
                {RECENT_USERS.map(({ name, role: r, email, joined, status }) => (
                  <div key={email} className="px-5 py-3 flex items-center gap-3 hover:bg-gray-50/60 transition-colors">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${r === 'Doctor' ? 'bg-violet-100 text-violet-600' : 'bg-blue-100 text-blue-600'}`}>
                      {name.split(' ').map(w => w[0]).join('').slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{name}</p>
                      <p className="text-xs text-gray-400 truncate">{email} · {joined}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${r === 'Doctor' ? 'bg-violet-100 text-violet-700' : 'bg-blue-100 text-blue-700'}`}>{r}</span>
                      <span className={`text-[10px] font-semibold ${STATUS_BADGE[status]?.replace('bg-', 'text-').replace('-100', '-600')}`}>{status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-5">
              <h2 className="text-sm font-bold text-gray-800 mb-4">Quick Actions</h2>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Add New User',        icon: 'users',    color: 'blue'   },
                  { label: 'Schedule Doctor',      icon: 'doctors',  color: 'violet' },
                  { label: 'Generate Report',      icon: 'chart',    color: 'teal'   },
                  { label: 'Create Invoice',       icon: 'receipt',  color: 'amber'  },
                  { label: 'View Audit Log',       icon: 'history',  color: 'indigo' },
                  { label: 'System Settings',      icon: 'cog',      color: 'rose'   },
                  { label: 'Manage Medicines',     icon: 'pill',     color: 'cyan'   },
                  { label: 'Lab Report Queue',     icon: 'flask',    color: 'green'  },
                ].map(({ label, icon, color }) => {
                  const c = COLOR_MAP[color];
                  return (
                    <button
                      key={label}
                      onClick={() => showToast(label)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-left text-sm font-semibold ${c.bg} ${c.icon.split(' ')[1]} hover:shadow-sm active:scale-95 transition-all ring-1 ${c.ring}`}
                    >
                      <div className={`w-8 h-8 rounded-lg ${c.icon} flex items-center justify-center shrink-0`}>
                        <Icon name={icon} className="w-4 h-4" />
                      </div>
                      <span className="text-gray-700 leading-tight">{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

        </main>
      </div>

      {/* ── Toast ────────────────────────────────────────── */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-gray-900 text-white text-sm font-medium px-5 py-3 rounded-2xl shadow-2xl animate-bounce-once">
          <svg className="w-4 h-4 text-amber-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 3a9 9 0 100 18A9 9 0 0012 3z" />
          </svg>
          <span><strong>{toast}</strong> — not yet implemented</span>
          <button onClick={() => setToast(null)} className="text-gray-400 hover:text-white ml-1">
            <Icon name="close" className="w-4 h-4" />
          </button>
        </div>
      )}

    </div>
  );
}

