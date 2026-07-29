import { Component } from 'react';
import { testi } from '../i18n/lingua';

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
                        <h1 className="auth-logo">{testi().erroreTitolo}</h1>
                        <span className="auth-tagline">{testi().erroreSottotitolo}</span>
                    </div>

                    <p className="consent-text">
                        {testi().erroreTesto}
                    </p>

                    <button
                        type="button"
                        className="btn-primary auth-submit"
                        onClick={() => window.location.reload()}
                    >
                        {testi().erroreRicarica}
                    </button>

                    <p className="companion-notice">
                        {testi().erroreScriviciA}{' '}
                        <a href="mailto:hello@neurodesk.it">hello@neurodesk.it</a>{testi().erroreScriviciB}
                    </p>
                </div>
            </div>
        );
    }
}

export default ErrorBoundary;
