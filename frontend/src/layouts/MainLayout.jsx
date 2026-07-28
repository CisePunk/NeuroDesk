import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { IconDashboard, IconModuli, IconTask, IconCompanion, IconFeedback, IconSun, IconMoon, IconCodici, IconEsci } from '../components/Icons';
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

    // L'archivio del browser puo' rifiutare lettura e scrittura (quota piena, Safari
    // privato). Non e' un motivo per far cadere l'app: al massimo si perde la scelta
    // del tema. Senza try/catch l'eccezione smonterebbe l'albero -> pagina bianca.
    const [isLight, setIsLight] = useState(() => {
        try {
            const saved = localStorage.getItem('nd-theme');
            if (saved) return saved === 'light';
        } catch { /* nessuna preferenza salvata */ }
        // Default: chiaro morbido a bassa stimolazione (indipendente dall'OS).
        return true;
    });

    useEffect(() => {
        const theme = isLight ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', theme);
        try {
            localStorage.setItem('nd-theme', theme);
        } catch { /* il tema vale per questa sessione */ }
    }, [isLight]);

    const navClass = ({ isActive }) => isActive ? 'nav-link active' : 'nav-link';

    return (
        <div className="app">
            {/* Salta la barra laterale: visibile solo quando riceve il focus da tastiera. */}
            <a className="skip-link" href="#contenuto-principale">Salta al contenuto</a>
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
                            <NavLink to="/codici" className={navClass}>
                                <IconCodici className="nav-icon" />
                                <span>Codici</span>
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

                    {/* Su telefono questo bottone diventa l'ultima voce della barra
                        in basso (vedi App.css, @media max-width 767px): chi usa un
                        dispositivo condiviso deve poter uscire in un gesto, non
                        cercando in fondo a un menu. L'icona serve li': senza, "Esci"
                        non si distingue dalle altre voci. */}
                    <button className="btn-ghost logout-btn" onClick={logout}>
                        <IconEsci className="nav-icon logout-icon" aria-hidden="true" />
                        <span>Esci</span>
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

            <main id="contenuto-principale" tabIndex={-1}>
                {children}
            </main>
        </div>
    );
}

export default MainLayout;
