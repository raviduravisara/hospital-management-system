import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import FormInput from '../components/FormInput';
import FormError from '../components/FormError';
import ThemeSwitch from '../components/ThemeSwitch';
import axiosInstance from '../api/axios';


/* Role options */
const ROLE_OPTIONS = [
    { value: '', label: '-- Select Role --' },
    { value: 'Doctor', label: 'Doctor' },
    { value: 'Patient', label: 'Patient' },
];

/* Register Page */
export default function Register() {
    const navigate = useNavigate();
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

    return (
        <div
            className="relative min-h-screen w-full flex flex-col overflow-hidden"
            style={{
                backgroundImage: "url('/1.png')",
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
            }}
        >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-950/85 via-blue-900/80 to-blue-800/75 pointer-events-none" />
            <div className="absolute inset-0 bg-black/40 pointer-events-none" />

            {/* Top bar */}
            <div className="relative z-20 w-full flex items-center justify-between px-6 py-4">
                <Link to="/" className="flex items-center gap-2.5">
                    <img src="/logo.png" alt="HEALIX" className="h-9 w-9 object-contain" />
                    <span className="text-white font-extrabold text-lg tracking-tight">HEALIX</span>
                </Link>
                <ThemeSwitch />
            </div>

            {/* Centered card */}
            <div className="relative z-10 flex-1 flex items-center justify-center px-4 py-8">
                <div className="w-full max-w-md">
                    <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
                        {/* Blue header band */}
                        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6 text-center">
                            <div className="flex items-center justify-center gap-2.5 mb-3">
                                <img src="/logo.png" alt="HEALIX" className="h-10 w-10 object-contain drop-shadow-md" />
                                <span className="text-white font-extrabold text-xl tracking-tight">HEALIX</span>
                            </div>
                            <h1 className="text-white text-2xl font-bold">Create Account</h1>
                            <p className="text-blue-100 text-sm mt-1">Join the HEALIX healthcare platform</p>
                        </div>

                        {/* Form body */}
                        <div className="px-8 py-6 flex flex-col gap-4">
                            <FormError message={errors.root?.message} />

                            <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
                                <FormInput
                                    id="username"
                                    label="Username"
                                    type="text"
                                    placeholder="e.g. jsmith"
                                    error={errors.username}
                                    registration={register('username', { required: 'Username is required' })}
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

                                <div className="flex flex-col gap-1.5">
                                    <label htmlFor="role" className="text-sm font-medium text-gray-700">Role</label>
                                    <select
                                        id="role"
                                        className={`w-full px-4 py-2.5 bg-gray-100 text-gray-900 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:border-transparent appearance-none cursor-pointer ${
                                            errors.role ? 'border-red-400 focus:ring-red-400' : 'border-transparent focus:ring-blue-500'
                                        }`}
                                        {...register('role', { required: 'Please select a role' })}
                                    >
                                        {ROLE_OPTIONS.map(({ value, label }) => (
                                            <option key={value} value={value} disabled={value === ''}>{label}</option>
                                        ))}
                                    </select>
                                    {errors.role && (
                                        <span role="alert" className="text-xs text-red-500 font-medium mt-0.5">{errors.role.message}</span>
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
                                        minLength: { value: 6, message: 'Password must be at least 6 characters' },
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
                                        validate: (val) => val === password || 'Passwords do not match',
                                    })}
                                />

                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full py-3 px-4 mt-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-lg transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-y-0"
                                >
                                    {isSubmitting ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <svg className="w-4 h-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z" />
                                            </svg>
                                            Creating account…
                                        </span>
                                    ) : 'Create Account'}
                                </button>
                            </form>

                            <div className="flex items-center gap-3">
                                <hr className="flex-1 border-gray-200" />
                                <span className="text-xs text-gray-400 font-medium">OR</span>
                                <hr className="flex-1 border-gray-200" />
                            </div>

                            <p className="text-sm text-center text-gray-600">
                                Already have an account?{' '}
                                <Link to="/login" className="text-blue-600 font-semibold hover:text-blue-700 hover:underline">Sign in here</Link>
                            </p>
                        </div>
                    </div>

                    <p className="text-center mt-5">
                        <Link to="/" className="text-white/70 hover:text-white text-sm transition-colors flex items-center justify-center gap-1.5">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            Back to Home
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
