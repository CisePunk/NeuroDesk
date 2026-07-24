import { useState } from 'react';
import { getFeedbackReport, scaricaFeedbackCsv } from '../api/feedbackApi';
import { useAsyncData } from '../ui/useAsyncData';
import { StatoLista } from '../ui/StatoLista';
import { useToast } from '../ui/ToastProvider';

function formatData(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleString('it-IT', {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
}

function FeedbackReportPage() {
    const toast = useToast();
    const { dati, caricamento, errore, ricarica } = useAsyncData(getFeedbackReport);
    const report = dati ?? { totale: 0, domande: [], commenti: [] };
    const [scaricando, setScaricando] = useState(false);

    async function handleCsv() {
        setScaricando(true);
        try {
            await scaricaFeedbackCsv();
        } catch (err) {
            toast.errore(err.message);
        } finally {
            setScaricando(false);
        }
    }

    return (
        <div className="page">
            <div className="page-header">
                <h2>Report feedback</h2>
                <button
                    className="btn-secondary"
                    onClick={handleCsv}
                    disabled={scaricando || report.totale === 0}
                >
                    {scaricando ? '…' : '↓ Scarica CSV'}
                </button>
            </div>

            <StatoLista
                caricamento={caricamento}
                errore={errore}
                vuoto={report.totale === 0}
                messaggioVuoto="Nessun feedback ancora. Comparirà qui appena i tester lo inviano."
                onRiprova={ricarica}
            >
                <p className="feedback-intro">
                    <strong>{report.totale}</strong> {report.totale === 1 ? 'feedback ricevuto' : 'feedback ricevuti'}.
                </p>

                <div className="report-grid">
                    {report.domande.map((d) => {
                        const totRisposte = d.opzioni.reduce((s, o) => s + o.conteggio, 0);
                        return (
                            <div className="report-card" key={d.id}>
                                <h3 className="report-question">{d.testo}</h3>
                                <div className="report-bars">
                                    {d.opzioni.map((o) => {
                                        const perc = totRisposte ? Math.round((o.conteggio / totRisposte) * 100) : 0;
                                        return (
                                            <div className="report-bar-row" key={o.valore}>
                                                <span className="report-bar-label">{o.etichetta}</span>
                                                <span className="report-bar-track">
                                                    <span className="report-bar-fill" style={{ width: `${perc}%` }} />
                                                </span>
                                                <span className="report-bar-count">{o.conteggio}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                                {totRisposte === 0 && <p className="muted">Nessuna risposta a questa domanda.</p>}
                            </div>
                        );
                    })}
                </div>

                {report.commenti.length > 0 && (
                    <div className="report-comments">
                        <h3>Commenti e errori segnalati</h3>
                        <div className="card-list">
                            {report.commenti.map((c, i) => (
                                <div className="card" key={i}>
                                    <div className="card-meta">
                                        {formatData(c.creatoIl)}
                                        {c.etichetta && <span className="badge badge-secondary">{c.etichetta}</span>}
                                    </div>
                                    {c.descrizioneErrori && (
                                        <div className="card-detail">
                                            <strong>Errori:</strong> {c.descrizioneErrori}
                                        </div>
                                    )}
                                    {c.commento && (
                                        <div className="card-detail">
                                            <strong>Commento:</strong> {c.commento}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </StatoLista>
        </div>
    );
}

export default FeedbackReportPage;
