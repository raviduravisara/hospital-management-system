import { useEffect, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import axiosInstance from '../api/axios';
import { extractRoleFromToken } from '../utils/auth';

export default function PatientLabReports() {
  const token = localStorage.getItem('token');
  const role = extractRoleFromToken(token);

  const [reports, setReports] = useState([]);
  const [doctorRequests, setDoctorRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Self-upload form state
  const [uploading, setUploading] = useState(false);
  const [testName, setTestName] = useState('');
  const [testDate, setTestDate] = useState('');
  const [resultSummary, setResultSummary] = useState('');
  const [reportFile, setReportFile] = useState(null);

  // Per-request upload
  const [uploadingRequestId, setUploadingRequestId] = useState(null);
  const requestFileRefs = useRef({});

  const fetchAll = async () => {
    setError('');
    setLoading(true);
    try {
      const [reportsRes, requestsRes] = await Promise.all([
        axiosInstance.get('/api/patients/me/lab-reports'),
        axiosInstance.get('/api/lab-requests/patient/me'),
      ]);
      setReports(reportsRes.data || []);
      setDoctorRequests(requestsRes.data || []);
    } catch (err) {
      setError(err.response?.data?.message ?? 'Unable to load lab reports.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token || role !== 'patient') { setLoading(false); return; }
    fetchAll();
  }, [token, role]);

  const handleSelfUpload = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!testName.trim()) return setError('Please enter the lab test name.');
    if (!testDate) return setError('Please select the test date.');

    const formData = new FormData();
    formData.append('testName', testName.trim());
    formData.append('testDate', testDate);
    formData.append('resultSummary', resultSummary.trim());
    if (reportFile) formData.append('reportFile', reportFile);

    setUploading(true);
    try {
      const res = await axiosInstance.post('/api/patients/me/lab-reports', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSuccess('Lab report uploaded successfully.');
      setTestName(''); setTestDate(''); setResultSummary(''); setReportFile(null);
      setReports((prev) => [res.data, ...prev]);
    } catch (err) {
      setError(err.response?.data?.message ?? 'Unable to upload lab report.');
    } finally {
      setUploading(false);
    }
  };

  const CLOUD_NAME = 'dzgmexkrw';
  const UPLOAD_PRESET = 'healix_unsigned';

  const handleRequestUpload = async (requestId, file) => {
    if (!file) return;
    setError(''); setSuccess('');
    setUploadingRequestId(requestId);
    try {
      // Step 1: Upload file directly from browser to Cloudinary (no signature needed)
      const cloudForm = new FormData();
      cloudForm.append('file', file);
      cloudForm.append('upload_preset', UPLOAD_PRESET);
      cloudForm.append('public_id', `hospital/lab_reports/${crypto.randomUUID()}`);

      const cloudRes = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`,
        { method: 'POST', body: cloudForm }
      );
      const cloudData = await cloudRes.json();
      if (!cloudRes.ok) {
        throw new Error(cloudData?.error?.message ?? 'Cloudinary upload failed.');
      }
      const fileUrl = cloudData.secure_url;

      // Step 2: Send the Cloudinary URL to our backend to update the database
      const res = await axiosInstance.post(
        `/api/lab-requests/${requestId}/upload-report`,
        { fileUrl, fileName: file.name }
      );
      setSuccess('Report uploaded and sent to your doctor!');
      setDoctorRequests((prev) =>
        prev.map((r) => (r.requestId === requestId ? res.data : r))
      );
    } catch (err) {
      setError(err.message ?? err.response?.data?.message ?? 'Failed to upload report.');
    } finally {
      setUploadingRequestId(null);
    }
  };

  const handleDownload = async (reportId, fileName) => {
    setError('');
    try {
      const res = await axiosInstance.get(`/api/patients/me/lab-reports/${reportId}/download`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName || `lab-report-${reportId}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.response?.data?.message ?? 'Unable to download lab report.');
    }
  };

  if (!token) return <Navigate to="/login" replace />;
  if (role !== 'patient') return <Navigate to="/dashboard" replace />;

  const pendingCount = doctorRequests.filter((r) => !r.hasReport && r.status !== 'Cancelled').length;

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Lab Reports</h1>
          <p className="text-sm text-gray-500 mt-1">View doctor-requested tests and upload your results.</p>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}
        {success && (
          <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{success}</div>
        )}

        {/* ── DOCTOR REQUESTS SECTION ── */}
        <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Lab Tests Ordered by Your Doctor</h2>
              <p className="text-sm text-gray-500 mt-0.5">Upload your result file for each pending request.</p>
            </div>
            {pendingCount > 0 && (
              <span className="inline-flex items-center rounded-full bg-yellow-50 px-3 py-1 text-xs font-semibold text-yellow-700 border border-yellow-200">
                {pendingCount} Pending Upload{pendingCount > 1 ? 's' : ''}
              </span>
            )}
          </div>

          {loading ? (
            <div className="text-sm text-gray-500">Loading...</div>
          ) : doctorRequests.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-6 text-sm text-gray-600">
              No lab tests have been ordered by your doctor yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                    <th className="px-4 py-3">Test</th>
                    <th className="px-4 py-3">Doctor</th>
                    <th className="px-4 py-3">Priority</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Notes</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {doctorRequests.map((req) => (
                    <tr key={req.requestId} className={`hover:bg-gray-50 ${!req.hasReport && req.status !== 'Cancelled' ? 'bg-yellow-50/40' : ''}`}>
                      <td className="px-4 py-4 font-medium text-gray-900">{req.testName}</td>
                      <td className="px-4 py-4 text-gray-600">
                        <div className="flex items-center gap-1.5">
                          <span>{req.doctorName}</span>
                          <span className="text-[10px] font-bold text-teal-600 font-mono bg-teal-50 px-1.5 py-0.5 rounded">{req.doctorFormattedId}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${req.priority === 'Urgent' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}>
                          {req.priority}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          req.hasReport || req.status === 'Completed' ? 'bg-green-100 text-green-700' :
                          req.status === 'InProgress' ? 'bg-blue-100 text-blue-700' :
                          req.status === 'Cancelled' ? 'bg-gray-100 text-gray-500' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {req.hasReport ? 'Uploaded ✓' : req.status}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-gray-500 text-xs max-w-[160px] truncate" title={req.notes || ''}>{req.notes || '—'}</td>
                      <td className="px-4 py-4 text-gray-500 text-xs whitespace-nowrap">{new Date(req.requestedAt).toLocaleDateString()}</td>
                      <td className="px-4 py-4">
                        {req.hasReport ? (
                          <div className="flex flex-col gap-1">
                            <a
                              href={req.reportFileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 rounded-full bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                            >
                              ↓ Download
                            </a>
                            <span className="text-[10px] text-gray-400">Uploaded {new Date(req.reportUploadedAt).toLocaleDateString()}</span>
                          </div>
                        ) : req.status === 'Cancelled' ? (
                          <span className="text-xs text-gray-400">Cancelled</span>
                        ) : (
                          <div className="flex items-center gap-2">
                            {/* Hidden file input per request */}
                            <input
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                              className="hidden"
                              ref={(el) => { requestFileRefs.current[req.requestId] = el; }}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleRequestUpload(req.requestId, file);
                              }}
                            />
                            <button
                              type="button"
                              disabled={uploadingRequestId === req.requestId}
                              onClick={() => requestFileRefs.current[req.requestId]?.click()}
                              className="inline-flex items-center gap-1 rounded-full bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                            >
                              {uploadingRequestId === req.requestId ? 'Uploading…' : '↑ Upload'}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ── SELF-UPLOAD SECTION ── */}
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Upload Your Own Lab Report</h2>
            <form onSubmit={handleSelfUpload} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Test Name</label>
                <input
                  value={testName}
                  onChange={(e) => setTestName(e.target.value)}
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none"
                  placeholder="e.g. Blood count, MRI report"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Test Date</label>
                <input
                  type="date"
                  value={testDate}
                  onChange={(e) => setTestDate(e.target.value)}
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Summary / Notes</label>
                <textarea
                  value={resultSummary}
                  onChange={(e) => setResultSummary(e.target.value)}
                  rows={3}
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none"
                  placeholder="Add short findings or additional details."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Upload File</label>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  onChange={(e) => setReportFile(e.target.files?.[0] ?? null)}
                  className="w-full text-sm text-gray-700"
                />
              </div>
              <button
                type="submit"
                disabled={uploading}
                className="inline-flex items-center justify-center rounded-2xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {uploading ? 'Uploading...' : 'Upload Report'}
              </button>
            </form>
          </section>

          <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Helpful Tips</h2>
            <div className="space-y-3 text-sm text-gray-600">
              <p>📋 Use the <strong>Doctor Requests</strong> section above to upload results for tests your doctor ordered.</p>
              <p>📁 Upload PDF, image, or document files. Your doctor will be notified.</p>
              <p>⬇️ You can always download your reports from the history below.</p>
            </div>
          </section>
        </div>

        {/* ── SELF-UPLOAD HISTORY ── */}
        <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
            <h2 className="text-xl font-semibold text-gray-900">Your Uploaded Report History</h2>
            <p className="text-sm text-gray-500">Latest reports appear first.</p>
          </div>

          {loading ? (
            <div className="text-sm text-gray-500">Loading lab reports...</div>
          ) : reports.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-6 text-sm text-gray-600">
              No lab reports uploaded yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                    <th className="px-4 py-3">Test</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Summary</th>
                    <th className="px-4 py-3">Doctor</th>
                    <th className="px-4 py-3">File</th>
                    <th className="px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {reports.map((report) => (
                    <tr key={report.reportId} className="hover:bg-gray-50">
                      <td className="px-4 py-4 font-medium text-gray-900">{report.testName}</td>
                      <td className="px-4 py-4 text-gray-600">{report.testDate}</td>
                      <td className="px-4 py-4 text-gray-600">{report.resultSummary || 'No summary'}</td>
                      <td className="px-4 py-4 text-gray-600">
                        {report.doctorName ? (
                          <div className="flex items-center gap-2" title={report.doctorFormattedId}>
                            <span>{report.doctorName}</span>
                            {report.doctorFormattedId && (
                              <span className="text-[10px] font-bold text-teal-600 font-mono bg-teal-50 px-1.5 py-0.5 rounded">{report.doctorFormattedId}</span>
                            )}
                          </div>
                        ) : 'Self-uploaded'}
                      </td>
                      <td className="px-4 py-4 text-gray-600">{report.hasFile ? report.fileName : 'None'}</td>
                      <td className="px-4 py-4">
                        {report.hasFile && report.fileUrl ? (
                          <a
                            href={report.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-full bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                          >
                            Download
                          </a>
                        ) : (
                          <span className="text-xs text-gray-500">No file</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
