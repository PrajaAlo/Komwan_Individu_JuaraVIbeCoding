import { useState, useRef, useEffect } from "react";
import { Send, Image as ImageIcon, X, ChefHat, Loader2, Moon, Sun, Trash2, Settings2, Save, ArrowLeft } from "lucide-react";
import { Link, Navigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { motion } from "motion/react";
import { Content } from "../types";
import NutritionChart, { NutritionData } from "../components/NutritionChart";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";

const extractNutritionData = (text: string): { data: NutritionData | null; cleanText: string } => {
  const match = text.match(/```json\n([\s\S]*?)\n```/);
  if (match && match[1]) {
    try {
      const data = JSON.parse(match[1]);
      const cleanText = text.replace(match[0], '').trim();
      return { data, cleanText };
    } catch (e) {
      return { data: null, cleanText: text };
    }
  }
  return { data: null, cleanText: text };
};

const DEFAULT_TARGETS: NutritionData = {
  calories: 2000,
  protein: 60,
  carbs: 300,
  fat: 65,
  fiber: 30,
  sodium: 2000,
  sugar: 50,
};

export default function ChatPage() {
  const { user, profile, updateProfile } = useAuth();
  const { isDarkMode, toggleDarkMode } = useTheme();
  
  const [history, setHistory] = useState<Content[]>(() => {
    try {
      const saved = localStorage.getItem("nutri_chat_history");
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [input, setInput] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // User Profile State
  const dailyTargets = profile?.dailyTargets || DEFAULT_TARGETS;
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [tempTargets, setTempTargets] = useState<NutritionData>(dailyTargets);

  useEffect(() => {
    if (profile) setTempTargets(profile.dailyTargets);
  }, [profile]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem("nutri_chat_history", JSON.stringify(history));
  }, [history]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [history, isLoading]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const url = URL.createObjectURL(file);
      setImagePreview(url);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
      setImagePreview(null);
    }
  };

  const handleSaveProfile = async () => {
    await updateProfile({ dailyTargets: tempTargets });
    setIsProfileModalOpen(false);
  };

  if (!user || !profile) {
    return <Navigate to="/login" replace />;
  }

  const markAsConsumed = (index: number) => {
    setHistory((prev) => {
      const newHistory = [...prev];
      const msg = newHistory[index];
      if (msg && msg.role === "model") {
        const text = msg.parts[0].text;
        if (text) {
          const newText = text.replace(/```json\n([\s\S]*?)\n```/, (match, p1) => {
            try {
              const data = JSON.parse(p1);
              data.consumed = true;
              return `\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\``;
            } catch (e) {
              return match;
            }
          });
          newHistory[index] = {
            ...msg,
            parts: [{ text: newText }],
          };
        }
      }
      return newHistory;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && !imageFile) || isLoading) return;

    let base64 = "";
    let mimeType = "";

    if (imageFile) {
      mimeType = imageFile.type;
      base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(imageFile);
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.onerror = (error) => reject(error);
      });
    }

    const newMessage = input.trim();
    const newUserContent: Content = {
      role: "user",
      parts: [],
      timestamp: Date.now(),
    };

    if (base64) {
      newUserContent.parts.push({
        inlineData: { data: base64, mimeType },
      });
    }
    if (newMessage) {
      newUserContent.parts.push({ text: newMessage });
    }

    setHistory((prev) => [...prev, newUserContent]);
    setInput("");
    removeImage();
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          history, // Send current history
          message: newMessage,
          imageBase64: base64 || undefined,
          mimeType: mimeType || undefined,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setHistory((prev) => [
          ...prev,
          {
            role: "model",
            parts: [{ text: data.text }],
            timestamp: Date.now(),
          },
        ]);
      } else {
        setHistory((prev) => [
          ...prev,
          {
            role: "model",
            parts: [{ text: "**Error:** " + (data.error || "Gagal menghubungi asisten.") }],
            timestamp: Date.now(),
          },
        ]);
      }
    } catch (err) {
      setHistory((prev) => [
        ...prev,
        {
          role: "model",
          parts: [{ text: "**Error:** Terjadi kesalahan jaringan." }],
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-slate-50 dark:bg-slate-950 font-sans text-slate-800 dark:text-slate-200 transition-colors duration-300">
      {/* Header */}
      <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 md:px-8 py-4 flex justify-between items-center shrink-0 sticky top-0 z-40 transition-colors">
        <div className="flex gap-2">
           <Link
            to="/"
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Kembali</span>
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-emerald-600 dark:from-emerald-500 dark:to-emerald-700 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-emerald-500/20 transition-colors">
            <ChefHat className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-800 dark:text-slate-50">
            Nutri <span className="text-emerald-500 font-normal">AI</span>
          </h1>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          {history.length > 0 && (
            <button
              onClick={() => setHistory([])}
              className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-500 dark:text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
              aria-label="Clear chat"
              title="Bersihkan Chat"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}
          <button
            onClick={toggleDarkMode}
            className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors"
            aria-label="Toggle dark mode"
          >
            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Main Chat Area */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6 w-full max-w-4xl mx-auto space-y-6 scroll-smooth">
        {history.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-5 pt-12 md:pt-24 opacity-80 animate-in fade-in duration-700 zoom-in-95">
            <div className="w-24 h-24 bg-gradient-to-br from-emerald-100 to-emerald-50 dark:from-emerald-900/40 dark:to-emerald-800/20 shadow-inner rounded-full flex items-center justify-center text-emerald-500 dark:text-emerald-400 mb-2 transition-colors relative">
               <div className="absolute inset-0 rounded-full border border-emerald-200/50 dark:border-emerald-700/30"></div>
               <ChefHat className="w-12 h-12 relative z-10" />
            </div>
            <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-50 transition-colors tracking-tight">Halo, saya Nutri! 👋</h2>
            <p className="max-w-md text-slate-500 dark:text-slate-400 transition-colors leading-relaxed">
              Kirim nama makanan Indonesia atau foto hidanganmu, dan saya akan bantu cek kandungan gizinya dengan cepat dan akurat.
            </p>
            <div className="flex flex-wrap justify-center gap-3 mt-6 text-xs text-emerald-600 dark:text-emerald-300 font-semibold tracking-wide transition-colors">
              <span className="bg-emerald-50 dark:bg-emerald-500/10 px-4 py-2 rounded-full border border-emerald-200/50 dark:border-emerald-500/20">"Kalori Nasi Goreng"</span>
              <span className="bg-emerald-50 dark:bg-emerald-500/10 px-4 py-2 rounded-full border border-emerald-200/50 dark:border-emerald-500/20">"Kandungan Gado-Gado"</span>
              <span className="bg-emerald-50 dark:bg-emerald-500/10 px-4 py-2 rounded-full border border-emerald-200/50 dark:border-emerald-500/20 flex items-center gap-1.5"><ImageIcon className="w-3.5 h-3.5"/> Upload Foto</span>
            </div>
          </div>
        ) : (
          history.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 15, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
            >
              <div
                className={`max-w-[92%] md:max-w-[85%] p-5 md:p-6 transition-all duration-300 ${
                  msg.role === "user"
                    ? "bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rounded-3xl rounded-tr-sm shadow-md shadow-emerald-500/20"
                    : "bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/60 text-slate-800 dark:text-slate-200 rounded-3xl rounded-tl-sm shadow-sm"
                }`}
              >
                {msg.parts.map((p, idx) => {
                  const hasText = !!p.text;
                  const extracted = hasText ? extractNutritionData(p.text!) : { data: null, cleanText: "" };

                  return (
                    <div key={idx} className="space-y-4">
                      {p.inlineData && (
                        <img
                          src={`data:${p.inlineData.mimeType};base64,${p.inlineData.data}`}
                          className="max-w-xs md:max-w-sm rounded-2xl shadow-sm border border-black/5 dark:border-white/5"
                          alt="Uploaded food"
                        />
                      )}
                      {hasText && (
                        <div className={`prose prose-sm md:prose-base ${msg.role === "user" ? "prose-invert" : "dark:prose-invert"} max-w-none break-words leading-relaxed`}>
                          <ReactMarkdown>{extracted.cleanText}</ReactMarkdown>
                        </div>
                      )}
                      {extracted.data && msg.role === "model" && (
                        <div className="space-y-5 pt-2">
                          <NutritionChart data={extracted.data} dailyTargets={dailyTargets} />
                          {!extracted.data.consumed ? (
                            <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800/80 mt-5">
                              <button 
                                onClick={() => markAsConsumed(i)}
                                className="text-sm rounded-xl font-medium bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 py-2.5 px-5 transition-colors border border-emerald-200/50 dark:border-emerald-500/20"
                              >
                                ✓ Saya konsumsi ini
                              </button>
                            </div>
                          ) : (
                            <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800/80 mt-5">
                              <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 opacity-80 bg-emerald-50/50 dark:bg-emerald-500/5 px-3 py-1.5 rounded-lg">
                                <ChefHat className="w-4 h-4" /> Tercatat di jurnal harian
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          ))
        )}

        {isLoading && (
           <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-start w-full md:w-[85%]"
          >
            <div className="w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/60 rounded-3xl rounded-tl-sm p-6 shadow-sm transition-colors">
              <div className="flex items-center gap-3 mb-5">
                <ChefHat className="text-emerald-500 w-5 h-5 animate-pulse" />
                <span className="text-sm font-medium text-slate-500 dark:text-slate-400 animate-pulse">Menyiapkan analisa nutrisi...</span>
              </div>
              <div className="space-y-3 animate-pulse">
                <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full w-3/4"></div>
                <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full w-full"></div>
                <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full w-5/6"></div>
              </div>
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} className="h-4" />
      </main>

      {/* Input Area */}
      <footer className="p-4 md:p-6 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800/80 sticky bottom-0 shrink-0 transition-colors">
        <div className="max-w-4xl mx-auto flex flex-col gap-3">
          {imagePreview && (
            <div className="relative w-max animate-in slide-in-from-bottom-2 duration-300">
              <img
                src={imagePreview}
                alt="Preview"
                className="h-28 max-w-xs object-cover rounded-2xl border-2 border-slate-200 dark:border-slate-700 shadow-sm"
              />
              <button
                type="button"
                onClick={removeImage}
                className="absolute -top-3 -right-3 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-full p-1.5 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-slate-700 transition-colors shadow-md border border-slate-200 dark:border-slate-700"
                aria-label="Remove image"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          <form
            onSubmit={handleSubmit}
            className="relative flex items-end bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-1.5 shadow-sm focus-within:ring-2 focus-within:ring-emerald-500/50 focus-within:border-emerald-500/50 transition-all"
          >
            <label
              htmlFor="image-upload"
              className="shrink-0 p-3.5 text-slate-400 hover:text-emerald-500 dark:hover:text-emerald-400 hover:bg-slate-200/50 dark:hover:bg-slate-800 rounded-2xl cursor-pointer transition-colors mb-0.5"
            >
              <ImageIcon className="w-5 h-5" />
              <input
                id="image-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageChange}
              />
            </label>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              placeholder="Tanya makanan apa hari ini..."
              className="flex-1 max-h-32 min-h-[52px] bg-transparent outline-none resize-none py-3.5 px-2 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 leading-relaxed mb-0.5 font-medium"
              rows={Math.min(input.split("\n").length, 4) || 1}
            />
            <div className="flex shrink-0 gap-2 mb-1.5 mr-1.5 p-0.5">
              <button
                type="submit"
                disabled={(!input.trim() && !imageFile) || isLoading}
                className="bg-emerald-500 dark:bg-emerald-600 text-white p-3 rounded-2xl shadow-sm hover:bg-emerald-600 dark:hover:bg-emerald-500 disabled:opacity-50 disabled:hover:bg-emerald-500 disabled:shadow-none transition-all flex items-center justify-center transform active:scale-95"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </form>
        </div>
      </footer>

      {/* Profile/Targets Modal */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm dark:bg-black/60 animate-in fade-in duration-200">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md shadow-xl border border-[#EDF2F0] dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]"
          >
            <div className="flex justify-between items-center p-6 border-b border-[#EDF2F0] dark:border-slate-800 shrink-0">
              <h2 className="text-xl font-bold flex items-center gap-2 text-[#1B4332] dark:text-emerald-50">
                <Settings2 className="w-5 h-5" /> Target Gizi Harian
              </h2>
              <button onClick={() => setIsProfileModalOpen(false)} className="text-[#95A5A6] hover:text-[#2D3436] dark:hover:text-slate-200 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-4">
              <p className="text-sm text-[#525B58] dark:text-slate-400 mb-2">Sesuaikan target harianmu agar analisis gizi Nutri lebih personal.</p>
              
              <div className="space-y-4">
                {[
                  { key: 'calories', label: 'Kalori', unit: 'kkal', max: 5000 },
                  { key: 'protein', label: 'Protein', unit: 'g', max: 300 },
                  { key: 'carbs', label: 'Karbohidrat', unit: 'g', max: 600 },
                  { key: 'fat', label: 'Lemak', unit: 'g', max: 200 },
                  { key: 'fiber', label: 'Serat', unit: 'g', max: 100 },
                  { key: 'sodium', label: 'Natrium (Max)', unit: 'mg', max: 5000 },
                  { key: 'sugar', label: 'Gula (Max)', unit: 'g', max: 200 },
                ].map(({ key, label, unit, max }) => (
                  <div key={key} className="bg-[#F9FAF8] dark:bg-slate-950 p-4 rounded-2xl border border-[#EDF2F0] dark:border-slate-800">
                    <div className="flex justify-between mb-2">
                       <label className="text-sm font-semibold text-[#2D3436] dark:text-slate-200">{label}</label>
                       <span className="text-xs font-medium text-[#40916C] dark:text-emerald-400 bg-[#E9F5EE] dark:bg-emerald-900/30 px-2 py-0.5 rounded-full">{tempTargets[key as keyof NutritionData]} {unit}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max={max}
                      step={key === 'calories' || key === 'sodium' ? 50 : 5}
                      value={tempTargets[key as keyof NutritionData] as number}
                      onChange={(e) => setTempTargets({...tempTargets, [key]: Number(e.target.value)})}
                      className="w-full accent-[#40916C]"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 border-t border-[#EDF2F0] dark:border-slate-800 shrink-0 flex gap-3">
               <button 
                  onClick={() => setTempTargets(DEFAULT_TARGETS)}
                  className="flex-1 py-3 px-4 rounded-xl font-semibold text-[#525B58] dark:text-slate-400 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors"
                >
                  Reset Default
                </button>
                <button 
                  onClick={handleSaveProfile}
                  className="flex-1 py-3 px-4 rounded-xl font-semibold text-white bg-[#40916C] hover:bg-[#2D6A4F] dark:bg-emerald-600 dark:hover:bg-emerald-700 transition-colors flex justify-center items-center gap-2 shadow-sm"
                >
                  <Save className="w-4 h-4" /> Simpan
                </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}