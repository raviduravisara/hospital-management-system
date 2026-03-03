import { Navigate, useNavigate } from 'react-router-dom';
import './Dashboard.css';
import { extractRoleFromToken } from '../utils/auth';

function PatientDashboard() {
    const navigate = useNavigate();
    const token = localStorage.getItem('token');
    const role = extractRoleFromToken(token);

    if (!token) {
        return <Navigate to="/login" replace />;
    }

    if (role !== 'patient') {
        return <Navigate to="/dashboard" replace />;
    }

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        navigate('/login');
    };

    const stats = [
        { label: 'Upcoming Appointments', value: '2', icon: 'Visits', color: '#1a56db' },
        { label: 'Active Prescriptions', value: '3', icon: 'Rx', color: '#0e9f6e' },
        { label: 'Lab Reports', value: '1', icon: 'Labs', color: '#7e3af2' },
        { label: 'Pending Payments', value: 'LKR 8,500', icon: 'Bills', color: '#e3a008' },
    ];

    return (
        <div className="dashboard-wrapper">
            <div className="dashboard-header">
                <div>
                    <h1>Patient Dashboard</h1>
                    <p>Your appointments, prescriptions, and health records at a glance.</p>
                </div>
                <button className="btn-logout" onClick={handleLogout}>
                    Logout
                </button>
            </div>

            <div className="stats-grid">
                {stats.map(({ label, value, icon, color }) => (
                    <div className="stat-card" key={label} style={{ '--accent': color }}>
                        <span className="stat-icon">{icon}</span>
                        <div>
                            <p className="stat-value">{value}</p>
                            <p className="stat-label">{label}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="placeholder-section">
                <p>Patient module pages can be linked here for sprint demonstration.</p>
            </div>
        </div>
    );
}

export default PatientDashboard;
