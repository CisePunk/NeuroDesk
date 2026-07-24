import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    getStudenti,
    getTestMode,
    seedTestStudenti,
    removeTestStudenti,
} from '../api/studentiApi';
import { useAsyncData } from '../ui/useAsyncData';
import { StatoLista } from '../ui/StatoLista';
import { useToast } from '../ui/ToastProvider';

function StudentiPage() {
    const navigate = useNavigate();
    const toast = useToast();
    const { dati, caricamento, errore, ricarica } = useAsyncData(getStudenti);
    const studenti = dati ?? [];

    const [testMode, setTestMode] = useState(false);
    const [azioneTest, setAzioneTest] = useState(false);

    useEffect(() => {
        getTestMode().then(setTestMode);
    }, []);

    async function handleSeed() {
        setAzioneTest(true);
        try {
            const creati = await seedTestStudenti(5);
            toast.successo(`${creati.length} utenti di test creati.`);
            ricarica();
        } catch (err) {
            toast.errore(err.message);
        } finally {
            setAzioneTest(false);
        }
    }

    async function handleRemoveTest() {
        setAzioneTest(true);
        try {
            const res = await removeTestStudenti();
            toast.successo(`${res.rimossi} utenti di test rimossi.`);
            ricarica();
        } catch (err) {
            toast.errore(err.message);
        } finally {
            setAzioneTest(false);
        }
    }

    return (
        <div className="page">
            <div className="page-header">
                <h2>Utenti</h2>
                <button className="btn-primary" onClick={() => navigate('/studenti/nuovo')}>
                    + Nuovo utente
                </button>
            </div>

            {testMode && (
                <div className="test-banner">
                    <span>
                        Ambiente di test — gli utenti generati qui sono <strong>fittizi</strong>.
                        In produzione gli utenti li inserisce solo la scuola.
                    </span>
                    <div className="test-banner-actions">
                        <button className="btn-secondary" onClick={handleSeed} disabled={azioneTest}>
                            {azioneTest ? '…' : '+ Crea 5 utenti di test'}
                        </button>
                        <button className="btn-ghost" onClick={handleRemoveTest} disabled={azioneTest}>
                            Rimuovi utenti di test
                        </button>
                    </div>
                </div>
            )}

            <StatoLista
                caricamento={caricamento}
                errore={errore}
                vuoto={studenti.length === 0}
                messaggioVuoto="Nessun utente ancora. Aggiungine uno."
                onRiprova={ricarica}
            >
                <div className="card-list">
                    {studenti.map((studente, i) => (
                        <div
                            key={studente.id}
                            className="card"
                            style={{ animationDelay: `${i * 55}ms` }}
                        >
                            <div className="card-title">
                                {studente.nome} {studente.cognome}
                            </div>
                            <div className="card-detail">{studente.email}</div>
                            <div>
                                {studente.profiloNeurodivergente && (
                                    <span className="badge">{studente.profiloNeurodivergente}</span>
                                )}
                                {studente.livelloEnergiaPreferito && (
                                    <span className="badge badge-secondary">{studente.livelloEnergiaPreferito}</span>
                                )}
                                <span className={`badge ${studente.attivo ? 'badge-success' : 'badge-muted'}`}>
                                    {studente.attivo ? 'Attivo' : 'Non attivo'}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </StatoLista>
        </div>
    );
}

export default StudentiPage;
