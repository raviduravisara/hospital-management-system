import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axios';
import { extractRoleFromToken } from '../utils/auth';

const normalizeDateValue = (value) => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
};

export default function PatientPrescriptions() {
  const token = localStorage.getItem('token');
  const role = extractRoleFromToken(token);
  const navigate = useNavigate();

  const [patient, setPatient] = useState(null);
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPrescriptions = async () => {
      if (!token || role !== 'patient') {
        setLoading(false);
        return;
      }

      setError('');
      setLoading(true);

      try {
        const profileRes = await axiosInstance.get('/api/patients/me');
        setPatient(profileRes.data);

        const patientId = profileRes.data?.patientId;
        if (!patientId) {
          setPrescriptions([]);
          return;
        }

        const prescriptionsRes = await axiosInstance.get(`/api/prescriptions/patient/${patientId}`);
        const ordered = [...(prescriptionsRes.data || [])].sort(
          (a, b) => normalizeDateValue(b.prescriptionDate) - normalizeDateValue(a.prescriptionDate),
        );
        setPrescriptions(ordered);
      } catch (err) {
        setError(err.response?.data?.message ?? 'Unable to load prescriptions.');
      } finally {
        setLoading(false);
      }
    };

    fetchPrescriptions();
  }, [token, role]);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (role !== 'patient') {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Prescriptions</h1>
            <p className="text-sm text-gray-500 mt-1">
              Review prescriptions issued for you and view medicine details.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => navigate('/patient/billing')}
              className="rounded-2xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Go to Billing
            </button>
            <button
              onClick={() => navigate('/patient/appointments')}
              className="rounded-2xl border border-gray-200 bg-white px-5 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
            >
              View Appointments
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Prescription History</h2>
          {loading ? (
            <p className="text-sm text-gray-500">Loading prescriptions...</p>
          ) : prescriptions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-6 text-sm text-gray-600">
              No prescriptions found. Ask your doctor to issue a prescription after your consultation.
            </div>
          ) : (
            <div className="relative pl-6">
              <span className="absolute left-[11px] top-0 h-full w-px bg-gray-200" aria-hidden />
              <div className="space-y-5">
                {prescriptions.map((prescription) => (
                  <article key={prescription.prescriptionId} className="relative">
                    <span
                      className="absolute -left-6 top-6 inline-flex h-3 w-3 rounded-full border-2 border-white bg-blue-500 shadow"
                      aria-hidden
                    />
                    <div className="rounded-3xl border border-gray-200 bg-gray-50 p-5 shadow-sm">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
                        <div>
                          <p className="text-sm text-gray-500">Prescription #{prescription.prescriptionId}</p>
                          <h3 className="text-lg font-semibold text-gray-900">{prescription.diagnosis || 'Prescription details'}</h3>
                        </div>
                        <div className="text-sm text-gray-500 text-right">
                          <p>Date: {prescription.prescriptionDate}</p>
                          <p className="flex items-center justify-end gap-2 mt-0.5" title={prescription.doctorFormattedId}>
                            <span>Doctor: {prescription.doctorName || 'Unknown'}</span>
                            {prescription.doctorFormattedId && (
                              <span className="text-[10px] font-bold text-teal-600 font-mono tracking-tighter bg-teal-50 px-1.5 py-0.5 rounded">
                                {prescription.doctorFormattedId}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-2xl bg-white p-4 border border-gray-200">
                          <p className="text-sm font-semibold text-gray-700">Notes</p>
                          <p className="mt-2 text-sm text-gray-600">
                            {prescription.notes || 'No notes provided.'}
                          </p>
                        </div>
                        <div className="rounded-2xl bg-white p-4 border border-gray-200">
                          <p className="text-sm font-semibold text-gray-700">Medicine Items</p>
                          {prescription.items?.length ? (
                            <ul className="mt-3 space-y-2 text-sm text-gray-600">
                              {prescription.items.map((item) => (
                                <li key={item.prescriptionItemId} className="rounded-xl bg-gray-50 p-3">
                                  <p className="font-medium text-gray-900">{item.medicineName || `Medicine ${item.medicineId}`}</p>
                                  <p>{item.dosage || 'Dosage not set'}, {item.frequency || 'Frequency not set'}</p>
                                  <p>Duration: {item.duration || 'N/A'} • Qty: {item.quantity}</p>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="mt-3 text-sm text-gray-500">No medicine items were added to this prescription.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
