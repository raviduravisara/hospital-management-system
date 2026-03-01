import { useMemo } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import './DoctorDashboard.css';
import { extractRoleFromToken } from '../utils/auth';

const ALLOWED_ROLES = ['doctor', 'admin'];

const APPOINTMENTS = [
  { id: 1, patient: 'Nimal Perera', time: '09:00 AM', reason: 'Follow-up consultation' },
  { id: 2, patient: 'Anjali Silva', time: '10:30 AM', reason: 'Blood pressure review' },
  { id: 3, patient: 'Kamal Fernando', time: '01:15 PM', reason: 'Diabetes management' },
];

function DoctorDashboard() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  const userRole = useMemo(() => extractRoleFromToken(token), [token]);
  const isAuthorized = userRole ? ALLOWED_ROLES.includes(userRole) : false;

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (!isAuthorized) {
    return (
      <div className="doctor-dashboard unauthorized-state">
        <h1>Unauthorized</h1>
        <p>You do not have permission to access the doctor dashboard.</p>
        <button type="button" className="action-button" onClick={() => navigate('/dashboard')}>
          Back to Main Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="doctor-dashboard">
      <header className="doctor-header">
        <div>
          <h1>Doctor Dashboard</h1>
          <p>Welcome back, doctor. Here is your Sprint 1 overview.</p>
        </div>
        <button
          type="button"
          className="action-button secondary"
          onClick={() => {
            localStorage.removeItem('token');
            navigate('/login');
          }}
        >
          Logout
        </button>
      </header>

      <section className="card profile-card">
        <h2>Profile Summary</h2>
        <p>
          <strong>Name:</strong> Dr. Placeholder Name
        </p>
        <p>
          <strong>Specialty:</strong> General Medicine
        </p>
        <p>
          <strong>Role:</strong> {userRole}
        </p>
      </section>

      <section className="card">
        <h2>Today&apos;s Appointments</h2>
        {APPOINTMENTS.length > 0 ? (
          <ul className="appointment-list">
            {APPOINTMENTS.map((appointment) => (
              <li key={appointment.id}>
                <span className="time">{appointment.time}</span>
                <div>
                  <p className="patient">{appointment.patient}</p>
                  <p className="reason">{appointment.reason}</p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="empty-state">No appointments scheduled for today.</div>
        )}
      </section>

      <section className="card availability-block">
        <h2>Availability Summary</h2>
        <p>Morning: Available</p>
        <p>Afternoon: Partially booked</p>
        <p>Evening: Unavailable</p>
      </section>

      <section className="card">
        <h2>Quick Actions</h2>
        <div className="quick-actions">
          <button type="button" className="action-button">
            View Patient Queue
          </button>
          <button type="button" className="action-button">
            Open Prescriptions
          </button>
          <button type="button" className="action-button">
            Check Lab Requests
          </button>
        </div>
      </section>
    </div>
  );
}

export default DoctorDashboard;
