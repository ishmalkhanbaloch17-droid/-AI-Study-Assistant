import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, 
  BookOpen, 
  Layers, 
  CreditCard, 
  HelpCircle, 
  Presentation,
  Upload,
  Loader2,
  ChevronRight,
  Menu,
  X,
  RefreshCw
} from 'lucide-react';
import { extractTextFromFile } from './services/documentService';
import * as ai from './services/geminiService';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import pptxgen from 'pptxgenjs';

type View = 'upload' | 'summary' | 'topics' | 'flashcards' | 'quiz' | 'slides';

export default function App() {
  const [view, setView] = useState<View>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Data states
  const [summary, setSummary] = useState<string>('');
  const [topics, setTopics] = useState<string[]>([]);
  const [flashcards, setFlashcards] = useState<any[]>([]);
  const [quiz, setQuiz] = useState<any[]>([]);
  const [slides, setSlides] = useState<any[]>([]);

  const resetData = () => {
    setSummary('');
    setTopics([]);
    setFlashcards([]);
    setQuiz([]);
    setSlides([]);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    setLoading(true);
    resetData();
    setFile(uploadedFile);
    try {
      const extractedText = await extractTextFromFile(uploadedFile);
      setText(extractedText);
      
      // Pre-fetch basic data
      const [sum, top] = await Promise.all([
        ai.generateSummary(extractedText),
        ai.extractTopics(extractedText)
      ]);
      
      setSummary(sum || '');
      setTopics(top);
      setView('summary');
    } catch (error) {
      console.error(error);
      alert('Error processing file. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchViewData = async (targetView: View, force = false) => {
    if (!text) return;
    
    if (targetView === 'summary' && (summary === '' || force)) {
      setLoading(true);
      const data = await ai.generateSummary(text);
      setSummary(data || '');
      setLoading(false);
    } else if (targetView === 'topics' && (topics.length === 0 || force)) {
      setLoading(true);
      const data = await ai.extractTopics(text);
      setTopics(data);
      setLoading(false);
    } else if (targetView === 'flashcards' && (flashcards.length === 0 || force)) {
      setLoading(true);
      const data = await ai.generateFlashcards(text);
      setFlashcards(data);
      setLoading(false);
    } else if (targetView === 'quiz' && (quiz.length === 0 || force)) {
      setLoading(true);
      const data = await ai.generateQuiz(text);
      setQuiz(data);
      setLoading(false);
    } else if (targetView === 'slides' && (slides.length === 0 || force)) {
      setLoading(true);
      const data = await ai.generateSlideContent(text);
      setSlides(data);
      setLoading(false);
    }
    setView(targetView);
  };

  const downloadSlides = () => {
    const pres = new pptxgen();
    slides.forEach(slide => {
      const s = pres.addSlide();
      s.addText(slide.title, { x: 0.5, y: 0.5, w: '90%', h: 1, fontSize: 32, bold: true, color: '363636' });
      s.addText(slide.bulletPoints.join('\n'), { x: 0.5, y: 1.5, w: '90%', h: 4, fontSize: 18, color: '666666', bullet: true });
    });
    pres.writeFile({ fileName: `${file?.name.split('.')[0]}_Study_Slides.pptx` });
  };

  return (
    <div className="flex h-screen bg-[#F8F9FA] text-[#2D3436] font-sans overflow-hidden">
      {/* Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside 
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            className="w-72 bg-white border-r border-[#E9ECEF] flex flex-col z-20"
          >
            <div className="p-8 border-bottom border-[#E9ECEF]">
              <h1 className="text-2xl font-bold tracking-tight text-[#0984E3] flex items-center gap-2">
                <BookOpen className="w-8 h-8" />
                StudyAI
              </h1>
              <p className="text-xs text-[#636E72] mt-1 font-medium uppercase tracking-widest">Assistant</p>
            </div>

            <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
              <SidebarItem 
                icon={<Upload className="w-5 h-5" />} 
                label="Upload Notes" 
                active={view === 'upload'} 
                onClick={() => setView('upload')} 
              />
              <div className="pt-4 pb-2 px-4 text-[10px] font-bold text-[#B2BEC3] uppercase tracking-widest">Analysis</div>
              <SidebarItem 
                icon={<FileText className="w-5 h-5" />} 
                label="Summary" 
                active={view === 'summary'} 
                disabled={!text}
                onClick={() => fetchViewData('summary')} 
              />
              <SidebarItem 
                icon={<Layers className="w-5 h-5" />} 
                label="Key Topics" 
                active={view === 'topics'} 
                disabled={!text}
                onClick={() => fetchViewData('topics')} 
              />
              <div className="pt-4 pb-2 px-4 text-[10px] font-bold text-[#B2BEC3] uppercase tracking-widest">Study Tools</div>
              <SidebarItem 
                icon={<CreditCard className="w-5 h-5" />} 
                label="Flashcards" 
                active={view === 'flashcards'} 
                disabled={!text}
                onClick={() => fetchViewData('flashcards')} 
              />
              <SidebarItem 
                icon={<HelpCircle className="w-5 h-5" />} 
                label="Practice Quiz" 
                active={view === 'quiz'} 
                disabled={!text}
                onClick={() => fetchViewData('quiz')} 
              />
              <SidebarItem 
                icon={<Presentation className="w-5 h-5" />} 
                label="Slides Generator" 
                active={view === 'slides'} 
                disabled={!text}
                onClick={() => fetchViewData('slides')} 
              />
            </nav>

            <div className="p-6 border-t border-[#E9ECEF]">
              <div className="bg-[#E1F5FE] p-4 rounded-2xl">
                <p className="text-xs font-semibold text-[#01579B]">Pro Tip</p>
                <p className="text-[11px] text-[#0277BD] mt-1 leading-relaxed">
                  Use the Quiz to test your knowledge after reviewing the summary.
                </p>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {/* Header */}
        <header className="h-20 bg-white border-b border-[#E9ECEF] flex items-center justify-between px-8 z-10">
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-[#F1F3F5] rounded-xl transition-colors"
          >
            {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
          
          <div className="flex items-center gap-4">
            {file && (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 bg-[#F1F3F5] px-4 py-2 rounded-full border border-[#E9ECEF]">
                  <FileText className="w-4 h-4 text-[#0984E3]" />
                  <span className="text-sm font-medium truncate max-w-[200px]">{file.name}</span>
                </div>
                <button 
                  onClick={() => fetchViewData(view, true)}
                  title="Regenerate current analysis"
                  className="p-2 text-[#636E72] hover:text-[#0984E3] hover:bg-[#E1F5FE] rounded-xl transition-all flex items-center gap-2"
                >
                  <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                  <span className="text-xs font-bold uppercase tracking-wider hidden md:inline">Regenerate</span>
                </button>
              </div>
            )}
          </div>
        </header>

        {/* View Content */}
        <div className="flex-1 overflow-y-auto p-8">
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div 
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full flex flex-col items-center justify-center text-center"
              >
                <Loader2 className="w-12 h-12 text-[#0984E3] animate-spin mb-4" />
                <h2 className="text-xl font-semibold">Analyzing your notes...</h2>
                <p className="text-[#636E72] mt-2">This might take a few seconds depending on the length.</p>
              </motion.div>
            ) : (
              <motion.div
                key={view}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="max-w-5xl mx-auto"
              >
                {view === 'upload' && (
                  <div className="h-[60vh] flex flex-col items-center justify-center border-2 border-dashed border-[#DFE6E9] rounded-[40px] bg-white p-12 text-center group hover:border-[#0984E3] transition-colors cursor-pointer relative">
                    <input 
                      type="file" 
                      onChange={handleFileUpload} 
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      accept=".pdf,.docx,.txt"
                    />
                    <div className="w-24 h-24 bg-[#E1F5FE] rounded-[32px] flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                      <Upload className="w-12 h-12 text-[#0984E3]" />
                    </div>
                    <h2 className="text-3xl font-bold mb-4">Upload Lecture Notes</h2>
                    <p className="text-[#636E72] max-w-md mx-auto mb-8 leading-relaxed">
                      Drop your PDF, DOCX, or TXT files here. We'll extract the text, clean it up, and prepare your study materials.
                    </p>
                    <div className="flex gap-4">
                      <span className="px-4 py-2 bg-[#F1F3F5] rounded-full text-xs font-bold text-[#B2BEC3] uppercase tracking-widest">PDF</span>
                      <span className="px-4 py-2 bg-[#F1F3F5] rounded-full text-xs font-bold text-[#B2BEC3] uppercase tracking-widest">DOCX</span>
                      <span className="px-4 py-2 bg-[#F1F3F5] rounded-full text-xs font-bold text-[#B2BEC3] uppercase tracking-widest">TXT</span>
                    </div>
                  </div>
                )}

                {view === 'summary' && (
                  <div className="space-y-8">
                    <div className="flex items-center justify-between">
                      <h2 className="text-4xl font-bold tracking-tight">Concise Summary</h2>
                      <div className="h-1 w-24 bg-[#0984E3] rounded-full"></div>
                    </div>
                    <div className="bg-white p-10 rounded-[40px] shadow-sm border border-[#E9ECEF] prose prose-slate max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{summary}</ReactMarkdown>
                    </div>
                  </div>
                )}

                {view === 'topics' && (
                  <div className="space-y-8">
                    <h2 className="text-4xl font-bold tracking-tight">Key Topics & Keywords</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {topics.map((topic, i) => (
                        <motion.div 
                          key={i}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className="bg-white p-6 rounded-3xl border border-[#E9ECEF] flex items-center gap-4 hover:shadow-md transition-shadow"
                        >
                          <div className="w-10 h-10 bg-[#0984E3] text-white rounded-2xl flex items-center justify-center font-bold">
                            {i + 1}
                          </div>
                          <span className="text-lg font-medium">{topic}</span>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                {view === 'flashcards' && (
                  <div className="space-y-8">
                    <h2 className="text-4xl font-bold tracking-tight">Study Flashcards</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {flashcards.map((card, i) => (
                        <Flashcard key={i} question={card.question} answer={card.answer} />
                      ))}
                    </div>
                  </div>
                )}

                {view === 'quiz' && (
                  <div className="space-y-8">
                    <h2 className="text-4xl font-bold tracking-tight">Practice Quiz</h2>
                    <div className="space-y-6">
                      {quiz.length > 0 ? (
                        quiz.map((q, i) => (
                          <QuizQuestion key={i} question={q.question} options={q.options} correctAnswer={q.correctAnswer} index={i} />
                        ))
                      ) : (
                        <div className="bg-white p-10 rounded-[40px] border border-[#E9ECEF] text-center">
                          <p className="text-[#636E72]">No valid quiz questions could be generated from these notes. Try uploading a more detailed document.</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {view === 'slides' && (
                  <div className="space-y-8">
                    <div className="flex items-center justify-between">
                      <h2 className="text-4xl font-bold tracking-tight">Presentation Slides</h2>
                      <button 
                        onClick={downloadSlides}
                        className="bg-[#0984E3] text-white px-8 py-4 rounded-2xl font-bold hover:bg-[#0773C5] transition-colors flex items-center gap-2 shadow-lg shadow-blue-200"
                      >
                        <Presentation className="w-5 h-5" />
                        Download PPTX
                      </button>
                    </div>
                    <div className="grid grid-cols-1 gap-8">
                      {slides.map((slide, i) => (
                        <div key={i} className="bg-white p-10 rounded-[40px] border border-[#E9ECEF] shadow-sm">
                          <h3 className="text-2xl font-bold mb-6 text-[#0984E3]">{slide.title}</h3>
                          <ul className="space-y-4">
                            {slide.bulletPoints.map((bp: string, j: number) => (
                              <li key={j} className="flex items-start gap-3 text-[#636E72]">
                                <div className="mt-2 w-1.5 h-1.5 bg-[#0984E3] rounded-full flex-shrink-0"></div>
                                <span>{bp}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

function SidebarItem({ icon, label, active, disabled, onClick }: { icon: any, label: string, active?: boolean, disabled?: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl transition-all duration-200 ${
        active 
          ? 'bg-[#0984E3] text-white shadow-lg shadow-blue-100' 
          : disabled 
            ? 'opacity-40 cursor-not-allowed text-[#B2BEC3]' 
            : 'text-[#636E72] hover:bg-[#F1F3F5] hover:text-[#2D3436]'
      }`}
    >
      {icon}
      <span className="text-sm font-semibold">{label}</span>
      {active && <ChevronRight className="w-4 h-4 ml-auto" />}
    </button>
  );
}

function Flashcard({ question, answer }: { question: string, answer: string }) {
  const [flipped, setFlipped] = useState(false);

  return (
    <div 
      className="h-64 perspective-1000 cursor-pointer"
      onClick={() => setFlipped(!flipped)}
    >
      <motion.div 
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.6, type: 'spring', stiffness: 260, damping: 20 }}
        className="relative w-full h-full preserve-3d"
      >
        {/* Front */}
        <div className="absolute inset-0 backface-hidden bg-white p-8 rounded-[32px] border border-[#E9ECEF] flex flex-col items-center justify-center text-center shadow-sm overflow-y-auto">
          <p className="text-xs font-bold text-[#B2BEC3] uppercase tracking-widest mb-4">Question</p>
          <div className="text-lg font-bold leading-relaxed">
            <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{question}</ReactMarkdown>
          </div>
          <p className="mt-8 text-[10px] text-[#0984E3] font-bold uppercase tracking-widest">Click to flip</p>
        </div>
        {/* Back */}
        <div className="absolute inset-0 backface-hidden bg-[#0984E3] text-white p-8 rounded-[32px] flex flex-col items-center justify-center text-center rotate-y-180 shadow-xl overflow-y-auto">
          <p className="text-xs font-bold text-white/60 uppercase tracking-widest mb-4">Answer</p>
          <div className="text-lg font-medium leading-relaxed">
            <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{answer}</ReactMarkdown>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function QuizQuestion({ question, options, correctAnswer, index }: { question: string, options: string[], correctAnswer: string, index: number }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);

  return (
    <div className="bg-white p-10 rounded-[40px] border border-[#E9ECEF] shadow-sm">
      <div className="flex items-center gap-4 mb-6">
        <span className="text-xs font-bold bg-[#F1F3F5] px-3 py-1 rounded-full text-[#B2BEC3] uppercase tracking-widest">Question {index + 1}</span>
      </div>
      <div className="text-xl font-bold mb-8 leading-relaxed">
        <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{question}</ReactMarkdown>
      </div>
      <div className="grid grid-cols-1 gap-3">
        {options.map((option, i) => (
          <button 
            key={i}
            onClick={() => {
              if (showResult) return;
              setSelected(option);
              setShowResult(true);
            }}
            className={`p-5 rounded-2xl text-left transition-all border-2 ${
              showResult
                ? option === correctAnswer
                  ? 'bg-[#E8F5E9] border-[#4CAF50] text-[#2E7D32]'
                  : option === selected
                    ? 'bg-[#FFEBEE] border-[#EF5350] text-[#C62828]'
                    : 'bg-white border-[#E9ECEF] opacity-50'
                : selected === option
                  ? 'bg-[#E1F5FE] border-[#0984E3] text-[#01579B]'
                  : 'bg-white border-[#E9ECEF] hover:border-[#0984E3] hover:bg-[#F8F9FA]'
            }`}
          >
            <div className="flex items-center gap-4">
              <span className="w-8 h-8 rounded-xl bg-[#F1F3F5] flex items-center justify-center text-xs font-bold text-[#B2BEC3]">
                {String.fromCharCode(65 + i)}
              </span>
              <div className="font-medium">
                <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{option}</ReactMarkdown>
              </div>
            </div>
          </button>
        ))}
      </div>
      {showResult && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mt-8 p-4 rounded-2xl text-center font-bold ${
            selected === correctAnswer ? 'text-[#4CAF50]' : 'text-[#EF5350]'
          }`}
        >
          {selected === correctAnswer ? 'Correct! Well done.' : `Incorrect. The correct answer is: ${correctAnswer}`}
        </motion.div>
      )}
    </div>
  );
}
