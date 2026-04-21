import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import './Layout.css';
import { extractRoleFromToken } from '../utils/auth';
// logo loaded from /public so no import needed

// Dashboard routes own their full layout (sidebar + topbar), so hide the shared navbar
const NAVBAR_HIDDEN_ROUTES = ['/', '/login', '/register', '/admin/dashboard', '/doctor/dashboard', '/patient/dashboard', '/dashboard'];

function Layout() {
    const { pathname } = useLocation();
    const navigate = useNavigate();
    const hideNavbar = NAVBAR_HIDDEN_ROUTES.includes(pathname);

    const token = localStorage.getItem('token');
    const role = extractRoleFromToken(token);
    const isLoggedIn = Boolean(token && role);

    const dashboardRoute =
        role === 'admin'
            ? '/admin/dashboard'
            : role === 'doctor'
                ? '/doctor/dashboard'
                : role === 'patient'
                    ? '/patient/dashboard'
                    : '/dashboard';

    const navLinks = isLoggedIn
        ? [
            { to: dashboardRoute, label: 'Dashboard' },
            { to: '/dashboard', label: 'Home' },
        ]
        : [
            { to: '/login', label: 'Login' },
            { to: '/register', label: 'Register' },
        ];

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        navigate('/login');
    };

    return (
        <div className="layout">
            {!hideNavbar && (
                <nav className="navbar">
                    <Link to={isLoggedIn ? dashboardRoute : '/'} className="navbar-brand">
                        <img src="/logo.png" alt="HEALIX" className="brand-logo" />
                        <span className="brand-name">HEALIX</span>
                    </Link>

                    <ul className="nav-links">
                        {navLinks.map(({ to, label }) => (
                            <li key={to}>
                                <Link to={to} className={`nav-link ${pathname === to ? 'active' : ''}`}>
                                    {label}
                                </Link>
                            </li>
                        ))}
                        {isLoggedIn && (
                            <li>
                                <button type="button" className="nav-link nav-btn" onClick={handleLogout}>
                                    Logout
                                </button>
                            </li>
                        )}
                    </ul>
                </nav>
            )}
            <main className="page-content">
                <Outlet />
            </main>
        </div>
    );
}

export default Layout;
