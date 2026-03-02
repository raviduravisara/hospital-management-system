import { Link, Outlet, useLocation } from 'react-router-dom';
import './Layout.css';

/* Routes where the Layout navbar should NOT render.
   The login page manages its own full-bleed layout. */
const NAVBAR_HIDDEN_ROUTES = ['/login', '/register'];

function Layout() {
    const { pathname } = useLocation();
    const hideNavbar = NAVBAR_HIDDEN_ROUTES.includes(pathname);

    const navLinks = [
        { to: '/login', label: 'Login' },
        { to: '/register', label: 'Register' },
        { to: '/dashboard', label: 'Dashboard' },
    ];

    return (
        <div className="layout">
            {!hideNavbar && (
                <nav className="navbar">
                    <div className="navbar-brand">
                        <span className="brand-icon">🏥</span>
                        <span className="brand-name">HMS Portal</span>
                    </div>
                    <ul className="nav-links">
                        {navLinks.map(({ to, label }) => (
                            <li key={to}>
                                <Link
                                    to={to}
                                    className={`nav-link ${pathname === to ? 'active' : ''}`}
                                >
                                    {label}
                                </Link>
                            </li>
                        ))}
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
