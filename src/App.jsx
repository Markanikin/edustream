import { useState, useEffect, useMemo } from 'react';
import { GoogleGenAI } from "@google/genai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY; 

function App() {
  const [input, setInput] = useState('');
  const [level, setLevel] = useState('student'); 
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [history, setHistory] = useState([]);

  const ai = useMemo(() => new GoogleGenAI({ apiKey: API_KEY }), []);

  useEffect(() => {
    const saved = localStorage.getItem('eduMindHistory');
    if (saved) setHistory(JSON.parse(saved));
  }, []);

  async function handleAsk() {
    if (!input.trim()) return;

    setLoading(true);
    setError('');
    setResult('');
    setCopied(false);
    
    const instructions = {
      child: "Поясни як маленькій дитині, максимально просто, на іграшкових прикладах та з емодзі.",
      student: "Поясни як прогресивний викладач: цікаво, сучасно, зі структурою та кейсами.",
      pro: "Поясни на рівні експерта: глибока термінологія, детальна логіка та професійна мова."
    };

    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{
          role: "user",
          parts: [{ text: `Тема: ${input}. Інструкція: ${instructions[level]}. Мова: українська. Виділяй ключові моменти жирним.` }]
        }]
      });

      if (response && response.text) {
        const fullText = response.text;
        setResult(fullText);

        const titleRes = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: [{
            role: "user",
            parts: [{ text: `Дай коротку назву (макс 3 слова) для теми: "${input}". Тільки назва.` }]
          }]
        });
        
        const shortTitle = titleRes.text.trim() || input;
        const newItem = { title: shortTitle, content: fullText, id: Date.now() };
        
        setHistory(prev => {
          const updated = [newItem, ...prev].slice(0, 10);
          localStorage.setItem('eduMindHistory', JSON.stringify(updated));
          return updated;
        });
      }
    } catch (err) {
      console.error(err);
      setError("КРИТИЧНА ПОМИЛКА МЕРЕЖІ. ПЕРЕПІДКЛЮЧЕННЯ...");
    } finally {
      setLoading(false);
    }
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#02040a] text-slate-100 font-sans selection:bg-cyan-500/40 overflow-x-hidden relative flex">
      
      <aside className={`fixed top-0 left-0 h-full bg-[#050810]/98 backdrop-blur-2xl border-r border-cyan-500/10 transition-all duration-500 z-[100] ${isSidebarOpen ? 'w-full sm:w-72' : 'w-0 overflow-hidden'}`}>
        <div className="p-6 w-full sm:w-72">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-cyan-500 font-black text-[10px] uppercase tracking-[0.3em]">Історія запитів</h3>
            <button onClick={() => setIsSidebarOpen(false)} className="sm:hidden text-cyan-500 text-xl">✕</button>
          </div>
          <div className="space-y-4">
            {history.map((item) => (
              <div 
                key={item.id} 
                onClick={() => { setResult(item.content); setIsSidebarOpen(false); }}
                className="p-4 bg-white/5 border border-white/5 rounded-xl cursor-pointer hover:border-cyan-500/30 hover:bg-cyan-500/5 transition-all group"
              >
                <p className="text-sm font-bold text-slate-300 group-hover:text-cyan-400 transition-colors truncate">{item.title}</p>
                <span className="text-[9px] text-slate-600 uppercase tracking-widest">Архів даних</span>
              </div>
            ))}
          </div>
          <button 
            onClick={() => { setHistory([]); localStorage.removeItem('eduMindHistory'); }}
            className="mt-10 text-[9px] text-red-500/50 hover:text-red-500 font-bold uppercase tracking-widest transition-colors w-full text-left"
          >
            Очистити пам'ять
          </button>
        </div>
      </aside>

      <div className={`flex-grow transition-all duration-500 ${isSidebarOpen ? 'sm:ml-72' : 'ml-0'}`}>
        <div className="fixed inset-0 -z-10">
          <div className="absolute top-[-20%] left-[-10%] w-[300px] md:w-[700px] h-[300px] md:h-[700px] bg-blue-600/10 blur-[120px] md:blur-[180px] rounded-full animate-pulse"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[300px] md:w-[600px] h-[300px] md:h-[600px] bg-cyan-600/10 blur-[100px] md:blur-[150px] rounded-full"></div>
        </div>

        <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 md:py-10 flex flex-col min-h-screen">
          
          <header className="flex justify-between items-center mb-12 md:mb-20 gap-4">
            <div className="flex items-center gap-3 md:gap-6 shrink-0">
              <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="w-10 h-10 flex flex-col items-center justify-center gap-1.5 group">
                <div className={`h-0.5 bg-cyan-500 transition-all ${isSidebarOpen ? 'w-6 rotate-45 translate-y-2' : 'w-4 shadow-[0_0_10px_cyan]'}`}></div>
                <div className={`h-0.5 bg-cyan-500 transition-all ${isSidebarOpen ? 'opacity-0' : 'w-6 shadow-[0_0_10px_cyan]'}`}></div>
                <div className={`h-0.5 bg-cyan-500 transition-all ${isSidebarOpen ? 'w-6 -rotate-45 -translate-y-2' : 'w-3 shadow-[0_0_10px_cyan]'}`}></div>
              </button>

              <div className="flex items-center gap-2 md:gap-4 group">
                <div className="w-10 h-10 md:w-14 md:h-14 bg-transparent border-2 border-cyan-500 rounded-xl md:rounded-2xl flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.4)]">
                  <span className="text-xl md:text-3xl font-black text-cyan-400 italic">E</span>
                </div>
                <h1 className="text-lg md:text-2xl font-black tracking-[0.1em] md:tracking-[0.2em] text-white uppercase">E-Mind <span className="text-cyan-500 font-light">Core</span></h1>
              </div>
            </div>
            
            <a 
              href="https://send.monobank.ua/jar/8LjZWeX9nK" 
              target="_blank" 
              className="px-4 md:px-8 py-2 md:py-3 font-black text-cyan-400 border border-cyan-500/30 rounded-full hover:bg-cyan-500/10 transition-all backdrop-blur-md uppercase text-[9px] md:text-[10px] tracking-[0.1em] md:tracking-[0.2em] whitespace-nowrap"
            >
              На каву ☕
            </a>
          </header>

          <main className="flex-grow flex flex-col items-center">
            <div className="text-center mb-8 md:mb-16 space-y-4 md:space-y-6 animate-in fade-in zoom-in duration-1000">
              <h2 className="text-4xl md:text-8xl font-black leading-tight tracking-tighter">
                INTELLIGENT <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 drop-shadow-[0_0_20px_rgba(6,182,212,0.3)]">
                  EXPLORATION
                </span>
              </h2>
              <p className="text-slate-500 text-xs md:text-lg uppercase tracking-[0.2em] md:tracking-[0.4em] font-light px-4">Доступ до знань нового покоління</p>
              
              <div className="flex flex-wrap justify-center bg-black/40 p-1 rounded-2xl border border-white/10 backdrop-blur-3xl shadow-xl">
                {['child', 'student', 'pro'].map((id) => (
                  <button
                    key={id}
                    onClick={() => setLevel(id)}
                    className={`px-4 md:px-8 py-2 md:py-2.5 rounded-xl text-[10px] md:text-xs font-black tracking-widest uppercase transition-all duration-500 ${level === id ? 'bg-cyan-600 text-white shadow-[0_0_20px_rgba(8,145,178,0.6)]' : 'text-slate-500 hover:text-cyan-400'}`}
                  >
                    {id === 'child' ? 'Дитина' : id === 'student' ? 'Студент' : 'Експерт'}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="w-full max-w-3xl relative px-2">
              <div className="group relative rounded-3xl md:rounded-[2.5rem] bg-black/60 border border-cyan-500/20 focus-within:border-cyan-500/60 transition-all duration-500 shadow-[0_0_50px_rgba(0,0,0,0.8)]">
                <div className="flex flex-col md:flex-row gap-2 p-2 md:p-3">
                  <input 
                    type="text" 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
                    placeholder="ВВЕДІТЬ ЗАПИТ..." 
                    className="flex-grow bg-transparent px-4 md:px-8 py-4 md:py-5 outline-none text-white text-lg md:text-xl placeholder:text-slate-800 font-mono tracking-wider uppercase"
                  />
                  <button onClick={() => handleAsk()} disabled={loading} className="bg-transparent border-2 border-cyan-500 text-cyan-400 px-6 md:px-12 py-4 md:py-5 rounded-2xl md:rounded-[1.8rem] font-black text-sm md:text-lg hover:bg-cyan-500 hover:text-black transition-all">
                    {loading ? "SEARCHING" : "EXECUTE"}
                  </button>
                </div>
              </div>
              {error && <p className="mt-4 text-red-500 text-center font-mono text-[9px] md:text-[10px] uppercase tracking-[0.3em] animate-pulse">{error}</p>}
            </div>

            {result && (
              <div className="mt-8 md:mt-16 w-full max-w-4xl bg-[#050810]/80 border border-cyan-500/10 rounded-3xl p-6 md:p-10 backdrop-blur-3xl shadow-2xl relative text-left">
                <div className="absolute top-0 left-6 md:left-10 w-20 md:w-32 h-1 bg-cyan-500 shadow-[0_0_15px_rgba(6,182,212,1)]"></div>
                <button onClick={copyToClipboard} className="absolute top-4 md:top-8 right-6 md:right-8 text-cyan-500 text-[9px] md:text-[10px] font-black tracking-widest uppercase border-b border-cyan-500/20">
                  {copied ? "DATA_COPIED" : "COPY_STREAM"}
                </button>
                <div className="whitespace-pre-wrap text-slate-300 leading-relaxed text-base md:text-xl font-light italic">
                  {result}
                </div>
              </div>
            )}
          </main>

          <footer className="mt-16 md:mt-32 py-8 md:py-12 border-t border-white/5">
            <div className="flex flex-col md:flex-row justify-between items-center gap-6 md:gap-10">
              <div className="flex flex-col items-center md:items-start space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 bg-green-500 rounded-full shadow-[0_0_10px_#22c55e] animate-pulse"></div>
                  <span className="text-[10px] md:text-[11px] font-black text-green-500 uppercase tracking-[0.3em]">СИСТЕМА АКТИВОВАНА</span>
                </div>
                <p className="text-[9px] text-slate-600 font-mono tracking-widest uppercase">Ukraine 🇺🇦 • AES-256</p>
              </div>

              <div className="text-right text-[9px] md:text-[10px] text-slate-600 font-mono uppercase tracking-widest text-center md:text-right">
                © {new Date().getFullYear()} E-Mind AI <br />
                <span className="text-cyan-800 font-black italic">РОЗРОБЛЕНО В УКРАЇНІ</span>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}

export default App;
