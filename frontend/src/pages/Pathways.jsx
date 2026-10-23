import { useState, useEffect } from 'react';
import { profileService } from '../services/api';
import { BookOpen, Clock, Brain, Compass, Sparkles, AlertCircle, Loader2, History, ChevronDown, Search, Layers } from 'lucide-react';

const parseInline = (text) => {
  if (!text) return null;
  const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);

  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="text-slate-900 font-bold">{part.slice(2, -2)}</strong>;
    } else if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={i} className="font-mono text-sm px-1.5 py-0.5 bg-slate-100 text-rose-600 rounded-md border border-slate-200">{part.slice(1, -1)}</code>;
    }
    return part;
  });
};

const renderStructuredContent = (text) => {
  if (!text) return null;

  const lines = text.split('\n');
  let inCodeBlock = false;
  let codeContent = '';
  let codeLang = '';
  const elements = [];

  const mainSections = [
    'TITLE', 'INTRODUCTION', 'CORE CONCEPTS', 'EXAMPLES', 'KEY TAKEAWAYS', 'OPTIONAL PRACTICE QUESTION', 'PRACTICE QUESTION', 'PRACTICE QUESTIONS', 'SUMMARY'
  ];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    let cleanLine = line.replace(/^\s*[#*]+\s*/, '').trim();
    const trimmed = line.trim();

    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        elements.push(
          <div key={`code-${i}`} className="my-8 rounded-3xl overflow-hidden bg-slate-900 shadow-2xl shadow-slate-900/20 border border-slate-800">
            <div className="bg-slate-800/80 px-5 py-3.5 flex items-center justify-between border-b border-slate-700/50">
              <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest">{codeLang || 'Snippet'}</span>
              <div className="flex space-x-2">
                <div className="w-3 h-3 rounded-full bg-rose-500/80"></div>
                <div className="w-3 h-3 rounded-full bg-amber-500/80"></div>
                <div className="w-3 h-3 rounded-full bg-emerald-500/80"></div>
              </div>
            </div>
            <div className="p-5 overflow-x-auto bg-slate-900/50">
              <pre className="text-sm font-mono text-emerald-400/90 whitespace-pre">
                <code>{codeContent.trimEnd()}</code>
              </pre>
            </div>
          </div>
        );
        inCodeBlock = false;
        codeContent = '';
        codeLang = '';
      } else {
        inCodeBlock = true;
        codeLang = trimmed.replace(/`/g, '').trim();
      }
      continue;
    }

    if (inCodeBlock) {
      codeContent += line + '\n';
      continue;
    }

    if (!cleanLine) continue;

    const upperTrimmed = cleanLine.toUpperCase().replace(/[:*#]/g, '').trim();

    if (upperTrimmed === 'TITLE' || upperTrimmed.startsWith('TITLE:')) {
      const actualTitle = cleanLine.replace(/^title:?\s*/i, '').trim() || (lines[i + 1] ? lines[i + 1].trim() : 'Study Guide');
      elements.push(
        <div key={`title-${i}`} className="mb-10 p-8 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-[2rem] text-white shadow-xl shadow-indigo-200/50 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
          <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-200 mb-3 flex items-center space-x-2">
            <Sparkles className="w-3 h-3" />
            <span>Lesson Focus</span>
          </h3>
          <h2 className="text-3xl font-black tracking-tight leading-tight relative z-10">{actualTitle.replace(/[*#]/g, '')}</h2>
        </div>
      );
      if (!cleanLine.toLowerCase().includes(actualTitle.toLowerCase()) && lines[i + 1]) {
        lines[i + 1] = '';
      }
      continue;
    }

    if (mainSections.includes(upperTrimmed)) {
      elements.push(
        <h2 key={`h2-${i}`} className="text-2xl font-black text-slate-900 mt-14 mb-6 pb-4 border-b-2 border-slate-100 flex items-center tracking-tight">
          {cleanLine.replace(/[:*#]/g, '')}
        </h2>
      );
      continue;
    }

    const isSubHeading = cleanLine.length > 2 && cleanLine.length < 50 &&
      !['.', '?', '!', ',', ';', ')'].includes(cleanLine.slice(-1)) &&
      cleanLine.split(' ').length <= 6 &&
      cleanLine[0] === cleanLine[0].toUpperCase() &&
      !cleanLine.match(/^\d/);

    if (isSubHeading) {
      elements.push(
        <h3 key={`h3-${i}`} className="text-xl font-bold text-indigo-600 mt-10 mb-4 tracking-tight flex items-center space-x-2">
          <span>{cleanLine}</span>
        </h3>
      );
      continue;
    }

    const isBullet = cleanLine.match(/^[-•*]\s+/) || cleanLine.match(/^\d+[.)]\s+/);

    if (isBullet) {
      const content = cleanLine.replace(/^[-•*\d.)]+\s*/, '');
      const colonSplit = content.split(':');

      let titlePart = null;
      let itemContent = content;

      if (colonSplit.length > 1 && colonSplit[0].split(' ').length <= 5) {
        titlePart = colonSplit[0] + ':';
        itemContent = colonSplit.slice(1).join(':').trim();
      }

      elements.push(
        <div key={`li-${i}`} className="flex items-start space-x-4 my-4 group bg-slate-50 border border-slate-100 p-5 rounded-2xl hover:border-indigo-200 hover:shadow-md hover:shadow-indigo-50/50 transition-all">
          <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 mt-2 flex-shrink-0 group-hover:scale-125 transition-transform shadow-sm"></div>
          <p className="text-slate-600 leading-relaxed font-medium">
            {titlePart && <strong className="text-slate-900 font-bold mr-1.5">{parseInline(titlePart)}</strong>}
            {parseInline(itemContent)}
          </p>
        </div>
      );
    } else {
      const isMath = cleanLine.includes('=') && cleanLine.length < 40 && !cleanLine.match(/[a-zA-Z]{5,}/);

      if (isMath) {
        elements.push(
          <div key={`math-${i}`} className="my-6 py-5 px-6 bg-slate-50 border border-slate-200 rounded-2xl flex justify-center items-center shadow-inner">
            <span className="font-mono text-xl font-bold text-indigo-700 tracking-wider bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-100">{cleanLine}</span>
          </div>
        );
      } else {
        elements.push(
          <p key={`p-${i}`} className="text-slate-600 leading-relaxed font-medium mb-6 text-lg">
            {parseInline(cleanLine)}
          </p>
        );
      }
    }
  }

  return <div className="animate-in fade-in duration-500">{elements}</div>;
};

export default function Pathways() {
  const [knowledgeMap, setKnowledgeMap] = useState({});
  const [selectedTopic, setSelectedTopic] = useState('');
  const [selectedWeakness, setSelectedWeakness] = useState('');
  const [duration, setDuration] = useState(10);

  const [isLoading, setIsLoading] = useState(false);
  const [content, setContent] = useState('');
  const [error, setError] = useState('');

  // Explore mode
  const [mode, setMode] = useState('adaptive');
  const [customTopic, setCustomTopic] = useState('');

  // History
  const [history, setHistory] = useState([]);
  const [historyOffset, setHistoryOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Track what the viewer is showing
  const [viewerMeta, setViewerMeta] = useState({ topic: '', subtopic: '', duration: 0, mode: 'adaptive' });

  const HISTORY_LIMIT = 3;

  useEffect(() => {
    profileService.getKnowledgeMap().then(res => {
      const data = res.data;
      setKnowledgeMap(data);
      const topics = Object.keys(data);
      if (topics.length > 0) {
        setSelectedTopic(topics[0]);
        const weaknesses = data[topics[0]].weaknesses;
        if (weaknesses && weaknesses.length > 0) {
          setSelectedWeakness(weaknesses[0]);
        }
      }
    }).catch(() => {
      console.error("Failed to load knowledge map");
    });

    loadHistory(0, true);
  }, []);

  useEffect(() => {
    if (selectedTopic && knowledgeMap[selectedTopic]) {
      const weaknesses = knowledgeMap[selectedTopic].weaknesses;
      if (weaknesses && weaknesses.length > 0) {
        setSelectedWeakness(weaknesses[0]);
      } else {
        setSelectedWeakness('');
      }
    }
  }, [selectedTopic, knowledgeMap]);

  const loadHistory = async (offset = 0, replace = false) => {
    setHistoryLoading(true);
    try {
      const res = await profileService.getStudyHistory(HISTORY_LIMIT + 1, offset);
      const items = res.data;
      const more = items.length > HISTORY_LIMIT;
      const sliced = items.slice(0, HISTORY_LIMIT);
      if (replace) {
        setHistory(sliced);
      } else {
        setHistory(prev => [...prev, ...sliced]);
      }
      setHasMore(more);
      setHistoryOffset(offset + sliced.length);
    } catch {
      console.error("Failed to load study history");
    } finally {
      setHistoryLoading(false);
    }
  };

  const topics = Object.keys(knowledgeMap);
  const currentWeaknesses = selectedTopic && knowledgeMap[selectedTopic] ? knowledgeMap[selectedTopic].weaknesses : [];

  const handleGenerate = async () => {
    if (mode === 'adaptive' && (!selectedTopic || !selectedWeakness)) return;
    if (mode === 'explore' && !customTopic.trim()) return;

    setIsLoading(true);
    setContent('');
    setError('');

    const payload = mode === 'explore'
      ? { topic: customTopic.trim(), subtopic: '', duration, mode: 'explore' }
      : { topic: selectedTopic, subtopic: selectedWeakness, duration, mode: 'adaptive' };

    setViewerMeta({
      topic: payload.topic,
      subtopic: payload.subtopic,
      duration: payload.duration,
      mode
    });

    try {
      const res = await profileService.generateStudyMaterial(payload);
      setContent(res.data.content);
      loadHistory(0, true);
    } catch {
      setError('The AI Generator is currently unavailable. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  const viewHistoryItem = (item) => {
    setContent(item.content);
    setViewerMeta({
      topic: item.topic,
      subtopic: item.subtopic || '',
      duration: item.duration,
      mode: item.mode
    });
    setTimeout(() => {
      document.getElementById('content-viewer')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-10 text-center">
        <div className="inline-flex items-center justify-center p-4 bg-indigo-50 rounded-2xl mb-4">
          <Compass className="w-8 h-8 text-indigo-600" />
        </div>
        <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2">AI Driven Adaptive Learning Pathways</h1>
        <p className="text-slate-500 font-medium max-w-xl mx-auto">
          Generate perfectly tailored, distraction-free study guides designed to bridge your specific cognitive gaps.
        </p>
      </div>

      {/* Two-column: Controls left, History right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">

        {/* Left: Generator Controls (2/3 width) */}
        <div className="lg:col-span-2">
          <div className="bg-white p-8 rounded-3xl shadow-xl shadow-indigo-100/40 border border-slate-200 relative overflow-hidden h-full">
            <Sparkles className="absolute -right-8 -top-8 w-40 h-40 text-indigo-50 opacity-50" />
            <div className="relative z-10 space-y-8">

              {/* Mode Toggle */}
              <div className="flex items-center justify-center">
                <div className="bg-slate-100 p-1.5 rounded-2xl flex items-center space-x-1">
                  <button
                    onClick={() => setMode('adaptive')}
                    className={`flex items-center space-x-2 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                      mode === 'adaptive'
                        ? 'bg-white text-indigo-600 shadow-lg shadow-indigo-100'
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Adaptive</span>
                  </button>
                  <button
                    onClick={() => setMode('explore')}
                    className={`flex items-center space-x-2 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                      mode === 'explore'
                        ? 'bg-white text-indigo-600 shadow-lg shadow-indigo-100'
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>Explore New Topic</span>
                  </button>
                </div>
              </div>

              {/* Adaptive Mode Inputs */}
              {mode === 'adaptive' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-300">
                  <div>
                    <label className="flex items-center space-x-2 text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">
                      <BookOpen className="w-3 h-3" />
                      <span>Target Subject</span>
                    </label>
                    <select
                      value={selectedTopic}
                      onChange={(e) => setSelectedTopic(e.target.value)}
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-700 font-bold focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all appearance-none cursor-pointer"
                      disabled={topics.length === 0}
                    >
                      {topics.length === 0 && <option>No active subjects...</option>}
                      {topics.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="flex items-center space-x-2 text-[10px] font-black uppercase tracking-widest text-rose-400 mb-3">
                      <Brain className="w-3 h-3" />
                      <span>Target Cognitive Gap</span>
                    </label>
                    <select
                      value={selectedWeakness}
                      onChange={(e) => setSelectedWeakness(e.target.value)}
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-700 font-bold focus:ring-4 focus:ring-rose-100 focus:border-rose-500 transition-all appearance-none cursor-pointer"
                      disabled={currentWeaknesses.length === 0}
                    >
                      {currentWeaknesses.length === 0 && <option>No weaknesses found!</option>}
                      {currentWeaknesses.map(w => <option key={w} value={w}>{w}</option>)}
                    </select>
                  </div>
                </div>
              )}

              {/* Explore Mode Input */}
              {mode === 'explore' && (
                <div className="animate-in fade-in duration-300">
                  <label className="flex items-center space-x-2 text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">
                    <Search className="w-3 h-3" />
                    <span>Enter a Topic to Explore</span>
                  </label>
                  <input
                    type="text"
                    value={customTopic}
                    onChange={(e) => setCustomTopic(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                    placeholder="e.g. Photosynthesis, React Hooks, Quantum Physics, Calculus..."
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-700 font-bold focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all placeholder:text-slate-300 placeholder:font-medium"
                  />
                </div>
              )}

              {/* Duration Selector */}
              <div>
                <label className="flex items-center space-x-2 text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">
                  <Clock className="w-3 h-3" />
                  <span>Study Duration</span>
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[5, 10, 15].map(time => (
                    <button
                      key={time}
                      onClick={() => setDuration(time)}
                      className={`py-3 px-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${duration === time
                          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                          : 'bg-white border-2 border-slate-100 text-slate-400 hover:border-indigo-200 hover:text-indigo-600'
                        }`}
                    >
                      {time} Min{time > 5 ? 's' : ''}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleGenerate}
                disabled={
                  (mode === 'adaptive' && (!selectedTopic || !selectedWeakness)) ||
                  (mode === 'explore' && !customTopic.trim()) ||
                  isLoading
                }
                className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-slate-800 transition-all shadow-lg flex items-center justify-center space-x-3 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Generating Intelligence...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    <span>{mode === 'explore' ? 'Explore Topic' : 'Generate Study Guide'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right: Study History Sidebar (1/3 width) */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-3xl shadow-xl shadow-indigo-100/40 border border-slate-200 overflow-hidden h-full flex flex-col">
            {/* History Header */}
            <div className="p-5 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-indigo-50 rounded-xl">
                  <History className="w-4 h-4 text-indigo-600" />
                </div>
                <h2 className="text-sm font-black text-slate-900 tracking-tight uppercase">Study History</h2>
              </div>
            </div>

            {/* History List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5" style={{ maxHeight: '420px' }}>
              {history.length === 0 && !historyLoading && (
                <div className="text-center py-10 px-4">
                  <div className="inline-flex items-center justify-center p-3 bg-slate-100 rounded-2xl mb-3">
                    <BookOpen className="w-5 h-5 text-slate-400" />
                  </div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No guides yet</p>
                  <p className="text-[11px] text-slate-400 mt-1">Generate your first study guide to see it here.</p>
                </div>
              )}

              {history.map((item) => (
                <button
                  key={item.id}
                  onClick={() => viewHistoryItem(item)}
                  className="w-full text-left p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-indigo-300 hover:bg-indigo-50/30 hover:shadow-md hover:shadow-indigo-50/50 transition-all group"
                >
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-md text-[8px] font-black uppercase tracking-widest">
                      {item.mode === 'explore' ? 'Explore' : 'Adaptive'}
                    </span>
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md text-[8px] font-black uppercase tracking-widest">
                      {item.duration} min
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-800 truncate group-hover:text-indigo-600 transition-colors leading-snug">
                    {item.topic}
                  </h3>
                  {item.subtopic && (
                    <p className="text-[11px] text-slate-400 font-medium truncate mt-0.5">{item.subtopic}</p>
                  )}
                  <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mt-2">{formatDate(item.created_at)}</p>
                </button>
              ))}
            </div>

            {/* Show More */}
            {hasMore && (
              <div className="p-4 border-t border-slate-100">
                <button
                  onClick={() => loadHistory(historyOffset, false)}
                  disabled={historyLoading}
                  className="w-full py-3 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-xs font-bold text-slate-400 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  {historyLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <>
                      <ChevronDown className="w-3.5 h-3.5" />
                      <span>Show More</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Results / Content Viewer */}
      {error && (
        <div className="p-6 bg-rose-50 border-2 border-rose-100 rounded-2xl flex items-start space-x-3 text-rose-600 mb-8">
          <AlertCircle className="w-6 h-6 flex-shrink-0" />
          <p className="font-bold">{error}</p>
        </div>
      )}

      {content && (
        <div id="content-viewer" className="bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden transform transition-all animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="p-8 md:p-12">
            <div className="mb-8 pb-8 border-b border-slate-100">
              <div className="flex items-center space-x-2 mb-2">
                <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-black uppercase tracking-widest">
                  {viewerMeta.mode === 'explore' ? 'Explore' : viewerMeta.duration + ' Min Guide'}
                </span>
                <span className="px-3 py-1 bg-slate-100 text-slate-500 rounded-lg text-[10px] font-black uppercase tracking-widest">
                  {viewerMeta.topic}
                </span>
              </div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-tight">
                {viewerMeta.mode === 'explore' ? (
                  <>Exploring <span className="text-indigo-600">{viewerMeta.topic}</span></>
                ) : (
                  <>Mastering <span className="text-indigo-600">{viewerMeta.subtopic || viewerMeta.topic}</span></>
                )}
              </h2>
            </div>

            <div className="max-w-none">
              {renderStructuredContent(content)}
            </div>
          </div>
          <div className="bg-slate-50 p-6 flex justify-between items-center border-t border-slate-100">
            <p className="text-xs font-bold text-slate-400 tracking-wide uppercase">End of Lesson</p>
            <button onClick={() => setContent('')} className="text-xs font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-800 transition-colors">
              Close Guide
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
