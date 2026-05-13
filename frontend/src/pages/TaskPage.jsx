import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTask } from '../api/taskApi';

const PRIORITA_CLASS = {
    ALTA:  'badge-danger',
    MEDIA: 'badge-warning',
    BASSA: 'badge-muted',
};

function TaskPage() {
    const navigate = useNavigate();
    const [task, setTask] = useState([]);
    const [errore, setErrore] = useState('');

    useEffect(() => {
        async function load() {
            try {
                const data = await getTask();
                setTask(data);
            } catch {
                setErrore('Errore nel caricamento dei task.');
            }
        }
        load();
    }, []);

    return (
        <div className="page">
            <div className="page-header">
                <h2>Task Studio</h2>
                <button className="btn-primary" onClick={() => navigate('/task/nuovo')}>
                    + Nuovo task
                </button>
            </div>

            {errore && <p className="errore">{errore}</p>}

            {task.length === 0 && !errore ? (
                <p className="empty-state">Nessun task presente.</p>
            ) : (
                <div className="card-list">
                    {task.map((item, i) => (
                        <div
                            key={item.id}
                            className="card"
                            style={{ animationDelay: `${i * 55}ms` }}
                        >
                            <div className="card-title">{item.titolo}</div>
                            {item.descrizione && (
                                <div className="card-detail">{item.descrizione}</div>
                            )}
                            {(item.studenteNomeCompleto || item.moduloTitolo) && (
                                <div className="card-meta">
                                    {item.studenteNomeCompleto && (
                                        <span className="card-detail">Studente: {item.studenteNomeCompleto}</span>
                                    )}
                                    {item.moduloTitolo && (
                                        <span className="card-detail">Modulo: {item.moduloTitolo}</span>
                                    )}
                                </div>
                            )}
                            <div>
                                <span className={`badge ${PRIORITA_CLASS[item.priorita] ?? 'badge-muted'}`}>
                                    {item.priorita}
                                </span>
                                <span className={`badge ${item.stato === 'COMPLETATO' ? 'badge-success' : 'badge-muted'}`}>
                                    {item.stato}
                                </span>
                                {item.durataStimataMinuti && (
                                    <span className="badge badge-secondary">{item.durataStimataMinuti} min</span>
                                )}
                                {item.tagFocus && (
                                    <span className="badge">{item.tagFocus}</span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default TaskPage;
