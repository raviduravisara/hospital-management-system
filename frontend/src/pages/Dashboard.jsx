import { Navigate, useNavigate } from 'react-router-dom';
import './Dashboard.css';
import { extractRoleFromToken } from '../utils/auth';

function Dashboard() {
    const navigate = useNavigate();
    const token = localStorage.getItem('token');
    const role = extractRoleFromToken(token);

    if (!token) {
        return <Navigate to="/login" replace />;
    }

    if (role === 'doctor') {
        return <Navigate to="/doctor/dashboard" replace />;
    }

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/login');
    };

    const stats = [
        { label: 'Total Patients', value: '1,284', icon: '🧑‍🤝‍🧑', color: '#1a56db' },
        { label: 'Appointments Today', value: '48', icon: '📅', color: '#0e9f6e' },
        { label: 'Active Doctors', value: '32', icon: '🩺', color: '#7e3af2' },
        { label: 'Beds Available', value: '64', icon: '🛏️', color: '#e3a008' },
    ];

    return (
        <div className="dashboard-wrapper">
            <div className="dashboard-header">
                <div>
                    <h1>Dashboard</h1>
                    <p>Welcome back! Here's your hospital overview.</p>
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
                <p>📊 More analytics and management modules will appear here.</p>
            </div>
        </div>
    );
}

export default Dashboard;
