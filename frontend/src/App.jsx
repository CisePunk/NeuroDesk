import { Routes, Route } from 'react-router-dom';
import './App.css';
import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';
import StudentiPage from './pages/StudentiPage';
import ModuliPage from './pages/ModuliPage';
import TaskPage from './pages/TaskPage';
import StudentiFormPage from './pages/StudentiFormPage';
import ModuliFormPage from './pages/ModuliFormPage';
import TaskFormPage from './pages/TaskFormPage';

function App() {
  return (
    <MainLayout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/studenti" element={<StudentiPage />} />
        <Route path="/studenti/nuovo" element={<StudentiFormPage />} />
        <Route path="/moduli" element={<ModuliPage />} />
        <Route path="/moduli/nuovo" element={<ModuliFormPage />} />
        <Route path="/task" element={<TaskPage />} />
        <Route path="/task/nuovo" element={<TaskFormPage />} />
      </Routes>
    </MainLayout>
  );
}

export default App;
