import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getModuli } from '../api/moduliApi';

function ModuliPage() {
    const navigate = useNavigate();
    const [moduli, setModuli] = useState([]);
    const [errore, setErrore] = useState('');

    useEffect(() => {
        async function load() {
            try {
                const data = await getModuli();
                setModuli(data);
            } catch {
                setErrore('Errore nel caricamento dei moduli.');
            }
        }
        load();
    }, []);

    return (
        <div className="page">
            <div className="page-header">
                <h2>Moduli</h2>
                <button className="btn-primary" onClick={() => navigate('/moduli/nuovo')}>
                    + Nuovo modulo
                </button>
            </div>

            {errore && <p className="errore">{errore}</p>}

            {moduli.length === 0 && !errore ? (
                <p className="empty-state">Nessun modulo presente.</p>
            ) : (
                <div className="card-list">
                    {moduli.map((modulo, i) => (
                        <div
                            key={modulo.id}
                            className="card"
                            style={{ animationDelay: `${i * 55}ms` }}
                        >
                            <div className="card-title">{modulo.titolo}</div>
                            {modulo.descrizione && (
                                <div className="card-detail">{modulo.descrizione}</div>
                            )}
                            <div>
                                <span className="badge">{modulo.tecnologia}</span>
                                <span className="badge badge-secondary">{modulo.difficolta}</span>
                                <span className={`badge ${modulo.stato === 'COMPLETATO' ? 'badge-success' : 'badge-muted'}`}>
                                    {modulo.stato}
                                </span>
                                {modulo.caricoCognitivo && (
                                    <span className="badge badge-warning">{modulo.caricoCognitivo}</span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default ModuliPage;
