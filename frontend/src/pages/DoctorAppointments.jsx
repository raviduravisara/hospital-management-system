import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import axiosInstance from '../api/axios';
import { extractRoleFromToken } from '../utils/auth';

const STATUS_OPTIONS = ['Pending', 'Confirmed', 'Completed', 'Cancelled'];
const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const toIsoDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseIsoDate = (value) => {
  const [year, month, day] = String(value).split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
};

const getStartOfWeek = (date) => {
  const base = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const mondayBasedOffset = (base.getDay() + 6) % 7;
  base.setDate(base.getDate() - mondayBasedOffset);
  return base;
};

const buildCalendarCells = (monthDate, appointmentsByDate) => {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1);
  const mondayBasedStartOffset = (firstDayOfMonth.getDay() + 6) % 7;
  const firstVisibleDate = new Date(year, month, 1 - mondayBasedStartOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const cellDate = new Date(firstVisibleDate);
    cellDate.setDate(firstVisibleDate.getDate() + index);
    const isoDate = toIsoDate(cellDate);
    const dayAppointments = appointmentsByDate.get(isoDate) || [];

    return {
      isoDate,
      dayNumber: cellDate.getDate(),
      inCurrentMonth: cellDate.getMonth() === month,
      isToday: isoDate === toIsoDate(new Date()),
      totalCount: dayAppointments.length,
      pendingCount: dayAppointments.filter((item) => item.status === 'Pending').length,
      confirmedCount: dayAppointments.filter((item) => item.status === 'Confirmed').length,
      completedCount: dayAppointments.filter((item) => item.status === 'Completed').length,
    };
  });
};

function DoctorAppointments() {
  const token = localStorage.getItem('token');
  const role = extractRoleFromToken(token);

  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState([]);
  const [doctorProfile, setDoctorProfile] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [doctorProfileMissing, setDoctorProfileMissing] = useState(false);
  const [statusUpdates, setStatusUpdates] = useState({});
  const [statusSubmitting, setStatusSubmitting] = useState({});
  const [editingAppointmentId, setEditingAppointmentId] = useState(null);
  const [editForm, setEditForm] = useState({
    appointmentDate: '',
    appointmentTime: '',
    reason: '',
  });
  const [editAvailableSlots, setEditAvailableSlots] = useState([]);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [calendarViewMode, setCalendarViewMode] = useState('month');
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(() => toIsoDate(new Date()));

  useEffect(() => {
    const fetchDoctorData = async () => {
      setLoading(true);
      setError('');

      try {
        const doctorRes = await axiosInstance.get('/api/doctors/me');
        setDoctorProfile(doctorRes.data);
      } catch (err) {
        console.error('Doctor appointment page error:', err.response?.data || err);
        if (err.response?.status === 404) {
          setDoctorProfileMissing(true);
          setError('Doctor profile not found. Please create your doctor profile first.');
        } else {
          setError(
            err.response?.data?.message ||
              err.response?.data?.title ||
              (typeof err.response?.data === 'string' ? err.response.data : '') ||
              'Failed to load doctor appointments.'
          );
        }
      } finally {
        setLoading(false);
      }
    };

    fetchDoctorData();
  }, []);

  useEffect(() => {
    const fetchAppointments = async () => {
      if (!doctorProfile?.doctorId) return;

      try {
        const res = await axiosInstance.get(`/api/appointments/doctor/${doctorProfile.doctorId}`);
        setAppointments(res.data || []);
      } catch (err) {
        console.error('Doctor appointments fetch error:', err.response?.data || err);
        setAppointments([]);
      }
    };

    fetchAppointments();
  }, [doctorProfile]);

  useEffect(() => {
    const fetchEditSlots = async () => {
      if (!doctorProfile?.doctorId || !editForm.appointmentDate) {
        setEditAvailableSlots([]);
        return;
      }

      try {
        const res = await axiosInstance.get('/api/appointments/available-slots', {
          params: {
            doctorId: doctorProfile.doctorId,
            appointmentDate: editForm.appointmentDate,
          },
        });

        let slots = Array.isArray(res.data?.availableSlots)
          ? res.data.availableSlots
          : Array.isArray(res.data)
          ? res.data
          : [];

        const currentSlot = editForm.appointmentTime?.slice(0, 5);
        if (currentSlot && !slots.includes(currentSlot)) {
          slots = [...slots, currentSlot];
        }

        setEditAvailableSlots(slots);
      } catch (err) {
        console.error('Doctor edit available slots error:', err.response?.data || err);
        setEditAvailableSlots([]);
      }
    };

    fetchEditSlots();
  }, [doctorProfile?.doctorId, editForm.appointmentDate, editForm.appointmentTime]);

  const refreshAppointments = async () => {
    if (!doctorProfile?.doctorId) return;

    try {
      const res = await axiosInstance.get(`/api/appointments/doctor/${doctorProfile.doctorId}`);
      setAppointments(res.data || []);
    } catch (err) {
      console.error('Refresh appointments error:', err.response?.data || err);
      setAppointments([]);
    }
  };

  const handleStatusChange = (appointmentId, value) => {
    setStatusUpdates((prev) => ({
      ...prev,
      [appointmentId]: value,
    }));
  };

  const handleUpdateStatus = async (appointmentId, currentStatus, overrideStatus) => {
    const selectedStatus = overrideStatus ?? statusUpdates[appointmentId] ?? currentStatus;
    if (selectedStatus === currentStatus) {
      return;
    }

    const confirmMessage = overrideStatus
      ? `Are you sure you want to ${overrideStatus === 'Confirmed' ? 'accept' : 'reject'} this appointment?`
      : 'Are you sure you want to update this appointment status?';

    if (!window.confirm(confirmMessage)) {
      return;
    }

    setError('');
    setSuccess('');
    setStatusSubmitting((prev) => ({ ...prev, [appointmentId]: true }));

    try {
      await axiosInstance.put(`/api/appointments/${appointmentId}/status`, {
        status: selectedStatus,
      });

      setSuccess('Appointment status updated successfully.');
      setStatusUpdates((prev) => ({ ...prev, [appointmentId]: selectedStatus }));
      await refreshAppointments();
    } catch (err) {
      console.error('Status update error:', err.response?.data || err);
      setError(
        err.response?.data?.message ||
          err.response?.data?.title ||
          (typeof err.response?.data === 'string' ? err.response.data : '') ||
          'Failed to update appointment status.'
      );
    } finally {
      setStatusSubmitting((prev) => ({ ...prev, [appointmentId]: false }));
    }
  };

  const handleEditClick = (appointment) => {
    setError('');
    setSuccess('');
    setEditingAppointmentId(appointment.appointmentId);
    setEditForm({
      appointmentDate: appointment.appointmentDate,
      appointmentTime: appointment.appointmentTime?.slice(0, 5) || '',
      reason: appointment.reason || '',
    });
    setEditAvailableSlots([]);
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({
      ...prev,
      [name]: value,
      ...(name === 'appointmentDate' ? { appointmentTime: '' } : {}),
    }));
  };

  const cancelEdit = () => {
    setEditingAppointmentId(null);
    setEditForm({ appointmentDate: '', appointmentTime: '', reason: '' });
    setEditAvailableSlots([]);
  };

  const handleUpdateAppointment = async (e) => {
    e.preventDefault();
    if (!editingAppointmentId || !doctorProfile?.doctorId) return;

    setError('');
    setSuccess('');

    if (!editForm.appointmentDate || !editForm.appointmentTime) {
      setError('Please fill date and time.');
      return;
    }

    setEditSubmitting(true);

    try {
      await axiosInstance.put(`/api/appointments/${editingAppointmentId}`, {
        doctorId: Number(doctorProfile.doctorId),
        appointmentDate: editForm.appointmentDate,
        appointmentTime: editForm.appointmentTime,
        reason: editForm.reason || null,
      });

      setSuccess('Appointment time slot updated. Patient should be informed about the change.');
      cancelEdit();
      await refreshAppointments();
    } catch (err) {
      console.error('Doctor reschedule error:', err.response?.data || err);
      if (err.response?.status === 403) {
        const backendMessage =
          err.response?.data?.message ||
          err.response?.data?.title ||
          (typeof err.response?.data === 'string' ? err.response.data : '');

        setError(
          backendMessage ||
            'Reschedule is forbidden by the API. If you recently updated backend permissions, restart the backend server and sign in again.'
        );
        return;
      }

      setError(
        err.response?.data?.message ||
          err.response?.data?.title ||
          (typeof err.response?.data === 'string' ? err.response.data : '') ||
          'Failed to reschedule appointment.'
      );
    } finally {
      setEditSubmitting(false);
    }
  };

  const formatTimeLabel = (time) => {
    if (!time) return '';
    return time.slice(0, 5);
  };

  const getStatusBadge = (status) => {
    const base = 'inline-flex rounded-full px-2.5 py-1 text-xs font-semibold';

    switch (status) {
      case 'Pending':
        return <span className={`${base} bg-amber-100 text-amber-700`}>Pending</span>;
      case 'Confirmed':
        return <span className={`${base} bg-green-100 text-green-700`}>Confirmed</span>;
      case 'Completed':
        return <span className={`${base} bg-blue-100 text-blue-700`}>Completed</span>;
      case 'Cancelled':
        return <span className={`${base} bg-red-100 text-red-700`}>Cancelled</span>;
      default:
        return <span className={`${base} bg-gray-100 text-gray-600`}>{status}</span>;
    }
  };

  const appointmentsByDate = useMemo(() => {
    const map = new Map();
    appointments.forEach((item) => {
      const key = item.appointmentDate;
      if (!key) return;
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key).push(item);
    });
    return map;
  }, [appointments]);

  const calendarCells = useMemo(
    () => buildCalendarCells(calendarMonth, appointmentsByDate),
    [calendarMonth, appointmentsByDate]
  );
  const weekCells = useMemo(() => {
    const baseDate = parseIsoDate(selectedDate) || new Date();
    const weekStart = getStartOfWeek(baseDate);

    return Array.from({ length: 7 }, (_, index) => {
      const cellDate = new Date(weekStart);
      cellDate.setDate(weekStart.getDate() + index);
      const isoDate = toIsoDate(cellDate);
      const dayAppointments = appointmentsByDate.get(isoDate) || [];

      return {
        isoDate,
        dayNumber: cellDate.getDate(),
        dayName: WEEKDAY_LABELS[index],
        inCurrentMonth: cellDate.getMonth() === calendarMonth.getMonth(),
        isToday: isoDate === toIsoDate(new Date()),
        totalCount: dayAppointments.length,
        pendingCount: dayAppointments.filter((item) => item.status === 'Pending').length,
        confirmedCount: dayAppointments.filter((item) => item.status === 'Confirmed').length,
        completedCount: dayAppointments.filter((item) => item.status === 'Completed').length,
      };
    });
  }, [appointmentsByDate, calendarMonth, selectedDate]);

  const filteredAppointments = useMemo(() => {
    const source = selectedDate
      ? appointments.filter((item) => item.appointmentDate === selectedDate)
      : appointments;

    return source
      .slice()
      .sort((a, b) => String(a.appointmentTime || '').localeCompare(String(b.appointmentTime || '')));
  }, [appointments, selectedDate]);

  const selectedDateLabel = useMemo(() => {
    if (!selectedDate) return 'All dates';
    const parsed = parseIsoDate(selectedDate);
    if (!parsed) return selectedDate;
    return parsed.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }, [selectedDate]);

  const visibleMonthLabel = calendarMonth.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
  const visibleWeekLabel = useMemo(() => {
    const first = weekCells[0];
    const last = weekCells[6];
    if (!first || !last) return '';

    const firstDate = parseIsoDate(first.isoDate);
    const lastDate = parseIsoDate(last.isoDate);
    if (!firstDate || !lastDate) return '';

    const firstLabel = firstDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const lastLabel = lastDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return `${firstLabel} - ${lastLabel}`;
  }, [weekCells]);

  if (!token) return <Navigate to="/login" replace />;
  if (role !== 'doctor') return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen glass-page p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Doctor Appointments</h1>
          <p className="text-sm text-gray-500 mt-1">
            View and update appointment status for your assigned patients.
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {success}
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl glass-card p-6 text-sm text-gray-500">
            Loading appointments...
          </div>
        ) : doctorProfileMissing ? (
          <div className="rounded-2xl glass-card p-6 text-sm text-gray-700">
            <p className="mb-4">Doctor profile not found. Please complete your doctor profile first.</p>
            <Link
              to="/doctor/register"
              className="inline-flex items-center rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
            >
              Register Doctor Profile
            </Link>
          </div>
        ) : !doctorProfile ? (
          <div className="rounded-2xl glass-card p-6 text-sm text-red-600">
            Doctor profile not found. Please complete your doctor profile first.
          </div>
        ) : (
          <>
            {editingAppointmentId && (
              <div className="mb-6 rounded-2xl glass-card p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Reschedule appointment</h2>
                    <p className="text-sm text-gray-500">Update date/time and inform the patient about the change.</p>
                  </div>
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="text-sm font-medium text-gray-600 hover:text-gray-900"
                  >
                    Cancel edit
                  </button>
                </div>
                <form onSubmit={handleUpdateAppointment} className="grid gap-4 lg:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                    <input
                      type="date"
                      name="appointmentDate"
                      value={editForm.appointmentDate}
                      onChange={handleEditChange}
                      className="w-full rounded-lg glass-input px-3 py-2 text-sm outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Available Time Slot</label>
                    <select
                      name="appointmentTime"
                      value={editForm.appointmentTime}
                      onChange={handleEditChange}
                      className="w-full rounded-lg glass-input px-3 py-2 text-sm outline-none focus:border-blue-500"
                      disabled={!editAvailableSlots.length}
                    >
                      <option value="">
                        {editAvailableSlots.length ? 'Select time' : 'No slots available'}
                      </option>
                      {editAvailableSlots.map((slot, idx) => (
                        <option key={`${slot}-${idx}`} value={slot.length === 5 ? `${slot}:00` : slot}>
                          {formatTimeLabel(slot)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="lg:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                    <textarea
                      name="reason"
                      value={editForm.reason}
                      onChange={handleEditChange}
                      rows="3"
                      placeholder="Reason for schedule change"
                      className="w-full rounded-lg glass-input px-3 py-2 text-sm outline-none focus:border-blue-500 resize-none"
                    />
                  </div>

                  <div className="lg:col-span-2 flex justify-end">
                    <button
                      type="submit"
                      disabled={editSubmitting}
                      className="rounded-lg bg-blue-600 text-white px-4 py-2 text-sm font-semibold hover:bg-blue-700 disabled:opacity-60"
                    >
                      {editSubmitting ? 'Saving...' : 'Save schedule change'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="mb-6 rounded-2xl glass-card p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Appointment Calendar</h2>
                  <p className="text-sm text-gray-500 mt-1">Select a day to filter appointments, using month or week view.</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="mr-2 inline-flex rounded-lg border border-gray-300 bg-white p-0.5">
                    <button
                      type="button"
                      onClick={() => setCalendarViewMode('month')}
                      className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                        calendarViewMode === 'month'
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      Month
                    </button>
                    <button
                      type="button"
                      onClick={() => setCalendarViewMode('week')}
                      className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                        calendarViewMode === 'week'
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      Week
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (calendarViewMode === 'month') {
                        setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
                        return;
                      }

                      const base = parseIsoDate(selectedDate) || new Date();
                      const next = new Date(base);
                      next.setDate(next.getDate() - 7);
                      setSelectedDate(toIsoDate(next));
                      setCalendarMonth(new Date(next.getFullYear(), next.getMonth(), 1));
                    }}
                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
                  >
                    Prev
                  </button>
                  <p className="min-w-44 text-center text-sm font-semibold text-gray-800">
                    {calendarViewMode === 'month' ? visibleMonthLabel : visibleWeekLabel}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      if (calendarViewMode === 'month') {
                        setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
                        return;
                      }

                      const base = parseIsoDate(selectedDate) || new Date();
                      const next = new Date(base);
                      next.setDate(next.getDate() + 7);
                      setSelectedDate(toIsoDate(next));
                      setCalendarMonth(new Date(next.getFullYear(), next.getMonth(), 1));
                    }}
                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
                  >
                    Next
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const today = new Date();
                      setCalendarMonth(new Date(today.getFullYear(), today.getMonth(), 1));
                      setSelectedDate(toIsoDate(today));
                    }}
                    className="rounded-lg border border-blue-300 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-100"
                  >
                    Today
                  </button>
                </div>
              </div>

              <div className="mb-2 grid grid-cols-7 gap-2">
                {WEEKDAY_LABELS.map((day) => (
                  <div key={day} className="px-2 py-1 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-2">
                {(calendarViewMode === 'month' ? calendarCells : weekCells).map((cell) => {
                  const isSelected = selectedDate === cell.isoDate;
                  return (
                    <button
                      key={cell.isoDate}
                      type="button"
                      onClick={() => setSelectedDate(cell.isoDate)}
                      className={`${
                        calendarViewMode === 'month' ? 'min-h-[88px]' : 'min-h-[96px]'
                      } rounded-xl border p-2 text-left transition ${
                        isSelected
                          ? 'border-blue-400 bg-blue-50'
                          : cell.inCurrentMonth
                          ? 'border-gray-200 bg-white/70 hover:bg-gray-50'
                          : 'border-gray-100 bg-gray-50/70 text-gray-400'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-semibold ${calendarViewMode === 'week' ? 'uppercase tracking-wide' : ''} ${
                            cell.isToday && !isSelected
                              ? 'rounded-full bg-teal-100 px-2 py-0.5 text-teal-700'
                              : 'text-gray-700'
                          }`}
                        >
                          {calendarViewMode === 'month' ? cell.dayNumber : `${cell.dayName} ${cell.dayNumber}`}
                        </span>
                        {cell.totalCount > 0 && (
                          <span className="rounded-full bg-gray-900 px-2 py-0.5 text-[10px] font-bold text-white">
                            {cell.totalCount}
                          </span>
                        )}
                      </div>
                      <div className="mt-2 flex items-center gap-1.5">
                        {cell.pendingCount > 0 && <span className="h-1.5 w-1.5 rounded-full bg-amber-500" title="Pending" />}
                        {cell.confirmedCount > 0 && <span className="h-1.5 w-1.5 rounded-full bg-green-500" title="Confirmed" />}
                        {cell.completedCount > 0 && <span className="h-1.5 w-1.5 rounded-full bg-blue-500" title="Completed" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl glass-card p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">My Appointments</h2>
                  <p className="text-xs text-gray-500 mt-1">Showing: {selectedDateLabel}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedDate('')}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                  >
                    Show all
                  </button>
                  <button
                    onClick={refreshAppointments}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                  >
                    Refresh
                  </button>
                </div>
              </div>

              {!filteredAppointments.length ? (
                <p className="text-sm text-gray-500">No appointments found.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 text-left text-gray-500">
                        <th className="py-3 pr-4">Patient</th>
                        <th className="py-3 pr-4">Date</th>
                        <th className="py-3 pr-4">Time</th>
                        <th className="py-3 pr-4">Status</th>
                        <th className="py-3 pr-4">Reason</th>
                        <th className="py-3 pr-0">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAppointments.map((item) => (
                        <tr key={item.appointmentId} className="border-b border-gray-50">
                          <td className="py-3 pr-4 font-medium text-gray-900">{item.patientName}</td>
                          <td className="py-3 pr-4 text-gray-700">{item.appointmentDate}</td>
                          <td className="py-3 pr-4 text-gray-700">{formatTimeLabel(item.appointmentTime)}</td>
                          <td className="py-3 pr-4">{getStatusBadge(item.status)}</td>
                          <td className="py-3 pr-4 text-gray-600">{item.reason || '-'}</td>
                          <td className="py-3 pr-0">
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center gap-2">
                                <select
                                  value={statusUpdates[item.appointmentId] ?? item.status}
                                  onChange={(e) => handleStatusChange(item.appointmentId, e.target.value)}
                                  className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 outline-none focus:border-blue-500"
                                >
                                  {STATUS_OPTIONS.map((status) => (
                                    <option key={status} value={status}>
                                      {status}
                                    </option>
                                  ))}
                                </select>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateStatus(item.appointmentId, item.status)}
                                  disabled={
                                    statusSubmitting[item.appointmentId] ||
                                    (statusUpdates[item.appointmentId] ?? item.status) === item.status
                                  }
                                  className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                                >
                                  {statusSubmitting[item.appointmentId] ? 'Updating...' : 'Update'}
                                </button>
                              </div>

                              {(item.status === 'Pending' || item.status === 'Confirmed') && (
                                <button
                                  type="button"
                                  onClick={() => handleEditClick(item)}
                                  className="w-fit rounded-lg border border-indigo-300 px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-50"
                                >
                                  Reschedule
                                </button>
                              )}

                              {item.status === 'Pending' && (
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateStatus(item.appointmentId, item.status, 'Confirmed')}
                                    disabled={statusSubmitting[item.appointmentId]}
                                    className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                                  >
                                    Accept
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateStatus(item.appointmentId, item.status, 'Cancelled')}
                                    disabled={statusSubmitting[item.appointmentId]}
                                    className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
                                  >
                                    Reject
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default DoctorAppointments;
