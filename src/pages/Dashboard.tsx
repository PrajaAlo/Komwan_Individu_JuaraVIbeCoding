import { useAuth } from "../contexts/AuthContext";
import { Navigate, Link } from "react-router-dom";
import { ChefHat, LogOut, ArrowRight, Activity, Moon, Sun, Utensils } from "lucide-react";
import { motion } from "motion/react";
import NutritionChart, { NutritionData } from "../components/NutritionChart";
import WeeklySummaryChart from "../components/WeeklySummaryChart";
import { useState, useEffect } from "react";
import { UserProfile } from "../contexts/AuthContext";
import ProfileSettings from "../components/ProfileSettings";
import { useTheme } from "../contexts/ThemeContext";
import Markdown from "react-markdown";

export default function Dashboard() {
  const { user, profile, logOut } = useAuth();
  const { isDarkMode, toggleDarkMode } = useTheme();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().split("T")[0]);
  const [dailyNutrition, setDailyNutrition] = useState<NutritionData>({
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber: 0,
    sodium: 0,
    sugar: 0,
  });
  const [consumedFoods, setConsumedFoods] = useState<any[]>([]);
  const [weeklyData, setWeeklyData] = useState<any[]>([]);
  const [isGeneratingRecipe, setIsGeneratingRecipe] = useState(false);
  const [recipeSuggestions, setRecipeSuggestions] = useState<string>("");

  const generateRecipe = async () => {
    setIsGeneratingRecipe(true);
    setRecipeSuggestions("");
    
    try {
      const saved = localStorage.getItem("nutri_chat_history");
      const foods: string[] = [];
      if (saved) {
        const history = JSON.parse(saved);
        history.forEach((msg: any) => {
          if (msg.role === "model" && msg.parts && msg.parts[0] && msg.parts[0].text) {
             const match = msg.parts[0].text.match(/```json\n([\s\S]*?)\n```/);
             if (match && match[1]) {
               try {
                 const data = JSON.parse(match[1]);
                 if (data && data.consumed) {
                   const cleanText = msg.parts[0].text.replace(/```json\n[\s\S]*?\n```/, '').trim();
                   // Take the first line or a short description to avoid too long texts
                   foods.push(cleanText.split('\n')[0].substring(0, 50));
                 }
               } catch (e) {}
             }
          }
        });
      }
      
      const foodContext = foods.length > 0 
        ? `Makanan yang sering dikonsumsi: ${foods.slice(0, 20).join(", ")}.` // Limit to recent 20 for context
        : "Belum banyak riwayat makanan.";
      
      const prompt = `${foodContext}\nBerdasarkan daftar makanan yang sering dikonsumsi pengguna tersebut, berikan 3 saran resep sehat dan bergizi yang mudah dibuat. Berikan bahan-bahan dan cara singkat pembuatannya. Format dengan rapi menggunakan Markdown. Jangan sertakan json di output.`;

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          history: [], 
          message: prompt 
        }),
      });

      const data = await response.json();
      if (data.text) {
        setRecipeSuggestions(data.text);
      } else {
        setRecipeSuggestions("Gagal mendapatkan saran resep. Coba lagi.");
      }
    } catch (error) {
      setRecipeSuggestions("Terjadi kesalahan jaringan.");
    } finally {
      setIsGeneratingRecipe(false);
    }
  };

  useEffect(() => {
    try {
      const saved = localStorage.getItem("nutri_chat_history");
      if (saved) {
        const history = JSON.parse(saved);
        let totals = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sodium: 0, sugar: 0 };
        const foods: any[] = [];
        
        // Prepare weekly data map
        const weeklyMap: Record<string, { calories: number; protein: number; carbs: number; fat: number; }> = {};
        for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const dateStr = d.toISOString().split("T")[0];
          weeklyMap[dateStr] = { calories: 0, protein: 0, carbs: 0, fat: 0 };
        }
        
        history.forEach((msg: any) => {
          if (msg.role === "model" && msg.parts && msg.parts[0] && msg.parts[0].text) {
             const msgDate = msg.timestamp ? new Date(msg.timestamp).toISOString().split("T")[0] : new Date().toISOString().split("T")[0];
             
             const match = msg.parts[0].text.match(/```json\n([\s\S]*?)\n```/);
             if (match && match[1]) {
               try {
                 const data = JSON.parse(match[1]);
                 if (data && data.consumed) {
                   if (msgDate === selectedDate) {
                     totals.calories += data.calories || 0;
                     totals.protein += data.protein || 0;
                     totals.carbs += data.carbs || 0;
                     totals.fat += data.fat || 0;
                     totals.fiber += data.fiber || 0;
                     totals.sodium += data.sodium || 0;
                     totals.sugar += data.sugar || 0;
                     
                     // Extract food name assuming it's above the JSON block
                     const cleanText = msg.parts[0].text.replace(/```json\n[\s\S]*?\n```/, '').trim();
                     foods.push({
                       data,
                       text: cleanText,
                       timestamp: msg.timestamp || Date.now()
                     });
                   }
                   
                   if (weeklyMap[msgDate]) {
                     weeklyMap[msgDate].calories += data.calories || 0;
                     weeklyMap[msgDate].protein += data.protein || 0;
                     weeklyMap[msgDate].carbs += data.carbs || 0;
                     weeklyMap[msgDate].fat += data.fat || 0;
                   }
                 }
               } catch (e) {}
             }
          }
        });
        
        setDailyNutrition(totals);
        setConsumedFoods(foods.sort((a, b) => b.timestamp - a.timestamp));
        
        const formattedWeeklyData = Object.keys(weeklyMap).map(dateStr => {
          const [, m, d] = dateStr.split("-");
          return {
            date: `${d}/${m}`,
            ...weeklyMap[dateStr]
          };
        });
        setWeeklyData(formattedWeeklyData);
      }
    } catch (e) {}
  }, [selectedDate]);

  
  if (!user || !profile) {
    return <Navigate to="/login" replace />;
  }

  // Calculate TDEE/BMR
  const calculateTDEE = (p: Partial<UserProfile> | null) => {
    if (!p || !p.weight || !p.height || !p.age || !p.gender || !p.activityLevel) return 0;
    // Mifflin-St Jeor Equation
    let bmr = (10 * p.weight) + (6.25 * p.height) - (5 * p.age);
    bmr += p.gender === 'male' ? 5 : -161;
    let tdee = bmr * p.activityLevel;
    
    // Adjust based on health goal
    if (p.healthGoal === 'weight_loss') tdee -= 500;
    if (p.healthGoal === 'muscle_building') tdee += 500;

    return Math.max(1200, Math.round(tdee)); // minimum 1200 calories
  };
  
  const estimatedTDEE = calculateTDEE(profile);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-800 dark:text-slate-200 transition-colors duration-300">
      {/* Header */}
      <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex justify-between items-center sticky top-0 z-40 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-emerald-600 dark:from-emerald-500 dark:to-emerald-700 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-emerald-500/20 transition-colors">
            <ChefHat className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-800 dark:text-slate-50">
            Nutri <span className="text-emerald-500 font-normal">Dashboard</span>
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={toggleDarkMode}
            className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors"
            aria-label="Toggle dark mode"
          >
            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          <span className="text-sm font-medium text-slate-600 dark:text-slate-400 hidden sm:inline">
            {profile.displayName}
          </span>
          <button
            onClick={logOut}
            className="flex items-center gap-2 text-sm font-semibold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 px-3 py-2 rounded-xl transition-colors"
          >
            <LogOut className="w-4 h-4" /> <span className="hidden sm:inline">Keluar</span>
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 md:p-6 space-y-8">
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="col-span-1 md:col-span-2 bg-gradient-to-br from-slate-900 to-slate-800 dark:from-emerald-900 dark:to-slate-900 rounded-3xl p-8 sm:p-10 relative overflow-hidden flex flex-col justify-center shadow-xl shadow-slate-900/10 border border-slate-800"
          >
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-emerald-500/20 blur-[80px] rounded-full" />
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] dark:opacity-10 mix-blend-overlay">
              <ChefHat className="w-64 h-64 text-white" />
            </div>
            <div className="relative z-10 text-white">
              <h2 className="text-3xl md:text-4xl font-extrabold mb-3 tracking-tight">Halo, {profile.displayName.split(" ")[0]}!</h2>
              <p className="text-slate-300 dark:text-emerald-100/80 mb-8 max-w-md leading-relaxed text-lg font-light">Siap untuk memantau asupan gizi hari ini? Nutri AI siap membantu menganalisis makananmu.</p>
              <Link 
                to="/chat" 
                className="inline-flex items-center gap-3 bg-emerald-500 hover:bg-emerald-400 text-white shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 font-bold py-3.5 px-7 rounded-2xl transition-all transform hover:-translate-y-0.5 active:scale-95"
                title="Mulai Chat Baru"
              >
                Mulai Chat Nutri AI <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-3xl p-6 md:p-8 shadow-sm flex flex-col justify-between"
          >
            <div>
              <div className="flex border-b border-slate-100 dark:border-slate-800 pb-5 mb-5 gap-4 items-center">
                <div className="p-3 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl border border-emerald-100 dark:border-emerald-500/20 shadow-sm">
                  <Activity className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-slate-200">BMR & TDEE</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Estimasi Kebutuhan Kalori</p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Target Kamu:</span>
                  <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-100 dark:border-emerald-500/20">
                    {profile.healthGoal === "weight_loss" ? "Weight Loss" : profile.healthGoal === "muscle_building" ? "Muscle Build" : "Maintenance"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Estimasi TDEE:</span>
                  <span className="font-extrabold text-xl text-slate-800 dark:text-slate-200">{estimatedTDEE} <span className="text-sm font-semibold text-slate-400">kkal</span></span>
                </div>
                <div className="flex justify-between items-center">
                   <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Target Sistem:</span>
                   <span className="font-extrabold text-xl text-slate-800 dark:text-slate-200">{profile.dailyTargets.calories} <span className="text-sm font-semibold text-slate-400">kkal</span></span>
                </div>
              </div>
            </div>
            <button onClick={() => setIsSettingsOpen(true)} className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 mt-6 inline-block text-center border border-emerald-200/50 hover:bg-emerald-50 dark:border-emerald-500/30 dark:hover:bg-emerald-500/10 py-3 rounded-2xl w-full transition-colors">
              Ubah Data Fisik & Tujuan
            </button>
          </motion.div>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-3xl p-6 md:p-8 shadow-sm flex flex-col"
        >
           <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4 border-b border-slate-100 dark:border-slate-800 pb-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-1.5 tracking-tight">Riwayat Nutrisi Harian</h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm">Akumulasi asupan gizimu berdasarkan makanan yang dikonsumsi.</p>
              </div>
              <div className="flex gap-2 self-start md:self-auto items-center">
                <button
                  onClick={() => {
                    const d = new Date(selectedDate);
                    d.setDate(d.getDate() - 1);
                    setSelectedDate(d.toISOString().split("T")[0]);
                  }}
                  className="p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:border-emerald-200 hover:bg-emerald-50 dark:hover:border-emerald-800 dark:hover:bg-emerald-900/40 rounded-xl transition-all"
                >
                  &larr;
                </button>
                <div className="flex gap-1.5 sm:gap-2">
                  <select
                    value={selectedDate.split("-")[2]}
                    onChange={(e) => {
                      const parts = selectedDate.split("-");
                      parts[2] = e.target.value;
                      setSelectedDate(parts.join("-"));
                    }}
                    className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-xl px-2 sm:px-4 py-3 text-sm font-semibold focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 cursor-pointer text-center appearance-none"
                  >
                    {Array.from({ length: new Date(parseInt(selectedDate.split("-")[0]), parseInt(selectedDate.split("-")[1]), 0).getDate() || 31 }, (_, i) => i + 1).map(d => {
                      const val = d.toString().padStart(2, '0');
                      return <option key={val} value={val}>{val}</option>;
                    })}
                  </select>
                  <select
                    value={selectedDate.split("-")[1]}
                    onChange={(e) => {
                      const parts = selectedDate.split("-");
                      parts[1] = e.target.value;
                      
                      const year = parseInt(parts[0]);
                      const month = parseInt(parts[1]);
                      const maxDays = new Date(year, month, 0).getDate();
                      
                      if (parseInt(parts[2]) > maxDays) {
                         parts[2] = maxDays.toString().padStart(2, '0');
                      }
                      
                      setSelectedDate(parts.join("-"));
                    }}
                    className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-xl px-2 sm:px-4 py-3 text-sm font-semibold focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 cursor-pointer text-center appearance-none"
                  >
                    {[
                      { v: "01", l: "Jan" }, { v: "02", l: "Feb" }, { v: "03", l: "Mar" }, { v: "04", l: "Apr" },
                      { v: "05", l: "Mei" }, { v: "06", l: "Jun" }, { v: "07", l: "Jul" }, { v: "08", l: "Ags" },
                      { v: "09", l: "Sep" }, { v: "10", l: "Okt" }, { v: "11", l: "Nov" }, { v: "12", l: "Des" }
                    ].map(m => (
                      <option key={m.v} value={m.v}>{m.l}</option>
                    ))}
                  </select>
                  <select
                    value={selectedDate.split("-")[0]}
                    onChange={(e) => {
                      const parts = selectedDate.split("-");
                      parts[0] = e.target.value;
                      
                      const year = parseInt(parts[0]);
                      const month = parseInt(parts[1]);
                      const maxDays = new Date(year, month, 0).getDate();
                      
                      if (parseInt(parts[2]) > maxDays) {
                         parts[2] = maxDays.toString().padStart(2, '0');
                      }
                      
                      setSelectedDate(parts.join("-"));
                    }}
                    className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-xl px-2 sm:px-4 py-3 text-sm font-semibold focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 cursor-pointer text-center appearance-none"
                  >
                    {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(y => (
                      <option key={y} value={y.toString()}>{y}</option>
                    ))}
                  </select>
                </div>
                <button
                  disabled={selectedDate === new Date().toISOString().split("T")[0]}
                  onClick={() => {
                    const d = new Date(selectedDate);
                    d.setDate(d.getDate() + 1);
                    setSelectedDate(d.toISOString().split("T")[0]);
                  }}
                  className="p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:border-emerald-200 hover:bg-emerald-50 dark:hover:border-emerald-800 dark:hover:bg-emerald-900/40 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  &rarr;
                </button>
                <Link to="/chat" className="text-sm font-semibold text-white bg-emerald-500 hover:bg-emerald-400 shadow-md shadow-emerald-500/20 px-5 py-3 rounded-xl whitespace-nowrap transition-all hover:-translate-y-0.5 active:scale-95 flex items-center justify-center gap-2">
                  Makan Apa? <ChefHat className="w-4 h-4" />
                </Link>
              </div>
           </div>
           
           <div className="max-w-4xl mx-auto w-full space-y-8">
             <NutritionChart data={dailyNutrition} dailyTargets={profile.dailyTargets} />
             
             {consumedFoods.length > 0 && (
               <div className="mt-8">
                 <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-5">Konsumsi pada {selectedDate}</h3>
                 <div className="space-y-4">
                   {consumedFoods.map((food, idx) => (
                     <div key={idx} className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex flex-col md:flex-row justify-between md:items-center gap-5 transition-colors hover:border-emerald-200 dark:hover:border-emerald-500/30">
                       <div className="flex-1">
                         <div className="text-sm font-medium text-slate-800 dark:text-slate-200 prose prose-sm dark:prose-invert line-clamp-2 leading-relaxed">
                           {food.text || "Makanan Terdata"}
                         </div>
                         <div className="text-xs font-semibold text-slate-400 dark:text-slate-500 mt-2">
                           {new Date(food.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                         </div>
                       </div>
                       <div className="flex flex-wrap gap-2 shrink-0">
                         <span className="text-xs font-bold px-3 py-1.5 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-lg whitespace-nowrap border border-rose-100 dark:border-rose-500/20">Kal: {food.data.calories}</span>
                         <span className="text-xs font-bold px-3 py-1.5 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg whitespace-nowrap border border-blue-100 dark:border-blue-500/20">Pro: {food.data.protein}g</span>
                         <span className="text-xs font-bold px-3 py-1.5 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg whitespace-nowrap border border-amber-100 dark:border-amber-500/20">Kar: {food.data.carbs}g</span>
                         <span className="text-xs font-bold px-3 py-1.5 bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 rounded-lg whitespace-nowrap border border-orange-100 dark:border-orange-500/20">Lem: {food.data.fat}g</span>
                       </div>
                     </div>
                   ))}
                 </div>
               </div>
             )}
             
             {consumedFoods.length === 0 && (
               <div className="text-center py-10 bg-slate-50 dark:bg-slate-800/20 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl">
                 <p className="text-slate-500 dark:text-slate-400 font-medium">Tidak ada catatan makanan untuk tanggal ini.</p>
               </div>
             )}
           </div>
        </motion.div>

        {/* Ringkasan Gizi Mingguan */}
        <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.25 }}
           className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-3xl p-6 md:p-8 shadow-sm flex flex-col mb-8"
        >
           <div className="mb-6 border-b border-slate-100 dark:border-slate-800 pb-6">
             <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-1.5 flex items-center gap-3 tracking-tight">
               <div className="p-2.5 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl border border-emerald-100 dark:border-emerald-500/20">
                 <Activity className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
               </div>
               Tren Gizi Mingguan
             </h2>
             <p className="text-slate-500 dark:text-slate-400 text-sm">Pola asupan kalori dan makronutrisi selama 7 hari terakhir.</p>
           </div>
           
           <div className="w-full">
             {weeklyData.length > 0 ? (
               <WeeklySummaryChart data={weeklyData} />
             ) : (
               <div className="text-center py-10 bg-slate-50 dark:bg-slate-800/20 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl">
                 <p className="text-slate-500 dark:text-slate-400 font-medium">Belum ada data untuk grafik mingguan.</p>
               </div>
             )}
           </div>
        </motion.div>

        {/* Saran Resep Sehat */}
        <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.3 }}
           className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-3xl p-6 md:p-8 shadow-sm flex flex-col"
        >
           <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-5 border-b border-slate-100 dark:border-slate-800 pb-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-1.5 flex items-center gap-3 tracking-tight">
                  <div className="p-2.5 bg-amber-50 dark:bg-amber-500/10 rounded-xl border border-amber-100 dark:border-amber-500/20">
                    <Utensils className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  Saran Resep Sehat
                </h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm">Dapatkan inspirasi menu bergizi berbasis makanan favoritmu.</p>
              </div>
              <button
                onClick={generateRecipe}
                disabled={isGeneratingRecipe}
                className="text-sm font-bold text-slate-900 dark:text-slate-900 bg-emerald-400 hover:bg-emerald-300 px-6 py-3.5 rounded-2xl whitespace-nowrap transition-all flex items-center justify-center gap-2 disabled:opacity-70 shadow-lg shadow-emerald-400/20 hover:-translate-y-0.5 active:scale-95"
              >
                {isGeneratingRecipe ? (
                  <>
                     <span className="w-4 h-4 rounded-full border-2 border-slate-900/30 border-t-slate-900 animate-spin"></span>
                     Meracik Resep...
                  </>
                ) : (
                  "Buat Saran Resep"
                )}
              </button>
           </div>
           
           <div className="w-full">
             {recipeSuggestions ? (
               <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-3xl p-6 md:p-8 prose prose-emerald dark:prose-invert max-w-none text-sm md:text-base leading-relaxed">
                 <Markdown>{recipeSuggestions}</Markdown>
               </div>
             ) : (
               <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/20 border border-slate-200 dark:border-slate-800 rounded-3xl border-dashed">
                 <ChefHat className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-5" />
                 <p className="text-slate-500 dark:text-slate-400 font-medium">Klik tombol di atas untuk mendapatkan resep berdasarkan riwayat asupan gizimu.</p>
               </div>
             )}
           </div>
        </motion.div>

      </main>

      {/* Settings Modal */}
      <ProfileSettings 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
      />
    </div>
  );
}
