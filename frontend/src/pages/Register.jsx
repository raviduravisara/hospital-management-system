import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import FormInput from '../components/FormInput';
import FormError from '../components/FormError';
import ThemeSwitch from '../components/ThemeSwitch';
import { useTheme } from '../context/ThemeContext';
import axiosInstance from '../api/axios';

/* ─── Left-column marketing bullets ──────────────────────────────── */
const BENEFITS = [
    {
        icon: (
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
        ),
        text: 'Manage patient records from anywhere',
    },
    {
        icon: (
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
        ),
        text: 'Schedule and track appointments with ease',
    },
    {
        icon: (
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17 20h5v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2h5M12 12a4 4 0 100-8 4 4 0 000 8z"
            />
        ),
        text: 'Collaborate across all staff roles securely',
    },
];

/* ─── Role options ────────────────────────────────────────────────── */
const ROLE_OPTIONS = [
    { value: '', label: '— Select Role —' },
    { value: 'Admin', label: 'Admin' },
    { value: 'Doctor', label: 'Doctor' },
    { value: 'Patient', label: 'Patient' },
];

/* ─── Register Page ───────────────────────────────────────────────── */
export default function Register() {
    const navigate = useNavigate();
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    const {
        register,
        handleSubmit,
        watch,
        formState: { errors, isSubmitting },
        setError,
    } = useForm({ mode: 'onTouched' });

    const password = watch('password');

    const onSubmit = async (data) => {
        try {
            const { confirmPassword, ...payload } = data;
            await axiosInstance.post('/api/auth/register', payload);
            navigate('/login');
        } catch (err) {
            const message =
                err.response?.data?.message ?? 'Registration failed. Please try again.';
            setError('root', { message });
        }
    };

    /* ── Theme-aware surface tokens (mirrors Login.jsx) ──────────── */
    const glassBg = isDark ? 'bg-[rgba(255,255,255,0.15)]' : 'bg-[rgba(0,0,0,0.18)]';
    const glassBorder = isDark ? 'border-[rgba(255,255,255,0.25)]' : 'border-[rgba(0,0,0,0.25)]';
    const labelColor = isDark ? 'text-white' : 'text-gray-900';
    const heroColor = isDark ? 'text-white' : 'text-gray-900';
    const dividerColor = isDark
        ? 'border-[rgba(255,255,255,0.4)]'
        : 'border-[rgba(0,0,0,0.25)]';
    const dividerText = isDark ? 'text-white/70' : 'text-gray-900/70';

    return (
        /*
         * Full-bleed wrapper — same background image as Login to preserve
         * visual continuity across the auth flow.
         */
        <div
            className="relative min-h-screen w-full flex items-center justify-center overflow-hidden"
            style={{
                backgroundImage:
                    "url('/hospital-bg.png')",
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
            }}
        >
            {/* Scrim overlay */}
            {/* Scrim: strong enough to make text readable over ANY background brightness */}
            <div className="absolute inset-0 bg-black/50 pointer-events-none" />

            {/* Theme toggle */}
            <div className="absolute top-4 right-4 z-20">
                <ThemeSwitch />
            </div>

            {/* ── Two-column grid (lg+) / single-column (< lg) ───────── */}
            <div className="relative z-10 w-full max-w-6xl mx-auto px-6 py-10 lg:grid lg:grid-cols-2 lg:gap-16 lg:items-center">

                {/* ── LEFT: Hero Branding (hidden on < lg) ─────────────── */}
                <div className="hidden lg:flex flex-col gap-8">
                    {/* Logo */}
                    <div className="flex items-center gap-3 drop-shadow-md">
                        <span className="text-3xl" aria-hidden="true">🏥</span>
                        <span className={`text-lg font-semibold tracking-wide ${heroColor}`}>
                            HMS Portal
                        </span>
                    </div>

                    {/* Headline */}
                    <div className="drop-shadow-lg">
                        <h1
                            className={`font-extrabold uppercase leading-tight text-5xl lg:text-7xl ${heroColor}`}
                            style={{ textShadow: '0 2px 12px rgba(0,0,0,0.55)' }}
                        >
                            Join Our{' '}
                            <span className="text-primary-500">
                                Healthcare
                            </span>{' '}
                            Network.
                        </h1>
                        <p className={`mt-4 text-xl font-semibold leading-relaxed drop-shadow-md ${heroColor}`}>
                            Register to manage appointments, medical records, and more.
                        </p>
                    </div>

                    {/* Benefit bullets */}
                    <ul className="flex flex-col gap-4">
                        {BENEFITS.map(({ icon, text }) => (
                            <li key={text} className="flex items-center gap-3">
                                <span
                                    className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-primary-500/30 ${heroColor}`}
                                >
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        className="w-4 h-4"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                        strokeWidth={2}
                                        aria-hidden="true"
                                    >
                                        {icon}
                                    </svg>
                                </span>
                                <span className={`text-sm font-semibold drop-shadow-sm ${heroColor}`}>{text}</span>
                            </li>
                        ))}
                    </ul>

                    <p className={`text-sm font-medium drop-shadow-sm ${heroColor}`}>
                        Trusted by over 200 hospitals worldwide.
                    </p>
                </div>

                {/* ── RIGHT: Glassmorphism Registration Card ────────────── */}
                <div
                    className={[
                        glassBg,
                        glassBorder,
                        'backdrop-blur-glass',
                        'border',
                        'rounded-card',
                        'shadow-glass',
                        'p-8 sm:p-10',
                        'w-full',
                        'flex flex-col gap-5',
                    ].join(' ')}
                    aria-label="Registration form"
                >
                    {/* Card header */}
                    <div className="flex flex-col gap-1">
                        {/* Mobile-only logo */}
                        <div className={`flex items-center gap-2 mb-2 lg:hidden ${labelColor}`}>
                            <span className="text-2xl" aria-hidden="true">🏥</span>
                            <span className="text-base font-semibold tracking-wide">HMS Portal</span>
                        </div>
                        <h2 className={`text-2xl font-bold ${labelColor}`}>Create Account</h2>
                        <p className={`text-sm opacity-95 ${labelColor}`}>
                            Register as a new HMS user to get started
                        </p>
                    </div>

                    {/* Root error banner */}
                    <FormError message={errors.root?.message} />

                    {/* Registration form */}
                    <form
                        onSubmit={handleSubmit(onSubmit)}
                        noValidate
                        className="flex flex-col gap-4"
                    >
                        <FormInput
                            id="username"
                            label="Username"
                            type="text"
                            placeholder="admin2"
                            error={errors.username}
                            registration={register('username', {
                                required: 'Username is required',
                            })}
                        />

                        <FormInput
                            id="email"
                            label="Email Address"
                            type="email"
                            placeholder="doctor@hospital.com"
                            error={errors.email}
                            registration={register('email', {
                                required: 'Email address is required',
                                pattern: {
                                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                                    message: 'Please enter a valid email address',
                                },
                            })}
                        />

                        {/* Role dropdown */}
                        <div className="flex flex-col gap-1.5">
                            <label
                                htmlFor="role"
                                className={`text-sm font-medium ${labelColor}`}
                            >
                                Role
                            </label>
                            <select
                                id="role"
                                className={[
                                    'w-full px-4 py-2.5',
                                    'bg-gray-100 text-gray-900',
                                    'rounded-input border',
                                    errors.role
                                        ? 'border-red-400 focus:ring-red-400'
                                        : 'border-transparent focus:ring-primary-500',
                                    'focus:outline-none focus:ring-2 focus:border-transparent',
                                    'text-sm transition-shadow duration-150',
                                    'appearance-none cursor-pointer',
                                ].join(' ')}
                                {...register('role', { required: 'Please select a role' })}
                            >
                                {ROLE_OPTIONS.map(({ value, label }) => (
                                    <option key={value} value={value} disabled={value === ''}>
                                        {label}
                                    </option>
                                ))}
                            </select>
                            {errors.role && (
                                <span role="alert" className="text-xs text-red-300 font-medium mt-0.5">
                                    {errors.role.message}
                                </span>
                            )}
                        </div>

                        <FormInput
                            id="password"
                            label="Password"
                            type="password"
                            placeholder="••••••••"
                            error={errors.password}
                            registration={register('password', {
                                required: 'Password is required',
                                minLength: {
                                    value: 6,
                                    message: 'Password must be at least 6 characters',
                                },
                            })}
                        />

                        <FormInput
                            id="confirmPassword"
                            label="Confirm Password"
                            type="password"
                            placeholder="••••••••"
                            error={errors.confirmPassword}
                            registration={register('confirmPassword', {
                                required: 'Please confirm your password',
                                validate: (val) =>
                                    val === password || 'Passwords do not match',
                            })}
                        />

                        {/* Submit — primary medical blue, same as Login CTA */}
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className={[
                                'w-full py-3 px-4 mt-1',
                                'bg-primary-500 hover:bg-primary-600',
                                'text-white font-semibold text-sm',
                                'rounded-input',
                                'transition-all duration-200',
                                'hover:-translate-y-0.5 hover:shadow-lg',
                                'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
                                'disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-y-0',
                            ].join(' ')}
                        >
                            {isSubmitting ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg
                                        className="w-4 h-4 animate-spin"
                                        xmlns="http://www.w3.org/2000/svg"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        aria-hidden="true"
                                    >
                                        <circle
                                            className="opacity-25"
                                            cx="12"
                                            cy="12"
                                            r="10"
                                            stroke="currentColor"
                                            strokeWidth="4"
                                        />
                                        <path
                                            className="opacity-75"
                                            fill="currentColor"
                                            d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z"
                                        />
                                    </svg>
                                    Creating account…
                                </span>
                            ) : (
                                'CREATE ACCOUNT'
                            )}
                        </button>
                    </form>

                    {/* Divider */}
                    <div className="flex items-center gap-3">
                        <hr className={`flex-1 border-t ${dividerColor}`} />
                        <span className={`text-xs font-medium ${dividerText}`}>OR</span>
                        <hr className={`flex-1 border-t ${dividerColor}`} />
                    </div>

                    {/* Sign in link */}
                    <p className={`text-sm text-center ${labelColor}`}>
                        Already have an account?{' '}
                        <Link
                            to="/login"
                            className="font-semibold underline hover:opacity-80 transition-opacity"
                        >
                            Sign in here
                        </Link>
                    </p>
                </div>
                {/* ── END Registration Card ──────────────────────────────── */}

            </div>
        </div>
    );
}
