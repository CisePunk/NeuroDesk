import { Navigate, Route, Routes } from 'react-router-dom';
import './App.css';
import { useAuth } from './auth/AuthContext';
import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';
import UtentiPage from './pages/UtentiPage';
import ModuliPage from './pages/ModuliPage';
import TaskPage from './pages/TaskPage';
import ModuliFormPage from './pages/ModuliFormPage';
import TaskFormPage from './pages/TaskFormPage';
import CompanionPage from './pages/CompanionPage';
import FeedbackPage from './pages/FeedbackPage';
import FeedbackReportPage from './pages/FeedbackReportPage';
import LoginPage from './pages/LoginPage';
import ConsentPage from './pages/ConsentPage';

function App() {
  const { isAuth, ruolo, consensoDato, caricato } = useAuth();

  // Evita il "lampo" di login mentre si recupera lo stato dal token salvato.
  if (!caricato) {
    return <div className="fullscreen-loader">Caricamento…</div>;
  }

  // Non autenticato: solo login.
  if (!isAuth) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  // Studente che non ha ancora dato il consenso: solo la schermata di consenso.
  if (ruolo === 'STUDENTE' && !consensoDato) {
    return (
      <Routes>
        <Route path="/consenso" element={<ConsentPage />} />
        <Route path="*" element={<Navigate to="/consenso" replace />} />
      </Routes>
    );
  }

  // App autenticata, con rotte diverse per ruolo.
  return (
    <MainLayout>
      <Routes>
        {ruolo === 'SCUOLA' ? (
          <>
            <Route path="/" element={<Dashboard />} />
            <Route path="/utenti" element={<UtentiPage />} />
            <Route path="/moduli" element={<ModuliPage />} />
            <Route path="/moduli/nuovo" element={<ModuliFormPage />} />
            <Route path="/task" element={<TaskPage />} />
            <Route path="/task/nuovo" element={<TaskFormPage />} />
            <Route path="/companion" element={<CompanionPage />} />
            <Route path="/feedback" element={<FeedbackReportPage />} />
          </>
        ) : (
          <>
            <Route path="/" element={<Navigate to="/companion" replace />} />
            <Route path="/companion" element={<CompanionPage />} />
            <Route path="/feedback" element={<FeedbackPage />} />
          </>
        )}
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </MainLayout>
  );
}

export default App;
