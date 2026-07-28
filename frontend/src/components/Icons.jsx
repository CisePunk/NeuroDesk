const base = { viewBox: '0 0 20 20', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' };

export function IconDashboard(props) {
    return (
        <svg {...base} {...props}>
            <rect x="2.5" y="2.5" width="6" height="6" rx="1.5" />
            <rect x="11.5" y="2.5" width="6" height="6" rx="1.5" />
            <rect x="2.5" y="11.5" width="6" height="6" rx="1.5" />
            <rect x="11.5" y="11.5" width="6" height="6" rx="1.5" />
        </svg>
    );
}

export function IconStudenti(props) {
    return (
        <svg {...base} {...props}>
            <circle cx="10" cy="7" r="3.2" />
            <path d="M3.5 17c0-3.038 2.91-5.5 6.5-5.5s6.5 2.462 6.5 5.5" />
        </svg>
    );
}

export function IconModuli(props) {
    return (
        <svg {...base} {...props}>
            <path d="M5 3h8a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a1.5 1.5 0 0 1-1.5-1.5v-12A1.5 1.5 0 0 1 5 3z" />
            <path d="M7.5 8h5M7.5 11h5M7.5 14h3" />
        </svg>
    );
}

export function IconTask(props) {
    return (
        <svg {...base} {...props}>
            <rect x="3" y="3" width="14" height="14" rx="3" />
            <path d="M7 10l2 2 4-4" />
        </svg>
    );
}

export function IconCompanion(props) {
    return (
        <svg {...base} {...props}>
            <path d="M5 4.5h10a2 2 0 0 1 2 2v5.5a2 2 0 0 1-2 2H9l-4 3v-3a2 2 0 0 1-2-2V6.5a2 2 0 0 1 2-2z" />
            <path d="M7 8h6M7 11h4" />
        </svg>
    );
}

export function IconSun(props) {
    return (
        <svg {...base} {...props}>
            <circle cx="10" cy="10" r="3.5" />
            <path d="M10 2v1.5M10 16.5V18M2 10h1.5M16.5 10H18M4.22 4.22l1.06 1.06M14.72 14.72l1.06 1.06M4.22 15.78l1.06-1.06M14.72 5.28l1.06-1.06" />
        </svg>
    );
}

export function IconMoon(props) {
    return (
        <svg {...base} {...props}>
            <path d="M17.5 12.5A7.5 7.5 0 0 1 7.5 2.5a7.5 7.5 0 1 0 10 10z" />
        </svg>
    );
}

export function IconPlus(props) {
    return (
        <svg {...base} {...props}>
            <path d="M10 4v12M4 10h12" />
        </svg>
    );
}

export function IconFeedback(props) {
    return (
        <svg {...base} {...props}>
            <path d="M10 2.5l2.06 4.18 4.61.67-3.34 3.25.79 4.6L10 13.4l-4.12 2.17.79-4.6L3.33 7.35l4.61-.67z" />
        </svg>
    );
}

// Chiave: i codici di accesso emessi.
export function IconCodici(props) {
    return (
        <svg {...base} {...props}>
            <circle cx="6.5" cy="10" r="3.5" />
            <path d="M10 10h7.5M15 10v3M12.5 10v2.2" />
        </svg>
    );
}

// Uscita: porta con la freccia che esce. Serve sulla barra in basso da telefono,
// dove "Esci" senza icona non si distingue dalle altre voci.
export function IconEsci(props) {
    return (
        <svg {...base} {...props}>
            <path d="M8 3.5H4.5A1.5 1.5 0 0 0 3 5v10a1.5 1.5 0 0 0 1.5 1.5H8" />
            <path d="M12.5 13.5 16 10l-3.5-3.5M16 10H7" />
        </svg>
    );
}
