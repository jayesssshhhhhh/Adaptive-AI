import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Quiz from './pages/Quiz';
import Review from './pages/Review';
import Tutor from './pages/Tutor';
import CreateQuiz from './pages/CreateQuiz';
import Pathways from './pages/Pathways';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen text-2xl font-bold text-indigo-600 animate-pulse">Loading Antigravity...</div>;
  if (!user) return <Navigate to="/login" />;
  return children;
};

import Navbar from './components/Navbar';

const AppContent = () => {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-indigo-100 flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/create" element={<ProtectedRoute><CreateQuiz /></ProtectedRoute>} />
          <Route path="/quiz" element={<ProtectedRoute><Quiz /></ProtectedRoute>} />
          <Route path="/review" element={<ProtectedRoute><Review /></ProtectedRoute>} />
          <Route path="/tutor" element={<ProtectedRoute><Tutor /></ProtectedRoute>} />
          <Route path="/pathways" element={<ProtectedRoute><Pathways /></ProtectedRoute>} />
        </Routes>
      </main>
    </div>
  );
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

export default App;
