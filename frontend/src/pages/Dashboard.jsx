import { Navigate } from 'react-router-dom';
import { extractRoleFromToken } from '../utils/auth';

function Dashboard() {
    const token = localStorage.getItem('token');
    const role = extractRoleFromToken(token);

    if (!token) {
        return <Navigate to="/login" replace />;
    }

    if (role === 'doctor') {
        return <Navigate to="/doctor/dashboard" replace />;
    }
    if (role === 'patient') {
        return <Navigate to="/patient/dashboard" replace />;
    }
    if (role === 'admin') {
        return <Navigate to="/admin/dashboard" replace />;
    }
    return <Navigate to="/login" replace />;
}

export default Dashboard;
