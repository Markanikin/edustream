import { useState, useEffect, useMemo, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY; 

function App() {
  const [input, setInput] = useState('');
  const [level, setLevel] = useState('student'); 
  const [messages, setMessages] = useState([
    { role: 'ai', text: 'СИСТЕМА E-MIND АКТИВОВАНА. МОЖЕТЕ ЗАВАНТАЖИТИ ФАЙЛ ДЛЯ АНАЛІЗУ.', id: 'init' }
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [attachedFile, setAttachedFile] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [history, setHistory] = useState([]);

  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const ai = useMemo(() => new GoogleGenAI({ apiKey: API_KEY }), []);

  useEffect(() => {
    const saved = localStorage.getItem('eduMindHistory');
    if (saved) setHistory(JSON.parse(saved));
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setAttachedFile({
          name: file.name,
          content: event.target.result
        });
      };
      reader.readAsText(file);
    }
  };

  const startNewChat = () => {
    setMessages([{ role: 'ai', text: 'НОВА СЕСІЯ РОЗПОЧАТА. СИСТЕМА ГОТОВА.', id: Date.now() }]);
    setInput('');
    setAttachedFile(null);
  };

  const deleteHistoryItem = (id, e) => {
    e.stopPropagation();
    const updated = history.filter(item => item.id !== id);
    setHistory(updated);
    localStorage.setItem('eduMindHistory', JSON.stringify(updated));
  };

  async function handleAsk() {
    if (!input.trim() && !attachedFile || loading) return;

    const userText = input;
    const isFirstMessage = messages.length <= 1;
    const displayText = attachedFile ? `📎 [ФАЙЛ: ${attachedFile.name}] ${userText}` : userText;
    
    setMessages(prev => [...prev, { role: "user", text: displayText, id: Date.now() }]);
    setInput('');
    setLoading(true);
    setError('');

    try {
      const instructions = {
        child: "Поясни як маленькій дитині, максимально просто, на іграшкових прикладах та з емодзі.",
        student: "Поясни як прогресивний викладач: цікаво, сучасно, зі структурою та кейсами.",
        pro: "Поясни на рівні експерта: глибока термінологія, детальна логіка та професійна мова."
      };

      const context = messages.slice(-4).map(m => `${m.role === 'user' ? 'Запит' : 'Відповідь'}: ${m.text}`).join('\n');
      const fileContext = attachedFile ? `\nКОНТЕКСТ З ФАЙЛУ (${attachedFile.name}):\n${attachedFile.content}\n` : '';

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{
          role: "user",
          parts: [{ text: `${fileContext}\nКонтекст:\n${context}\n\nТема: ${userText}. Інструкція: ${instructions[level]}. Мова: українська.` }]
        }]
      });

      if (response && response.text) {
        const fullText = response.text;
        setMessages(prev => [...prev, { role: "ai", text: fullText, id: Date.now() + 1 }]);
        setAttachedFile(null);

        if (isFirstMessage) {
          const titleRes = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [{ role: "user", parts: [{ text: `Назва (макс 3 слова) для: "${userText}"` }] }]
          });
          const shortTitle = titleRes.text?.trim() || userText;
          setHistory(prev => {
            const updated = [{ title: shortTitle, content: fullText, id: Date.now() }, ...prev].slice(0, 15);
            localStorage.setItem('eduMindHistory', JSON.stringify(updated));
            return updated;
          });
        }
      }
    } catch {
      setError("КРИТИЧНА ПОМИЛКА МЕРЕЖІ.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="h-screen bg-[#02040a] text-slate-100 font-sans selection:bg-cyan-500/40 relative flex overflow-hidden">
      
      <aside className={`fixed top-0 left-0 h-full bg-[#050810]/98 backdrop-blur-2xl border-r border-cyan-500/10 transition-all duration-700 z-[100] ${isSidebarOpen ? 'w-full sm:w-80' : 'w-0 overflow-hidden'}`}>
        <div className="p-6 w-80 h-full flex flex-col">
          <div className="mb-8 pt-16 text-left">
            <h3 className="text-cyan-500 font-black text-[10px] uppercase tracking-[0.3em] opacity-50">Neural_Archive</h3>
          </div>
          <button onClick={startNewChat} className="w-full mb-6 py-3 border border-cyan-500/20 rounded-xl text-[10px] font-black uppercase text-cyan-400 hover:bg-cyan-500/10 transition-all">+ Нова сесія</button>
          <div className="space-y-4 overflow-y-auto flex-1 no-scrollbar pb-10">
            {history.map((item) => (
              <div key={item.id} onClick={() => { setMessages([{ role: 'ai', text: item.content, id: item.id }]); setIsSidebarOpen(false); }} className="p-4 bg-white/5 border border-white/5 rounded-xl cursor-pointer hover:border-cyan-500/30 transition-all group relative text-left">
                <p className="text-sm font-bold text-slate-300 truncate pr-6">{item.title}</p>
                <button onClick={(e) => deleteHistoryItem(item.id, e)} className="absolute right-3 top-4 opacity-0 group-hover:opacity-100 text-red-500/50 hover:text-red-500 transition-all">✕</button>
              </div>
            ))}
          </div>
        </div>
      </aside>

      <div className={`flex-1 flex flex-col h-full transition-all duration-700 ${isSidebarOpen ? 'sm:ml-80' : 'ml-0'}`}>
        
        <header className="shrink-0 z-[110] bg-[#02040a]/80 backdrop-blur-xl border-b border-white/5 px-6 py-4 flex justify-between items-center shadow-lg">
          <div className="flex items-center gap-6">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="w-10 h-10 flex flex-col items-center justify-center gap-1.5 group relative">
              <div className={`h-0.5 bg-cyan-500 transition-all duration-500 ${isSidebarOpen ? 'w-6 rotate-45 translate-y-2' : 'w-4 shadow-[0_0_10px_cyan]'}`}></div>
              <div className={`h-0.5 bg-cyan-500 transition-all duration-500 ${isSidebarOpen ? 'opacity-0' : 'w-6 shadow-[0_0_10px_cyan]'}`}></div>
              <div className={`h-0.5 bg-cyan-500 transition-all duration-500 ${isSidebarOpen ? 'w-6 -rotate-45 -translate-y-2' : 'w-3 shadow-[0_0_10px_cyan]'}`}></div>
            </button>
            <div className="flex items-center gap-4 group">
              <div className="w-10 h-10 border-2 border-cyan-500 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.4)]">
                <span className="text-xl font-black text-cyan-400 italic">E</span>
              </div>
              <h1 className="text-xl font-black tracking-[0.2em] text-white uppercase hidden sm:block font-mono">E-Mind <span className="text-cyan-500 font-light text-xs">Core</span></h1>
            </div>
          </div>
          <a href="https://send.monobank.ua/jar/8LjZWeX9nK" target="_blank" className="px-5 py-2 font-black text-cyan-400 border border-cyan-500/30 rounded-full hover:bg-cyan-500 hover:text-black hover:shadow-[0_0_20px_#06b6d4] transition-all uppercase text-[9px] tracking-widest">На каву ☕</a>
        </header>

        <main className="flex-1 overflow-y-auto px-6 py-8 space-y-8 custom-scrollbar relative">
          <div className="max-w-4xl mx-auto pb-10 text-left">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} mb-8 animate-in fade-in slide-in-from-bottom-5 duration-700`}>
                <div className={`max-w-[85%] p-6 md:p-8 rounded-[2rem] backdrop-blur-3xl border relative transition-all hover:border-cyan-500/30 ${msg.role === 'user' ? 'bg-cyan-500/5 border-cyan-500/20 rounded-br-none' : 'bg-[#050810]/80 border-cyan-500/10 rounded-bl-none shadow-2xl'}`}>
                  <div className={`absolute top-0 ${msg.role === 'user' ? 'right-12' : 'left-12'} w-24 h-0.5 bg-cyan-500 shadow-[0_0_15px_cyan] animate-pulse`}></div>
                  <div className="whitespace-pre-wrap text-slate-300 leading-relaxed text-sm md:text-lg font-light italic">
                    {msg.text}
                  </div>
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
        </main>

        <section className="shrink-0 bg-[#02040a]/90 backdrop-blur-md border-t border-white/5 p-4 md:p-8 z-[105]">
          <div className="max-w-4xl mx-auto space-y-6">
            
            <div className="flex justify-center items-center gap-4">
              {attachedFile && (
                <div className="bg-cyan-500/10 border border-cyan-500/30 px-4 py-1.5 rounded-full flex items-center gap-3 animate-pulse">
                  <span className="text-[10px] text-cyan-400 font-black tracking-widest uppercase">📎 {attachedFile.name}</span>
                  <button onClick={() => setAttachedFile(null)} className="text-red-500 text-xs hover:text-red-400">✕</button>
                </div>
              )}
              {!attachedFile && (
                <div className="flex justify-center gap-4">
                  {['child', 'student', 'pro'].map((id) => (
                    <button key={id} onClick={() => setLevel(id)} className={`px-6 py-1.5 rounded-full text-[9px] font-black uppercase transition-all duration-500 border ${level === id ? 'bg-cyan-600 border-cyan-400 text-white shadow-[0_0_20px_#0891b2]' : 'border-white/10 text-slate-500 hover:border-cyan-500/40'}`}>
                      {id === 'child' ? 'Дитина' : id === 'student' ? 'Студент' : 'Експерт'}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="relative group rounded-[2.5rem] bg-black/60 border border-cyan-500/20 focus-within:border-cyan-500/60 transition-all duration-700 shadow-[0_0_50px_rgba(0,0,0,0.8)]">
              <div className="flex items-center gap-2 p-2 md:p-3">
                <button onClick={() => fileInputRef.current.click()} className="p-3 text-cyan-500 hover:text-cyan-300 transition-all border-r border-white/5 opacity-50 hover:opacity-100">
                  📎
                </button>
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".txt,.js,.py,.json,.css,.html" />
                
                <input 
                  type="text" 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
                  placeholder="ВВЕДІТЬ ЗАПИТ АБО АНАЛІЗ ФАЙЛУ..." 
                  className="flex-grow bg-transparent px-4 py-3 outline-none text-white text-base md:text-lg placeholder:text-slate-800 font-mono tracking-wider uppercase"
                />
                <button onClick={() => handleAsk()} disabled={loading} className="bg-cyan-500 text-black px-10 py-3 rounded-[1.8rem] font-black text-sm hover:bg-cyan-400 hover:shadow-[0_0_20px_#06b6d4] transition-all">
                  {loading ? "..." : "EXECUTE"}
                </button>
              </div>
            </div>

            <div className="flex justify-between items-center px-4">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_#22c55e]"></div>
                <span className="text-[9px] font-black text-green-500 uppercase tracking-widest opacity-60">Система активована // AES-256</span>
              </div>
              <div className="text-[9px] text-slate-600 font-mono uppercase tracking-widest text-right">
                Зроблено в Україні 🇺🇦 <span className="ml-2 text-cyan-900 italic">v2.5_Flash</span>
              </div>
            </div>
            {error && <p className="mt-2 text-red-500 text-center font-mono text-[9px] uppercase tracking-widest animate-pulse">{error}</p>}
          </div>
        </section>

        <div className="fixed bottom-40 right-12 pointer-events-none opacity-[0.02] select-none text-[10vw] font-black italic text-cyan-500 -rotate-12">
          E-MIND CORE
        </div>
      </div>
    </div>
  );
}

export default App;