import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, Upload, FileText, ChevronRight, Brain, Sparkles, Clock, History } from 'lucide-react';
import { quizService } from '../services/api';

export default function CreateQuiz() {
  const navigate = useNavigate();
  const [topic, setTopic] = useState('');
  const [level, setLevel] = useState('Intermediate');
  const [numQuestions, setNumQuestions] = useState(15);
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [history, setHistory] = useState([]);
  const [showLimit, setShowLimit] = useState(3);

  useEffect(() => {
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

  const startQuiz = async () => {
    let contextText = topic;
    if (file) {
      setIsUploading(true);
      try {
        const res = await quizService.upload(file);
        contextText = res.data.text;
      } catch (err) {
        alert('File upload failed');
        setIsUploading(false);
        return;
      }
      setIsUploading(false);
    }
    navigate('/quiz', { state: { topic: contextText, level, numQuestions } });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Left: Configuration */}
        <div className="flex-1 space-y-8">
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5">
              <Brain className="w-32 h-32" />
            </div>

            <div className="flex items-center space-x-3 mb-8">
              <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-100">
                <Sparkles className="text-white w-6 h-6" />
              </div>
              <div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">Generates Personalized Quizzes using AI</h2>
                <p className="text-slate-500 font-medium">Configure your personalized learning experience.</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex space-x-4">
                <button
                  onClick={() => setFile(null)}
                  className={`flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl border-2 transition-all ${!file ? 'border-indigo-600 bg-indigo-50 text-indigo-600' : 'border-slate-100 text-slate-400'}`}
                >
                  Topic Mode
                </button>
                <button
                  onClick={() => document.getElementById('file-upload').click()}
                  className={`flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl border-2 transition-all ${file ? 'border-indigo-600 bg-indigo-50 text-indigo-600' : 'border-slate-100 text-slate-400'}`}
                >
                  {file ? 'File Loaded' : 'Upload Content'}
                </button>
                <input id="file-upload" type="file" className="hidden" accept=".pdf" onChange={(e) => setFile(e.target.files[0])} />
              </div>

              {!file ? (
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Target Subject</label>
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g. Astrophysics, Medieval History..."
                    className="w-full px-6 py-4 rounded-2xl border border-slate-200 focus:ring-8 focus:ring-indigo-100 focus:border-indigo-500 transition-all font-bold text-slate-700"
                  />
                </div>
              ) : (
                <div className="p-6 bg-slate-50 border border-indigo-100 rounded-2xl flex items-center space-x-4">
                  <div className="p-2 bg-indigo-100 rounded-lg"><FileText className="text-indigo-600 w-5 h-5" /></div>
                  <span className="text-sm font-bold text-slate-700 truncate flex-1">{file.name}</span>
                  <button onClick={() => setFile(null)} className="text-rose-500 text-[10px] font-black uppercase tracking-widest hover:bg-rose-50 p-2 rounded-lg transition-colors">Discard</button>
                </div>
              )}

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Cognitive Level</label>
                  <select
                    value={level}
                    onChange={(e) => setLevel(e.target.value)}
                    className="w-full px-6 py-4 rounded-2xl border border-slate-200 focus:ring-8 focus:ring-indigo-100 focus:border-indigo-500 transition-all bg-white font-bold text-slate-700 appearance-none cursor-pointer"
                  >
                    <option>Beginner</option>
                    <option>Intermediate</option>
                    <option>Advanced</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Depth (Questions)</label>
                  <select
                    value={numQuestions}
                    onChange={(e) => setNumQuestions(Number(e.target.value))}
                    className="w-full px-6 py-4 rounded-2xl border border-slate-200 focus:ring-8 focus:ring-indigo-100 focus:border-indigo-500 transition-all bg-white font-bold text-slate-700 appearance-none cursor-pointer"
                  >
                    <option value={5}>Focused (5)</option>
                    <option value={15}>Standard (15)</option>
                    <option value={30}>Comprehensive (30)</option>
                    <option value={50}>Deep Dive (50)</option>
                  </select>
                </div>
              </div>

              <button
                onClick={startQuiz}
                disabled={(!topic && !file) || isUploading}
                className="w-full py-5 bg-indigo-600 text-white font-black rounded-2xl flex items-center justify-center space-x-3 hover:bg-indigo-700 shadow-xl shadow-indigo-200 disabled:opacity-50 transition-all group"
              >
                <span className="uppercase tracking-widest text-sm">{isUploading ? 'Preparing Matrix...' : 'Generate New Quiz'}</span>
                {!isUploading && <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-all" />}
              </button>
            </div>
          </div>
        </div>

        {/* Right: Mini History */}
        <div className="w-full md:w-96 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden h-fit">
            <div className="p-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <History className="w-4 h-4 text-slate-400" />
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-600">Quick History</h3>
              </div>
            </div>
            <div className="divide-y divide-slate-100">
              {history.slice(0, showLimit).map(h => (
                <div key={h.id} className="p-4 hover:bg-slate-50 transition-colors group">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter truncate w-32">{h.topic || "AI Lesson"}</span>
                    <span className={`text-xs font-black ${h.score >= 80 ? 'text-emerald-500' : 'text-amber-500'}`}>{Math.round(h.score)}%</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {h.attempt_strengths?.slice(0, 1).map((s, i) => (
                      <span key={i} className="text-[8px] font-bold uppercase tracking-tighter bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded border border-emerald-100/50">✓ {s}</span>
                    ))}
                    {h.attempt_weaknesses?.slice(0, 1).map((w, i) => (
                      <span key={i} className="text-[8px] font-bold uppercase tracking-tighter bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded border border-amber-100/50">⚠ {w}</span>
                    ))}
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-400">{new Date(h.created_at).toLocaleDateString()}</span>
                    <button
                      onClick={() => navigate('/review', { state: { results: h, questions: h.questions, answers: h.questions.map(q => q.user_answer) } })}
                      className="text-[10px] font-black text-indigo-600 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      Review
                    </button>
                  </div>
                </div>
              ))}
              {history.length > showLimit && (
                <button
                  onClick={() => setShowLimit(prev => prev + 5)}
                  className="w-full p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-indigo-600 transition-colors bg-slate-50/50"
                >
                  Show More
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
