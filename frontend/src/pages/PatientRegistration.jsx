import { useForm } from 'react-hook-form';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import axiosInstance from '../api/axios';
import { extractRoleFromToken } from '../utils/auth';

const GENDER_OPTIONS = ['Male', 'Female', 'Other'];

export default function PatientRegistration() {
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
  if (role !== 'patient') return <Navigate to="/dashboard" replace />;

  const onSubmit = async (data) => {
    setError('');
    try {
      await axiosInstance.post('/api/patients', {
        userId: null,
        firstName: data.firstName,
        lastName: data.lastName,
        dateOfBirth: data.dateOfBirth || null,
        gender: data.gender || null,
        phone: data.phone || null,
        address: data.address || null,
        bloodGroup: data.bloodGroup || null,
        emergencyContact: data.emergencyContact || null,
      });

      navigate('/patient/dashboard');
    } catch (err) {
      setError(err.response?.data?.message ?? 'Unable to create patient profile.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Patient Profile Registration</h1>
            <p className="text-sm text-gray-500 mt-1">Complete your medical profile to unlock patient features.</p>
          </div>
          <Link
            to="/patient/dashboard"
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
              input={
                <input
                  id="firstName"
                  className={inputClass(errors.firstName)}
                  {...register('firstName', { required: 'First name is required' })}
                />
              }
            />

            <Field
              label="Last Name"
              id="lastName"
              error={errors.lastName?.message}
              input={
                <input
                  id="lastName"
                  className={inputClass(errors.lastName)}
                  {...register('lastName', { required: 'Last name is required' })}
                />
              }
            />

            <Field
              label="Date of Birth"
              id="dateOfBirth"
              error={errors.dateOfBirth?.message}
              input={<input id="dateOfBirth" type="date" className={inputClass(errors.dateOfBirth)} {...register('dateOfBirth')} />}
            />

            <Field
              label="Gender"
              id="gender"
              error={errors.gender?.message}
              input={
                <select id="gender" className={inputClass(errors.gender)} {...register('gender')}>
                  <option value="">Select gender</option>
                  {GENDER_OPTIONS.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              }
            />

            <Field
              label="Phone"
              id="phone"
              error={errors.phone?.message}
              input={<input id="phone" className={inputClass(errors.phone)} {...register('phone')} />}
            />

            <Field
              label="Blood Group"
              id="bloodGroup"
              error={errors.bloodGroup?.message}
              input={<input id="bloodGroup" className={inputClass(errors.bloodGroup)} placeholder="e.g. O+" {...register('bloodGroup')} />}
            />

            <Field
              label="Emergency Contact"
              id="emergencyContact"
              error={errors.emergencyContact?.message}
              input={<input id="emergencyContact" className={inputClass(errors.emergencyContact)} {...register('emergencyContact')} />}
            />

            <div className="md:col-span-2">
              <Field
                label="Address"
                id="address"
                error={errors.address?.message}
                input={<textarea id="address" rows={3} className={inputClass(errors.address)} {...register('address')} />}
              />
            </div>

            <div className="md:col-span-2 pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full md:w-auto px-6 py-2.5 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors disabled:opacity-60"
              >
                {isSubmitting ? 'Saving...' : 'Save Patient Profile'}
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
    error ? 'border-red-300 focus:ring-red-300' : 'border-gray-300 focus:ring-blue-400'
  }`;
}
