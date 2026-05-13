import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createModulo } from '../api/moduliApi';

const STATI      = ['BOZZA', 'IN_CORSO', 'COMPLETATO'];
const DIFFICOLTA = ['BASSA', 'MEDIA', 'ALTA'];
const CARICHI    = ['BASSO', 'MEDIO', 'ALTO'];

function ModuliFormPage() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        titolo: '',
        descrizione: '',
        tecnologia: '',
        stato: 'BOZZA',
        difficolta: 'MEDIA',
        caricoCognitivo: 'MEDIO',
    });
    const [errore, setErrore] = useState('');
    const [caricamento, setCaricamento] = useState(false);

    function handleChange(e) {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setErrore('');
        setCaricamento(true);
        try {
            await createModulo(formData);
            navigate('/moduli');
        } catch {
            setErrore('Errore nel salvataggio. Riprova.');
        } finally {
            setCaricamento(false);
        }
    }

    return (
        <div className="page">
            <div className="page-header">
                <h2>Nuovo Modulo</h2>
                <button className="btn-secondary" onClick={() => navigate('/moduli')}>
                    ← Torna alla lista
                </button>
            </div>

            {errore && <p className="errore">{errore}</p>}

            <form className="form-card" onSubmit={handleSubmit}>
                <div className="form-group">
                    <label>Titolo</label>
                    <input type="text" name="titolo" value={formData.titolo} onChange={handleChange} required />
                </div>

                <div className="form-group">
                    <label>Tecnologia</label>
                    <input
                        type="text"
                        name="tecnologia"
                        value={formData.tecnologia}
                        onChange={handleChange}
                        placeholder="es. React, Spring Boot, Python..."
                        required
                    />
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label>Stato</label>
                        <select name="stato" value={formData.stato} onChange={handleChange}>
                            {STATI.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Difficoltà</label>
                        <select name="difficolta" value={formData.difficolta} onChange={handleChange}>
                            {DIFFICOLTA.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Carico cognitivo</label>
                        <select name="caricoCognitivo" value={formData.caricoCognitivo} onChange={handleChange}>
                            {CARICHI.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                </div>

                <div className="form-group">
                    <label>Descrizione</label>
                    <textarea
                        name="descrizione"
                        value={formData.descrizione}
                        onChange={handleChange}
                        rows={4}
                        placeholder="Descrizione del modulo..."
                    />
                </div>

                <button type="submit" className="btn-primary" disabled={caricamento}>
                    {caricamento ? 'Salvataggio...' : 'Salva modulo'}
                </button>
            </form>
        </div>
    );
}

export default ModuliFormPage;
