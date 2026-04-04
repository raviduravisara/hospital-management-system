import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import axiosInstance from '../api/axios';
import { extractRoleFromToken } from '../utils/auth';

const STATUS_OPTIONS = ['Pending', 'Confirmed', 'Completed', 'Cancelled'];

const formatTimeLabel = (time) => {
  if (!time) return '';
  return String(time).slice(0, 5);
};

export default function AdminAppointments() {
  const token = localStorage.getItem('token');
  const role = extractRoleFromToken(token);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [statusUpdates, setStatusUpdates] = useState({});
  const [statusSubmitting, setStatusSubmitting] = useState({});

  const [editingAppointmentId, setEditingAppointmentId] = useState(null);
  const [editForm, setEditForm] = useState({
    doctorId: '',
    appointmentDate: '',
    appointmentTime: '',
    reason: '',
  });
  const [editAvailableSlots, setEditAvailableSlots] = useState([]);
  const [editSubmitting, setEditSubmitting] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');

  const selectedDoctorId = useMemo(() => Number(editForm.doctorId) || 0, [editForm.doctorId]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');

      try {
        const doctorsRes = await axiosInstance.get('/api/doctors');
        const doctorsList = Array.isArray(doctorsRes.data) ? doctorsRes.data : [];
        setDoctors(doctorsList);

        const appointmentGroups = await Promise.all(
          doctorsList.map((doctor) =>
            axiosInstance
              .get(`/api/appointments/doctor/${doctor.doctorId}`)
              .then((res) => (Array.isArray(res.data) ? res.data : []))
              .catch(() => [])
          )
        );

        const map = new Map();
        appointmentGroups.flat().forEach((item) => map.set(item.appointmentId, item));
        setAppointments(Array.from(map.values()));
      } catch (requestError) {
        setError(requestError.response?.data?.message || 'Unable to load admin appointments.');
      } finally {
        setLoading(false);
      }
    };

    if (token && role === 'admin') {
      load();
    }
  }, [token, role]);

  useEffect(() => {
    const fetchEditSlots = async () => {
      if (!selectedDoctorId || !editForm.appointmentDate) {
        setEditAvailableSlots([]);
        return;
      }

      try {
        const res = await axiosInstance.get('/api/appointments/available-slots', {
          params: {
            doctorId: selectedDoctorId,
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
      } catch {
        setEditAvailableSlots([]);
      }
    };

    fetchEditSlots();
  }, [selectedDoctorId, editForm.appointmentDate, editForm.appointmentTime]);

  const refreshAppointments = async () => {
    try {
      const appointmentGroups = await Promise.all(
        doctors.map((doctor) =>
          axiosInstance
            .get(`/api/appointments/doctor/${doctor.doctorId}`)
            .then((res) => (Array.isArray(res.data) ? res.data : []))
            .catch(() => [])
        )
      );

      const map = new Map();
      appointmentGroups.flat().forEach((item) => map.set(item.appointmentId, item));
      setAppointments(Array.from(map.values()));
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to refresh appointments.');
    }
  };

  const handleStatusChange = (appointmentId, value) => {
    setStatusUpdates((prev) => ({ ...prev, [appointmentId]: value }));
  };

  const handleUpdateStatus = async (appointmentId, currentStatus) => {
    const nextStatus = statusUpdates[appointmentId] ?? currentStatus;
    if (nextStatus === currentStatus) return;

    setError('');
    setSuccess('');
    setStatusSubmitting((prev) => ({ ...prev, [appointmentId]: true }));

    try {
      await axiosInstance.put(`/api/appointments/${appointmentId}/status`, { status: nextStatus });
      setSuccess('Appointment status updated.');
      await refreshAppointments();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to update status.');
    } finally {
      setStatusSubmitting((prev) => ({ ...prev, [appointmentId]: false }));
    }
  };

  const handleCancel = async (appointmentId) => {
    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      await axiosInstance.delete(`/api/appointments/${appointmentId}`);
      setSuccess('Appointment cancelled successfully.');
      await refreshAppointments();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to cancel appointment.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditClick = (appointment) => {
    setError('');
    setSuccess('');
    setEditingAppointmentId(appointment.appointmentId);
    setEditForm({
      doctorId: String(appointment.doctorId),
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
      ...(name === 'doctorId' || name === 'appointmentDate' ? { appointmentTime: '' } : {}),
    }));
  };

  const cancelEdit = () => {
    setEditingAppointmentId(null);
    setEditForm({ doctorId: '', appointmentDate: '', appointmentTime: '', reason: '' });
    setEditAvailableSlots([]);
  };

  const handleReschedule = async (e) => {
    e.preventDefault();
    if (!editingAppointmentId) return;

    if (!editForm.doctorId || !editForm.appointmentDate || !editForm.appointmentTime) {
      setError('Please fill doctor, date and time for rescheduling.');
      return;
    }

    setError('');
    setSuccess('');
    setEditSubmitting(true);

    try {
      await axiosInstance.put(`/api/appointments/${editingAppointmentId}`, {
        doctorId: Number(editForm.doctorId),
        appointmentDate: editForm.appointmentDate,
        appointmentTime: editForm.appointmentTime,
        reason: editForm.reason || null,
      });
      setSuccess('Appointment rescheduled successfully.');
      cancelEdit();
      await refreshAppointments();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to reschedule appointment.');
    } finally {
      setEditSubmitting(false);
    }
  };

  const filteredAppointments = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return appointments;

    return appointments.filter((item) =>
      [item.patientName, item.doctorName, item.reason, item.status, item.appointmentDate]
        .some((value) => String(value ?? '').toLowerCase().includes(q))
    );
  }, [appointments, searchTerm]);

  if (!token) return <Navigate to="/login" replace />;
  if (role !== 'admin') return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen glass-page p-6 md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Appointments</h1>
            <p className="mt-1 text-sm text-gray-500">Manage all doctor/patient appointments in one place.</p>
          </div>
          <div className="flex gap-2">
            <Link to="/admin/dashboard" className="rounded-lg border border-white/50 bg-white/60 backdrop-blur px-3 py-2 text-sm font-medium text-gray-700 hover:bg-white/75">Back to Dashboard</Link>
            <button onClick={refreshAppointments} className="rounded-lg border border-white/50 bg-white/60 backdrop-blur px-3 py-2 text-sm font-medium text-gray-700 hover:bg-white/75">Refresh</button>
          </div>
        </div>

        {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        {success && <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{success}</div>}

        {editingAppointmentId && (
          <div className="mb-5 rounded-2xl glass-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Reschedule Appointment</h2>
              <button onClick={cancelEdit} className="text-sm font-medium text-gray-600 hover:text-gray-900">Cancel edit</button>
            </div>
            <form onSubmit={handleReschedule} className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Doctor</label>
                <select name="doctorId" value={editForm.doctorId} onChange={handleEditChange} className="w-full rounded-lg glass-input px-3 py-2 text-sm">
                  <option value="">Select doctor</option>
                  {doctors.map((doctor) => (
                    <option key={doctor.doctorId} value={doctor.doctorId}>
                      Dr. {doctor.firstName} {doctor.lastName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Date</label>
                <input type="date" name="appointmentDate" value={editForm.appointmentDate} onChange={handleEditChange} className="w-full rounded-lg glass-input px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Available Time Slot</label>
                <select name="appointmentTime" value={editForm.appointmentTime} onChange={handleEditChange} disabled={!editAvailableSlots.length} className="w-full rounded-lg glass-input px-3 py-2 text-sm">
                  <option value="">{editAvailableSlots.length ? 'Select time' : 'No slots available'}</option>
                  {editAvailableSlots.map((slot, idx) => (
                    <option key={`${slot}-${idx}`} value={slot.length === 5 ? `${slot}:00` : slot}>{formatTimeLabel(slot)}</option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-gray-700">Reason</label>
                <textarea name="reason" value={editForm.reason} onChange={handleEditChange} rows={3} className="w-full rounded-lg glass-input px-3 py-2 text-sm" />
              </div>
              <div className="md:col-span-2 flex justify-end">
                <button type="submit" disabled={editSubmitting} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
                  {editSubmitting ? 'Saving...' : 'Save reschedule'}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="rounded-2xl glass-card p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-gray-900">All Appointments</h2>
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search patient, doctor, status..."
              className="w-full max-w-xs rounded-lg glass-input px-3 py-2 text-sm"
            />
          </div>

          {loading ? (
            <p className="text-sm text-gray-500">Loading appointments...</p>
          ) : !filteredAppointments.length ? (
            <p className="text-sm text-gray-500">No appointments found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-gray-500">
                    <th className="py-2 pr-4">Patient</th>
                    <th className="py-2 pr-4">Doctor</th>
                    <th className="py-2 pr-4">Date</th>
                    <th className="py-2 pr-4">Time</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4">Reason</th>
                    <th className="py-2 pr-0">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAppointments.map((item) => (
                    <tr key={item.appointmentId} className="border-b border-gray-50">
                      <td className="py-2 pr-4 font-medium text-gray-900">{item.patientName}</td>
                      <td className="py-2 pr-4 text-gray-700">{item.doctorName}</td>
                      <td className="py-2 pr-4 text-gray-700">{item.appointmentDate}</td>
                      <td className="py-2 pr-4 text-gray-700">{formatTimeLabel(item.appointmentTime)}</td>
                      <td className="py-2 pr-4">
                        <div className="flex items-center gap-2">
                          <select
                            value={statusUpdates[item.appointmentId] ?? item.status}
                            onChange={(e) => handleStatusChange(item.appointmentId, e.target.value)}
                            className="rounded-lg glass-input px-2 py-1 text-xs"
                          >
                            {STATUS_OPTIONS.map((status) => (
                              <option key={status} value={status}>{status}</option>
                            ))}
                          </select>
                          <button
                            onClick={() => handleUpdateStatus(item.appointmentId, item.status)}
                            disabled={statusSubmitting[item.appointmentId] || (statusUpdates[item.appointmentId] ?? item.status) === item.status}
                            className="rounded-lg bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                          >
                            {statusSubmitting[item.appointmentId] ? 'Updating...' : 'Update'}
                          </button>
                        </div>
                      </td>
                      <td className="py-2 pr-4 text-gray-600">{item.reason || '-'}</td>
                      <td className="py-2 pr-0">
                        <div className="flex gap-2">
                          <button onClick={() => handleEditClick(item)} className="rounded-lg border border-indigo-300 px-3 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-50">Reschedule</button>
                          <button onClick={() => handleCancel(item.appointmentId)} disabled={submitting} className="rounded-lg border border-rose-300 px-3 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60">Cancel</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
