import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axios';
import { extractRoleFromToken } from '../utils/auth';

export default function DoctorRegistration() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const role = extractRoleFromToken(token);
  const [error, setError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ mode: 'onTouched' });

  if (!token) return <Navigate to="/login" replace />;
  if (role !== 'doctor') return <Navigate to="/dashboard" replace />;

  const onSubmit = async (data) => {
    setError('');
    try {
      await axiosInstance.post('/api/doctors', {
        userId: null,
        firstName: data.firstName,
        lastName: data.lastName,
        specialization: data.specialization || null,
        licenseNumber: data.licenseNumber,
        phone: data.phone || null,
        consultationFee: Number(data.consultationFee || 0),
      });

      navigate('/doctor/dashboard');
    } catch (err) {
      setError(err.response?.data?.message ?? 'Unable to create doctor profile.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Doctor Profile Registration</h1>
            <p className="text-sm text-gray-500 mt-1">Set up your professional profile details.</p>
          </div>
          <Link
            to="/doctor/dashboard"
            className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
          >
            Back to Dashboard
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
          {error && (
            <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-4" noValidate>
            <Field
              label="First Name"
              id="firstName"
              error={errors.firstName?.message}
              input={<input id="firstName" className={inputClass(errors.firstName)} {...register('firstName', { required: 'First name is required' })} />}
            />

            <Field
              label="Last Name"
              id="lastName"
              error={errors.lastName?.message}
              input={<input id="lastName" className={inputClass(errors.lastName)} {...register('lastName', { required: 'Last name is required' })} />}
            />

            <Field
              label="Specialization"
              id="specialization"
              error={errors.specialization?.message}
              input={<input id="specialization" className={inputClass(errors.specialization)} placeholder="e.g. Neurology" {...register('specialization')} />}
            />

            <Field
              label="License Number"
              id="licenseNumber"
              error={errors.licenseNumber?.message}
              input={<input id="licenseNumber" className={inputClass(errors.licenseNumber)} {...register('licenseNumber', { required: 'License number is required' })} />}
            />

            <Field
              label="Phone"
              id="phone"
              error={errors.phone?.message}
              input={<input id="phone" className={inputClass(errors.phone)} {...register('phone')} />}
            />

            <Field
              label="Consultation Fee"
              id="consultationFee"
              error={errors.consultationFee?.message}
              input={
                <input
                  id="consultationFee"
                  type="number"
                  step="0.01"
                  className={inputClass(errors.consultationFee)}
                  {...register('consultationFee', {
                    min: { value: 0, message: 'Consultation fee cannot be negative' },
                  })}
                />
              }
            />

            <div className="md:col-span-2 pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full md:w-auto px-6 py-2.5 rounded-lg bg-teal-600 text-white font-semibold hover:bg-teal-700 transition-colors disabled:opacity-60"
              >
                {isSubmitting ? 'Saving...' : 'Save Doctor Profile'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function Field({ label, id, input, error }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {input}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

function inputClass(error) {
  return `w-full rounded-lg border px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 ${
    error ? 'border-red-300 focus:ring-red-300' : 'border-gray-300 focus:ring-teal-400'
  }`;
}
