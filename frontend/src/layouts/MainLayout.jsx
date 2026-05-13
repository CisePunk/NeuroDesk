import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { IconDashboard, IconStudenti, IconModuli, IconTask, IconSun, IconMoon } from '../components/Icons';

function MainLayout({ children }) {
    const [isLight, setIsLight] = useState(() => {
        const saved = localStorage.getItem('nd-theme');
        if (saved) return saved === 'light';
        return window.matchMedia('(prefers-color-scheme: light)').matches;
    });

    useEffect(() => {
        const theme = isLight ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('nd-theme', theme);
    }, [isLight]);

    const navClass = ({ isActive }) => isActive ? 'nav-link active' : 'nav-link';

    return (
        <div className="app">
            <aside>
                <div className="sidebar-shimmer" />

                <div className="sidebar-brand">
                    <span className="sidebar-logo">NeuroDesk</span>
                    <span className="sidebar-tagline">gestionale neurodivergente</span>
                </div>

                <nav>
                    <NavLink to="/" end className={navClass}>
                        <IconDashboard className="nav-icon" />
                        <span>Dashboard</span>
                    </NavLink>
                    <NavLink to="/studenti" className={navClass}>
                        <IconStudenti className="nav-icon" />
                        <span>Studenti</span>
                    </NavLink>
                    <NavLink to="/moduli" className={navClass}>
                        <IconModuli className="nav-icon" />
                        <span>Moduli</span>
                    </NavLink>
                    <NavLink to="/task" className={navClass}>
                        <IconTask className="nav-icon" />
                        <span>Task</span>
                    </NavLink>
                </nav>

                <button
                    className="theme-toggle"
                    onClick={() => setIsLight(v => !v)}
                    aria-label={isLight ? 'Passa al tema scuro' : 'Passa al tema chiaro'}
                >
                    <span className={`theme-icon theme-icon--moon${!isLight ? ' theme-icon--active' : ''}`}>
                        <IconMoon />
                    </span>
                    <span className="theme-toggle-track">
                        <span className="theme-toggle-thumb" />
                    </span>
                    <span className={`theme-icon theme-icon--sun${isLight ? ' theme-icon--active' : ''}`}>
                        <IconSun />
                    </span>
                </button>
            </aside>

            <main>
                {children}
            </main>
        </div>
    );
}

export default MainLayout;
