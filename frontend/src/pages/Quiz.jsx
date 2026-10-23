import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { quizService } from '../services/api';
import { Timer, ChevronLeft, ChevronRight, Send, AlertCircle, Clock } from 'lucide-react';

export default function Quiz() {
  const location = useLocation();
  const navigate = useNavigate();
  const { topic, level, numQuestions } = location.state || {};

  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timePerQuestion, setTimePerQuestion] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [timeLeft, setTimeLeft] = useState(numQuestions * 60); // 1 min per question

  const questionStartTime = useRef(Date.now());

  useEffect(() => {
    if (!topic) navigate('/');
    fetchQuiz();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchQuiz = async () => {
    try {
      const response = await quizService.generate({
        topic, proficiency: level, num_questions: numQuestions
      });
      setQuestions(response.data);
      setLoading(false);
      setStartTime(Date.now());
      questionStartTime.current = Date.now();
    } catch (err) {
      alert('Failed to generate quiz');
      navigate('/');
    }
  };

  const handleNext = () => {
    // Record time for current question
    const duration = Math.round((Date.now() - questionStartTime.current) / 1000);
    setTimePerQuestion(prev => ({ ...prev, [currentIndex]: duration }));

    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      questionStartTime.current = Date.now();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      questionStartTime.current = Date.now();
    }
  };

  const handleSubmit = async () => {
    // Record final question time
    const duration = Math.round((Date.now() - questionStartTime.current) / 1000);
    const finalTimes = { ...timePerQuestion, [currentIndex]: duration };

    const score = questions.reduce((acc, q, idx) => {
      return acc + (answers[idx] === q.correct_answer ? 1 : 0);
    }, 0);

    const conceptPerformance = {};
    questions.forEach((q, idx) => {
      if (!conceptPerformance[q.concept_tag]) conceptPerformance[q.concept_tag] = { correct: 0, total: 0 };
      conceptPerformance[q.concept_tag].total += 1;
      if (answers[idx] === q.correct_answer) conceptPerformance[q.concept_tag].correct += 1;
    });

    const formattedPerformance = {};
    for (const tag in conceptPerformance) {
      formattedPerformance[tag] = conceptPerformance[tag].correct / conceptPerformance[tag].total;
    }

    const answersArray = questions.map((_, i) => answers[i] || null);
    const payload = {
      score: (score / questions.length) * 100,
      total_questions: questions.length,
      time_taken: Math.round((Date.now() - startTime) / 1000),
      concept_performance: formattedPerformance,
      behavioral_insights: "Completed",
      questions: questions,
      answers: answersArray,
      topic: topic || "AI Generated Lesson"
    };

    if (submitting) return;
    setSubmitting(true);

    try {
      const res = await quizService.submit(payload);
      navigate('/review', { state: { questions, answers: answersArray, results: { ...payload, id: res.data.id } } });
    } catch (err) {
      alert('Submission failed');
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
      <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
      <p className="text-xl font-bold text-slate-800">Gemini is curating your personalized quiz...</p>
    </div>
  );

  const currentQuestion = questions[currentIndex];

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Progress Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center space-x-4">
            <span className="text-sm font-bold bg-white px-4 py-2 rounded-xl border shadow-sm">
              Question {currentIndex + 1} of {questions.length}
            </span>
            <div className={`flex items-center space-x-2 px-4 py-2 rounded-xl border shadow-sm bg-white ${timeLeft < 60 ? 'text-rose-600 border-rose-100' : 'text-slate-600'}`}>
              <Clock className="w-4 h-4" />
              <span className="font-mono font-bold">
                {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
              </span>
            </div>
          </div>
          <button 
            onClick={handleSubmit} 
            disabled={submitting}
            className="px-6 py-2 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors disabled:opacity-50 flex items-center space-x-2"
          >
            {submitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Submitting...</span>
              </>
            ) : (
              <span>Finish Quiz</span>
            )}
          </button>
        </div>

        {/* Queston Card */}
        <div className="bg-white p-8 md:p-12 rounded-3xl shadow-xl border border-slate-100 mb-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-2 h-full bg-indigo-600"></div>
          <span className="inline-block px-3 py-1 mb-6 text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 rounded-full">
            {currentQuestion.concept_tag}
          </span>
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 leading-snug mb-8">
            {currentQuestion.question_text}
          </h2>

          <div className="grid grid-cols-1 gap-4">
            {currentQuestion.options.map((option, idx) => (
              <button
                key={idx}
                onClick={() => setAnswers({ ...answers, [currentIndex]: option })}
                className={`p-5 text-left rounded-2xl border-2 transition-all font-medium ${answers[currentIndex] === option
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700 ring-4 ring-indigo-50'
                    : 'border-slate-100 hover:border-slate-300 bg-slate-50 text-slate-700'
                  }`}
              >
                <div className="flex items-center space-x-4">
                  <div className={`w-8 h-8 flex items-center justify-center rounded-lg font-bold ${answers[currentIndex] === option ? 'bg-indigo-600 text-white' : 'bg-white border text-slate-400'
                    }`}>
                    {String.fromCharCode(65 + idx)}
                  </div>
                  <span>{option}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <button
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="flex items-center space-x-2 px-6 py-3 font-bold text-slate-600 disabled:opacity-30"
          >
            <ChevronLeft className="w-5 h-5" />
            <span>Previous</span>
          </button>

          <div className="flex space-x-1">
            {questions.map((_, i) => (
              <div key={i} className={`w-2 h-2 rounded-full ${i === currentIndex ? 'bg-indigo-600 w-6' : answers[i] ? 'bg-indigo-300' : 'bg-slate-200'} transition-all`} />
            ))}
          </div>

          <button
            onClick={handleNext}
            disabled={currentIndex === questions.length - 1}
            className="flex items-center space-x-2 px-6 py-3 font-bold text-indigo-600 disabled:opacity-30"
          >
            <span>Next</span>
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
