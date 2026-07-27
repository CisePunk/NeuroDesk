import { Component } from 'react';

/**
 * Rete di sicurezza per TUTTA l'app. Senza questa, un solo errore in un render o
 * in un effetto fa smontare l'albero a React: l'utente resta davanti a una pagina
 * completamente BIANCA, senza capire cosa fare (segnalato da un tester: "clicco
 * continua, pagina bianca, ricarico e vedo il passo successivo").
 *
 * Qui l'errore diventa un messaggio leggibile con un pulsante per ricaricare. La
 * conversazione non si perde: la copia autorevole e' cifrata sul server.
 *
 * Deve restare un componente a classe: getDerivedStateFromError/componentDidCatch
 * non hanno equivalente con gli hook.
 */
class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { crollato: false };
    }

    static getDerivedStateFromError() {
        return { crollato: true };
    }

    componentDidCatch(errore, info) {
        // Solo in console, e solo il motivo tecnico: mai il testo dell'utente
        // (puo' contenere dati di salute, Art. 9 GDPR). Serve a chi raccoglie la
        // segnalazione del tester per capire cosa e' successo davvero.
        console.error('[neurodesk] errore non gestito:', errore?.message, info?.componentStack);
    }

    render() {
        if (!this.state.crollato) return this.props.children;

        return (
            <div className="auth-screen">
                <div className="auth-card auth-card--wide">
                    <div className="auth-brand">
                        <h1 className="auth-logo">Qualcosa si è inceppato</h1>
                        <span className="auth-tagline">Non è colpa tua, ed è un problema nostro.</span>
                    </div>

                    <p className="consent-text">
                        Ricarica la pagina: ritrovi la conversazione dov'era. Quello che avevi scritto
                        è già salvato, non si perde niente.
                    </p>

                    <button
                        type="button"
                        className="btn-primary auth-submit"
                        onClick={() => window.location.reload()}
                    >
                        Ricarica la pagina
                    </button>

                    <p className="companion-notice">
                        Se ti succede spesso, scrivici a <a href="mailto:hello@neurodesk.it">hello@neurodesk.it</a>:
                        dicci quale pulsante avevi toccato e con che telefono o computer.
                    </p>
                </div>
            </div>
        );
    }
}

export default ErrorBoundary;
