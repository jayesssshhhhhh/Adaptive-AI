import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle2, XCircle, ChevronLeft, RefreshCcw, Sparkles, Clock, Target, Brain } from 'lucide-react';
import { quizService } from '../services/api';

export default function Review() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { questions, answers, results } = state || {};
  const [explanations, setExplanations] = useState({});
  const [loadingExp, setLoadingExp] = useState(null);
  const [summary, setSummary] = useState(results?.attempt_summary || "Analyzing your performance...");
  useEffect(() => {
    if (!state) {
      navigate('/');
      return;
    }
    if (results?.id && !results?.attempt_summary) {
       quizService.getSummary(results.id).then(res => setSummary(res.data.summary));
    }
  }, [results?.id, results?.attempt_summary, state, navigate]);

  if (!state) return null;

  const fetchExplanation = async (idx) => {
    if (explanations[idx]) return;
    setLoadingExp(idx);
    try {
      const q = questions[idx];
      const res = await quizService.getExplanation({
        question: q.question_text,
        user_answer: answers[idx] || "No Answer",
        correct_answer: q.correct_answer
      });
      setExplanations({ ...explanations, [idx]: res.data.explanation });
    } catch (err) {
      alert('Failed to get explanation');
    } finally {
      setLoadingExp(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      {/* Result Hero */}
      <div className="bg-indigo-600 rounded-3xl p-8 mb-12 text-white flex flex-col md:flex-row items-center justify-between shadow-2xl overflow-hidden relative">
        <Sparkles className="absolute -right-12 -bottom-12 w-64 h-64 text-white/10" />
        <div>
          <h1 className="text-4xl font-extrabold mb-2 text-center md:text-left">Quiz Summary</h1>
          <p className="text-indigo-100 text-sm md:text-base opacity-90 max-w-xl leading-relaxed mb-4">
            {summary}
          </p>
          {(results.attempt_strengths?.length > 0 || results.attempt_weaknesses?.length > 0) && (
            <div className="flex flex-wrap gap-2">
              {results.attempt_strengths?.map((s, i) => (
                <span key={i} className="px-3 py-1 bg-white/20 text-white text-[10px] font-black uppercase tracking-widest rounded-lg backdrop-blur-sm border border-white/10">✓ {s}</span>
              ))}
              {results.attempt_weaknesses?.map((w, i) => (
                <span key={i} className="px-3 py-1 bg-white/10 text-white/70 text-[10px] font-black uppercase tracking-widest rounded-lg backdrop-blur-sm border border-white/5">⚠ {w}</span>
              ))}
            </div>
          )}
        </div>
        <div className="mt-8 md:mt-0 text-center">
          <div className="text-6xl font-black mb-1">{Math.round(results.score)}%</div>
          <div className="text-sm font-bold uppercase tracking-widest text-indigo-200">Accuracy Score</div>
        </div>
      </div>

      {/* Concept Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 border-b-4 border-b-blue-500">
          <div className="flex items-center space-x-3 mb-4">
            <Clock className="text-blue-500" />
            <span className="font-bold text-slate-800">Time Taken</span>
          </div>
          <div className="text-3xl font-bold">{Math.floor(results.time_taken / 60)}m {results.time_taken % 60}s</div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-200 border-b-4 border-b-emerald-500">
          <div className="flex items-center space-x-3 mb-4">
            <Target className="text-emerald-500" />
            <span className="font-bold text-slate-800">Top Concept</span>
          </div>
          <div className="text-xl font-bold truncate">
            {Object.keys(results.concept_performance).sort((a,b) => results.concept_performance[b] - results.concept_performance[a])[0] || 'N/A'}
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-200 border-b-4 border-b-indigo-500">
          <button onClick={() => navigate('/')} className="w-full h-full flex items-center justify-center space-x-2 font-bold text-indigo-600 hover:text-indigo-800 transition-colors">
            <RefreshCcw className="w-5 h-5" />
            <span>Practice Again</span>
          </button>
        </div>
      </div>

      {/* Questions Review */}
      <h2 className="text-2xl font-bold mb-6 text-slate-900">Detailed Review</h2>
      <div className="space-y-6">
        {questions.map((q, idx) => {
          const isCorrect = answers[idx] === q.correct_answer;
          return (
            <div key={idx} className={`bg-white rounded-3xl border p-8 transition-all ${isCorrect ? 'border-emerald-100' : 'border-rose-100 shadow-sm'}`}>
              <div className="flex items-start justify-between mb-6">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-bold uppercase">{q.concept_tag}</span>
                    {isCorrect ? (
                      <span className="flex items-center space-x-1 text-emerald-600 text-xs font-bold uppercase">
                        <CheckCircle2 className="w-4 h-4" /> <span>Correct</span>
                      </span>
                    ) : (
                      <span className="flex items-center space-x-1 text-rose-600 text-xs font-bold uppercase">
                        <XCircle className="w-4 h-4" /> <span>Incorrect</span>
                      </span>
                    )}
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">{q.question_text}</h3>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 mb-6">
                {q.options.map((option, optIdx) => {
                  const isUserChoice = answers[idx] === option;
                  const isCorrectAlt = q.correct_answer === option;
                  
                  let bgColor = 'bg-slate-50 border-slate-100 text-slate-600';
                  if (isCorrectAlt) bgColor = 'bg-emerald-50 border-emerald-200 text-emerald-700 ring-2 ring-emerald-100';
                  if (isUserChoice && !isCorrectAlt) bgColor = 'bg-rose-50 border-rose-200 text-rose-700 ring-2 ring-rose-100';

                  return (
                    <div key={optIdx} className={`p-4 rounded-2xl border flex items-center justify-between ${bgColor}`}>
                      <div className="flex items-center space-x-4">
                        <div className={`w-8 h-8 flex items-center justify-center rounded-lg font-bold text-sm ${isCorrectAlt ? 'bg-emerald-600 text-white' : isUserChoice ? 'bg-rose-600 text-white' : 'bg-white border text-slate-400'}`}>
                          {String.fromCharCode(65 + optIdx)}
                        </div>
                        <span className="font-medium">{option}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        {isCorrectAlt && <span className="text-[10px] font-black uppercase tracking-tighter bg-emerald-600 text-white px-2 py-1 rounded-md">Correct</span>}
                        {isUserChoice && !isCorrectAlt && <span className="text-[10px] font-black uppercase tracking-tighter bg-rose-600 text-white px-2 py-1 rounded-md">Your Choice</span>}
                        {isUserChoice && isCorrectAlt && <span className="text-[10px] font-black uppercase tracking-tighter bg-emerald-700 text-white px-2 py-1 rounded-md">Your Choice</span>}
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={() => fetchExplanation(idx)}
                className="flex items-center space-x-2 text-indigo-600 font-bold text-sm hover:underline"
              >
                {loadingExp === idx ? (
                  <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Brain className="w-4 h-4" />
                )}
                <span>{explanations[idx] ? 'Hide AI Explanation' : 'Ask AI for Explanation'}</span>
              </button>

              {explanations[idx] && (
                <div className="mt-6 animate-in fade-in slide-in-from-top-4 duration-500">
                  <div className="bg-gradient-to-br from-indigo-50 to-white rounded-3xl border border-indigo-100 shadow-sm overflow-hidden">
                    <div className="bg-indigo-600 px-6 py-2 flex items-center space-x-2">
                       <Sparkles className="w-4 h-4 text-indigo-200" />
                       <span className="text-[10px] font-black uppercase tracking-widest text-white">AI Learning Insight</span>
                    </div>
                    <div className="p-8 space-y-6 text-slate-700 leading-relaxed">
                      {explanations[idx].split('\n\n').map((section, sIdx) => {
                        const [title, ...content] = section.split('\n');
                        return (
                          <div key={sIdx}>
                            <h4 className="text-xs font-black text-indigo-600 uppercase tracking-wider mb-2 flex items-center space-x-2">
                              <span>{title}</span>
                            </h4>
                            <div className="text-sm font-medium whitespace-pre-wrap pl-1 border-l-2 border-indigo-100/50">
                              {content.join('\n')}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="px-8 py-4 bg-indigo-50/50 border-t border-indigo-100 flex items-center justify-between text-[10px] font-bold text-indigo-400 uppercase">
                      <span>Generated by Gemini Flash</span>
                      <Brain className="w-3 h-3 opacity-50" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
