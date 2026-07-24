import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getStudenti, getTestMode } from '../api/studentiApi';
import { getModuli } from '../api/moduliApi';
import { getTask } from '../api/taskApi';
import { useAsyncData } from '../ui/useAsyncData';
import { IconStudenti, IconModuli, IconTask, IconPlus } from '../components/Icons';

function greeting() {
    const h = new Date().getHours();
    if (h < 12) return 'Buongiorno';
    if (h < 18) return 'Buon pomeriggio';
    return 'Buonasera';
}

// Loader stabile (a livello di modulo): carica i tre insiemi in parallelo.
const caricaDashboard = () =>
    Promise.all([getStudenti(), getModuli(), getTask()]).then(([studenti, moduli, task]) => ({
        studenti,
        moduli,
        task,
    }));

function useCountUp(target, duration = 700) {
    const [count, setCount] = useState(0);
    useEffect(() => {
        if (target === 0) return;
        const start = performance.now();
        function tick(now) {
            const p = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - p, 3);
            setCount(Math.floor(eased * target));
            if (p < 1) requestAnimationFrame(tick);
            else setCount(target);
        }
        const id = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(id);
    }, [target, duration]);
    return target === 0 ? 0 : count;
}

const STATO_LABEL = { DA_FARE: 'Da fare', IN_CORSO: 'In corso', COMPLETATO: 'Completato' };
const STATO_CLASS = { DA_FARE: 'badge-muted', IN_CORSO: 'badge-warning', COMPLETATO: 'badge-success' };

function Dashboard() {
    const { dati, caricamento, errore, ricarica } = useAsyncData(caricaDashboard);
    const data = dati ?? { studenti: [], moduli: [], task: [] };

    // Moduli e Task sono strumenti solo di test: in produzione la dashboard mostra i soli utenti.
    const [testMode, setTestMode] = useState(false);
    useEffect(() => {
        getTestMode().then(setTestMode);
    }, []);

    const nStudenti = useCountUp(data.studenti.length);
    const nModuli   = useCountUp(data.moduli.length);
    const nTask     = useCountUp(data.task.length);

    const taskCompletati = data.task.filter(t => t.stato === 'COMPLETATO').length;
    const taskPercent    = data.task.length > 0
        ? Math.round((taskCompletati / data.task.length) * 100)
        : 0;

    const recentTask = [...data.task].slice(-4).reverse();

    return (
        <div className="page">
            <div className="dashboard-hero">
                <div className="hero-content">
                    <div className="hero-left">
                        <div className="hero-eyebrow">{greeting()} — workspace attivo</div>
                        <h1>NeuroDesk</h1>
                        <p>Spazio di lavoro neurodivergent-friendly.</p>
                    </div>
                    <div className="hero-actions">
                        <div className="hero-actions-label">Aggiungi</div>
                        <div className="quick-actions">
                            <Link to="/studenti/nuovo" className="quick-action quick-action--violet">
                                <IconPlus className="qa-icon" /> Utente
                            </Link>
                            {testMode && (
                                <>
                                    <Link to="/moduli/nuovo" className="quick-action quick-action--cyan">
                                        <IconPlus className="qa-icon" /> Modulo
                                    </Link>
                                    <Link to="/task/nuovo" className="quick-action quick-action--indigo">
                                        <IconPlus className="qa-icon" /> Task
                                    </Link>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {errore ? (
                <div className="stato stato--errore" role="alert">
                    <p>{errore}</p>
                    <button type="button" className="btn-secondary" onClick={ricarica}>
                        Riprova
                    </button>
                </div>
            ) : caricamento ? (
                <p className="stato stato--attesa">Caricamento…</p>
            ) : (
                <>
                    <div className="dashboard-grid">
                        <Link to="/studenti" className="stat-card stat-card--violet">
                            <div className="stat-card-top">
                                <div className="stat-icon-wrap stat-icon--violet">
                                    <IconStudenti />
                                </div>
                                <div className="stat-number">{nStudenti}</div>
                            </div>
                            <div className="stat-label">Utenti</div>
                            <div className="stat-desc">
                                {data.studenti.length === 0
                                    ? 'Nessun utente'
                                    : `${data.studenti.filter(s => s.attivo).length} attivi`}
                            </div>
                        </Link>

                        {testMode && (<>
                        <Link to="/moduli" className="stat-card stat-card--cyan">
                            <div className="stat-card-top">
                                <div className="stat-icon-wrap stat-icon--cyan">
                                    <IconModuli />
                                </div>
                                <div className="stat-number">{nModuli}</div>
                            </div>
                            <div className="stat-label">Moduli</div>
                            <div className="stat-desc">
                                {data.moduli.length === 0
                                    ? 'Nessun modulo'
                                    : `${data.moduli.filter(m => m.stato === 'IN_CORSO').length} in corso`}
                            </div>
                        </Link>

                        <Link to="/task" className="stat-card stat-card--indigo">
                            <div className="stat-card-top">
                                <div className="stat-icon-wrap stat-icon--indigo">
                                    <IconTask />
                                </div>
                                <div className="stat-number">{nTask}</div>
                            </div>
                            <div className="stat-label">Task</div>
                            <div className="stat-desc">
                                {data.task.length === 0
                                    ? 'Nessun task'
                                    : `${taskCompletati} di ${data.task.length} completati`}
                            </div>
                            {data.task.length > 0 && (
                                <div className="stat-progress-wrap">
                                    <div className="stat-progress">
                                        <div
                                            className="stat-progress-fill stat-progress--indigo"
                                            style={{ width: `${taskPercent}%` }}
                                        />
                                    </div>
                                    <span className="stat-progress-pct">{taskPercent}%</span>
                                </div>
                            )}
                        </Link>
                        </>)}
                    </div>

                    {testMode && recentTask.length > 0 && (
                        <div className="dashboard-recent">
                            <div className="recent-header">
                                <span className="recent-title">Ultimi task</span>
                                <Link to="/task" className="recent-link">Vedi tutti →</Link>
                            </div>
                            <div className="recent-list">
                                {recentTask.map(t => (
                                    <div key={t.id} className="recent-item">
                                        <span className="recent-item-dot recent-dot--indigo" />
                                        <span className="recent-item-name">{t.titolo}</span>
                                        <span className={`badge ${STATO_CLASS[t.stato] || 'badge-muted'}`}>
                                            {STATO_LABEL[t.stato] || t.stato}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

export default Dashboard;
