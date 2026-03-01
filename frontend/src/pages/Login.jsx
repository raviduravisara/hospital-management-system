import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import FormInput from '../components/FormInput';
import FormError from '../components/FormError';
import ThemeSwitch from '../components/ThemeSwitch';
import { useTheme } from '../context/ThemeContext';
import axiosInstance from '../api/axios';

/* ─── Hero value-proposition bullet list ─────────────────────────── */
const VALUE_PROPS = [
    {
        icon: (
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12h6m-3-3v6m-7 4h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
        ),
        text: 'Instant access to patient medical records',
    },
    {
        icon: (
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
        ),
        text: 'Seamless appointment scheduling',
    },
    {
        icon: (
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17 20h5v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2h5M12 12a4 4 0 100-8 4 4 0 000 8z"
            />
        ),
        text: 'Unified platform for all staff roles',
    },
];

/* ─── Login Page ──────────────────────────────────────────────────── */
export default function Login() {
    const navigate = useNavigate();
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
        setError,
    } = useForm({ mode: 'onTouched' });

    const onSubmit = async (data) => {
        try {
            const response = await axiosInstance.post('/api/auth/login', {
                usernameOrEmail: data.usernameOrEmail,
                password: data.password,
            });

            localStorage.setItem('token', response.data.accessToken);
            if (response.data.refreshToken) {
                localStorage.setItem('refreshToken', response.data.refreshToken);
            }
            navigate('/dashboard');
        } catch (err) {
            const message = err.response?.data?.message ?? err.message ?? 'Login failed. Please try again.';
            setError('root', { message });
        }
    };

    /* ── Glass panel surface – inverts between dark & light mode ──── */
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
         * Full-bleed wrapper:
         * - Hospital operating-room photo from Unsplash (free, no attribution required)
         * - bg-cover + bg-center ensures it fills the viewport at any size
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
            {/* Overlay: subtle dark scrim to deepen contrast on bright backgrounds */}
            {/* Scrim: strong enough to make text readable over ANY background brightness */}
            <div className="absolute inset-0 bg-black/50 pointer-events-none" />

            {/* Theme toggle — absolute top-right corner */}
            <div className="absolute top-4 right-4 z-20">
                <ThemeSwitch />
            </div>

            {/* ── Two-column grid (lg+) / single-column (< lg) ─────────── */}
            <div className="relative z-10 w-full max-w-6xl mx-auto px-6 py-12 lg:grid lg:grid-cols-2 lg:gap-16 lg:items-center">

                {/* ── LEFT: Hero Branding (hidden on < lg) ──────────────── */}
                <div className="hidden lg:flex flex-col gap-8">
                    {/* Logo / wordmark */}
                    <div className="flex items-center gap-3 drop-shadow-md">
                        <span className="text-3xl" aria-hidden="true">🏥</span>
                        <span className={`text-lg font-semibold tracking-wide ${heroColor}`}>
                            HMS Portal
                        </span>
                    </div>

                    {/* Hero headline */}
                    <div className="drop-shadow-lg">
                        <h1
                            className={`font-extrabold uppercase leading-tight text-5xl lg:text-7xl ${heroColor}`}
                            style={{ textShadow: '0 2px 12px rgba(0,0,0,0.55)' }}
                        >
                            Better Care,{' '}
                            <span className="text-primary-500">
                                Connected.
                            </span>
                        </h1>
                        <p className={`mt-4 text-xl font-semibold leading-relaxed drop-shadow-md ${heroColor}`}>
                            The all-in-one platform your hospital needs.
                        </p>
                    </div>

                    {/* Value proposition bullets */}
                    <ul className="flex flex-col gap-4">
                        {VALUE_PROPS.map(({ icon, text }) => (
                            <li key={text} className="flex items-center gap-3">
                                <span className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-primary-500/30 ${heroColor}`}>
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

                {/* ── RIGHT: Glassmorphism Login Card ───────────────────── */}
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
                        'flex flex-col gap-6',
                    ].join(' ')}
                    aria-label="Login form"
                >
                    {/* Card header — visible on all screen sizes */}
                    <div className="flex flex-col gap-1">
                        {/* Mobile logo (shown only on < lg) */}
                        <div className={`flex items-center gap-2 mb-2 lg:hidden ${labelColor}`}>
                            <span className="text-2xl" aria-hidden="true">🏥</span>
                            <span className="text-base font-semibold tracking-wide">HMS Portal</span>
                        </div>
                        <h2 className={`text-2xl font-bold ${labelColor}`}>Welcome back</h2>
                        <p className={`text-sm opacity-95 ${labelColor}`}>
                            Sign in to your HMS account to continue
                        </p>
                    </div>

                    {/* Root-level error banner */}
                    <FormError message={errors.root?.message} />

                    {/* Login form */}
                    <form
                        onSubmit={handleSubmit(onSubmit)}
                        noValidate
                        className="flex flex-col gap-5"
                    >
                        <FormInput
                            id="usernameOrEmail"
                            label="Username or Email"
                            type="text"
                            placeholder="admin2 or admin2@hospital.local"
                            error={errors.usernameOrEmail}
                            registration={register('usernameOrEmail', {
                                required: 'Username or email is required',
                            })}
                        />

                        <div className="flex flex-col gap-1.5">
                            {/* Password label row with Forgot link */}
                            <div className="flex items-center justify-between">
                                <label
                                    htmlFor="password"
                                    className={`text-sm font-medium ${labelColor}`}
                                >
                                    Password
                                </label>
                                <Link
                                    to="/forgot-password"
                                    className={`text-sm underline opacity-80 hover:opacity-100 transition-opacity ${labelColor}`}
                                >
                                    Forgot password?
                                </Link>
                            </div>
                            <FormInput
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                error={errors.password}
                                registration={register('password', {
                                    required: 'Password is required',
                                    minLength: { value: 6, message: 'Password must be at least 6 characters' },
                                })}
                            />
                        </div>

                        {/* Sign In button — primary blue, reserved for this CTA only */}
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className={[
                                'w-full py-3 px-4',
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
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z" />
                                    </svg>
                                    Signing in…
                                </span>
                            ) : (
                                'SIGN IN'
                            )}
                        </button>
                    </form>

                    {/* Divider */}
                    <div className="flex items-center gap-3">
                        <hr className={`flex-1 border-t ${dividerColor}`} />
                        <span className={`text-xs font-medium ${dividerText}`}>OR</span>
                        <hr className={`flex-1 border-t ${dividerColor}`} />
                    </div>

                    {/* Register link */}
                    <p className={`text-sm text-center ${labelColor}`}>
                        Don&apos;t have an account?{' '}
                        <Link
                            to="/register"
                            className="font-semibold underline hover:opacity-80 transition-opacity"
                        >
                            Create one now
                        </Link>
                    </p>
                </div>
                {/* ── END Login Card ─────────────────────────────────────── */}

            </div>
        </div>
    );
}
