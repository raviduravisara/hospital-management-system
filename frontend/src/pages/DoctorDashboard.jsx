import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axios';
import { extractRoleFromToken } from '../utils/auth';

const CLINICAL_NOTES_STORAGE_KEY = 'doctorDashboardClinicalNotes';
const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

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
  Pending:      'bg-amber-100 text-amber-700',
  Confirmed:    'bg-green-100 text-green-700',
  Completed:    'bg-blue-100 text-blue-700',
  Cancelled:    'bg-red-100 text-red-700',
};

const APPT_TYPE_BADGE = {
  'Follow-up':   'bg-violet-100 text-violet-700',
  Consultation:  'bg-teal-100 text-teal-700',
  Review:        'bg-indigo-100 text-indigo-700',
  'New Visit':   'bg-cyan-100 text-cyan-700',
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

const formatDateLabel = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatTimeLabel = (value) => {
  if (!value) return '-';
  const raw = String(value).slice(0, 5);
  const date = new Date(`1970-01-01T${raw}:00`);
  if (Number.isNaN(date.getTime())) return raw;
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
};

const getDayKey = (dateValue) => {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', { weekday: 'short' });
};

const getApiErrorMessage = (error, fallbackMessage) => {
  const data = error?.response?.data;
  if (typeof data === 'string' && data.trim()) {
    return data;
  }

  if (data?.message) {
    return data.message;
  }

  if (data?.title) {
    return data.title;
  }

  if (data?.errors && typeof data.errors === 'object') {
    const firstError = Object.values(data.errors).flat()[0];
    if (firstError) {
      return String(firstError);
    }
  }

  return fallbackMessage;
};

/* ─── Doctor Dashboard ───────────────────────────────────── */
export default function DoctorDashboard() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const role = extractRoleFromToken(token);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeNav, setActiveNav]     = useState('dashboard');
  const [toast, setToast]             = useState(null);
  const [doctorProfile, setDoctorProfile] = useState(null);
  const [doctorLoading, setDoctorLoading] = useState(true);
  const [doctorLoadError, setDoctorLoadError] = useState('');
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState('');
  const [appointments, setAppointments] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [weeklySchedules, setWeeklySchedules] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');
  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
  const [isLabRequestModalOpen, setIsLabRequestModalOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState('');
  const [clinicalNotes, setClinicalNotes] = useState([]);
  const [labRequestForm, setLabRequestForm] = useState({
    patientId: '',
    appointmentId: '',
    testName: '',
    priority: 'Routine',
    notes: '',
  });
  const [labRequests, setLabRequests] = useState([]);
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    specialization: '',
    licenseNumber: '',
    phone: '',
    consultationFee: '',
  });
  const topRef = useRef(null);
  const scheduleRef = useRef(null);
  const patientsRef = useRef(null);
  const labReportsRef = useRef(null);
  const quickActionsRef = useRef(null);

  const mapDoctorProfileForDashboard = (profile) => {
    const firstName = profile.firstName ?? '';
    const lastName = profile.lastName ?? '';
    const name = `${firstName} ${lastName}`.trim() || 'Doctor';
    const initials = [firstName?.[0], lastName?.[0]].filter(Boolean).join('').toUpperCase() || 'DR';

    return {
      ...profile,
      name,
      initials,
      specialty: profile.specialization ?? 'General Medicine',
      department: profile.specialization ? `${profile.specialization} Dept.` : 'Doctor Department',
      license: profile.licenseNumber ?? '',
      rating: profile.rating ?? null,
      experience: profile.experience ?? null,
    };
  };

  useEffect(() => {
    const loadDoctorProfile = async () => {
      if (!token || role !== 'doctor') {
        setDoctorLoading(false);
        return;
      }

      setDoctorLoadError('');
      setDoctorLoading(true);

      try {
        const response = await axiosInstance.get('/api/doctors/me');
        const profile = response.data || {};
        setDoctorProfile(mapDoctorProfileForDashboard(profile));
      } catch (err) {
        setDoctorLoadError(err.response?.data?.message || 'Unable to load doctor profile.');
      } finally {
        setDoctorLoading(false);
      }
    };

    loadDoctorProfile();
  }, [token, role]);

  useEffect(() => {
    const loadDashboardData = async () => {
      if (!doctorProfile?.doctorId) {
        setDashboardLoading(false);
        return;
      }

      setDashboardLoading(true);
      setDashboardError('');

      try {
        const [appointmentsRes, prescriptionsRes, schedulesRes, labRequestsRes] = await Promise.all([
          axiosInstance.get(`/api/appointments/doctor/${doctorProfile.doctorId}`),
          axiosInstance.get(`/api/prescriptions/doctor/${doctorProfile.doctorId}`),
          axiosInstance.get('/api/doctors/me/schedules'),
          axiosInstance.get('/api/lab-requests/me').catch(() => ({ data: [] })),
        ]);

        setAppointments(Array.isArray(appointmentsRes.data) ? appointmentsRes.data : []);
        setPrescriptions(Array.isArray(prescriptionsRes.data) ? prescriptionsRes.data : []);
        setWeeklySchedules(Array.isArray(schedulesRes.data) ? schedulesRes.data : []);
        setLabRequests(Array.isArray(labRequestsRes.data) ? labRequestsRes.data : []);
      } catch (err) {
        setDashboardError(err.response?.data?.message || 'Unable to load dashboard data.');
      } finally {
        setDashboardLoading(false);
      }
    };

    loadDashboardData();
  }, [doctorProfile?.doctorId]);

  useEffect(() => {
    try {
      const storedNotes = JSON.parse(localStorage.getItem(CLINICAL_NOTES_STORAGE_KEY) ?? '[]');
      if (Array.isArray(storedNotes)) {
        setClinicalNotes(storedNotes);
      }
    } catch {
      setClinicalNotes([]);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(CLINICAL_NOTES_STORAGE_KEY, JSON.stringify(clinicalNotes));
  }, [clinicalNotes]);

  const activeDoctor = doctorProfile;
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const pendingLabItems = useMemo(
    () =>
      labRequests.map((item) => ({
        id: `LR-${item.requestId}`,
        requestId: item.requestId,
        patient: item.patientName,
        patientFormattedId: item.patientFormattedId,
        test: item.testName,
        ordered: formatDateLabel(item.requestedAt),
        urgent: item.priority === 'Urgent',
        status: item.status,
        hasReport: item.hasReport,
        reportFileUrl: item.reportFileUrl,
        reportFileName: item.reportFileName,
        reportUploadedAt: item.reportUploadedAt,
      })),
    [labRequests],
  );

  const todayIso = new Date().toISOString().slice(0, 10);

  const dashboardAppointments = useMemo(() => {
    const prescriptionByAppointmentId = new Map(
      prescriptions
        .filter((item) => item.appointmentId != null)
        .map((item) => [item.appointmentId, item]),
    );

    return appointments
      .map((item) => {
        const linkedPrescription = prescriptionByAppointmentId.get(item.appointmentId);
        return {
          id: `APT-${item.appointmentId}`,
          patient: item.patientName || 'Unknown Patient',
          patientFormattedId: item.patientFormattedId,
          rawTime: String(item.appointmentTime || '00:00:00'),
          time: formatTimeLabel(item.appointmentTime),
          reason: item.reason || 'General consultation',
          status: item.status || 'Pending',
          type: linkedPrescription ? 'Follow-up' : 'New Visit',
          appointmentDate: item.appointmentDate,
        };
      })
      .sort((a, b) => a.rawTime.localeCompare(b.rawTime));
  }, [appointments, prescriptions]);

  const todayAppointments = useMemo(
    () => dashboardAppointments.filter((item) => item.appointmentDate === todayIso),
    [dashboardAppointments, todayIso],
  );

  const patientSummaries = useMemo(() => {
    const byPatient = new Map();
    const latestDiagnosisByPatient = new Map();

    prescriptions.forEach((item) => {
      if (!latestDiagnosisByPatient.has(item.patientName)) {
        latestDiagnosisByPatient.set(item.patientName, item.diagnosis || 'Recent prescription');
      }
    });

    appointments
      .slice()
      .sort((a, b) => String(b.appointmentDate).localeCompare(String(a.appointmentDate)))
      .forEach((item) => {
        if (byPatient.has(item.patientName)) return;
        const latestDiagnosis = latestDiagnosisByPatient.get(item.patientName);
        byPatient.set(item.patientName, {
          name: item.patientName,
          formattedId: item.patientFormattedId,
          condition: latestDiagnosis || item.reason || 'General follow-up',
          lastVisit: formatDateLabel(item.appointmentDate),
          status: item.status === 'Cancelled' ? 'Critical' : item.status === 'Completed' ? 'Stable' : 'Monitor',
        });
      });

    return Array.from(byPatient.values()).slice(0, 10);
  }, [appointments, prescriptions]);

  const patientOptions = useMemo(() => {
    const map = new Map();
    appointments.forEach((item) => {
      if (!map.has(item.patientId)) {
        map.set(item.patientId, {
          patientId: item.patientId,
          patientName: item.patientName,
          patientFormattedId: item.patientFormattedId,
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.patientName.localeCompare(b.patientName));
  }, [appointments]);

  const appointmentOptionsForSelectedPatient = useMemo(() => {
    const patientId = Number(labRequestForm.patientId);
    if (!patientId) return [];
    return appointments
      .filter((item) => item.patientId === patientId)
      .map((item) => ({
        appointmentId: item.appointmentId,
        label: `${item.appointmentDate} ${formatTimeLabel(item.appointmentTime)} (${item.status})`,
      }));
  }, [appointments, labRequestForm.patientId]);

  const weekLoad = useMemo(() => {
    const slotsByDay = new Map(WEEK_DAYS.map((day) => [day, 0]));
    const bookedByDay = new Map(WEEK_DAYS.map((day) => [day, 0]));
    const now = new Date();
    const dayIndex = (now.getDay() + 6) % 7;
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - dayIndex);
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);

    weeklySchedules.forEach((item) => {
      if (!item.isAvailable) return;
      const dayKey = (item.dayOfWeek || '').slice(0, 3);
      if (!slotsByDay.has(dayKey)) return;

      const slotMinutes = Number(item.slotDurationMinutes || 0);
      const start = item.startTime ? String(item.startTime).slice(0, 5) : null;
      const end = item.endTime ? String(item.endTime).slice(0, 5) : null;

      let computedSlots = 0;
      if (slotMinutes > 0 && start && end) {
        const startDate = new Date(`1970-01-01T${start}:00`);
        const endDate = new Date(`1970-01-01T${end}:00`);
        const diffMinutes = Math.max(Math.floor((endDate - startDate) / 60000), 0);
        computedSlots = Math.floor(diffMinutes / slotMinutes);
      }

      slotsByDay.set(dayKey, slotsByDay.get(dayKey) + computedSlots);
    });

    appointments.forEach((item) => {
      if (item.status === 'Cancelled') return;
      const appointmentDate = new Date(item.appointmentDate);
      if (Number.isNaN(appointmentDate.getTime())) return;
      if (appointmentDate < startOfWeek || appointmentDate >= endOfWeek) return;
      const dayKey = getDayKey(item.appointmentDate);
      if (!bookedByDay.has(dayKey)) return;
      bookedByDay.set(dayKey, bookedByDay.get(dayKey) + 1);
    });

    const todayDay = getDayKey(new Date().toISOString());

    return WEEK_DAYS.map((day) => ({
      day,
      slots: slotsByDay.get(day) || 0,
      booked: bookedByDay.get(day) || 0,
      isToday: day === todayDay,
    }));
  }, [appointments, weeklySchedules]);

  const filteredAppointments = useMemo(() => {
    if (!normalizedSearch) return todayAppointments;
    return todayAppointments.filter((item) =>
      [item.patient, item.reason, item.type, item.status, item.id].some((value) =>
        String(value).toLowerCase().includes(normalizedSearch))
    );
  }, [normalizedSearch, todayAppointments]);

  const filteredPatients = useMemo(() => {
    if (!normalizedSearch) return patientSummaries;
    return patientSummaries.filter((item) =>
      [item.name, item.condition, item.status].some((value) =>
        String(value).toLowerCase().includes(normalizedSearch))
    );
  }, [normalizedSearch, patientSummaries]);

  const filteredLabReports = useMemo(() => {
    if (!normalizedSearch) return pendingLabItems;
    return pendingLabItems.filter((item) =>
      [item.id, item.patient, item.test, item.status].some((value) =>
        String(value).toLowerCase().includes(normalizedSearch))
    );
  }, [normalizedSearch, pendingLabItems]);

  const thisWeekIso = new Date();
  thisWeekIso.setDate(thisWeekIso.getDate() - 7);
  const prescriptionsThisWeek = prescriptions.filter((item) => new Date(item.prescriptionDate) >= thisWeekIso);
  const completedToday = todayAppointments.filter((item) => item.status === 'Completed').length;
  const openTodayCount = todayAppointments.filter((item) => item.status !== 'Completed').length;

  const kpiCards = [
    {
      label: "Today's Appointments",
      value: String(todayAppointments.length),
      delta: `${Math.max(todayAppointments.length - completedToday, 0)} remaining`,
      positive: null,
      icon: 'calendar',
      color: 'blue',
    },
    {
      label: 'My Patients',
      value: String(patientSummaries.length),
      delta: 'active patients',
      positive: true,
      icon: 'patients',
      color: 'violet',
    },
    {
      label: 'Prescriptions Issued',
      value: String(prescriptionsThisWeek.length),
      delta: 'this week',
      positive: null,
      icon: 'document',
      color: 'teal',
    },
    {
      label: 'Lab Requests Pending',
      value: String(pendingLabItems.length),
      delta: `${pendingLabItems.filter((item) => item.urgent).length} urgent`,
      positive: pendingLabItems.filter((item) => item.urgent).length === 0,
      icon: 'flask',
      color: 'amber',
    },
    {
      label: 'Completed Today',
      value: String(completedToday),
      delta: `of ${todayAppointments.length} scheduled`,
      positive: true,
      icon: 'check',
      color: 'green',
    },
    {
      label: 'Follow-ups Due',
      value: String(openTodayCount),
      delta: 'open today',
      positive: null,
      icon: 'clock',
      color: 'indigo',
    },
  ];

  if (!token) return <Navigate to="/login" replace />;
  if (role !== 'doctor') return <Navigate to="/dashboard" replace />;

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    navigate('/login');
  };

  const showToast = (label, pending = true) => {
    setToast({ label, pending });
    setTimeout(() => setToast(null), 3000);
  };

  const openEditModal = () => {
    if (!doctorProfile) return;
    setEditError('');
    setEditForm({
      firstName: doctorProfile.firstName ?? '',
      lastName: doctorProfile.lastName ?? '',
      specialization: doctorProfile.specialization ?? '',
      licenseNumber: doctorProfile.licenseNumber ?? '',
      phone: doctorProfile.phone ?? '',
      consultationFee: doctorProfile.consultationFee != null ? String(doctorProfile.consultationFee) : '',
    });
    setIsEditModalOpen(true);
  };

  const handleEditInputChange = (event) => {
    const { name, value } = event.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditSave = async (event) => {
    event.preventDefault();

    if (!editForm.firstName.trim() || !editForm.lastName.trim() || !editForm.licenseNumber.trim()) {
      setEditError('First name, last name, and license number are required.');
      return;
    }

    const fee = Number(editForm.consultationFee || 0);
    if (Number.isNaN(fee) || fee < 0) {
      setEditError('Consultation fee must be 0 or greater.');
      return;
    }

    setEditSaving(true);
    setEditError('');

    const requestBody = {
      userId: null,
      firstName: editForm.firstName.trim(),
      lastName: editForm.lastName.trim(),
      specialization: editForm.specialization.trim() || null,
      licenseNumber: editForm.licenseNumber.trim(),
      phone: editForm.phone.trim() || null,
      consultationFee: fee,
    };

    try {
      const response = await axiosInstance.put('/api/doctors/me', requestBody);
      const updatedProfile = response.data || {};
      setDoctorProfile(mapDoctorProfileForDashboard(updatedProfile));
      setIsEditModalOpen(false);
      showToast('Profile updated successfully.', false);
    } catch (err) {
      setEditError(err.response?.data?.message || 'Unable to update profile.');
    } finally {
      setEditSaving(false);
    }
  };

  const isProfileNotFound = !doctorLoading && !doctorProfile;

  if (doctorLoading) {
    return (
      <div className="min-h-screen glass-page flex items-center justify-center p-6">
        <div className="rounded-3xl glass-card p-8 text-center">
          <p className="text-sm text-gray-600">Loading your doctor profile...</p>
        </div>
      </div>
    );
  }

  if (isProfileNotFound) {
    return (
      <div className="min-h-screen glass-page p-6 md:p-8">
        <div className="max-w-3xl mx-auto rounded-3xl glass-card p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Doctor Profile Required</h1>
          <p className="mt-4 text-sm text-gray-600">
            We could not find your doctor profile. Please create it before using the professional dashboard.
          </p>
          <p className="mt-2 text-sm text-red-500">{doctorLoadError || 'Doctor profile not found.'}</p>
          <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              to="/doctor/register"
              className="inline-flex items-center justify-center rounded-2xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white hover:bg-teal-700"
            >
              Register Doctor Profile
            </Link>
            <Link
              to="/doctor/profile"
              className="inline-flex items-center justify-center rounded-2xl border border-gray-200 px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-100"
            >
              Manage Profile
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const scrollToSection = (ref) => {
    if (!ref?.current) return;
    ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const openNotesModal = () => {
    setNoteDraft('');
    setIsNotesModalOpen(true);
  };

  const addClinicalNote = (event) => {
    event.preventDefault();
    const trimmed = noteDraft.trim();
    if (!trimmed) {
      return;
    }

    const nextNote = {
      id: `NOTE-${Date.now()}`,
      body: trimmed,
      createdAt: new Date().toISOString(),
    };

    setClinicalNotes((prev) => [nextNote, ...prev].slice(0, 30));
    setNoteDraft('');
    setIsNotesModalOpen(false);
    showToast('Clinical note saved.', false);
  };

  const removeClinicalNote = (noteId) => {
    setClinicalNotes((prev) => prev.filter((item) => item.id !== noteId));
  };

  const openLabRequestModal = () => {
    setLabRequestForm({
      patientId: '',
      appointmentId: '',
      testName: '',
      priority: 'Routine',
      notes: '',
    });
    setIsLabRequestModalOpen(true);
  };

  const handleLabRequestSave = async (event) => {
    event.preventDefault();

    const patientId = Number(labRequestForm.patientId);
    const testName = labRequestForm.testName.trim();

    if (!patientId || !testName) {
      showToast('Please select a patient and provide test details.', false);
      return;
    }

    try {
      const response = await axiosInstance.post('/api/lab-requests', {
        patientId,
        appointmentId: labRequestForm.appointmentId ? Number(labRequestForm.appointmentId) : null,
        testName,
        priority: labRequestForm.priority,
        notes: labRequestForm.notes.trim() || null,
      });

      const created = response.data;
      if (created) {
        setLabRequests((prev) => [created, ...prev]);
      }

      setIsLabRequestModalOpen(false);
      showToast('Lab request added.', false);
      scrollToSection(labReportsRef);
    } catch (requestError) {
      showToast(getApiErrorMessage(requestError, 'Unable to create lab request.'), false);
    }
  };

  const navActionMap = {
    dashboard: () => scrollToSection(topRef),
    schedule: () => navigate('/doctor/schedule'),
    appointments: () => navigate('/doctor/appointments'),
    patients: () => scrollToSection(patientsRef),
    records: () => navigate('/doctor/patient-records'),
    prescriptions: () => navigate('/doctor/prescriptions'),
    'lab-request': () => openLabRequestModal(),
    'lab-reports': () => scrollToSection(labReportsRef),
    availability: () => navigate('/doctor/schedule'),
    notes: () => navigate('/doctor/consultation-notes'),
    profile: () => openEditModal(),
  };

  const handleNav = (id, label) => {
    setActiveNav(id);
    const action = navActionMap[id];

    if (action) {
      action();
      return;
    }

    showToast(`${label} is unavailable right now.`, false);
  };

  const handleQuickAction = (label) => {
    const quickActionMap = {
      'Write Prescription': () => navigate('/doctor/prescriptions'),
      'Request Lab Test': openLabRequestModal,
      'Add Clinical Note': () => navigate('/doctor/consultation-notes'),
      'View Patient Records': () => navigate('/doctor/patient-records'),
      'Mark Availability': () => navigate('/doctor/schedule'),
      'Appointment History': () => navigate('/doctor/appointments'),
      'View Lab Reports': () => scrollToSection(labReportsRef),
      'My Profile Settings': openEditModal,
    };

    const action = quickActionMap[label];
    if (action) {
      action();
      return;
    }

    showToast(`${label} is unavailable right now.`, false);
  };

  const progressPct    = todayAppointments.length > 0
    ? Math.round((completedToday / todayAppointments.length) * 100)
    : 0;
  const headerDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div ref={topRef} className="flex h-screen glass-page font-sans overflow-hidden">

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
                {activeDoctor.initials}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold truncate">{activeDoctor.name}</p>
                <p className="text-xs text-teal-200 truncate">{activeDoctor.specialty}</p>
              </div>
            </div>
            <div className="mt-2 flex items-center gap-1">
              <Icon name="star" className="w-3.5 h-3.5 text-amber-300" />
              <span className="text-xs text-teal-100 font-medium">
                {activeDoctor.rating ?? '-'} rating · {activeDoctor.experience ?? '-'}
              </span>
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
        <header className="h-16 bg-white/70 backdrop-blur border-b border-white/60 flex items-center justify-between px-6 shrink-0 shadow-sm">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Doctor Dashboard</h1>
            <p className="text-xs text-gray-400">{headerDate} — {activeDoctor.department}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 bg-gray-100 rounded-full px-3 py-1.5 text-sm text-gray-500">
              <Icon name="search" className="w-4 h-4" />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search patients, appointments, labs..."
                className="bg-transparent text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none"
              />
            </div>
            <button
              className="relative p-2 rounded-full hover:bg-gray-100 transition-colors"
              onClick={() => showToast('Notifications center will be available soon.')}
            >
              <Icon name="bell" className="w-5 h-5 text-gray-500" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            </button>
            <div className="flex items-center gap-2 bg-teal-600 text-white rounded-full pl-2 pr-3 py-1">
              <div className="w-7 h-7 rounded-full bg-teal-400 flex items-center justify-center text-xs font-bold">{activeDoctor.initials}</div>
              <span className="text-sm font-semibold hidden sm:block">Doctor</span>
            </div>
          </div>
        </header>

        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto p-6">
          {dashboardError && (
            <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {dashboardError}
            </div>
          )}

          {dashboardLoading && (
            <div className="mb-5 rounded-lg border border-white/60 bg-white/65 backdrop-blur px-4 py-3 text-sm text-gray-600">
              Loading appointments, prescriptions, and schedule...
            </div>
          )}

          {/* ── Today's progress banner ────────────────── */}
          <div className="mb-5 bg-gradient-to-r from-teal-600 to-teal-700 rounded-2xl p-5 text-white flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1">
              <p className="text-teal-100 text-sm font-medium">Good afternoon, {activeDoctor.name}</p>
              <p className="text-xl font-extrabold mt-0.5">
                You&apos;ve completed <span className="text-teal-200">{completedToday}</span> of <span className="text-teal-200">{todayAppointments.length}</span> appointments today
              </p>
              <div className="mt-3 h-2 bg-white/20 rounded-full overflow-hidden w-full max-w-xs">
                <div
                  className="h-full bg-white rounded-full transition-all duration-700"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <p className="text-xs text-teal-200 mt-1">
                {progressPct}% complete · {Math.max(todayAppointments.length - completedToday, 0)} remaining
              </p>
            </div>
            <div className="flex items-center gap-4 shrink-0">
              <div className="text-center">
                <p className="text-2xl font-extrabold">{pendingLabItems.filter(l => l.urgent).length}</p>
                <p className="text-xs text-teal-200">Urgent Labs</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-extrabold">
                  {openTodayCount}
                </p>
                <p className="text-xs text-teal-200">Follow-ups Due</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-extrabold">{activeDoctor.rating ?? '-'}</p>
                <p className="text-xs text-teal-200">Rating</p>
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] mb-6">
            <div className="rounded-3xl glass-card p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Professional Profile</h2>
                  <p className="text-sm text-gray-500 mt-1">Your registered doctor profile details.</p>
                </div>
               
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-widest text-gray-500">Doctor ID</p>
                  <p className="mt-2 text-sm font-bold text-blue-600 font-mono tracking-tight">{activeDoctor.formattedId || 'DOC-XXXX'}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-widest text-gray-500">Name</p>
                  <p className="mt-2 text-sm font-semibold text-gray-900">{activeDoctor.name}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-widest text-gray-500">Specialization</p>
                  <p className="mt-2 text-sm font-semibold text-gray-900">{activeDoctor.specialty}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-widest text-gray-500">License</p>
                  <p className="mt-2 text-sm font-semibold text-gray-900">{activeDoctor.license || 'Not set'}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-widest text-gray-500">Phone</p>
                  <p className="mt-2 text-sm font-semibold text-gray-900">{activeDoctor.phone || 'Not set'}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-widest text-gray-500">Department</p>
                  <p className="mt-2 text-sm font-semibold text-gray-900">{activeDoctor.department}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-widest text-gray-500">Consultation Fee</p>
                  <p className="mt-2 text-sm font-semibold text-gray-900">
                    {activeDoctor.consultationFee != null ? `$${Number(activeDoctor.consultationFee).toFixed(2)}` : 'Not set'}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl glass-card p-6">
              <h2 className="text-lg font-bold text-gray-900">Doctor Summary</h2>
              <div className="mt-5 space-y-4">
                <div className="rounded-2xl bg-gray-50 p-4">
                  <p className="text-xs uppercase tracking-widest text-gray-500">Profile status</p>
                  <p className="mt-2 text-sm font-semibold text-gray-900">Active</p>
                </div>
                <div className="rounded-2xl bg-gray-50 p-4">
                  <p className="text-xs uppercase tracking-widest text-gray-500">Specialty area</p>
                  <p className="mt-2 text-sm font-semibold text-gray-900">{activeDoctor.specialty}</p>
                </div>
                <div className="rounded-2xl bg-gray-50 p-4">
                  <p className="text-xs uppercase tracking-widest text-gray-500">Current rating</p>
                  <p className="mt-2 text-sm font-semibold text-gray-900">{activeDoctor.rating ?? 'Not rated'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* ── KPI Cards ──────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
            {kpiCards.map(({ label, value, delta, positive, icon, color }) => {
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
          <div ref={scheduleRef} className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">

            {/* Today's appointment schedule */}
            <div className="lg:col-span-2 glass-card rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <h2 className="text-sm font-bold text-gray-800">Today&apos;s Schedule</h2>
                <button onClick={() => navigate('/doctor/appointments')} className="text-xs text-teal-600 font-semibold hover:underline">Full view →</button>
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
                    {filteredAppointments.map(({ id, patient, patientFormattedId, time, reason, status, type }) => (
                      <tr key={id} className={`hover:bg-gray-50/60 transition-colors ${status === 'In Progress' ? 'bg-teal-50/40' : ''}`}>
                        <td className="px-5 py-3 font-mono text-xs text-gray-500 whitespace-nowrap">
                          {status === 'In Progress' && <span className="inline-block w-1.5 h-1.5 bg-teal-500 rounded-full mr-1.5 animate-pulse" />}
                          {time}
                        </td>
                        <td className="px-3 py-3" title={patientFormattedId}>
                          <p className="font-semibold text-gray-800 whitespace-nowrap">{patient}</p>
                          {patientFormattedId && (
                            <p className="text-[10px] font-bold text-teal-600 font-mono tracking-tight -mt-0.5">
                              {patientFormattedId}
                            </p>
                          )}
                          <p className="text-[10px] text-gray-400 mt-0.5">{status}</p>
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
                    {filteredAppointments.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-5 py-6 text-center text-sm text-gray-500">
                          No appointments match your search.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Weekly schedule load */}
            <div className="glass-card rounded-2xl p-5">
              <h2 className="text-sm font-bold text-gray-800 mb-4">This Week&apos;s Load</h2>
              <div className="flex items-end gap-2 h-28 mb-3">
                {weekLoad.map(({ day, slots, booked, isToday }) => {
                  const pct = slots ? Math.round((booked / slots) * 100) : 0;
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
                {weekLoad.map(({ day, slots, booked, isToday }) => (
                  <div key={day} className="flex items-center justify-between text-xs">
                    <span className={`font-medium ${isToday ? 'text-teal-700' : 'text-gray-500'}`}>{day}{isToday ? ' (Today)' : ''}</span>
                    <span className="text-gray-700 font-bold">{booked}<span className="text-gray-400 font-normal">/{slots}</span></span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Bottom row ─────────────────────────────── */}
          <div className="grid grid-cols-1 xl:grid-cols-5 gap-4 mb-6">

            {/* My Patients list */}
            <div className="xl:col-span-3 glass-card rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <h2 className="text-sm font-bold text-gray-800">My Patients</h2>
                <button onClick={() => navigate('/doctor/appointments')} className="text-xs text-teal-600 font-semibold hover:underline">View all →</button>
              </div>
              <div ref={patientsRef} className="divide-y divide-gray-50">
                {filteredPatients.map(({ name, formattedId, condition, lastVisit, status }) => (
                  <div key={name} className="px-5 py-3 flex items-center gap-3 hover:bg-gray-50/60 transition-colors" title={formattedId}>
                    <div className="w-9 h-9 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-xs font-bold shrink-0">
                      {name.split(' ').map(w => w[0]).join('').slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-gray-800">{name}</p>
                        {formattedId && (
                          <span className="text-[10px] font-bold text-teal-600 font-mono px-1.5 py-0.5 bg-teal-50 rounded">
                            {formattedId}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 truncate">{condition} · Last seen {lastVisit}</p>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${CONDITION_BADGE[status]}`}>{status}</span>
                  </div>
                ))}
                {filteredPatients.length === 0 && (
                  <div className="px-5 py-6 text-center text-sm text-gray-500">
                    No patients match your search.
                  </div>
                )}
              </div>
            </div>

            {/* Pending Lab Reports */}
            <div className="xl:col-span-2 glass-card rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <h2 className="text-sm font-bold text-gray-800">Pending Lab Reports</h2>
                <button onClick={openLabRequestModal} className="text-xs text-teal-600 font-semibold hover:underline">Request new →</button>
              </div>
              <div ref={labReportsRef} className="divide-y divide-gray-50">
                {filteredLabReports.map(({ id, patient, patientFormattedId, test, ordered, urgent, status, hasReport, reportFileUrl, reportUploadedAt }) => (
                  <div key={id} className={`px-5 py-3 hover:bg-gray-50/60 transition-colors ${hasReport ? 'bg-green-50/40' : ''}`} title={patientFormattedId}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          {urgent && <span className="text-[10px] font-bold bg-red-100 text-red-600 px-1.5 py-0.5 rounded">URGENT</span>}
                          <span className="text-[10px] font-mono text-gray-400">{id}</span>
                          {hasReport && (
                            <span className="text-[10px] font-bold bg-green-100 text-green-700 px-1.5 py-0.5 rounded">✓ UPLOADED</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-gray-800">{patient}</p>
                          {patientFormattedId && (
                            <span className="text-[10px] font-bold text-teal-600 font-mono px-1.5 py-0.5 bg-teal-50 rounded">
                              {patientFormattedId}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 truncate">{test} · {hasReport ? 'Report ready' : status}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0 mt-1">
                        <p className="text-[11px] text-gray-400 whitespace-nowrap">{ordered}</p>
                        {hasReport && reportFileUrl && (
                          <a
                            href={reportFileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-full bg-blue-600 px-2.5 py-1 text-[10px] font-semibold text-white hover:bg-blue-700"
                          >
                            ↓ Download
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {filteredLabReports.length === 0 && (
                  <div className="px-5 py-6 text-center text-sm text-gray-500">
                    No lab reports match your search.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Quick Actions ───────────────────────────── */}
          
            
           

        </main>
      </div>

      {isEditModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-gray-900/50"
            onClick={() => !editSaving && setIsEditModalOpen(false)}
          />
          <div className="relative z-10 w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Edit Doctor Profile</h2>
                <p className="mt-1 text-sm text-gray-500">Update your profile details directly from the dashboard.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                disabled={editSaving}
                className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
              >
                <Icon name="close" className="h-5 w-5" />
              </button>
            </div>

            {editError && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {editError}
              </div>
            )}

            <form onSubmit={handleEditSave} className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="text-sm font-medium text-gray-700">
                First Name
                <input
                  name="firstName"
                  value={editForm.firstName}
                  onChange={handleEditInputChange}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-400"
                  required
                />
              </label>

              <label className="text-sm font-medium text-gray-700">
                Last Name
                <input
                  name="lastName"
                  value={editForm.lastName}
                  onChange={handleEditInputChange}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-400"
                  required
                />
              </label>

              <label className="text-sm font-medium text-gray-700">
                Specialization
                <input
                  name="specialization"
                  value={editForm.specialization}
                  onChange={handleEditInputChange}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-400"
                />
              </label>

              <label className="text-sm font-medium text-gray-700">
                License Number
                <input
                  name="licenseNumber"
                  value={editForm.licenseNumber}
                  onChange={handleEditInputChange}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-400"
                  required
                />
              </label>

              <label className="text-sm font-medium text-gray-700">
                Phone
                <input
                  name="phone"
                  value={editForm.phone}
                  onChange={handleEditInputChange}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-400"
                />
              </label>

              <label className="text-sm font-medium text-gray-700">
                Consultation Fee
                <input
                  name="consultationFee"
                  type="number"
                  min="0"
                  step="0.01"
                  value={editForm.consultationFee}
                  onChange={handleEditInputChange}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-400"
                />
              </label>

              <div className="md:col-span-2 flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  disabled={editSaving}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSaving}
                  className="rounded-lg bg-teal-600 px-5 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
                >
                  {editSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isNotesModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-gray-900/50"
            onClick={() => setIsNotesModalOpen(false)}
          />
          <div className="relative z-10 w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Clinical Notes</h2>
                <p className="mt-1 text-sm text-gray-500">Capture short notes and keep them accessible from your dashboard.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsNotesModalOpen(false)}
                className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
              >
                <Icon name="close" className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={addClinicalNote} className="space-y-4">
              <textarea
                value={noteDraft}
                onChange={(event) => setNoteDraft(event.target.value)}
                placeholder="Add a clinical note..."
                rows={4}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-400"
              />
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsNotesModalOpen(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-teal-600 px-5 py-2 text-sm font-semibold text-white hover:bg-teal-700"
                >
                  Save Note
                </button>
              </div>
            </form>

            <div className="mt-5 max-h-56 space-y-2 overflow-y-auto">
              {clinicalNotes.length === 0 && (
                <p className="text-sm text-gray-500">No notes yet.</p>
              )}
              {clinicalNotes.map((note) => (
                <div key={note.id} className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
                  <p className="text-sm text-gray-700">{note.body}</p>
                  <div className="mt-2 flex items-center justify-between text-xs text-gray-400">
                    <span>{new Date(note.createdAt).toLocaleString()}</span>
                    <button
                      type="button"
                      onClick={() => removeClinicalNote(note.id)}
                      className="font-semibold text-red-500 hover:text-red-600"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {isLabRequestModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-gray-900/50"
            onClick={() => setIsLabRequestModalOpen(false)}
          />
          <div className="relative z-10 w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Request Lab Test</h2>
                <p className="mt-1 text-sm text-gray-500">Create a lab request and track it in pending reports.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsLabRequestModalOpen(false)}
                className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
              >
                <Icon name="close" className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleLabRequestSave} className="grid grid-cols-1 gap-4">
              <label className="text-sm font-medium text-gray-700">
                Patient
                <select
                  value={labRequestForm.patientId}
                  onChange={(event) => setLabRequestForm((prev) => ({ ...prev, patientId: event.target.value, appointmentId: '' }))}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-400"
                  required
                >
                  <option value="">Select patient</option>
                  {patientOptions.map((option) => (
                    <option key={option.patientId} value={option.patientId}>
                      {option.patientName}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm font-medium text-gray-700">
                Appointment (Optional)
                <select
                  value={labRequestForm.appointmentId}
                  onChange={(event) => setLabRequestForm((prev) => ({ ...prev, appointmentId: event.target.value }))}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-400"
                >
                  <option value="">No appointment linked</option>
                  {appointmentOptionsForSelectedPatient.map((option) => (
                    <option key={option.appointmentId} value={option.appointmentId}>
                      #{option.appointmentId} • {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm font-medium text-gray-700">
                Test Name
                <input
                  value={labRequestForm.testName}
                  onChange={(event) => setLabRequestForm((prev) => ({ ...prev, testName: event.target.value }))}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-400"
                  required
                />
              </label>

              <label className="text-sm font-medium text-gray-700">
                Priority
                <select
                  value={labRequestForm.priority}
                  onChange={(event) => setLabRequestForm((prev) => ({ ...prev, priority: event.target.value }))}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-400"
                >
                  <option value="Routine">Routine</option>
                  <option value="Urgent">Urgent</option>
                </select>
              </label>

              <label className="text-sm font-medium text-gray-700">
                Notes
                <textarea
                  value={labRequestForm.notes}
                  onChange={(event) => setLabRequestForm((prev) => ({ ...prev, notes: event.target.value }))}
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-400"
                />
              </label>

              <div className="mt-1 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsLabRequestModalOpen(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-teal-600 px-5 py-2 text-sm font-semibold text-white hover:bg-teal-700"
                >
                  Add Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Toast ────────────────────────────────────────── */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-gray-900 text-white text-sm font-medium px-5 py-3 rounded-2xl shadow-2xl">
          <svg className="w-4 h-4 text-amber-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 3a9 9 0 100 18A9 9 0 0012 3z" />
          </svg>
          <span>
            <strong>{toast.label}</strong>
            {toast.pending ? ' — not yet implemented' : ''}
          </span>
          <button onClick={() => setToast(null)} className="text-gray-400 hover:text-white ml-1">
            <Icon name="close" className="w-4 h-4" />
          </button>
        </div>
      )}

    </div>
  );
}
