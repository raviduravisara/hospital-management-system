import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import FormInput from '../components/FormInput';
import FormError from '../components/FormError';
import ThemeSwitch from '../components/ThemeSwitch';
import axiosInstance from '../api/axios';
import { extractRoleFromToken } from '../utils/auth';


export default function Login() {
  const navigate = useNavigate();
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

      const role = extractRoleFromToken(response.data.accessToken);
      const targetRoute =
        role === 'admin'
          ? '/admin/dashboard'
          : role === 'doctor'
            ? '/doctor/dashboard'
            : role === 'patient'
              ? '/patient/dashboard'
              : '/dashboard';

      navigate(targetRoute);
    } catch (err) {
      const message =
        err.response?.data?.message ?? err.message ?? 'Login failed. Please try again.';
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
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6 text-center">
              <div className="flex items-center justify-center gap-2.5 mb-3">
                <img src="/logo.png" alt="HEALIX" className="h-10 w-10 object-contain drop-shadow-md" />
                <span className="text-white font-extrabold text-xl tracking-tight">HEALIX</span>
              </div>
              <h1 className="text-white text-2xl font-bold">Welcome Back</h1>
              <p className="text-blue-100 text-sm mt-1">Sign in to your HEALIX account</p>
            </div>

            <div className="px-8 py-7 flex flex-col gap-5">
              <FormError message={errors.root?.message} />

              <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
                <FormInput
                  id="usernameOrEmail"
                  label="Username or Email"
                  type="text"
                  placeholder="e.g. admin or admin@hospital.local"
                  error={errors.usernameOrEmail}
                  registration={register('usernameOrEmail', {
                    required: 'Username or email is required',
                  })}
                />

                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="password" className="text-sm font-medium text-gray-700">Password</label>
                    <Link to="/forgot-password" className="text-xs text-blue-600 hover:text-blue-700 font-medium hover:underline">
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
                      Signing in…
                    </span>
                  ) : 'Sign In'}
                </button>
              </form>

              <div className="flex items-center gap-3">
                <hr className="flex-1 border-gray-200" />
                <span className="text-xs text-gray-400 font-medium">OR</span>
                <hr className="flex-1 border-gray-200" />
              </div>

              <p className="text-sm text-center text-gray-600">
                Don&apos;t have an account?{' '}
                <Link to="/register" className="text-blue-600 font-semibold hover:text-blue-700 hover:underline">Create one now</Link>
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
