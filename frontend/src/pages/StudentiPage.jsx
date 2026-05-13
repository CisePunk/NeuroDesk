import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getStudenti } from '../api/studentiApi';

function StudentiPage() {
    const navigate = useNavigate();
    const [studenti, setStudenti] = useState([]);
    const [errore, setErrore] = useState('');

    useEffect(() => {
        async function load() {
            try {
                const data = await getStudenti();
                setStudenti(data);
            } catch {
                setErrore('Errore nel caricamento degli studenti.');
            }
        }
        load();
    }, []);

    return (
        <div className="page">
            <div className="page-header">
                <h2>Studenti</h2>
                <button className="btn-primary" onClick={() => navigate('/studenti/nuovo')}>
                    + Nuovo studente
                </button>
            </div>

            {errore && <p className="errore">{errore}</p>}

            {studenti.length === 0 && !errore ? (
                <p className="empty-state">Nessuno studente ancora. Aggiungine uno.</p>
            ) : (
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
            )}
        </div>
    );
}

export default StudentiPage;
