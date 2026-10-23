import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Brain, BookOpen, Clock, TrendingUp, ChevronRight, GraduationCap, Upload, FileText, Sparkles } from 'lucide-react';
import { quizService, profileService } from '../services/api';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ topics_mastered: 0, total_time: 0, avg_score: 0 });
  const [knowledgeMap, setKnowledgeMap] = useState({});
  const [selectedTopic, setSelectedTopic] = useState('');
  const [history, setHistory] = useState([]);
  const [showLimit, setShowLimit] = useState(5);

  useEffect(() => {
    profileService.getStats().then(res => setStats(res.data));
    profileService.getKnowledgeMap().then(res => {
      setKnowledgeMap(res.data);
      const topics = Object.keys(res.data);
      if (topics.length > 0) {
        setSelectedTopic(topics[0]);
      }
    });
    quizService.getHistory().then(res => {
      // Deduplicate history items that are identical and submitted within 10 seconds of each other
      const cleanHistory = res.data.filter((item, index, self) =>
        index === self.findIndex((t) => (
          t.topic === item.topic &&
          t.score === item.score &&
          Math.abs(new Date(t.created_at) - new Date(item.created_at)) < 10000
        ))
      );
      setHistory(cleanHistory);
    });
  }, []);

  const topics = Object.keys(knowledgeMap);
  const currentData = selectedTopic ? knowledgeMap[selectedTopic] : null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-12">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">
            Welcome, {user?.full_name?.split(' ')[0] || 'Learner'}
          </h1>
          <p className="mt-2 text-lg text-slate-500 font-medium italic">"The limit does not exist when you're mastering the core."</p>
        </div>
        <div className="flex space-x-4">
          <button
            onClick={() => navigate('/create')}
            className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all flex items-center space-x-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>New Quiz</span>
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <StatCard icon={<TrendingUp className="text-emerald-600" />} label="Avg Accuracy" value={`${stats.avg_score}%`} color="bg-emerald-50" />
        <StatCard icon={<BookOpen className="text-blue-600" />} label="Topics Mastered" value={stats.topics_mastered} color="bg-blue-50" />
        <StatCard icon={<Clock className="text-purple-600" />} label="Learning Time" value={`${stats.total_time}m`} color="bg-purple-50" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-1 gap-8">
        <div className="bg-indigo-600 p-8 rounded-3xl text-white relative overflow-hidden flex flex-col justify-between shadow-xl min-h-[350px]">
          <Brain className="absolute -right-8 -top-8 w-80 h-80 text-indigo-500/30" />
          <div className="relative z-10 w-full">
            <h2 className="text-3xl font-black mb-6 flex items-center space-x-3">
              <Sparkles className="w-8 h-8 text-indigo-300" />
              <span>Adaptive Intelligence Profile</span>
            </h2>

            {topics.length > 0 ? (
              <>
                <div className="flex overflow-x-auto pb-4 mb-8 scrollbar-hide gap-3">
                  {topics.map(topic => (
                    <button
                      key={topic}
                      onClick={() => setSelectedTopic(topic)}
                      className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap border ${selectedTopic === topic
                        ? 'bg-white text-indigo-600 border-white shadow-lg'
                        : 'bg-indigo-500/30 text-indigo-100 border-indigo-400/30 hover:bg-indigo-500/50'
                        }`}
                    >
                      {topic}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 animate-in fade-in slide-in-from-bottom-2 duration-500">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-indigo-300 mb-4 border-b border-indigo-500/50 pb-2">Mastery Index (Top Strengths)</p>
                    <div className="flex flex-wrap gap-2">
                      {currentData?.strengths.length > 0 ? currentData.strengths.map(s => (
                        <span key={s} className="px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-xs font-black uppercase tracking-wider">{s}</span>
                      )) : <span className="text-sm opacity-60 italic">Keep practicing to unlock strengths</span>}
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-indigo-300 mb-4 border-b border-indigo-500/50 pb-2">Cognitive Gaps (Growth Areas)</p>
                    <div className="flex flex-wrap gap-2">
                      {currentData?.weaknesses.length > 0 ? currentData.weaknesses.map(w => (
                        <span key={w} className="px-4 py-2 bg-rose-500/20 border border-rose-500/30 rounded-xl text-xs font-black uppercase tracking-wider text-rose-100">{w}</span>
                      )) : <span className="text-sm opacity-60 italic">No cognitive gaps detected for this topic!</span>}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-xl font-bold opacity-60 mb-2">No intelligence data available yet</p>
                <p className="text-sm opacity-50">Complete your first quiz to generate your profile.</p>
              </div>
            )}
          </div>
          <div className="mt-8 flex items-center space-x-4 relative z-10">
            <div className="w-16 h-1 bg-indigo-400 rounded-full animate-pulse"></div>
            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-200">Personalized Learning Pathway Synchronized</span>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="mt-12 bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Learning Timeline</h2>
            <p className="text-slate-500 text-sm font-medium">Your evolutionary progress through the matrix.</p>
          </div>
          <div className="px-4 py-2 bg-white text-slate-600 rounded-xl text-xs font-black uppercase tracking-widest border border-slate-200 shadow-sm">
            {history.length} Lessons
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {history.length > 0 ? history.slice(0, showLimit).map((h) => (
            <div key={h.id} className="p-6 hover:bg-slate-50/50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-6 group">
              <div className="flex items-center space-x-6">
                <div className={`p-4 rounded-2xl transition-all group-hover:rotate-6 ${h.score >= 80 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors text-lg truncate w-48 md:w-auto">{h.topic || "AI Lesson"}</h4>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span className="text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-400 px-2 py-0.5 rounded">Quiz</span>
                    {h.attempt_strengths?.slice(0, 2).map((s, i) => (
                      <span key={i} className="text-[9px] font-black uppercase tracking-tighter bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded border border-emerald-100">✓ {s}</span>
                    ))}
                    {h.attempt_weaknesses?.slice(0, 1).map((w, i) => (
                      <span key={i} className="text-[9px] font-black uppercase tracking-tighter bg-amber-50 text-amber-600 px-2 py-0.5 rounded border border-amber-100">⚠ {w}</span>
                    ))}
                    <p className="text-xs text-slate-400 font-bold tracking-tight">{new Date(h.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-8">
                <div className="text-right">
                  <div className={`text-2xl font-black ${h.score >= 80 ? 'text-emerald-600' : 'text-amber-600'}`}>{Math.round(h.score)}%</div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Mastery</div>
                </div>
                <button
                  onClick={() => navigate('/review', { state: { results: h, questions: h.questions, answers: h.questions.map(q => q.user_answer) } })}
                  className="px-8 py-3 bg-white border-2 border-slate-100 text-indigo-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:border-indigo-600 hover:bg-indigo-600 hover:text-white transition-all"
                >
                  Review
                </button>
              </div>
            </div>
          )) : (
            <div className="p-24 text-center">
              <p className="text-slate-400 font-medium italic">“Knowledge is a blank slate.” — Take your first quiz!</p>
            </div>
          )}

          {history.length > showLimit && (
            <button
              onClick={() => setShowLimit(prev => prev + 5)}
              className="w-full p-6 text-xs font-black text-slate-400 uppercase tracking-widest hover:text-indigo-600 hover:bg-slate-50 transition-all"
            >
              Explore More History
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }) {
  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center space-x-4">
      <div className={`p-4 rounded-2xl ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
      </div>
    </div>
  );
}
