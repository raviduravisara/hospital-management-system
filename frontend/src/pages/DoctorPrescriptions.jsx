import { useEffect, useState, useMemo } from 'react';
import Select from 'react-select';
import { Link, Navigate } from 'react-router-dom';
import axiosInstance from '../api/axios';
import { extractRoleFromToken } from '../utils/auth';

const newItem = () => ({ medicineId: '', dosage: '', frequency: '', duration: '', quantity: '1' });

export default function DoctorPrescriptions() {
  const token = localStorage.getItem('token');
  const role = extractRoleFromToken(token);

  const [doctor, setDoctor] = useState(null);
  const [prescriptions, setPrescriptions] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [doctorProfileMissing, setDoctorProfileMissing] = useState(false);
  const [form, setForm] = useState({
    patientId: '',
    appointmentId: '',
    prescriptionDate: new Date().toISOString().slice(0, 10),
    diagnosis: '',
    notes: '',
    items: [newItem()],
  });

  useEffect(() => {
    const loadData = async () => {
      if (!token || role !== 'doctor') {
        setLoading(false);
        return;
      }

      setError('');
      setLoading(true);

      try {
        const doctorRes = await axiosInstance.get('/api/doctors/me');
        setDoctor(doctorRes.data);
        const doctorId = doctorRes.data?.doctorId;
        if (doctorId) {
          const [prescriptionsRes, appointmentsRes, medicinesRes] = await Promise.all([
            axiosInstance.get(`/api/prescriptions/doctor/${doctorId}`),
            axiosInstance.get(`/api/appointments/doctor/${doctorId}`),
            axiosInstance.get('/api/medicines'),
          ]);

          setPrescriptions(prescriptionsRes.data || []);
          setAppointments(appointmentsRes.data || []);
          setMedicines(Array.isArray(medicinesRes.data) ? medicinesRes.data : []);
        }
      } catch (err) {
        if (err.response?.status === 404) {
          setDoctorProfileMissing(true);
          setError('Doctor profile not found. Please create your doctor profile before issuing prescriptions.');
        } else {
          setError(err.response?.data?.message ?? 'Unable to load prescriptions.');
        }
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [token, role]);

  const refreshPrescriptions = async (doctorId) => {
    try {
      const res = await axiosInstance.get(`/api/prescriptions/doctor/${doctorId}`);
      setPrescriptions(res.data || []);
    } catch (err) {
      setPrescriptions([]);
    }
  };

  const patientOptions = useMemo(() => {
    const map = new Map();
    appointments.forEach((item) => {
      if (!map.has(String(item.patientId))) {
        map.set(String(item.patientId), {
          name: item.patientName || `Patient #${item.patientId}`,
          formattedId: item.patientFormattedId || `PAT-${String(item.patientId).padStart(4, '0')}`
        });
      }
    });

    return Array.from(map.entries())
      .map(([id, data]) => {
        return { value: id, label: `${data.formattedId} - ${data.name}` };
      })
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [appointments]);

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleAppointmentChange = (event) => {
    const appointmentId = event.target.value;
    const selectedAppointment = appointments.find((item) => String(item.appointmentId) === appointmentId);

    setForm((prev) => ({
      ...prev,
      appointmentId,
      patientId: selectedAppointment ? String(selectedAppointment.patientId) : prev.patientId,
    }));
  };

  const handleItemChange = (index, field, value) => {
    setForm((prev) => {
      const items = [...prev.items];
      items[index] = { ...items[index], [field]: value };
      return { ...prev, items };
    });
  };

  const addItem = () => {
    setForm((prev) => ({ ...prev, items: [...prev.items, newItem()] }));
  };

  const removeItem = (index) => {
    setForm((prev) => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    const patientId = Number(form.patientId);
    const appointmentId = form.appointmentId ? Number(form.appointmentId) : null;
    const items = form.items.map((item) => ({
      medicineId: Number(item.medicineId),
      dosage: item.dosage,
      frequency: item.frequency,
      duration: item.duration,
      quantity: Number(item.quantity),
    }));

    if (!patientId || patientId <= 0) {
      setError('Please enter a valid patient ID.');
      return;
    }
    if (form.appointmentId && (!appointmentId || appointmentId <= 0)) {
      setError('Please enter a valid appointment ID or clear the appointment selection.');
      return;
    }

    if (!form.prescriptionDate) {
      setError('Please choose a prescription date.');
      return;
    }

    if (!items.length || items.some((item) => item.medicineId <= 0 || item.quantity <= 0)) {
      setError('Please provide at least one medication with a valid medicine ID and quantity.');
      return;
    }
    const validMedicineIds = new Set(medicines.map((medicine) => medicine.medicineId));
    if (items.some((item) => !validMedicineIds.has(item.medicineId))) {
      setError('Please select valid medicines from the medicine selector.');
      return;
    }

    setSaving(true);

    try {
      const doctorId = doctor?.doctorId;
      if (!doctorId) {
        throw new Error('Doctor profile not available.');
      }

      const selectedAppointment = appointments.find((appt) => appt.appointmentId === appointmentId);
      if (selectedAppointment && selectedAppointment.patientId !== patientId) {
        throw new Error('Selected appointment patient does not match the entered patient.');
      }

      await axiosInstance.post('/api/prescriptions', {
        patientId,
        doctorId,
        appointmentId,
        prescriptionDate: form.prescriptionDate,
        diagnosis: form.diagnosis.trim() || null,
        notes: form.notes.trim() || null,
        items,
      });

      setSuccess('Prescription created successfully.');
      setForm((prev) => ({ ...prev, appointmentId: '', diagnosis: '', notes: '', items: [newItem()] }));
      refreshPrescriptions(doctorId);
    } catch (err) {
      setError(err.response?.data?.message ?? 'Unable to create prescription.');
    } finally {
      setSaving(false);
    }
  };

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (role !== 'doctor') {
    return <Navigate to="/dashboard" replace />;
  }

  if (doctorProfileMissing) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 md:p-8">
        <div className="max-w-3xl mx-auto rounded-2xl bg-white border border-gray-100 p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-gray-900">Prescriptions</h1>
          <p className="mt-3 text-sm text-gray-600">Doctor profile not found. You must complete your doctor profile before issuing prescriptions.</p>
          <div className="mt-5">
            <Link
              to="/doctor/register"
              className="inline-flex items-center rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
            >
              Register Doctor Profile
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Prescriptions</h1>
            <p className="text-sm text-gray-500 mt-1">
              Issue new prescriptions and review your previous prescriptions.
            </p>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {success}
          </div>
        )}

        <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Create Prescription</h2>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 text-sm text-gray-700">
                  <label className="block">Patient ID</label>
                  <Select
                    options={patientOptions}
                    value={patientOptions.find((opt) => opt.value === String(form.patientId)) || null}
                    onChange={(selected) =>
                      handleFormChange({ target: { name: 'patientId', value: selected ? selected.value : '' } })
                    }
                    isDisabled={Boolean(form.appointmentId)}
                    placeholder="Search PAT-XXXX..."
                    isClearable
                    styles={{
                      control: (base) => ({
                        ...base,
                        borderRadius: '1rem',
                        borderColor: '#E5E7EB',
                        backgroundColor: '#F9FAFB',
                        padding: '4px',
                        fontSize: '0.875rem',
                      }),
                    }}
                  />
                </div>
                  {form.appointmentId && (
                    <p className="text-xs text-gray-500">Patient ID is auto-filled from the selected appointment.</p>
                  )}
                <label className="space-y-2 text-sm text-gray-700">
                  Appointment (optional)
                  {appointments.length ? (
                    <select
                      name="appointmentId"
                      value={form.appointmentId}
                      onChange={handleAppointmentChange}
                      className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
                    >
                      <option value="">No appointment selected</option>
                      {appointments.map((appointment) => (
                        <option key={appointment.appointmentId} value={appointment.appointmentId}>
                          #{appointment.appointmentId} • {appointment.patientName} • {appointment.appointmentDate}
                        </option>
                      ))}
                    </select>
                  ) : (
                   <input
  name="appointmentId"
  type="number"
  min="1"
  value={form.appointmentId}
  onChange={handleFormChange}
  className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 focus:border-blue-500 focus:bg-white focus:outline-none"
  placeholder="Appointment ID"
/>
                  )}
                  {appointments.length === 0 ? (
                    <p className="text-xs text-gray-500">No appointments available for auto-selection.</p>
                  ) : (
                    <p className="text-xs text-gray-500">Select a valid appointment to auto-fill the correct patient.</p>
                  )}
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2 text-sm text-gray-700">
                  Prescription Date
                  <input
                    name="prescriptionDate"
                    type="date"
                    value={form.prescriptionDate}
                    onChange={handleFormChange}
                    className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 focus:border-blue-500 focus:bg-white focus:outline-none"
                  />
                </label>

                <label className="space-y-2 text-sm text-gray-700">
                  Diagnosis / Notes
                  <input
                    name="diagnosis"
                    value={form.diagnosis}
                    onChange={handleFormChange}
                    className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 focus:border-blue-500 focus:bg-white focus:outline-none"
                    placeholder="Diagnosis"
                  />
                </label>
              </div>

              <label className="space-y-2 text-sm text-gray-700">
                Notes
                <textarea
                  name="notes"
                  value={form.notes}
                  onChange={handleFormChange}
                  rows={3}
                  className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 focus:border-blue-500 focus:bg-white focus:outline-none"
                  placeholder="Additional patient instructions"
                />
              </label>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900">Medicine Items</h3>
                  <button
                    type="button"
                    onClick={addItem}
                    className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                  >
                    Add item
                  </button>
                </div>
                {medicines.length === 0 && (
                  <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
                    No medicines found. Ask admin to add medicines before creating prescriptions.
                  </p>
                )}

                {form.items.map((item, index) => (
                  <div key={index} className="rounded-3xl border border-gray-200 bg-gray-50 p-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="space-y-2 text-sm text-gray-700">
                        Medicine
                        <select
                          value={item.medicineId}
                          onChange={(event) => handleItemChange(index, 'medicineId', event.target.value)}
                          className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
                        >
                          <option value="">Select medicine</option>
                          {medicines.map((medicine) => (
                            <option key={medicine.medicineId} value={medicine.medicineId}>
                              {medicine.medicineName} (ID {medicine.medicineId}) - Stock {medicine.stockQuantity}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="space-y-2 text-sm text-gray-700">
                        Quantity
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(event) => handleItemChange(index, 'quantity', event.target.value)}
                          className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
                          placeholder="Quantity"
                        />
                      </label>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3 mt-4">
                      <input
                        type="text"
                        value={item.dosage}
                        onChange={(event) => handleItemChange(index, 'dosage', event.target.value)}
                        className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
                        placeholder="Dosage"
                      />
                      <input
                        type="text"
                        value={item.frequency}
                        onChange={(event) => handleItemChange(index, 'frequency', event.target.value)}
                        className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
                        placeholder="Frequency"
                      />
                      <input
                        type="text"
                        value={item.duration}
                        onChange={(event) => handleItemChange(index, 'duration', event.target.value)}
                        className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
                        placeholder="Duration"
                      />
                    </div>

                    <div className="mt-4 flex justify-end">
                      {form.items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-100"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="submit"
                disabled={saving || medicines.length === 0}
                className="inline-flex items-center justify-center rounded-2xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
              >
                {saving ? 'Saving...' : 'Create Prescription'}
              </button>
            </form>
          </div>

          <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Prescriptions</h2>

            {loading ? (
              <p className="text-sm text-gray-500">Loading recent prescriptions...</p>
            ) : prescriptions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-6 text-sm text-gray-600">
                No prescriptions have been created yet.
              </div>
            ) : (
              <div className="space-y-4">
                {prescriptions.map((prescription) => (
                  <div key={prescription.prescriptionId} className="rounded-3xl border border-gray-200 bg-gray-50 p-4">
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <p className="text-sm font-semibold text-gray-900">Prescription #{prescription.prescriptionId}</p>
                      <span className="text-xs text-gray-500">{prescription.prescriptionDate}</span>
                    </div>
                    <p className="text-sm text-gray-600">Patient ID: {prescription.patientId}</p>
                    <p className="text-sm text-gray-600 mt-2">Diagnosis: {prescription.diagnosis || 'N/A'}</p>
                    <div className="mt-3 text-sm text-gray-600">
                      <p className="font-semibold text-gray-800">Medicine items</p>
                      {prescription.items?.length ? (
                        <ul className="mt-2 space-y-2">
                          {prescription.items.map((item) => (
                            <li key={item.prescriptionItemId} className="rounded-2xl bg-white p-3 border border-gray-200">
                              <p className="font-medium text-gray-900">{item.medicineName || `ID ${item.medicineId}`}</p>
                              <p>{item.dosage || 'Dosage not set'} · {item.frequency || 'Frequency not set'}</p>
                              <p>Duration: {item.duration || 'N/A'} • Qty: {item.quantity}</p>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-2 text-gray-500">No medicine details available.</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
