import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createStudente } from '../api/studentiApi';

function StudentiFormPage() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        nome: '',
        cognome: '',
        email: '',
        attivo: true,
        profiloNeurodivergente: '',
        livelloEnergiaPreferito: '',
    });
    const [errore, setErrore] = useState('');
    const [caricamento, setCaricamento] = useState(false);

    function handleChange(event) {
        const { name, value, type, checked } = event.target;
        setFormData((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));
    }

    async function handleSubmit(event) {
        event.preventDefault();
        setErrore('');
        setCaricamento(true);
        try {
            await createStudente(formData);
            navigate('/studenti');
        } catch {
            setErrore('Errore nel salvataggio. Riprova.');
        } finally {
            setCaricamento(false);
        }
    }

    return (
        <div className="page">
            <div className="page-header">
                <h2>Nuovo Studente</h2>
                <button className="btn-secondary" onClick={() => navigate('/studenti')}>
                    ← Torna alla lista
                </button>
            </div>

            {errore && <p className="errore">{errore}</p>}

            <form className="form-card" onSubmit={handleSubmit}>
                <div className="form-group">
                    <label>Nome</label>
                    <input type="text" name="nome" value={formData.nome} onChange={handleChange} required />
                </div>

                <div className="form-group">
                    <label>Cognome</label>
                    <input type="text" name="cognome" value={formData.cognome} onChange={handleChange} required />
                </div>

                <div className="form-group">
                    <label>Email</label>
                    <input type="email" name="email" value={formData.email} onChange={handleChange} required />
                </div>

                <div className="form-group">
                    <label>Profilo neurodivergente</label>
                    <input
                        type="text"
                        name="profiloNeurodivergente"
                        value={formData.profiloNeurodivergente}
                        onChange={handleChange}
                        placeholder="es. ADHD, DSA, Autismo..."
                    />
                </div>

                <div className="form-group">
                    <label>Livello energia preferito</label>
                    <input
                        type="text"
                        name="livelloEnergiaPreferito"
                        value={formData.livelloEnergiaPreferito}
                        onChange={handleChange}
                        placeholder="es. mattina, pomeriggio..."
                    />
                </div>

                <div className="form-group form-group-checkbox">
                    <label>
                        <input type="checkbox" name="attivo" checked={formData.attivo} onChange={handleChange} />
                        Studente attivo
                    </label>
                </div>

                <button type="submit" className="btn-primary" disabled={caricamento}>
                    {caricamento ? 'Salvataggio...' : 'Salva studente'}
                </button>
            </form>
        </div>
    );
}

export default StudentiFormPage;
