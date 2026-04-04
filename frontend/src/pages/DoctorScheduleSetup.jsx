// Doctor Schedule Setup Page
// Handles weekly availability, time slots, and schedule configuration for doctors

import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import axios from '../api/axios';
import { extractRoleFromToken } from '../utils/auth';

// Days of the week used to generate default schedule rows
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const defaultRows = DAYS.map((day) => ({
  dayOfWeek: day,
  isAvailable: day !== 'Sunday',
  startTime: '09:00',
  endTime: '17:00',
  slotDurationMinutes: 30,
  notes: '',
}));

export default function DoctorScheduleSetup() {
  const token = localStorage.getItem('token');
  const role = extractRoleFromToken(token);

  const [rows, setRows] = useState(defaultRows);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [doctorProfileMissing, setDoctorProfileMissing] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        const response = await axios.get('/api/doctors/me/schedules');
        if (!isMounted) {
          return;
        }

        const byDay = new Map(
          (response.data ?? []).map((item) => [
            item.dayOfWeek,
            {
              dayOfWeek: item.dayOfWeek,
              isAvailable: item.isAvailable,
              startTime: item.startTime?.slice(0, 5) ?? '09:00',
              endTime: item.endTime?.slice(0, 5) ?? '17:00',
              slotDurationMinutes: item.slotDurationMinutes ?? 30,
              notes: item.notes ?? '',
            },
          ])
        );

        setRows(defaultRows.map((row) => byDay.get(row.dayOfWeek) ?? row));
      } catch (requestError) {
        if (requestError.response?.status === 404) {
          setDoctorProfileMissing(true);
          setError('Doctor profile not found. Please register your doctor profile before setting up your schedule.');
        } else {
          setError(requestError.response?.data?.message || 'Unable to load existing schedule.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, []);

  const totalAvailableDays = useMemo(() => rows.filter((row) => row.isAvailable).length, [rows]);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (role !== 'doctor') {
    return <Navigate to="/dashboard" replace />;
  }

  const updateRow = (dayOfWeek, field, value) => {
    setRows((prev) => prev.map((row) => (row.dayOfWeek === dayOfWeek ? { ...row, [field]: value } : row)));
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setIsSaving(true);

    try {
      const payload = {
        schedules: rows.map((row) => ({
          dayOfWeek: row.dayOfWeek,
          isAvailable: row.isAvailable,
          startTime: row.isAvailable ? row.startTime : null,
          endTime: row.isAvailable ? row.endTime : null,
          slotDurationMinutes: Number(row.slotDurationMinutes),
          notes: row.notes?.trim() || null,
        })),
      };

      await axios.put('/api/doctors/me/schedules', payload);
      setSuccess('Schedule saved successfully.');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to save schedule.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Doctor Schedule Setup</h1>
            <p className="text-sm text-slate-500">Define your weekly availability and slot duration.</p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/doctor/schedule/weekly"
              className="rounded-lg border border-teal-200 bg-white px-4 py-2 text-sm font-semibold text-teal-700 hover:bg-teal-50"
            >
              Weekly View
            </Link>
            <Link
              to="/doctor/dashboard"
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>

        <div className="mb-4 rounded-xl bg-white p-4 ring-1 ring-slate-200">
          <p className="text-sm text-slate-600">
            Available days: <span className="font-bold text-slate-900">{totalAvailableDays}</span> / 7
          </p>
        </div>

        {error && <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        {success && <div className="mb-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">{success}</div>}
        {doctorProfileMissing && (
          <div className="mb-4 rounded-lg bg-yellow-50 px-4 py-3 text-sm text-yellow-700">
            <p>Please visit the profile page to create your doctor profile before configuring availability.</p>
            <Link
              to="/doctor/register"
              className="mt-3 inline-flex items-center rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
            >
              Register Doctor Profile
            </Link>
          </div>
        )}

        <form onSubmit={handleSave} className="overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead className="bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Day</th>
                  <th className="px-4 py-3">Available</th>
                  <th className="px-4 py-3">Start</th>
                  <th className="px-4 py-3">End</th>
                  <th className="px-4 py-3">Slot (mins)</th>
                  <th className="px-4 py-3">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row) => (
                  <tr key={row.dayOfWeek} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-slate-700">{row.dayOfWeek}</td>
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={row.isAvailable}
                        onChange={(event) => updateRow(row.dayOfWeek, 'isAvailable', event.target.checked)}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="time"
                        value={row.startTime}
                        disabled={!row.isAvailable}
                        onChange={(event) => updateRow(row.dayOfWeek, 'startTime', event.target.value)}
                        className="w-full rounded-md border border-slate-300 px-2 py-1.5 disabled:bg-slate-100"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="time"
                        value={row.endTime}
                        disabled={!row.isAvailable}
                        onChange={(event) => updateRow(row.dayOfWeek, 'endTime', event.target.value)}
                        className="w-full rounded-md border border-slate-300 px-2 py-1.5 disabled:bg-slate-100"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min="5"
                        max="240"
                        value={row.slotDurationMinutes}
                        onChange={(event) => updateRow(row.dayOfWeek, 'slotDurationMinutes', event.target.value)}
                        className="w-24 rounded-md border border-slate-300 px-2 py-1.5"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={row.notes}
                        onChange={(event) => updateRow(row.dayOfWeek, 'notes', event.target.value)}
                        placeholder="Optional note"
                        className="w-full rounded-md border border-slate-300 px-2 py-1.5"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end border-t border-slate-100 p-4">
            <button
              type="submit"
              disabled={isLoading || isSaving}
              className="rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? 'Saving...' : 'Save Schedule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
