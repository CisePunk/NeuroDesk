import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { IconDashboard, IconStudenti, IconModuli, IconTask, IconCompanion, IconFeedback, IconSun, IconMoon } from '../components/Icons';
import { useAuth } from '../auth/AuthContext';
import { getTestMode } from '../api/studentiApi';

function MainLayout({ children }) {
    const { ruolo, logout } = useAuth();
    const isScuola = ruolo === 'SCUOLA';

    // Moduli e Task servono solo in test: in produzione (test-mode=false) restano nascosti.
    const [testMode, setTestMode] = useState(false);
    useEffect(() => {
        if (isScuola) getTestMode().then(setTestMode);
    }, [isScuola]);

    const [isLight, setIsLight] = useState(() => {
        const saved = localStorage.getItem('nd-theme');
        if (saved) return saved === 'light';
        // Default: chiaro morbido a bassa stimolazione (indipendente dall'OS).
        return true;
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
                    <span className="sidebar-tagline">
                        {isScuola ? 'gestione scuola' : 'il tuo companion'}
                    </span>
                </div>

                <nav>
                    {isScuola && (
                        <>
                            <NavLink to="/" end className={navClass}>
                                <IconDashboard className="nav-icon" />
                                <span>Dashboard</span>
                            </NavLink>
                            <NavLink to="/studenti" className={navClass}>
                                <IconStudenti className="nav-icon" />
                                <span>Utenti</span>
                            </NavLink>
                            {testMode && (
                                <>
                                    <NavLink to="/moduli" className={navClass}>
                                        <IconModuli className="nav-icon" />
                                        <span>Moduli</span>
                                    </NavLink>
                                    <NavLink to="/task" className={navClass}>
                                        <IconTask className="nav-icon" />
                                        <span>Task</span>
                                    </NavLink>
                                </>
                            )}
                        </>
                    )}
                    <NavLink to="/companion" className={navClass}>
                        <IconCompanion className="nav-icon" />
                        <span>Companion</span>
                    </NavLink>
                    <NavLink to="/feedback" className={navClass}>
                        <IconFeedback className="nav-icon" />
                        <span>{isScuola ? 'Report feedback' : 'Feedback'}</span>
                    </NavLink>
                </nav>

                <div className="sidebar-footer">
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

                    <button className="btn-ghost logout-btn" onClick={logout}>
                        Esci
                    </button>

                    {/* AGPLv3 art. 13: chi usa NeuroDesk attraverso la rete deve poter
                        ottenere il codice sorgente. Questo link e' come lo offriamo. */}
                    <a
                        className="sidebar-sorgente"
                        href="https://github.com/CisePunk/NeuroDesk"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Codice sorgente · AGPLv3
                    </a>
                </div>
            </aside>

            <main>
                {children}
            </main>
        </div>
    );
}

export default MainLayout;
