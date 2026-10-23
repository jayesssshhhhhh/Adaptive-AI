import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Brain, Send, User, Bot, Sparkles, Loader2, MessageSquare, Upload, FileText, X, Code } from 'lucide-react';
import { tutorService, quizService } from '../services/api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function Tutor() {
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fileContext, setFileContext] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [history]);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !file.name.endsWith('.pdf')) {
      alert('Please upload a PDF file.');
      return;
    }

    setIsUploading(true);
    try {
      const res = await quizService.upload(file);
      setFileContext({ name: file.name, text: res.data.text });
    } catch (err) {
      alert('Failed to extract text from PDF.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSend = async (e) => {
    if (e) e.preventDefault();
    if (!message.trim() || isLoading) return;

    const userMessage = { role: 'user', content: message };
    setHistory(prev => [...prev, userMessage]);
    setMessage('');
    setIsLoading(true);

    try {
      const res = await tutorService.chat(message, history, fileContext?.text);
      const aiResponse = { role: 'ai', content: res.data.response };
      setHistory(prev => [...prev, aiResponse]);
    } catch (err) {
      setHistory(prev => [...prev, { role: 'ai', content: "I'm having a bit of trouble connecting to my knowledge base. Let's try that again!" }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 h-[calc(100vh-80px)]">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden flex flex-col h-full">
        {/* Compact Header */}
        <div className="px-5 py-3 bg-white border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-50 rounded-xl">
              <Brain className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-800">Adaptive AI Tutor Chatbot</h1>
              <div className="flex items-center space-x-1.5">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
                <p className="text-[10px] text-slate-400 font-medium">Online</p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {fileContext && (
              <div className="flex items-center space-x-2 bg-indigo-50 px-3 py-1.5 rounded-lg">
                <FileText className="w-3.5 h-3.5 text-indigo-500" />
                <span className="text-[10px] font-semibold text-indigo-600 truncate max-w-[100px]">{fileContext.name}</span>
                <button onClick={() => setFileContext(null)} className="text-indigo-400 hover:text-rose-400 transition-colors">
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}

          </div>
        </div>

        {/* Chat Area - ChatGPT style */}
        <div className="flex-1 overflow-y-auto bg-white">
          {history.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-4">
              <div className="p-5 bg-indigo-50 rounded-2xl mb-5">
                <Brain className="w-10 h-10 text-indigo-500" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">How can I help you learn today?</h2>
              <p className="text-slate-400 text-sm max-w-md">Ask me anything — concepts, code, quiz reviews, or upload a PDF to discuss its content.</p>
              <div className="grid grid-cols-2 gap-3 mt-8 max-w-lg w-full">
                {["Explain a concept", "Review my quiz", "Help with code", "Summarize a document"].map(s => (
                  <button key={s} onClick={() => setMessage(s)} className="text-left px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-600 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 transition-all font-medium">
                    {s} →
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
              {history.map((msg, idx) => (
                <div key={idx} className={`flex gap-4 animate-in slide-in-from-bottom-2 duration-300 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role !== 'user' && (
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center mt-1">
                      <Bot className="w-4 h-4 text-indigo-600" />
                    </div>
                  )}
                  <div className={`max-w-[80%] ${msg.role === 'user' ? 'order-1' : ''}`}>
                    <div className={`rounded-2xl px-5 py-3.5 text-sm leading-relaxed ${msg.role === 'user'
                      ? 'bg-indigo-600 text-white rounded-br-sm'
                      : 'bg-slate-50 border border-slate-200 text-slate-800 rounded-bl-sm prose prose-slate max-w-none'
                      }`}>
                      {msg.role === 'user' ? (
                        <p className="m-0 whitespace-pre-wrap">{msg.content}</p>
                      ) : (
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            h3: ({ node, ...props }) => <h3 className="text-indigo-600 text-sm font-bold mt-4 mb-2" {...props} />,
                            p: ({ node, ...props }) => <p className="m-0 text-sm mb-3 last:mb-0" {...props} />,
                            code: ({ node, inline, className, children, ...props }) => {
                              return !inline ? (
                                <div className="bg-slate-900 text-slate-100 rounded-xl p-4 my-4 font-mono text-xs overflow-x-auto border-l-4 border-indigo-500 relative group">
                                  <Code className="absolute top-3 right-3 w-3.5 h-3.5 text-slate-600 opacity-50 group-hover:opacity-100 transition-opacity" />
                                  <code className={className} {...props}>{children}</code>
                                </div>
                              ) : (
                                <code className="bg-slate-100 text-indigo-600 px-1.5 py-0.5 rounded font-semibold text-[11px]" {...props}>{children}</code>
                              );
                            },
                            ul: ({ node, ...props }) => <ul className="list-disc pl-5 space-y-1 mb-3" {...props} />,
                            ol: ({ node, ...props }) => <ol className="list-decimal pl-5 space-y-1 mb-3" {...props} />,
                            li: ({ node, ...props }) => <li className="text-sm" {...props} />,
                            table: ({ node, ...props }) => <div className="overflow-x-auto my-4"><table className="text-sm w-full border-collapse" {...props} /></div>,
                            th: ({ node, ...props }) => <th className="border border-slate-300 bg-slate-100 px-3 py-2 text-left font-semibold" {...props} />,
                            td: ({ node, ...props }) => <td className="border border-slate-200 px-3 py-2" {...props} />,
                          }}
                        >
                          {msg.content}
                        </ReactMarkdown>
                      )}
                    </div>
                  </div>
                  {msg.role === 'user' && (
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center mt-1 order-2">
                      <User className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>
              ))}

              {isLoading && (
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center mt-1">
                    <Bot className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl rounded-bl-sm px-5 py-4 flex items-center space-x-2">
                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.15s]"></div>
                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.3s]"></div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area - ChatGPT style */}
        <div className="border-t border-slate-100 bg-white px-4 py-4">
          <form onSubmit={handleSend} className="max-w-3xl mx-auto">
            <div className="flex items-end gap-3 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
              <button
                type="button"
                onClick={() => fileInputRef.current.click()}
                disabled={isUploading}
                title="Upload PDF"
                className="flex-shrink-0 p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
              >
                {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
              </button>
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".pdf" />

              <textarea
                value={message}
                onChange={(e) => { setMessage(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px'; }}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e); } }}
                placeholder={fileContext ? `Ask about ${fileContext.name}...` : "Message AI Tutor..."}
                rows={1}
                className="flex-1 bg-transparent resize-none outline-none text-sm text-slate-800 placeholder:text-slate-400 py-1 max-h-40"
              />

              <button
                type="submit"
                disabled={isLoading || !message.trim()}
                className="flex-shrink-0 p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <p className="text-center text-[10px] text-slate-300 mt-2">
              AI Tutor can make mistakes. Verify important information.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
