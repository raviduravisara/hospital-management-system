import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import axiosInstance from '../api/axios';
import { extractRoleFromToken } from '../utils/auth';

function PatientAppointments() {
  const token = localStorage.getItem('token');
  const role = extractRoleFromToken(token);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [patientProfile, setPatientProfile] = useState(null);
  const [doctorProfile, setDoctorProfile] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [availableSlots, setAvailableSlots] = useState([]);
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

  const [form, setForm] = useState({
    doctorId: '',
    appointmentDate: '',
    appointmentTime: '',
    reason: '',
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [infoMessage, setInfoMessage] = useState('');

  if (!token) return <Navigate to="/login" replace />;
  if (!['patient', 'doctor'].includes(role)) return <Navigate to="/dashboard" replace />;

  const isDoctor = role === 'doctor';
  const isStaff = isDoctor;
  const showBookingForm = role === 'patient';
  const currentProfile = isDoctor ? doctorProfile : patientProfile;
  const profileLabel = isDoctor ? 'doctor' : 'patient';

  const selectedDoctorId = useMemo(() => Number(form.doctorId) || 0, [form.doctorId]);
  const editSelectedDoctorId = useMemo(() => Number(editForm.doctorId) || 0, [editForm.doctorId]);

  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      setError('');

      try {
        if (isDoctor) {
          const doctorRes = await axiosInstance.get('/api/doctors/me');
          setDoctorProfile(doctorRes.data);
        } else {
          const [patientRes, doctorsRes] = await Promise.all([
            axiosInstance.get('/api/patients/me'),
            axiosInstance.get('/api/doctors'),
          ]);

          setPatientProfile(patientRes.data);
          setDoctors(doctorsRes.data || []);
        }
      } catch (err) {
        console.error('Initial booking page error:', err.response?.data || err);
        setError(
          err.response?.data?.message ||
            err.response?.data?.title ||
            (typeof err.response?.data === 'string' ? err.response.data : '') ||
            'Failed to load booking page.'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, []);

  useEffect(() => {
    const fetchAppointments = async () => {
      if (isDoctor) {
        if (!doctorProfile?.doctorId) return;

        try {
          const res = await axiosInstance.get(`/api/appointments/doctor/${doctorProfile.doctorId}`);
          setAppointments(res.data || []);
        } catch (err) {
          console.error('Appointments fetch error:', err.response?.data || err);
          setAppointments([]);
        }
      } else {
        if (!patientProfile?.patientId) return;

        try {
          const res = await axiosInstance.get(`/api/appointments/patient/${patientProfile.patientId}`);
          setAppointments(res.data || []);
        } catch (err) {
          console.error('Appointments fetch error:', err.response?.data || err);
          setAppointments([]);
        }
      }
    };

    fetchAppointments();
  }, [patientProfile, doctorProfile, isDoctor]);

  useEffect(() => {
    if (isDoctor || !patientProfile?.patientId || !appointments.length) {
      return;
    }

    const snapshotKey = `patient_appointments_snapshot_${patientProfile.patientId}`;
    const previousSnapshotRaw = localStorage.getItem(snapshotKey);
    let previousSnapshot = {};
    if (previousSnapshotRaw) {
      try {
        previousSnapshot = JSON.parse(previousSnapshotRaw);
      } catch {
        previousSnapshot = {};
      }
    }

    let hasSlotChangeNotification = false;
    const currentSnapshot = {};

    appointments.forEach((item) => {
      const currentEntry = {
        doctorId: item.doctorId,
        appointmentDate: item.appointmentDate,
        appointmentTime: item.appointmentTime,
        status: item.status,
      };

      currentSnapshot[item.appointmentId] = currentEntry;

      const previousEntry = previousSnapshot[item.appointmentId];
      if (!previousEntry) {
        return;
      }

      const slotChanged =
        previousEntry.doctorId !== currentEntry.doctorId ||
        previousEntry.appointmentDate !== currentEntry.appointmentDate ||
        previousEntry.appointmentTime !== currentEntry.appointmentTime;

      if (slotChanged && currentEntry.status === 'Confirmed') {
        hasSlotChangeNotification = true;
      }
    });

    localStorage.setItem(snapshotKey, JSON.stringify(currentSnapshot));

    if (hasSlotChangeNotification) {
      setInfoMessage('Your confirmed appointment time slot was updated by the doctor/admin. Please review the latest schedule.');
    }
  }, [appointments, isDoctor, patientProfile?.patientId]);

  useEffect(() => {
    const fetchSlots = async () => {
      if (!selectedDoctorId || !form.appointmentDate) {
        setAvailableSlots([]);
        return;
      }

      try {
        const res = await axiosInstance.get('/api/appointments/available-slots', {
          params: {
            doctorId: selectedDoctorId,
            appointmentDate: form.appointmentDate,
          },
        });

        const slots = Array.isArray(res.data?.availableSlots)
          ? res.data.availableSlots
          : Array.isArray(res.data)
          ? res.data
          : [];

        setAvailableSlots(slots);
      } catch (err) {
        console.error('Available slots error:', err.response?.data || err);
        setAvailableSlots([]);
      }
    };

    fetchSlots();
  }, [selectedDoctorId, form.appointmentDate]);

  useEffect(() => {
    const fetchEditSlots = async () => {
      if (!editSelectedDoctorId || !editForm.appointmentDate) {
        setEditAvailableSlots([]);
        return;
      }

      try {
        const res = await axiosInstance.get('/api/appointments/available-slots', {
          params: {
            doctorId: editSelectedDoctorId,
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
        console.error('Edit available slots error:', err.response?.data || err);
        setEditAvailableSlots([]);
      }
    };

    fetchEditSlots();
  }, [editSelectedDoctorId, editForm.appointmentDate, editForm.appointmentTime]);

  const refreshAppointments = async () => {
    try {
      if (isDoctor) {
        if (!doctorProfile?.doctorId) return;
        const res = await axiosInstance.get(`/api/appointments/doctor/${doctorProfile.doctorId}`);
        setAppointments(res.data || []);
        return;
      }

      if (!patientProfile?.patientId) return;
      const res = await axiosInstance.get(`/api/appointments/patient/${patientProfile.patientId}`);
      setAppointments(res.data || []);
    } catch (err) {
      console.error('Refresh appointments error:', err.response?.data || err);
      setAppointments([]);
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

  const handleUpdateAppointment = async (e) => {
    e.preventDefault();
    if (!editingAppointmentId) return;

    setError('');
    setSuccess('');

    if (!editForm.doctorId || !editForm.appointmentDate || !editForm.appointmentTime) {
      setError('Please fill doctor, date, and time.');
      return;
    }

    setEditSubmitting(true);

    try {
      await axiosInstance.put(`/api/appointments/${editingAppointmentId}`, {
        doctorId: Number(editForm.doctorId),
        appointmentDate: editForm.appointmentDate,
        appointmentTime: editForm.appointmentTime,
        reason: editForm.reason || null,
      });

      setSuccess('Appointment updated successfully.');
      cancelEdit();
      await refreshAppointments();
    } catch (err) {
      console.error('Update appointment error:', err.response?.data || err);
      setError(
        err.response?.data?.message ||
          err.response?.data?.title ||
          (typeof err.response?.data === 'string' ? err.response.data : '') ||
          'Failed to update appointment.'
      );
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
      ...(name === 'doctorId' || name === 'appointmentDate' ? { appointmentTime: '' } : {}),
    }));
  };

  const handleBook = async (e) => {
    e.preventDefault();

    setError('');
    setSuccess('');

    if (!patientProfile?.patientId) {
      setError('Please complete patient profile first.');
      return;
    }

    if (!form.doctorId || !form.appointmentDate || !form.appointmentTime) {
      setError('Please fill doctor, date, and time.');
      return;
    }

    try {
      setSubmitting(true);

      await axiosInstance.post('/api/appointments', {
        patientId: patientProfile.patientId,
        doctorId: Number(form.doctorId),
        appointmentDate: form.appointmentDate,
        appointmentTime: form.appointmentTime,
        reason: form.reason || null,
      });

      setSuccess('Appointment booked successfully.');
      setForm({
        doctorId: '',
        appointmentDate: '',
        appointmentTime: '',
        reason: '',
      });
      setAvailableSlots([]);
      await refreshAppointments();
    } catch (err) {
      console.error('Booking error:', err.response?.data || err);
      setError(
        err.response?.data?.message ||
          err.response?.data?.title ||
          (typeof err.response?.data === 'string' ? err.response.data : '') ||
          'Failed to book appointment.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (appointmentId) => {
    setError('');
    setSuccess('');

    try {
      await axiosInstance.delete(`/api/appointments/${appointmentId}`);
      setSuccess('Appointment cancelled successfully.');
      await refreshAppointments();
    } catch (err) {
      console.error('Cancel error:', err.response?.data || err);
      setError(
        err.response?.data?.message ||
          err.response?.data?.title ||
          (typeof err.response?.data === 'string' ? err.response.data : '') ||
          'Failed to cancel appointment.'
      );
    }
  };

  const handleContactAdminForCancellation = () => {
    setError('');
    setSuccess('');
    setInfoMessage(
      'This appointment is already confirmed. Please contact the hospital admin to request cancellation or schedule changes.'
    );
  };

  const STATUS_OPTIONS = ['Pending', 'Confirmed', 'Completed', 'Cancelled'];

  const handleStatusChange = (appointmentId, value) => {
    setStatusUpdates((prev) => ({
      ...prev,
      [appointmentId]: value,
    }));
  };

  const handleUpdateStatus = async (appointmentId, currentStatus) => {
    const newStatus = statusUpdates[appointmentId] || currentStatus;
    if (newStatus === currentStatus) {
      return;
    }

    setError('');
    setSuccess('');
    setStatusSubmitting((prev) => ({ ...prev, [appointmentId]: true }));

    try {
      await axiosInstance.put(`/api/appointments/${appointmentId}/status`, {
        status: newStatus,
      });

      setSuccess('Appointment status updated successfully.');
      setStatusUpdates((prev) => ({
        ...prev,
        [appointmentId]: newStatus,
      }));
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

  return (
    <div className="min-h-screen glass-page p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Appointments</h1>
          <p className="text-sm text-gray-500 mt-1">
            {showBookingForm
              ? 'Book, view and cancel your appointments.'
              : 'View and update appointment status for your assigned patients.'}
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

        {infoMessage && (
          <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
            {infoMessage}
          </div>
        )}

        {editingAppointmentId && showBookingForm && (
          <div className="mb-6 rounded-2xl glass-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Edit appointment</h2>
                <p className="text-sm text-gray-500">Update your appointment details and save changes.</p>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Doctor</label>
                <select
                  name="doctorId"
                  value={editForm.doctorId}
                  onChange={handleEditChange}
                  className="w-full rounded-lg glass-input px-3 py-2 text-sm outline-none focus:border-blue-500"
                >
                  <option value="">Select doctor</option>
                  {doctors.map((doctor) => (
                    <option key={doctor.doctorId} value={doctor.doctorId}>
                      Dr. {doctor.firstName} {doctor.lastName}
                      {doctor.specialization ? ` - ${doctor.specialization}` : ''}
                    </option>
                  ))}
                </select>
              </div>

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
                  placeholder="Reason for appointment"
                  className="w-full rounded-lg glass-input px-3 py-2 text-sm outline-none focus:border-blue-500 resize-none"
                />
              </div>

              <div className="lg:col-span-2 flex justify-end">
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="rounded-lg bg-blue-600 text-white px-4 py-2 text-sm font-semibold hover:bg-blue-700 disabled:opacity-60"
                >
                  {editSubmitting ? 'Saving...' : 'Save changes'}
                </button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl glass-card p-6 text-sm text-gray-500">
            Loading appointments...
          </div>
        ) : !currentProfile ? (
          <div className="rounded-2xl glass-card p-6 text-sm text-red-600">
            {profileLabel === 'patient'
              ? 'Patient profile not found. Please create your profile first.'
              : 'Doctor profile not found. Please complete your doctor profile first.'}
          </div>
        ) : (
          <div className={`grid grid-cols-1 ${showBookingForm ? 'xl:grid-cols-3' : 'xl:grid-cols-1'} gap-6`}>
            {showBookingForm && (
              <div className="xl:col-span-1">
                <div className="rounded-2xl glass-card p-5">
                  <h2 className="text-lg font-bold text-gray-900 mb-4">Book Appointment</h2>

                  <form onSubmit={handleBook} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Doctor</label>
                    <select
                      name="doctorId"
                      value={form.doctorId}
                      onChange={handleChange}
                      className="w-full rounded-lg glass-input px-3 py-2 text-sm outline-none focus:border-blue-500"
                    >
                      <option value="">Select doctor</option>
                      {doctors.map((doctor) => (
                        <option key={doctor.doctorId} value={doctor.doctorId}>
                          {doctor.formattedId ? `${doctor.formattedId} - ` : ''}
                          Dr. {doctor.firstName} {doctor.lastName}
                          {doctor.specialization ? ` - ${doctor.specialization}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                    <input
                      type="date"
                      name="appointmentDate"
                      value={form.appointmentDate}
                      onChange={handleChange}
                      className="w-full rounded-lg glass-input px-3 py-2 text-sm outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Available Time Slot
                    </label>
                    <select
                      name="appointmentTime"
                      value={form.appointmentTime}
                      onChange={handleChange}
                      className="w-full rounded-lg glass-input px-3 py-2 text-sm outline-none focus:border-blue-500"
                      disabled={!availableSlots.length}
                    >
                      <option value="">
                        {availableSlots.length ? 'Select time' : 'No slots available'}
                      </option>
                      {availableSlots.map((slot, idx) => (
                        <option
                          key={`${slot}-${idx}`}
                          value={slot.length === 5 ? `${slot}:00` : slot}
                        >
                          {formatTimeLabel(slot)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                    <textarea
                      name="reason"
                      value={form.reason}
                      onChange={handleChange}
                      rows="3"
                      placeholder="Reason for appointment"
                      className="w-full rounded-lg glass-input px-3 py-2 text-sm outline-none focus:border-blue-500 resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full rounded-lg bg-blue-600 text-white py-2.5 text-sm font-semibold hover:bg-blue-700 disabled:opacity-60"
                  >
                    {submitting ? 'Booking...' : 'Book Appointment'}
                  </button>
                </form>
              </div>
            </div>
            )}

            <div className={showBookingForm ? 'xl:col-span-2' : 'xl:col-span-1'}>
              <div className="rounded-2xl glass-card p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-gray-900">My Appointments</h2>
                  <button
                    onClick={refreshAppointments}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                  >
                    Refresh
                  </button>
                </div>

                {!appointments.length ? (
                  <p className="text-sm text-gray-500">No appointments found.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100 text-left text-gray-500">
                          <th className="py-3 pr-4">Doctor</th>
                          <th className="py-3 pr-4">Date</th>
                          <th className="py-3 pr-4">Time</th>
                          <th className="py-3 pr-4">Status</th>
                          <th className="py-3 pr-4">Reason</th>
                          <th className="py-3 pr-0">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {appointments.map((item) => (
                          <tr key={item.appointmentId} className="border-b border-gray-50">
                            <td className="py-3 pr-4">
                              <div className="font-medium text-gray-900">{item.doctorName}</div>
                              {item.doctorFormattedId && (
                                <div className="text-[10px] font-bold text-blue-600 font-mono tracking-tighter">
                                  {item.doctorFormattedId}
                                </div>
                              )}
                            </td>
                            <td className="py-3 pr-4 text-gray-700">{item.appointmentDate}</td>
                            <td className="py-3 pr-4 text-gray-700">
                              {formatTimeLabel(item.appointmentTime)}
                            </td>
                            <td className="py-3 pr-4">{getStatusBadge(item.status)}</td>
                            <td className="py-3 pr-4 text-gray-600">{item.reason || '-'}</td>
                            <td className="py-3 pr-0">
                              {isStaff ? (
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
                              ) : (
                                (item.status === 'Pending' || item.status === 'Confirmed') ? (
                                  <div className="flex flex-col gap-2">
                                    {item.status === 'Confirmed' && item.updatedAt && item.createdAt && new Date(item.updatedAt) > new Date(item.createdAt) && (
                                      <span className="inline-flex w-fit rounded-full bg-blue-100 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
                                        Updated by clinic
                                      </span>
                                    )}
                                    <div className="flex flex-col gap-2 sm:flex-row">
                                    {item.status === 'Pending' ? (
                                      <button
                                        type="button"
                                        onClick={() => handleEditClick(item)}
                                        className="rounded-lg border border-blue-300 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50"
                                      >
                                        Edit
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        disabled
                                        className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-400 cursor-not-allowed"
                                        title="Confirmed appointments can only be rescheduled by doctor or admin."
                                      >
                                        Locked
                                      </button>
                                    )}
                                    {item.status === 'Pending' ? (
                                      <button
                                        type="button"
                                        onClick={() => handleCancel(item.appointmentId)}
                                        className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
                                      >
                                        Cancel
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={handleContactAdminForCancellation}
                                        className="rounded-lg border border-amber-300 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-50"
                                      >
                                        Contact Admin
                                      </button>
                                    )}
                                    </div>
                                  </div>
                                ) : (
                                  <button
                                    disabled
                                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-400 cursor-not-allowed"
                                  >
                                    Closed
                                  </button>
                                )
                              )}
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
        )}
      </div>
    </div>
  );
}

export default PatientAppointments;
