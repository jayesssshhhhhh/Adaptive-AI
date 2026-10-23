import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Brain, LayoutDashboard, MessageSquare, LogOut, User, Plus, Compass } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2 group">
              <div className="p-1.5 bg-indigo-600 rounded-lg group-hover:bg-indigo-700 transition-colors">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-black text-slate-900 tracking-tighter uppercase">AI Driven Adaptive Learning</span>
            </Link>

            <div className="hidden sm:ml-10 sm:flex sm:space-x-8">
              <Link to="/" className="flex items-center space-x-1 text-sm font-bold text-slate-600 hover:text-indigo-600 transition-colors">
                <LayoutDashboard className="w-4 h-4" />
                <span>Dashboard</span>
              </Link>
              <Link to="/tutor" className="flex items-center space-x-1 text-sm font-bold text-slate-600 hover:text-indigo-600 transition-colors">
                <MessageSquare className="w-4 h-4" />
                <span>AI Tutor Chatbot</span>
              </Link>
              <Link to="/pathways" className="flex items-center space-x-1 text-sm font-bold text-slate-600 hover:text-indigo-600 transition-colors">
                <Compass className="w-4 h-4" />
                <span>AI Learning Pathways</span>
              </Link>
              <Link to="/create" className="flex items-center space-x-1 text-sm font-bold text-slate-600 hover:text-indigo-600 transition-colors">
                <Plus className="w-4 h-4" />
                <span>New Quiz</span>
              </Link>
            </div>
          </div>

          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2 px-3 py-1.5 bg-slate-50 rounded-full border border-slate-100">
              <div className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-indigo-600" />
              </div>
              <span className="text-xs font-bold text-slate-700">{user.full_name?.split(' ')[0]}</span>
            </div>

            <button
              onClick={logout}
              className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
