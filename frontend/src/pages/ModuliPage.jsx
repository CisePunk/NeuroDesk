import { useNavigate } from 'react-router-dom';
import { getModuli } from '../api/moduliApi';
import { useAsyncData } from '../ui/useAsyncData';
import { StatoLista } from '../ui/StatoLista';

function ModuliPage() {
    const navigate = useNavigate();
    const { dati, caricamento, errore, ricarica } = useAsyncData(getModuli);
    const moduli = dati ?? [];

    return (
        <div className="page">
            <div className="page-header">
                <h2>Moduli</h2>
                <button className="btn-primary" onClick={() => navigate('/moduli/nuovo')}>
                    + Nuovo modulo
                </button>
            </div>

            <StatoLista
                caricamento={caricamento}
                errore={errore}
                vuoto={moduli.length === 0}
                messaggioVuoto="Nessun modulo ancora. Aggiungine uno."
                onRiprova={ricarica}
            >
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
            </StatoLista>
        </div>
    );
}

export default ModuliPage;
