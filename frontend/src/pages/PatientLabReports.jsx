import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import axiosInstance from '../api/axios';
import { extractRoleFromToken } from '../utils/auth';

export default function PatientLabReports() {
  const token = localStorage.getItem('token');
  const role = extractRoleFromToken(token);

  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [testName, setTestName] = useState('');
  const [testDate, setTestDate] = useState('');
  const [resultSummary, setResultSummary] = useState('');
  const [reportFile, setReportFile] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!token || role !== 'patient') {
      setLoading(false);
      return;
    }

    const fetchReports = async () => {
      setError('');
      setLoading(true);

      try {
        const response = await axiosInstance.get('/api/patients/me/lab-reports');
        setReports(response.data || []);
      } catch (err) {
        setError(err.response?.data?.message ?? 'Unable to load lab reports.');
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, [token, role]);

  const handleFileChange = (event) => {
    setReportFile(event.target.files?.[0] ?? null);
  };

  const handleUpload = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!testName.trim()) {
      setError('Please enter the lab test name.');
      return;
    }

    if (!testDate) {
      setError('Please select the test date.');
      return;
    }

    const formData = new FormData();
    formData.append('testName', testName.trim());
    formData.append('testDate', testDate);
    formData.append('resultSummary', resultSummary.trim());
    if (reportFile) {
      formData.append('reportFile', reportFile);
    }

    setUploading(true);

    try {
      const response = await axiosInstance.post('/api/patients/me/lab-reports', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setSuccess('Lab report uploaded successfully.');
      setTestName('');
      setTestDate('');
      setResultSummary('');
      setReportFile(null);
      setReports((current) => [response.data, ...current]);
    } catch (err) {
      setError(err.response?.data?.message ?? 'Unable to upload lab report.');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (reportId, fileName) => {
    setError('');

    try {
      const response = await axiosInstance.get(
        `/api/patients/me/lab-reports/${reportId}/download`,
        {
          responseType: 'blob',
        }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
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
            <h1 className="text-3xl font-bold text-gray-900">My Lab Reports</h1>
            <p className="text-sm text-gray-500 mt-1">
              Upload new lab results and download your saved reports.
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

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Upload Lab Report</h2>

            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label htmlFor="testName" className="block text-sm font-medium text-gray-700 mb-1">
                  Test Name
                </label>
                <input
                  id="testName"
                  name="testName"
                  value={testName}
                  onChange={(e) => setTestName(e.target.value)}
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none"
                  placeholder="e.g. Blood count, MRI report"
                />
              </div>

              <div>
                <label htmlFor="testDate" className="block text-sm font-medium text-gray-700 mb-1">
                  Test Date
                </label>
                <input
                  id="testDate"
                  name="testDate"
                  type="date"
                  value={testDate}
                  onChange={(e) => setTestDate(e.target.value)}
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="resultSummary" className="block text-sm font-medium text-gray-700 mb-1">
                  Summary / Notes
                </label>
                <textarea
                  id="resultSummary"
                  name="resultSummary"
                  value={resultSummary}
                  onChange={(e) => setResultSummary(e.target.value)}
                  rows={4}
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none"
                  placeholder="Add short findings, doctor comments, or additional details."
                />
              </div>

              <div>
                <label htmlFor="reportFile" className="block text-sm font-medium text-gray-700 mb-1">
                  Upload File
                </label>
                <input
                  id="reportFile"
                  name="reportFile"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  onChange={handleFileChange}
                  className="w-full text-sm text-gray-700"
                />
              </div>

              <button
                type="submit"
                disabled={uploading}
                className="inline-flex items-center justify-center rounded-2xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
              >
                {uploading ? 'Uploading...' : 'Upload Report'}
              </button>
            </form>
          </section>

          <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Helpful Tips</h2>
            <div className="space-y-3 text-sm text-gray-600">
              <p>Upload lab reports as PDF, image or document files so your care team can review them later.</p>
              <p>Use a descriptive test name and date to keep your records easy to find.</p>
              <p>You can download your reports again anytime from the list below.</p>
            </div>
          </section>
        </div>

        <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
            <h2 className="text-xl font-semibold text-gray-900">Your Lab Report History</h2>
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
                      <td className="px-4 py-4 text-gray-600">{report.resultSummary || 'No summary provided'}</td>
                      <td className="px-4 py-4 text-gray-600">{report.doctorName || 'Self-uploaded'}</td>
                      <td className="px-4 py-4 text-gray-600">{report.hasFile ? report.fileName : 'None'}</td>
                      <td className="px-4 py-4">
                        {report.hasFile ? (
                          <button
                            type="button"
                            onClick={() => handleDownload(report.reportId, report.fileName)}
                            className="rounded-full bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-blue-700"
                          >
                            Download
                          </button>
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
