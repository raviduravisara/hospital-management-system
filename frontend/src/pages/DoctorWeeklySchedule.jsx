import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import axios from '../api/axios';
import { extractRoleFromToken } from '../utils/auth';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function DoctorWeeklySchedule() {
  const token = localStorage.getItem('token');
  const role = extractRoleFromToken(token);

  const [schedules, setSchedules] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        const response = await axios.get('/api/doctors/me/schedules');
        if (isMounted) {
          setSchedules(response.data ?? []);
        }
      } catch (requestError) {
        if (isMounted) {
          setError(requestError.response?.data?.message || 'Unable to load weekly schedule.');
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

  const groupedByDay = useMemo(() => {
    const map = new Map(DAYS.map((day) => [day, []]));
    schedules.forEach((entry) => {
      const day = entry.dayOfWeek;
      if (!map.has(day)) {
        map.set(day, []);
      }
      map.get(day).push(entry);
    });
    return map;
  }, [schedules]);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (role !== 'doctor') {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">My Weekly Schedule</h1>
            <p className="text-sm text-slate-500">Availability view by day with time slots.</p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/doctor/schedule"
              className="rounded-lg border border-teal-200 bg-white px-4 py-2 text-sm font-semibold text-teal-700 hover:bg-teal-50"
            >
              Edit Schedule
            </Link>
            <Link
              to="/doctor/dashboard"
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>

        {isLoading && <div className="rounded-lg bg-white p-4 text-sm text-slate-500 ring-1 ring-slate-200">Loading schedule...</div>}
        {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        {!isLoading && !error && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {DAYS.map((day) => {
              const entries = groupedByDay.get(day) ?? [];
              return (
                <div key={day} className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
                  <h2 className="mb-3 text-base font-bold text-slate-800">{day}</h2>

                  {entries.length === 0 ? (
                    <p className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-500">No availability configured.</p>
                  ) : (
                    <div className="space-y-2">
                      {entries.map((entry) => (
                        <div key={entry.doctorScheduleId} className="rounded-lg border border-teal-100 bg-teal-50 p-3">
                          <p className="text-sm font-semibold text-teal-800">
                            {entry.startTime?.slice(0, 5)} - {entry.endTime?.slice(0, 5)}
                          </p>
                          <p className="text-xs text-teal-700">Slot: {entry.slotDurationMinutes} mins</p>
                          {entry.notes && <p className="mt-1 text-xs text-teal-700">{entry.notes}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
