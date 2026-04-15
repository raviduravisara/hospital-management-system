import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import axiosInstance from '../api/axios';
import { extractRoleFromToken } from '../utils/auth';

export default function DoctorPatientRecords() {
  const token = localStorage.getItem('token');
  const role = extractRoleFromToken(token);

  const [doctor, setDoctor] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [notes, setNotes] = useState([]);
  const [labRequests, setLabRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState('');

  useEffect(() => {
    const loadData = async () => {
      if (!token || role !== 'doctor') {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');

      try {
        const doctorRes = await axiosInstance.get('/api/doctors/me');
        const doctorData = doctorRes.data;
        setDoctor(doctorData);

        const doctorId = doctorData?.doctorId;
        if (!doctorId) {
          throw new Error('Doctor profile not found.');
        }

        const [appointmentsRes, prescriptionsRes, notesRes, labRequestsRes] = await Promise.all([
          axiosInstance.get(`/api/appointments/doctor/${doctorId}`).catch(() => ({ data: [] })),
          axiosInstance.get(`/api/prescriptions/doctor/${doctorId}`).catch(() => ({ data: [] })),
          axiosInstance.get('/api/consultation-notes/doctor/me').catch(() => ({ data: [] })),
          axiosInstance.get('/api/lab-requests/me').catch(() => ({ data: [] })),
        ]);

        setAppointments(Array.isArray(appointmentsRes.data) ? appointmentsRes.data : []);
        setPrescriptions(Array.isArray(prescriptionsRes.data) ? prescriptionsRes.data : []);
        setNotes(Array.isArray(notesRes.data) ? notesRes.data : []);
        setLabRequests(Array.isArray(labRequestsRes.data) ? labRequestsRes.data : []);
      } catch (err) {
        setError(err.response?.data?.message || err.message || 'Unable to load patient records.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [token, role]);

  const patientOptions = useMemo(() => {
    const map = new Map();

    appointments.forEach((item) => {
      if (!map.has(String(item.patientId))) {
        map.set(String(item.patientId), item.patientName || `Patient #${item.patientId}`);
      }
    });

    prescriptions.forEach((item) => {
      if (!map.has(String(item.patientId))) {
        map.set(String(item.patientId), item.patientName || `Patient #${item.patientId}`);
      }
    });

    notes.forEach((item) => {
      if (!map.has(String(item.patientId))) {
        map.set(String(item.patientId), item.patientName || `Patient #${item.patientId}`);
      }
    });

    labRequests.forEach((item) => {
      if (!map.has(String(item.patientId))) {
        map.set(String(item.patientId), item.patientName || `Patient #${item.patientId}`);
      }
    });

    return Array.from(map.entries())
      .map(([patientId, patientName]) => ({ patientId, patientName }))
      .sort((a, b) => a.patientName.localeCompare(b.patientName));
  }, [appointments, prescriptions, notes, labRequests]);

  const filteredAppointments = useMemo(() => {
    if (!selectedPatientId) return appointments;
    return appointments.filter((item) => String(item.patientId) === selectedPatientId);
  }, [appointments, selectedPatientId]);

  const filteredPrescriptions = useMemo(() => {
    if (!selectedPatientId) return prescriptions;
    return prescriptions.filter((item) => String(item.patientId) === selectedPatientId);
  }, [prescriptions, selectedPatientId]);

  const filteredNotes = useMemo(() => {
    if (!selectedPatientId) return notes;
    return notes.filter((item) => String(item.patientId) === selectedPatientId);
  }, [notes, selectedPatientId]);

  const filteredLabRequests = useMemo(() => {
    if (!selectedPatientId) return labRequests;
    return labRequests.filter((item) => String(item.patientId) === selectedPatientId);
  }, [labRequests, selectedPatientId]);

  if (!token) return <Navigate to="/login" replace />;
  if (role !== 'doctor') return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen glass-page p-6 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Patient Records</h1>
          <p className="mt-1 text-sm text-gray-500">
            View patient clinical information separately from prescriptions.
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <section className="rounded-2xl glass-card p-5">
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500">Doctor</p>
              <p className="mt-2 text-sm font-semibold text-gray-900">
                {doctor
                  ? `${doctor.firstName || ''} ${doctor.lastName || ''}`.trim() || 'Doctor'
                  : 'Loading...'}
              </p>
            </div>

            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500">Patients</p>
              <p className="mt-2 text-sm font-semibold text-gray-900">{patientOptions.length}</p>
            </div>

            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500">Appointments</p>
              <p className="mt-2 text-sm font-semibold text-gray-900">{filteredAppointments.length}</p>
            </div>

            <div>
              <label className="text-xs uppercase tracking-wide text-gray-500">Filter by Patient</label>
              <select
                value={selectedPatientId}
                onChange={(e) => setSelectedPatientId(e.target.value)}
                className="mt-2 w-full rounded-lg glass-input px-3 py-2 text-sm"
              >
                <option value="">All patients</option>
                {patientOptions.map((option) => (
                  <option key={option.patientId} value={option.patientId}>
                    {option.patientName}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {loading ? (
          <div className="rounded-2xl glass-card p-6 text-sm text-gray-500">
            Loading patient records...
          </div>
        ) : (
          <div className="grid gap-6 xl:grid-cols-2">
            <section className="rounded-2xl glass-card p-5">
              <h2 className="text-lg font-bold text-gray-900">Appointments</h2>
              <div className="mt-4 space-y-3">
                {!filteredAppointments.length ? (
                  <p className="text-sm text-gray-500">No appointments found.</p>
                ) : (
                  filteredAppointments.map((item) => (
                    <div key={item.appointmentId} className="rounded-xl border border-gray-200 bg-white/70 p-4">
                      <p className="text-sm font-semibold text-gray-900">
                        {item.patientName || `Patient #${item.patientId}`}
                      </p>
                      <p className="mt-1 text-sm text-gray-600">
                        Appointment #{item.appointmentId} • {item.appointmentDate} •{' '}
                        {String(item.appointmentTime || '').slice(0, 5)}
                      </p>
                      <p className="mt-1 text-sm text-gray-600">Status: {item.status || 'N/A'}</p>
                      <p className="mt-1 text-sm text-gray-600">Reason: {item.reason || 'N/A'}</p>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="rounded-2xl glass-card p-5">
              <h2 className="text-lg font-bold text-gray-900">Prescriptions</h2>
              <div className="mt-4 space-y-3">
                {!filteredPrescriptions.length ? (
                  <p className="text-sm text-gray-500">No prescriptions found.</p>
                ) : (
                  filteredPrescriptions.map((item) => (
                    <div key={item.prescriptionId} className="rounded-xl border border-gray-200 bg-white/70 p-4">
                      <p className="text-sm font-semibold text-gray-900">
                        {item.patientName || `Patient #${item.patientId}`}
                      </p>
                      <p className="mt-1 text-sm text-gray-600">
                        Prescription #{item.prescriptionId} • {item.prescriptionDate}
                      </p>
                      <p className="mt-1 text-sm text-gray-600">Diagnosis: {item.diagnosis || 'N/A'}</p>
                      <p className="mt-1 text-sm text-gray-600">Notes: {item.notes || 'N/A'}</p>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="rounded-2xl glass-card p-5">
              <h2 className="text-lg font-bold text-gray-900">Consultation Notes</h2>
              <div className="mt-4 space-y-3">
                {!filteredNotes.length ? (
                  <p className="text-sm text-gray-500">No consultation notes found.</p>
                ) : (
                  filteredNotes.map((item) => (
                    <div key={item.noteId} className="rounded-xl border border-gray-200 bg-white/70 p-4">
                      <p className="text-sm font-semibold text-gray-900">
                        {item.patientName || `Patient #${item.patientId}`}
                      </p>
                      <p className="mt-1 text-sm text-gray-600">Date: {item.consultationDate}</p>
                      <p className="mt-1 text-sm text-gray-600">
                        Chief Complaint: {item.chiefComplaint || 'N/A'}
                      </p>
                      <p className="mt-1 text-sm text-gray-600">Diagnosis: {item.diagnosis || 'N/A'}</p>
                      <p className="mt-1 text-sm text-gray-600">
                        Treatment Plan: {item.treatmentPlan || 'N/A'}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="rounded-2xl glass-card p-5">
              <h2 className="text-lg font-bold text-gray-900">Lab Requests</h2>
              <div className="mt-4 space-y-3">
                {!filteredLabRequests.length ? (
                  <p className="text-sm text-gray-500">No lab requests found.</p>
                ) : (
                  filteredLabRequests.map((item) => (
                    <div key={item.requestId} className="rounded-xl border border-gray-200 bg-white/70 p-4">
                      <p className="text-sm font-semibold text-gray-900">
                        {item.patientName || `Patient #${item.patientId}`}
                      </p>
                      <p className="mt-1 text-sm text-gray-600">
                        {item.testName || 'Lab Test'} • {item.priority || 'Routine'}
                      </p>
                      <p className="mt-1 text-sm text-gray-600">Status: {item.status || 'N/A'}</p>
                      <p className="mt-1 text-sm text-gray-600">Requested: {item.requestedAt || 'N/A'}</p>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}