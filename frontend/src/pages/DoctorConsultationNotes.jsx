import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import axiosInstance from '../api/axios';
import { extractRoleFromToken } from '../utils/auth';

const initialFormState = {
  patientId: '',
  appointmentId: '',
  consultationDate: new Date().toISOString().slice(0, 10),
  chiefComplaint: '',
  diagnosis: '',
  treatmentPlan: '',
  notes: '',
};

const asText = (value) => (value == null ? '' : String(value));

export default function DoctorConsultationNotes() {
  const token = localStorage.getItem('token');
  const role = extractRoleFromToken(token);

  const [doctor, setDoctor] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [doctorProfileMissing, setDoctorProfileMissing] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [historyPatientId, setHistoryPatientId] = useState('');
  const [form, setForm] = useState(initialFormState);

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
        setDoctor(doctorRes.data);

        const [appointmentsRes, notesRes] = await Promise.all([
          axiosInstance.get(`/api/appointments/doctor/${doctorRes.data.doctorId}`),
          axiosInstance.get('/api/consultation-notes/doctor/me'),
        ]);

        setAppointments(Array.isArray(appointmentsRes.data) ? appointmentsRes.data : []);
        setNotes(Array.isArray(notesRes.data) ? notesRes.data : []);
      } catch (requestError) {
        if (requestError.response?.status === 404) {
          setDoctorProfileMissing(true);
          setError('Doctor profile not found. Please create your doctor profile first.');
        } else {
          setError(requestError.response?.data?.message ?? 'Unable to load consultation notes.');
        }
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [token, role]);

  const refreshNotes = async (patientId = '') => {
    try {
      const query = patientId ? `?patientId=${patientId}` : '';
      const response = await axiosInstance.get(`/api/consultation-notes/doctor/me${query}`);
      setNotes(Array.isArray(response.data) ? response.data : []);
    } catch {
      setNotes([]);
    }
  };

  const patientOptions = useMemo(() => {
    const map = new Map();

    appointments.forEach((item) => {
      if (!map.has(item.patientId)) {
        map.set(item.patientId, item.patientName);
      }
    });

    notes.forEach((item) => {
      if (!map.has(item.patientId)) {
        map.set(item.patientId, item.patientName);
      }
    });

    return Array.from(map.entries())
      .map(([patientId, patientName]) => ({ patientId, patientName }))
      .sort((a, b) => a.patientName.localeCompare(b.patientName));
  }, [appointments, notes]);

  const appointmentOptions = useMemo(() => {
    const patientId = Number(form.patientId);
    if (!patientId) return [];

    return appointments
      .filter((item) => item.patientId === patientId)
      .map((item) => ({
        appointmentId: item.appointmentId,
        label: `${item.appointmentDate} ${String(item.appointmentTime || '').slice(0, 5)} (${item.status})`,
      }));
  }, [appointments, form.patientId]);

  const historyItems = useMemo(() => {
    const patientId = Number(historyPatientId);
    const items = patientId ? notes.filter((item) => item.patientId === patientId) : notes;

    return items.slice().sort((a, b) => {
      const left = `${b.consultationDate} ${b.createdAt || ''}`;
      const right = `${a.consultationDate} ${a.createdAt || ''}`;
      return left.localeCompare(right);
    });
  }, [notes, historyPatientId]);

  const resetForm = () => {
    setEditingNoteId(null);
    setForm({
      ...initialFormState,
      consultationDate: new Date().toISOString().slice(0, 10),
      patientId: historyPatientId || '',
    });
  };

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
      ...(name === 'patientId' ? { appointmentId: '' } : {}),
    }));
  };

  const startEdit = (note) => {
    setEditingNoteId(note.noteId);
    setForm({
      patientId: String(note.patientId),
      appointmentId: note.appointmentId ? String(note.appointmentId) : '',
      consultationDate: note.consultationDate,
      chiefComplaint: asText(note.chiefComplaint),
      diagnosis: asText(note.diagnosis),
      treatmentPlan: asText(note.treatmentPlan),
      notes: asText(note.notes),
    });
    setError('');
    setSuccess('');
  };

  const handleDelete = async (noteId) => {
    if (!window.confirm('Are you sure you want to delete this consultation note?')) {
      return;
    }

    setError('');
    setSuccess('');

    try {
      await axiosInstance.delete(`/api/consultation-notes/${noteId}`);
      setSuccess('Consultation note deleted successfully.');
      await refreshNotes(historyPatientId);
      if (editingNoteId === noteId) {
        resetForm();
      }
    } catch (requestError) {
      setError(requestError.response?.data?.message ?? 'Unable to delete consultation note.');
    }
  };

  const handleHistoryFilterChange = async (event) => {
    const patientId = event.target.value;
    setHistoryPatientId(patientId);
    await refreshNotes(patientId);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const patientId = Number(form.patientId);
    if (!patientId) {
      setError('Please select a patient.');
      return;
    }

    if (!form.consultationDate) {
      setError('Please choose consultation date.');
      return;
    }

    const payload = {
      patientId,
      appointmentId: form.appointmentId ? Number(form.appointmentId) : null,
      consultationDate: form.consultationDate,
      chiefComplaint: form.chiefComplaint.trim() || null,
      diagnosis: form.diagnosis.trim() || null,
      treatmentPlan: form.treatmentPlan.trim() || null,
      notes: form.notes.trim() || null,
    };

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      if (editingNoteId) {
        await axiosInstance.put(`/api/consultation-notes/${editingNoteId}`, payload);
        setSuccess('Consultation note updated successfully.');
      } else {
        await axiosInstance.post('/api/consultation-notes', payload);
        setSuccess('Consultation note created successfully.');
      }

      await refreshNotes(historyPatientId || String(patientId));
      resetForm();
    } catch (requestError) {
      setError(requestError.response?.data?.message ?? 'Unable to save consultation note.');
    } finally {
      setSaving(false);
    }
  };

  if (!token) return <Navigate to="/login" replace />;
  if (role !== 'doctor') return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen glass-page p-6 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Consultation Notes</h1>
          <p className="mt-1 text-sm text-gray-500">Record consultation details and review patient history.</p>
        </div>

        {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        {success && <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{success}</div>}

        {loading ? (
          <div className="rounded-2xl glass-card p-6 text-sm text-gray-500">Loading consultation notes...</div>
        ) : doctorProfileMissing || !doctor ? (
          <div className="rounded-2xl glass-card p-6 text-sm text-red-700">Doctor profile not found. Please complete your profile first.</div>
        ) : (
          <>
            <section className="rounded-2xl glass-card p-5">
              <h2 className="text-lg font-bold text-gray-900">{editingNoteId ? 'Edit Consultation Note' : 'Add Consultation Note'}</h2>
              <form onSubmit={handleSubmit} className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="text-sm font-medium text-gray-700">
                  Patient
                  <select
                    name="patientId"
                    value={form.patientId}
                    onChange={handleFormChange}
                    className="mt-1 w-full rounded-lg glass-input px-3 py-2 text-sm"
                    required
                  >
                    <option value="">Select patient</option>
                    {patientOptions.map((option) => (
                      <option key={option.patientId} value={option.patientId}>{option.patientName}</option>
                    ))}
                  </select>
                </label>

                <label className="text-sm font-medium text-gray-700">
                  Appointment (Optional)
                  <select
                    name="appointmentId"
                    value={form.appointmentId}
                    onChange={handleFormChange}
                    className="mt-1 w-full rounded-lg glass-input px-3 py-2 text-sm"
                  >
                    <option value="">No appointment linked</option>
                    {appointmentOptions.map((option) => (
                      <option key={option.appointmentId} value={option.appointmentId}>
                        #{option.appointmentId} • {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="text-sm font-medium text-gray-700">
                  Consultation Date
                  <input
                    type="date"
                    name="consultationDate"
                    value={form.consultationDate}
                    onChange={handleFormChange}
                    className="mt-1 w-full rounded-lg glass-input px-3 py-2 text-sm"
                    required
                  />
                </label>

                <label className="text-sm font-medium text-gray-700">
                  Chief Complaint
                  <input
                    name="chiefComplaint"
                    value={form.chiefComplaint}
                    onChange={handleFormChange}
                    className="mt-1 w-full rounded-lg glass-input px-3 py-2 text-sm"
                    maxLength={500}
                  />
                </label>

                <label className="text-sm font-medium text-gray-700 md:col-span-2">
                  Diagnosis
                  <textarea
                    name="diagnosis"
                    value={form.diagnosis}
                    onChange={handleFormChange}
                    rows={3}
                    className="mt-1 w-full rounded-lg glass-input px-3 py-2 text-sm"
                    maxLength={1000}
                  />
                </label>

                <label className="text-sm font-medium text-gray-700 md:col-span-2">
                  Treatment Plan
                  <textarea
                    name="treatmentPlan"
                    value={form.treatmentPlan}
                    onChange={handleFormChange}
                    rows={3}
                    className="mt-1 w-full rounded-lg glass-input px-3 py-2 text-sm"
                    maxLength={1000}
                  />
                </label>

                <label className="text-sm font-medium text-gray-700 md:col-span-2">
                  Notes
                  <textarea
                    name="notes"
                    value={form.notes}
                    onChange={handleFormChange}
                    rows={3}
                    className="mt-1 w-full rounded-lg glass-input px-3 py-2 text-sm"
                    maxLength={2000}
                  />
                </label>

                <div className="md:col-span-2 flex justify-end gap-2">
                  {editingNoteId && (
                    <button
                      type="button"
                      onClick={resetForm}
                      className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
                    >
                      Cancel Edit
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                  >
                    {saving ? 'Saving...' : editingNoteId ? 'Update Note' : 'Save Note'}
                  </button>
                </div>
              </form>
            </section>

            <section className="rounded-2xl glass-card p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-bold text-gray-900">Patient History</h2>
                <div className="flex items-center gap-2">
                  <select
                    value={historyPatientId}
                    onChange={handleHistoryFilterChange}
                    className="rounded-lg glass-input px-3 py-2 text-sm"
                  >
                    <option value="">All patients</option>
                    {patientOptions.map((option) => (
                      <option key={option.patientId} value={option.patientId}>{option.patientName}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => refreshNotes(historyPatientId)}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                  >
                    Refresh
                  </button>
                </div>
              </div>

              {!historyItems.length ? (
                <p className="text-sm text-gray-500">No consultation notes found.</p>
              ) : (
                <div className="space-y-3">
                  {historyItems.map((note) => (
                    <article key={note.noteId} className="rounded-xl border border-gray-200 bg-white/70 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{note.patientName}</p>
                          <p className="text-xs text-gray-500">
                            {note.consultationDate}
                            {note.appointmentId ? ` • Appointment #${note.appointmentId}` : ''}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => startEdit(note)}
                            className="rounded-lg border border-indigo-300 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(note.noteId)}
                            className="rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                          >
                            Delete
                          </button>
                        </div>
                      </div>

                      <div className="mt-3 grid gap-2 text-sm text-gray-700">
                        {note.chiefComplaint && <p><span className="font-semibold">Chief Complaint:</span> {note.chiefComplaint}</p>}
                        {note.diagnosis && <p><span className="font-semibold">Diagnosis:</span> {note.diagnosis}</p>}
                        {note.treatmentPlan && <p><span className="font-semibold">Treatment Plan:</span> {note.treatmentPlan}</p>}
                        {note.notes && <p><span className="font-semibold">Notes:</span> {note.notes}</p>}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
