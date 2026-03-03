import { Navigate, useNavigate } from 'react-router-dom';
import './Dashboard.css';
import { extractRoleFromToken } from '../utils/auth';

function AdminDashboard() {
    const navigate = useNavigate();
    const token = localStorage.getItem('token');
    const role = extractRoleFromToken(token);

    if (!token) {
        return <Navigate to="/login" replace />;
    }

    if (role !== 'admin') {
        return <Navigate to="/dashboard" replace />;
    }

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        navigate('/login');
    };

    const stats = [
        { label: 'Total Patients', value: '1,284', icon: 'Patients', color: '#1a56db' },
        { label: 'Appointments Today', value: '48', icon: 'Appointments', color: '#0e9f6e' },
        { label: 'Active Doctors', value: '32', icon: 'Doctors', color: '#7e3af2' },
        { label: 'Invoices Pending', value: '14', icon: 'Billing', color: '#e3a008' },
    ];

    return (
        <div className="dashboard-wrapper">
            <div className="dashboard-header">
                <div>
                    <h1>Admin Dashboard</h1>
                    <p>System overview and management controls.</p>
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
                <p>Admin controls for users, billing, and reports can be demonstrated from this screen.</p>
            </div>
        </div>
    );
}

export default AdminDashboard;
