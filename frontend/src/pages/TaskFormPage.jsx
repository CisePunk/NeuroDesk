import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createTask } from '../api/taskApi';
import { getStudenti } from '../api/studentiApi';
import { getModuli } from '../api/moduliApi';

const PRIORITA = ['ALTA', 'MEDIA', 'BASSA'];
const STATI    = ['DA_FARE', 'IN_CORSO', 'COMPLETATO'];

function TaskFormPage() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        titolo: '',
        descrizione: '',
        priorita: 'MEDIA',
        stato: 'DA_FARE',
        durataStimataMinuti: '',
        tagFocus: '',
        finestraEnergia: '',
        studenteId: '',
        moduloId: '',
    });
    const [studenti, setStudenti] = useState([]);
    const [moduli, setModuli]     = useState([]);
    const [errore, setErrore]     = useState('');
    const [caricamento, setCaricamento] = useState(false);

    useEffect(() => {
        async function loadOpzioni() {
            try {
                const [s, m] = await Promise.all([getStudenti(), getModuli()]);
                setStudenti(s);
                setModuli(m);
                if (s.length > 0) setFormData(prev => ({ ...prev, studenteId: s[0].id }));
                if (m.length > 0) setFormData(prev => ({ ...prev, moduloId: m[0].id }));
            } catch {
                setErrore('Impossibile caricare studenti o moduli. Verifica che il backend sia attivo.');
            }
        }
        loadOpzioni();
    }, []);

    function handleChange(e) {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setErrore('');
        setCaricamento(true);
        try {
            await createTask({
                ...formData,
                studenteId: Number(formData.studenteId),
                moduloId: Number(formData.moduloId),
                durataStimataMinuti: formData.durataStimataMinuti ? Number(formData.durataStimataMinuti) : null,
            });
            navigate('/task');
        } catch {
            setErrore('Errore nel salvataggio. Riprova.');
        } finally {
            setCaricamento(false);
        }
    }

    return (
        <div className="page">
            <div className="page-header">
                <h2>Nuovo Task</h2>
                <button className="btn-secondary" onClick={() => navigate('/task')}>
                    ← Torna alla lista
                </button>
            </div>

            {errore && <p className="errore">{errore}</p>}

            <form className="form-card" onSubmit={handleSubmit}>
                <div className="form-group">
                    <label>Titolo</label>
                    <input type="text" name="titolo" value={formData.titolo} onChange={handleChange} required />
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label>Priorità</label>
                        <select name="priorita" value={formData.priorita} onChange={handleChange}>
                            {PRIORITA.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Stato</label>
                        <select name="stato" value={formData.stato} onChange={handleChange}>
                            {STATI.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Durata stimata (min)</label>
                        <input
                            type="number"
                            name="durataStimataMinuti"
                            value={formData.durataStimataMinuti}
                            onChange={handleChange}
                            min="1"
                            placeholder="es. 30"
                        />
                    </div>
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label>Studente</label>
                        <select name="studenteId" value={formData.studenteId} onChange={handleChange} required>
                            {studenti.length === 0
                                ? <option value="">Caricamento...</option>
                                : studenti.map(s => (
                                    <option key={s.id} value={s.id}>{s.nome} {s.cognome}</option>
                                ))
                            }
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Modulo</label>
                        <select name="moduloId" value={formData.moduloId} onChange={handleChange} required>
                            {moduli.length === 0
                                ? <option value="">Caricamento...</option>
                                : moduli.map(m => (
                                    <option key={m.id} value={m.id}>{m.titolo}</option>
                                ))
                            }
                        </select>
                    </div>
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label>Tag focus</label>
                        <input
                            type="text"
                            name="tagFocus"
                            value={formData.tagFocus}
                            onChange={handleChange}
                            placeholder="es. concentrazione, lettura..."
                        />
                    </div>
                    <div className="form-group">
                        <label>Finestra energia</label>
                        <input
                            type="text"
                            name="finestraEnergia"
                            value={formData.finestraEnergia}
                            onChange={handleChange}
                            placeholder="es. mattina, dopo pausa..."
                        />
                    </div>
                </div>

                <div className="form-group">
                    <label>Descrizione</label>
                    <textarea
                        name="descrizione"
                        value={formData.descrizione}
                        onChange={handleChange}
                        rows={3}
                        placeholder="Dettagli del task..."
                    />
                </div>

                <button type="submit" className="btn-primary" disabled={caricamento || !formData.studenteId || !formData.moduloId}>
                    {caricamento ? 'Salvataggio...' : 'Salva task'}
                </button>
            </form>
        </div>
    );
}

export default TaskFormPage;
