import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axios';
import { extractRoleFromToken } from '../utils/auth';

const WIDGET_COLORS = ['blue', 'teal', 'violet', 'amber'];

const COLOR_MAP = {
    blue: 'from-blue-500 to-blue-600',
    teal: 'from-teal-500 to-teal-600',
    violet: 'from-violet-500 to-violet-600',
    amber: 'from-amber-500 to-amber-600',
};

const NAV_ITEMS = [
    { id: 'overview', label: 'Overview', type: 'section' },
    { id: 'appointments', label: 'Appointments', type: 'route', path: '/patient/appointments' },
    { id: 'prescriptions', label: 'Prescriptions', type: 'route', path: '/patient/prescriptions' },
    { id: 'lab', label: 'Lab Reports', type: 'route', path: '/patient/lab-reports' },
    { id: 'billing', label: 'Billing', type: 'route', path: '/patient/billing' },
];

export default function PatientDashboard() {
    const navigate = useNavigate();
    const token = localStorage.getItem('token');
    const role = extractRoleFromToken(token);

    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState(null);
    const [summary, setSummary] = useState(null);
    const [details, setDetails] = useState(null);
    const [error, setError] = useState('');
    const [activeSection, setActiveSection] = useState('overview');

    useEffect(() => {
        const fetchData = async () => {
            setError('');
            setLoading(true);

            try {
                const [profileRes, summaryRes, detailsRes] = await Promise.all([
                    axiosInstance.get('/api/patients/me').catch((err) => {
                        if (err.response?.status === 404) return { data: null };
                        throw err;
                    }),
                    axiosInstance.get('/api/patients/me/summary').catch((err) => {
                        if (err.response?.status === 404) {
                            return {
                                data: {
                                    upcomingAppointments: 0,
                                    activePrescriptions: 0,
                                    labReports: 0,
                                    pendingPayments: 0,
                                    profileCompleted: false,
                                },
                            };
                        }
                        throw err;
                    }),
                    axiosInstance.get('/api/patients/me/details').catch((err) => {
                        if (err.response?.status === 404) {
                            return {
                                data: {
                                    upcomingAppointments: [],
                                    recentPrescriptions: [],
                                    recentLabReports: [],
                                    pendingInvoices: [],
                                },
                            };
                        }
                        throw err;
                    }),
                ]);

                setProfile(profileRes.data);
                setSummary(summaryRes.data);
                setDetails(detailsRes.data);
            } catch (err) {
                setError(err.response?.data?.message ?? 'Unable to load dashboard data.');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    if (!token) return <Navigate to="/login" replace />;
    if (role !== 'patient') return <Navigate to="/dashboard" replace />;

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        navigate('/login');
    };

    const handleNavClick = (item) => {
        if (item.type === 'route' && item.path) {
            navigate(item.path);
            return;
        }

        setActiveSection(item.id);
    };

    const widgets = useMemo(() => {
        if (!summary) {
            return [];
        }

        return [
            {
                label: 'Upcoming Appointments',
                value: String(summary.upcomingAppointments ?? 0),
                icon: 'APPT',
            },
            {
                label: 'Active Prescriptions',
                value: String(summary.activePrescriptions ?? 0),
                icon: 'RX',
            },
            {
                label: 'Lab Reports',
                value: String(summary.labReports ?? 0),
                icon: 'LAB',
            },
            {
                label: 'Pending Payments',
                value: `LKR ${(summary.pendingPayments ?? 0).toLocaleString()}`,
                icon: 'BILL',
            },
        ];
    }, [summary]);

    return (
        <div className="min-h-screen glass-page p-6 md:p-8">
            <div className="max-w-7xl mx-auto grid grid-cols-1 xl:grid-cols-12 gap-6">
                <aside className="xl:col-span-3 glass-card rounded-2xl p-4 h-fit xl:sticky xl:top-6">
                    <h2 className="text-sm font-bold text-gray-900 mb-3">Patient Navigation</h2>

                    <div className="space-y-2">
                        {NAV_ITEMS.map((item) => {
                            const isActive = item.type === 'section' && activeSection === item.id;

                            return (
                                <button
                                    key={item.id}
                                    onClick={() => handleNavClick(item)}
                                    className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                        isActive
                                            ? 'bg-blue-100 text-blue-700'
                                            : 'text-gray-700 hover:bg-gray-100'
                                    }`}
                                >
                                    {item.label}
                                </button>
                            );
                        })}
                    </div>

                    <div className="mt-5 pt-4 border-t border-gray-100 space-y-2">
                        <Link
                            to={profile ? '/patient/profile' : '/patient/register'}
                            className="block w-full text-center px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
                        >
                            {profile ? 'Edit Profile' : 'Create Profile'}
                        </Link>

                        <button
                            onClick={() => navigate('/patient/dashboard')}
                            className="w-full px-4 py-2 rounded-lg border border-white/50 bg-white/60 backdrop-blur text-gray-700 text-sm font-semibold hover:bg-white/75"
                        >
                            Refresh
                        </button>
                    </div>
                </aside>

                <section className="xl:col-span-9">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                                {profile ? `Welcome Back, ${profile.firstName}!` : 'Patient Dashboard'}
                            </h1>
                            <p className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                                {profile?.formattedId && (
                                    <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-bold font-mono">
                                        {profile.formattedId}
                                    </span>
                                )}
                                <span>Here is an overview of your health statistics.</span>
                            </p>
                        </div>

                        <button
                            className="self-start lg:self-auto px-4 py-2 rounded-lg border border-white/50 bg-white/60 backdrop-blur text-sm font-medium text-gray-700 hover:bg-white/75"
                            onClick={handleLogout}
                        >
                            Logout
                        </button>
                    </div>

                    {error && (
                        <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                            {error}
                        </div>
                    )}

                    {!profile && !loading && (
                        <div className="mb-5 rounded-xl border border-blue-200 bg-blue-50 p-4 md:p-5">
                            <h2 className="text-sm md:text-base font-semibold text-blue-900">
                                Complete your patient profile
                            </h2>
                            <p className="text-sm text-blue-800 mt-1">
                                You need to register your patient details before using all module features.
                            </p>
                            <Link
                                to="/patient/register"
                                className="inline-flex mt-3 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
                            >
                                Register Profile
                            </Link>
                        </div>
                    )}

                    {(activeSection === 'overview' ||
                        activeSection === 'prescriptions' ||
                        activeSection === 'lab' ||
                        activeSection === 'billing') && (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
                            {(loading
                                ? Array.from({ length: 4 }).map((_, i) => ({
                                      label: 'Loading',
                                      value: '...',
                                      icon: '...',
                                      key: i,
                                  }))
                                : widgets.map((item, i) => ({ ...item, key: i }))
                            ).map((item, idx) => (
                                <div
                                    key={`${item.label}-${item.key}-${idx}`}
                                    className="rounded-2xl glass-card p-4"
                                >
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm text-gray-500">{item.label}</p>
                                        <span
                                            className={`h-8 min-w-8 px-2 rounded-lg text-white text-xs font-bold flex items-center justify-center bg-gradient-to-r ${
                                                COLOR_MAP[WIDGET_COLORS[idx % WIDGET_COLORS.length]]
                                            }`}
                                        >
                                            {item.icon}
                                        </span>
                                    </div>
                                    <p className="mt-3 text-2xl font-extrabold text-gray-900">{item.value}</p>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                        <div className="lg:col-span-2 glass-card rounded-2xl p-5">
                            <h3 className="text-base font-bold text-gray-900">Profile Snapshot</h3>

                            {loading ? (
                                <p className="text-sm text-gray-500 mt-3">Loading profile...</p>
                            ) : profile ? (
                                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                    <Info label="Name" value={`${profile.firstName} ${profile.lastName}`} />
                                    <Info label="Blood Group" value={profile.bloodGroup || 'Not set'} />
                                    <Info label="Date of Birth" value={profile.dateOfBirth || 'Not set'} />
                                    <Info label="Gender" value={profile.gender || 'Not set'} />
                                    <Info label="Phone" value={profile.phone || 'Not set'} />
                                    <Info
                                        label="Emergency Contact"
                                        value={profile.emergencyContact || 'Not set'}
                                    />
                                    <div className="md:col-span-2">
                                        <Info label="Address" value={profile.address || 'Not set'} />
                                    </div>
                                </div>
                            ) : (
                                <p className="text-sm text-gray-500 mt-3">No profile found yet.</p>
                            )}
                        </div>

                    

                            
                    </div>


                </section>
            </div>
        </div>
    );
}

function Panel({ title, children, className = '' }) {
    return (
        <section className={`glass-card rounded-2xl p-5 ${className}`}>
            <h3 className="text-base font-bold text-gray-900">{title}</h3>
            <div className="mt-3">{children}</div>
        </section>
    );
}

function EmptyText({ text }) {
    return <p className="text-sm text-gray-500">{text}</p>;
}

function Info({ label, value }) {
    return (
        <div>
            <p className="text-xs uppercase tracking-wide text-gray-400">{label}</p>
            <p className="text-sm text-gray-800 font-medium mt-1">{value}</p>
        </div>
    );
}