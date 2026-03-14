import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { extractRoleFromToken } from '../utils/auth';

/* ─── Mock Data ──────────────────────────────────────────── */
const DOCTOR = {
  name: 'Dr. James Harrington',
  initials: 'JH',
  specialty: 'Neurology',
  department: 'Neurology Dept.',
  license: 'MED-2018-04422',
  experience: '8 years',
  rating: 4.9,
  phone: '+1 (555) 204-3310',
};

const KPI_CARDS = [
  { label: "Today's Appointments", value: '8',  delta: '3 remaining',      positive: null,  icon: 'calendar', color: 'blue'   },
  { label: 'My Patients',          value: '156', delta: '+4 this week',     positive: true,  icon: 'patients', color: 'violet' },
  { label: 'Prescriptions Issued', value: '12',  delta: 'this week',        positive: null,  icon: 'document', color: 'teal'   },
  { label: 'Lab Requests Pending', value: '5',   delta: '2 urgent',         positive: false, icon: 'flask',    color: 'amber'  },
  { label: 'Completed Today',      value: '5',   delta: 'of 8 scheduled',   positive: true,  icon: 'check',    color: 'green'  },
  { label: 'Follow-ups Due',       value: '7',   delta: 'next 3 days',      positive: null,  icon: 'clock',    color: 'indigo' },
];

const TODAY_APPOINTMENTS = [
  { id: 'APT-4420', patient: 'Robert Davies',   age: 54, time: '08:30 AM', reason: 'Migraine follow-up',        status: 'Completed', type: 'Follow-up'   },
  { id: 'APT-4421', patient: 'Nimal Perera',    age: 40, time: '09:15 AM', reason: 'EEG result review',         status: 'Completed', type: 'Consultation' },
  { id: 'APT-4422', patient: 'Anjali Silva',    age: 32, time: '10:00 AM', reason: 'Epilepsy medication check', status: 'Completed', type: 'Follow-up'   },
  { id: 'APT-4423', patient: 'Kamal Fernando',  age: 61, time: '10:45 AM', reason: 'Stroke rehabilitation',     status: 'Completed', type: 'Review'      },
  { id: 'APT-4424', patient: 'Sara Williams',   age: 28, time: '11:30 AM', reason: 'Headache assessment',       status: 'Completed', type: 'New Patient' },
  { id: 'APT-4425', patient: 'Tom Nguyen',      age: 47, time: '01:00 PM', reason: 'Parkinson follow-up',       status: 'In Progress', type: 'Follow-up' },
  { id: 'APT-4426', patient: 'Maria Gonzalez',  age: 35, time: '02:00 PM', reason: 'Neuropathy consultation',   status: 'Waiting',   type: 'Consultation' },
  { id: 'APT-4427', patient: 'David Chen',      age: 58, time: '03:00 PM', reason: 'Post-op nerve assessment',  status: 'Waiting',   type: 'Review'      },
];

const RECENT_PATIENTS = [
  { name: 'Robert Davies',  age: 54, condition: 'Chronic Migraine',  lastVisit: '3 Mar 2026',  status: 'Stable'   },
  { name: 'Kamal Fernando', age: 61, condition: 'Ischemic Stroke',   lastVisit: '3 Mar 2026',  status: 'Critical' },
  { name: 'Anjali Silva',   age: 32, condition: 'Epilepsy',          lastVisit: '3 Mar 2026',  status: 'Stable'   },
  { name: 'Sara Williams',  age: 28, condition: 'Tension Headache',  lastVisit: '3 Mar 2026',  status: 'Good'     },
  { name: 'Tom Nguyen',     age: 47, condition: "Parkinson's",       lastVisit: '20 Feb 2026', status: 'Monitor'  },
  { name: 'Maria Gonzalez', age: 35, condition: 'Peripheral Neuropathy', lastVisit: '15 Feb 2026', status: 'Monitor' },
];

const PENDING_LAB = [
  { id: 'LAB-2091', patient: 'Kamal Fernando', test: 'Brain MRI Scan',         ordered: '02 Mar 2026', urgent: true  },
  { id: 'LAB-2090', patient: 'Robert Davies',  test: 'EEG Recording',          ordered: '02 Mar 2026', urgent: true  },
  { id: 'LAB-2088', patient: 'Tom Nguyen',     test: 'Dopamine Level Panel',   ordered: '28 Feb 2026', urgent: false },
  { id: 'LAB-2085', patient: 'Anjali Silva',   test: 'AED Blood Level',        ordered: '25 Feb 2026', urgent: false },
  { id: 'LAB-2083', patient: 'David Chen',     test: 'Nerve Conduction Study', ordered: '20 Feb 2026', urgent: false },
];

const WEEK_SCHEDULE = [
  { day: 'Mon',  slots: 8,  booked: 8  },
  { day: 'Tue',  slots: 8,  booked: 6  },
  { day: 'Wed',  slots: 6,  booked: 6  },
  { day: 'Thu',  slots: 8,  booked: 5  },
  { day: 'Fri',  slots: 8,  booked: 8  },
  { day: 'Sat',  slots: 4,  booked: 2  },
  { day: 'Sun',  slots: 0,  booked: 0  },
];

/* ─── Sidebar nav ─────────────────────────────────────────── */
const NAV_SECTIONS = [
  {
    heading: 'Overview',
    items: [{ id: 'dashboard', label: 'Dashboard', icon: 'grid' }],
  },
  {
    heading: 'Clinical Work',
    items: [
      { id: 'schedule',     label: 'My Schedule',       icon: 'calendar' },
      { id: 'appointments', label: 'Appointments',       icon: 'clipboard' },
      { id: 'patients',     label: 'My Patients',        icon: 'patients' },
      { id: 'records',      label: 'Patient Records',    icon: 'folder' },
    ],
  },
  {
    heading: 'Prescriptions & Labs',
    items: [
      { id: 'prescriptions', label: 'Prescriptions',    icon: 'document' },
      { id: 'lab-request',   label: 'Request Lab Test', icon: 'flask' },
      { id: 'lab-reports',   label: 'Lab Reports',      icon: 'chart' },
    ],
  },
  {
    heading: 'Personal',
    items: [
      { id: 'availability', label: 'My Availability', icon: 'clock' },
      { id: 'notes',        label: 'Clinical Notes',  icon: 'edit'  },
      { id: 'profile',      label: 'My Profile',      icon: 'user'  },
    ],
  },
];

/* ─── Helpers ────────────────────────────────────────────── */
const COLOR_MAP = {
  blue:   { bg: 'bg-blue-50',   icon: 'bg-blue-100 text-blue-600',     ring: 'ring-blue-200'   },
  violet: { bg: 'bg-violet-50', icon: 'bg-violet-100 text-violet-600', ring: 'ring-violet-200' },
  teal:   { bg: 'bg-teal-50',   icon: 'bg-teal-100 text-teal-600',     ring: 'ring-teal-200'   },
  amber:  { bg: 'bg-amber-50',  icon: 'bg-amber-100 text-amber-600',   ring: 'ring-amber-200'  },
  green:  { bg: 'bg-green-50',  icon: 'bg-green-100 text-green-600',   ring: 'ring-green-200'  },
  indigo: { bg: 'bg-indigo-50', icon: 'bg-indigo-100 text-indigo-600', ring: 'ring-indigo-200' },
};

const CONDITION_BADGE = {
  Stable:   'bg-green-100 text-green-700',
  Good:     'bg-blue-100 text-blue-700',
  Monitor:  'bg-amber-100 text-amber-700',
  Critical: 'bg-red-100 text-red-700',
};

const STATUS_BADGE = {
  Completed:    'bg-blue-100 text-blue-700',
  'In Progress':'bg-green-100 text-green-700',
  Waiting:      'bg-amber-100 text-amber-700',
  Cancelled:    'bg-red-100 text-red-700',
};

const APPT_TYPE_BADGE = {
  'Follow-up':   'bg-violet-100 text-violet-700',
  Consultation:  'bg-teal-100 text-teal-700',
  Review:        'bg-indigo-100 text-indigo-700',
  'New Patient': 'bg-cyan-100 text-cyan-700',
};

/* ─── Icon sprite ────────────────────────────────────────── */
const Icon = ({ name, className = 'w-5 h-5' }) => {
  const paths = {
    grid:       'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z',
    calendar:   'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
    clipboard:  'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
    patients:   'M17 20h5v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2h5M12 12a4 4 0 100-8 4 4 0 000 8z',
    folder:     'M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z',
    document:   'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    flask:      'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z',
    chart:      'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
    clock:      'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
    edit:       'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
    user:       'M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z',
    logout:     'M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1',
    menu:       'M4 6h16M4 12h16M4 18h16',
    close:      'M6 18L18 6M6 6l12 12',
    bell:       'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9',
    search:     'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
    check:      'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
    up:         'M5 10l7-7m0 0l7 7m-7-7v18',
    down:       'M19 14l-7 7m0 0l-7-7m7 7V3',
    star:       'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z',
    badge:      'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z',
  };
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d={paths[name] ?? paths.grid} />
    </svg>
  );
};

/* ─── Doctor Dashboard ───────────────────────────────────── */
export default function DoctorDashboard() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const role = extractRoleFromToken(token);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeNav, setActiveNav]     = useState('dashboard');
  const [toast, setToast]             = useState(null);

  if (!token) return <Navigate to="/login" replace />;
  if (role !== 'doctor') return <Navigate to="/dashboard" replace />;

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
    setActiveNav(id);
    if (id === 'dashboard') {
      return;
    }

    if (id === 'schedule' || id === 'availability') {
      navigate('/doctor/schedule');
      return;
    }

    if (id === 'profile') {
      navigate('/doctor/profile');
      return;
    }

    showToast(label);
  };

  const completedToday = TODAY_APPOINTMENTS.filter(a => a.status === 'Completed').length;
  const progressPct    = Math.round((completedToday / TODAY_APPOINTMENTS.length) * 100);

  return (
    <div className="flex h-screen bg-gray-50 font-sans overflow-hidden">

      {/* ── Sidebar ──────────────────────────────────────── */}
      <aside className={`flex flex-col bg-gradient-to-b from-teal-900 via-teal-800 to-teal-900 text-white transition-all duration-300 shrink-0 ${sidebarOpen ? 'w-60' : 'w-16'}`}>

        {/* Logo */}
        <div className="flex items-center gap-3 px-4 h-16 border-b border-white/10 shrink-0">
          <img src="/logo.png" alt="HEALIX" className="h-8 w-8 object-contain shrink-0" />
          {sidebarOpen && <span className="font-extrabold text-lg tracking-tight truncate">HEALIX</span>}
        </div>

        {/* Doctor mini-profile */}
        {sidebarOpen && (
          <div className="mx-3 mt-4 mb-1 p-3 bg-white/10 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-teal-400 flex items-center justify-center text-sm font-bold shrink-0">
                {DOCTOR.initials}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold truncate">{DOCTOR.name}</p>
                <p className="text-xs text-teal-200 truncate">{DOCTOR.specialty}</p>
              </div>
            </div>
            <div className="mt-2 flex items-center gap-1">
              <Icon name="star" className="w-3.5 h-3.5 text-amber-300" />
              <span className="text-xs text-teal-100 font-medium">{DOCTOR.rating} rating · {DOCTOR.experience}</span>
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 scrollbar-thin">
          {NAV_SECTIONS.map(({ heading, items }) => (
            <div key={heading} className="mb-1">
              {sidebarOpen && (
                <p className="px-4 text-[10px] font-bold uppercase tracking-widest text-teal-300 mb-1 mt-3">{heading}</p>
              )}
              {items.map(({ id, label, icon }) => (
                <button
                  key={id}
                  onClick={() => handleNav(id, label)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-all ${
                    activeNav === id
                      ? 'bg-white/15 text-white border-r-2 border-white'
                      : 'text-teal-100 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Icon name={icon} className="w-[18px] h-[18px] shrink-0" />
                  {sidebarOpen && <span className="truncate">{label}</span>}
                </button>
              ))}
            </div>
          ))}
        </nav>

        {/* Bottom */}
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
            className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-teal-200 hover:bg-white/10 rounded-lg transition-all"
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
            <h1 className="text-lg font-bold text-gray-900">Doctor Dashboard</h1>
            <p className="text-xs text-gray-400">Monday, 3 March 2026 — {DOCTOR.department}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 bg-gray-100 rounded-full px-3 py-1.5 text-sm text-gray-400">
              <Icon name="search" className="w-4 h-4" />
              <span>Search patients…</span>
            </div>
            <button className="relative p-2 rounded-full hover:bg-gray-100 transition-colors" onClick={() => showToast('Notifications')}>
              <Icon name="bell" className="w-5 h-5 text-gray-500" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            </button>
            <div className="flex items-center gap-2 bg-teal-600 text-white rounded-full pl-2 pr-3 py-1">
              <div className="w-7 h-7 rounded-full bg-teal-400 flex items-center justify-center text-xs font-bold">{DOCTOR.initials}</div>
              <span className="text-sm font-semibold hidden sm:block">Doctor</span>
            </div>
          </div>
        </header>

        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto p-6">

          {/* ── Today's progress banner ────────────────── */}
          <div className="mb-5 bg-gradient-to-r from-teal-600 to-teal-700 rounded-2xl p-5 text-white flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1">
              <p className="text-teal-100 text-sm font-medium">Good afternoon, {DOCTOR.name}</p>
              <p className="text-xl font-extrabold mt-0.5">
                You&apos;ve completed <span className="text-teal-200">{completedToday}</span> of <span className="text-teal-200">{TODAY_APPOINTMENTS.length}</span> appointments today
              </p>
              <div className="mt-3 h-2 bg-white/20 rounded-full overflow-hidden w-full max-w-xs">
                <div
                  className="h-full bg-white rounded-full transition-all duration-700"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <p className="text-xs text-teal-200 mt-1">{progressPct}% complete · {TODAY_APPOINTMENTS.length - completedToday} remaining</p>
            </div>
            <div className="flex items-center gap-4 shrink-0">
              <div className="text-center">
                <p className="text-2xl font-extrabold">{PENDING_LAB.filter(l => l.urgent).length}</p>
                <p className="text-xs text-teal-200">Urgent Labs</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-extrabold">7</p>
                <p className="text-xs text-teal-200">Follow-ups Due</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-extrabold">{DOCTOR.rating}</p>
                <p className="text-xs text-teal-200">Rating</p>
              </div>
            </div>
          </div>

          {/* ── KPI Cards ──────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
            {KPI_CARDS.map(({ label, value, delta, positive, icon, color }) => {
              const c = COLOR_MAP[color];
              return (
                <div key={label} className={`${c.bg} rounded-2xl p-4 ring-1 ${c.ring} hover:shadow-md transition-shadow`}>
                  <div className={`w-9 h-9 rounded-xl ${c.icon} flex items-center justify-center mb-3`}>
                    <Icon name={icon} className="w-4.5 h-4.5 w-[18px] h-[18px]" />
                  </div>
                  <p className="text-2xl font-extrabold text-gray-900 leading-tight">{value}</p>
                  <p className="text-xs font-semibold text-gray-600 mt-0.5 leading-snug">{label}</p>
                  <p className={`text-[11px] mt-1 font-medium ${positive === true ? 'text-green-600' : positive === false ? 'text-red-500' : 'text-gray-400'}`}>{delta}</p>
                </div>
              );
            })}
          </div>

          {/* ── Middle row ─────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">

            {/* Today's appointment schedule */}
            <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <h2 className="text-sm font-bold text-gray-800">Today&apos;s Schedule</h2>
                <button onClick={() => showToast('Appointments')} className="text-xs text-teal-600 font-semibold hover:underline">Full view →</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    <tr>
                      <th className="text-left px-5 py-2.5">Time</th>
                      <th className="text-left px-3 py-2.5">Patient</th>
                      <th className="text-left px-3 py-2.5 hidden md:table-cell">Reason</th>
                      <th className="text-left px-3 py-2.5">Type</th>
                      <th className="text-left px-3 py-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {TODAY_APPOINTMENTS.map(({ id, patient, age, time, reason, status, type }) => (
                      <tr key={id} className={`hover:bg-gray-50/60 transition-colors ${status === 'In Progress' ? 'bg-teal-50/40' : ''}`}>
                        <td className="px-5 py-3 font-mono text-xs text-gray-500 whitespace-nowrap">
                          {status === 'In Progress' && <span className="inline-block w-1.5 h-1.5 bg-teal-500 rounded-full mr-1.5 animate-pulse" />}
                          {time}
                        </td>
                        <td className="px-3 py-3">
                          <p className="font-semibold text-gray-800 whitespace-nowrap">{patient}</p>
                          <p className="text-xs text-gray-400">Age {age}</p>
                        </td>
                        <td className="px-3 py-3 text-gray-500 text-xs hidden md:table-cell max-w-[160px] truncate">{reason}</td>
                        <td className="px-3 py-3">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${APPT_TYPE_BADGE[type] ?? 'bg-gray-100 text-gray-600'}`}>{type}</span>
                        </td>
                        <td className="px-3 py-3">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_BADGE[status]}`}>{status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Weekly schedule load */}
            <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-5">
              <h2 className="text-sm font-bold text-gray-800 mb-4">This Week&apos;s Load</h2>
              <div className="flex items-end gap-2 h-28 mb-3">
                {WEEK_SCHEDULE.map(({ day, slots, booked }, i) => {
                  const pct = slots ? Math.round((booked / slots) * 100) : 0;
                  const isToday = i === 0;
                  return (
                    <div key={day} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className={`w-full rounded-t-md ${isToday ? 'bg-teal-600' : pct === 100 ? 'bg-amber-400' : 'bg-teal-200'}`}
                        style={{ height: `${slots ? pct : 8}%`, minHeight: slots ? '4px' : 0 }}
                      />
                      <span className={`text-[10px] font-semibold ${isToday ? 'text-teal-700' : 'text-gray-400'}`}>{day}</span>
                    </div>
                  );
                })}
              </div>
              <div className="flex flex-col gap-2 mt-4">
                {WEEK_SCHEDULE.map(({ day, slots, booked }, i) => (
                  <div key={day} className="flex items-center justify-between text-xs">
                    <span className={`font-medium ${i === 0 ? 'text-teal-700' : 'text-gray-500'}`}>{day}{i === 0 ? ' (Today)' : ''}</span>
                    <span className="text-gray-700 font-bold">{booked}<span className="text-gray-400 font-normal">/{slots}</span></span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Bottom row ─────────────────────────────── */}
          <div className="grid grid-cols-1 xl:grid-cols-5 gap-4 mb-6">

            {/* My Patients list */}
            <div className="xl:col-span-3 bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <h2 className="text-sm font-bold text-gray-800">My Patients</h2>
                <button onClick={() => showToast('My Patients')} className="text-xs text-teal-600 font-semibold hover:underline">View all 156 →</button>
              </div>
              <div className="divide-y divide-gray-50">
                {RECENT_PATIENTS.map(({ name, age, condition, lastVisit, status }) => (
                  <div key={name} className="px-5 py-3 flex items-center gap-3 hover:bg-gray-50/60 transition-colors">
                    <div className="w-9 h-9 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-xs font-bold shrink-0">
                      {name.split(' ').map(w => w[0]).join('').slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800">{name} <span className="text-gray-400 font-normal text-xs">· {age}y</span></p>
                      <p className="text-xs text-gray-400 truncate">{condition} · Last seen {lastVisit}</p>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${CONDITION_BADGE[status]}`}>{status}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Pending Lab Reports */}
            <div className="xl:col-span-2 bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <h2 className="text-sm font-bold text-gray-800">Pending Lab Reports</h2>
                <button onClick={() => showToast('Lab Reports')} className="text-xs text-teal-600 font-semibold hover:underline">View all →</button>
              </div>
              <div className="divide-y divide-gray-50">
                {PENDING_LAB.map(({ id, patient, test, ordered, urgent }) => (
                  <div key={id} className="px-5 py-3 hover:bg-gray-50/60 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          {urgent && <span className="text-[10px] font-bold bg-red-100 text-red-600 px-1.5 py-0.5 rounded">URGENT</span>}
                          <span className="text-xs font-mono text-gray-400">{id}</span>
                        </div>
                        <p className="text-sm font-semibold text-gray-800">{patient}</p>
                        <p className="text-xs text-gray-400 truncate">{test}</p>
                      </div>
                      <p className="text-[11px] text-gray-400 whitespace-nowrap shrink-0 mt-1">{ordered}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Quick Actions ───────────────────────────── */}
          <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-5">
            <h2 className="text-sm font-bold text-gray-800 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Write Prescription',   icon: 'document',  color: 'teal'   },
                { label: 'Request Lab Test',      icon: 'flask',     color: 'amber'  },
                { label: 'Add Clinical Note',     icon: 'edit',      color: 'indigo' },
                { label: 'View Patient Records',  icon: 'folder',    color: 'blue'   },
                { label: 'Mark Availability',     icon: 'clock',     color: 'green'  },
                { label: 'Appointment History',   icon: 'clipboard', color: 'violet' },
                { label: 'View Lab Reports',      icon: 'chart',     color: 'teal'   },
                { label: 'My Profile Settings',   icon: 'user',      color: 'indigo' },
              ].map(({ label, icon, color }) => {
                const c = COLOR_MAP[color];
                const routeByLabel = {
                  'Mark Availability': '/doctor/schedule',
                  'My Profile Settings': '/doctor/profile',
                };

                const handleActionClick = () => {
                  const route = routeByLabel[label];
                  if (route) {
                    navigate(route);
                    return;
                  }

                  showToast(label);
                };

                return (
                  <button
                    key={label}
                    onClick={handleActionClick}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-left text-sm font-semibold ${c.bg} hover:shadow-sm active:scale-95 transition-all ring-1 ${c.ring}`}
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

        </main>
      </div>

      {/* ── Toast ────────────────────────────────────────── */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-gray-900 text-white text-sm font-medium px-5 py-3 rounded-2xl shadow-2xl">
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
