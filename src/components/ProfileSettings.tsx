import { useState, useEffect } from "react";
import { X, Save, Settings, Sliders, User, ArrowRight } from "lucide-react";
import { motion } from "motion/react";
import { useAuth, UserProfile } from "../contexts/AuthContext";

interface ProfileSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProfileSettings({ isOpen, onClose }: ProfileSettingsProps) {
  const { profile, updateProfile } = useAuth();
  const [tempProfile, setTempProfile] = useState<Partial<UserProfile>>({});
  const [activeTab, setActiveTab] = useState<'physical' | 'manual'>('physical');

  useEffect(() => {
    if (profile) setTempProfile(profile);
  }, [profile, isOpen]);

  const handleSaveSettings = async () => {
    if (activeTab === 'physical') {
      // Recalculate TDEE and nutritional targets when saving physical profile data
      let weight = tempProfile.weight || 0;
      let height = tempProfile.height || 0;
      let age = tempProfile.age || 0;
      let gender = tempProfile.gender || 'male';
      let activityLevel = tempProfile.activityLevel || 1.2;
      let healthGoal = tempProfile.healthGoal || 'maintenance';

      // Mifflin-St Jeor Equation
      let bmr = (10 * weight) + (6.25 * height) - (5 * age);
      bmr += gender === 'male' ? 5 : -161;
      let tdee = bmr * activityLevel;
      
      if (healthGoal === 'weight_loss') tdee -= 500;
      else if (healthGoal === 'muscle_building') tdee += 500;

      let calories = Math.max(1200, Math.round(tdee));
      
      // Macro split
      let protein = Math.round(weight * 1.6); // 1.6g per kg of bodyweight
      let fat = Math.round((calories * 0.25) / 9); // 25% from fat
      let carbs = Math.round((calories - (protein * 4) - (fat * 9)) / 4); // remainder from carbs

      await updateProfile({
        ...tempProfile,
        dailyTargets: {
          ...tempProfile.dailyTargets,
          calories,
          protein,
          carbs,
          fat,
          fiber: tempProfile.dailyTargets?.fiber || 25,
          sodium: tempProfile.dailyTargets?.sodium || 2300,
          sugar: tempProfile.dailyTargets?.sugar || 50
        }
      });
    } else {
      // Save manual targets without recalculating
      await updateProfile({
        ...tempProfile
      });
    }
    onClose();
  };

  const handleTargetChange = (key: keyof UserProfile['dailyTargets'], value: number) => {
    setTempProfile(prev => ({
      ...prev,
      dailyTargets: {
        ...prev.dailyTargets!,
        [key]: value
      }
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm dark:bg-black/60 animate-in fade-in duration-200">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-3xl w-full max-w-md shadow-2xl shadow-emerald-500/5 dark:shadow-none border border-slate-200/50 dark:border-slate-800/50 overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <h2 className="text-xl font-bold flex items-center gap-2 text-slate-800 dark:text-slate-100 tracking-tight">
            <Settings className="w-5 h-5 text-emerald-500" /> Pengaturan Profil
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 p-2 rounded-full hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex border-b border-slate-100 dark:border-slate-800 shrink-0 bg-slate-50/50 dark:bg-slate-900/50">
          <button 
            className={`flex-1 py-3.5 text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${activeTab === 'physical' ? 'text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-500 bg-white dark:bg-slate-800/50' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/50'}`}
            onClick={() => setActiveTab('physical')}
          >
            <User className="w-4 h-4" /> Data Fisik (Otomatis)
          </button>
          <button 
            className={`flex-1 py-3.5 text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${activeTab === 'manual' ? 'text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-500 bg-white dark:bg-slate-800/50' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/50'}`}
            onClick={() => setActiveTab('manual')}
          >
            <Sliders className="w-4 h-4" /> Target Makro (Manual)
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto space-y-4">
          {activeTab === 'physical' ? (
            <div className="grid grid-cols-2 gap-5">
              <div className="col-span-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">Nama Panggilan</label>
                <input 
                  type="text" 
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 outline-none transition-all"
                  value={tempProfile.displayName || ""}
                  onChange={e => setTempProfile({...tempProfile, displayName: e.target.value})}
                />
              </div>
              <div className="col-span-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">Jenis Kelamin</label>
                <select 
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 outline-none transition-all"
                  value={tempProfile.gender || "male"}
                  onChange={e => setTempProfile({...tempProfile, gender: e.target.value as any})}
                >
                  <option value="male">Laki-laki</option>
                  <option value="female">Perempuan</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">Umur</label>
                <input 
                  type="number" 
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 outline-none transition-all"
                  value={tempProfile.age || 0}
                  onChange={e => setTempProfile({...tempProfile, age: Number(e.target.value)})}
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">Berat Badan (kg)</label>
                <input 
                  type="number" 
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 outline-none transition-all"
                  value={tempProfile.weight || 0}
                  onChange={e => setTempProfile({...tempProfile, weight: Number(e.target.value)})}
                />
              </div>
              <div className="col-span-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">Tinggi Badan (cm)</label>
                <input 
                  type="number" 
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 outline-none transition-all"
                  value={tempProfile.height || 0}
                  onChange={e => setTempProfile({...tempProfile, height: Number(e.target.value)})}
                />
              </div>
              <div className="col-span-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">Tingkat Aktivitas (Multiplier)</label>
                <select 
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 outline-none transition-all"
                  value={tempProfile.activityLevel || 1.2}
                  onChange={e => setTempProfile({...tempProfile, activityLevel: Number(e.target.value)})}
                >
                  <option value={1.2}>1.2 (Sangat jarang berolahraga)</option>
                  <option value={1.375}>1.375 (Olahraga ringan)</option>
                  <option value={1.55}>1.55 (Olahraga sedang)</option>
                  <option value={1.725}>1.725 (Olahraga berat)</option>
                  <option value={1.9}>1.9 (Sangat berat/atlet)</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">Tujuan Kesehatan</label>
                <select 
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 outline-none transition-all"
                  value={tempProfile.healthGoal || "maintenance"}
                  onChange={e => setTempProfile({...tempProfile, healthGoal: e.target.value as any})}
                >
                  <option value="weight_loss">Weight Loss (Turun Berat Badan)</option>
                  <option value="maintenance">Maintenance (Jaga Berat Badan)</option>
                  <option value="muscle_building">Muscle Build (Naik Massa Otot)</option>
                </select>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200/50 dark:border-amber-500/20 p-4 rounded-2xl flex gap-3">
                <Sliders className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-sm text-amber-700 dark:text-amber-400 font-medium leading-relaxed">
                  Atur target gizi harian secara manual. Menyimpan dari menu ini tidak akan mengubah atau menghitung ulang data fisik Anda.
                </p>
              </div>
              
              <div className="space-y-6">
              {[
                { key: 'calories', label: 'Kalori', unit: 'kkal', max: 5000, step: 50 },
                { key: 'carbs', label: 'Karbohidrat', unit: 'g', max: 500, step: 5 },
                { key: 'protein', label: 'Protein', unit: 'g', max: 300, step: 5 },
                { key: 'fat', label: 'Lemak', unit: 'g', max: 200, step: 5 }
              ].map(({ key, label, unit, max, step }) => (
                <div key={key} className="space-y-2">
                  <div className="flex justify-between items-end">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">{label}</label>
                    <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-100 dark:border-emerald-500/20">
                      {tempProfile.dailyTargets?.[key as keyof UserProfile['dailyTargets']] || 0} {unit}
                    </span>
                  </div>
                  <input 
                    type="range"
                    min="0"
                    max={max}
                    step={step}
                    value={tempProfile.dailyTargets?.[key as keyof UserProfile['dailyTargets']] as number || 0}
                    onChange={(e) => handleTargetChange(key as any, Number(e.target.value))}
                    className="w-full accent-emerald-500"
                  />
                </div>
              ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-slate-100 dark:border-slate-800 shrink-0 flex gap-3 bg-slate-50/50 dark:bg-slate-900/50">
            <button 
              onClick={handleSaveSettings}
              className="w-full py-4 px-6 rounded-2xl font-semibold text-white bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-500 transition-all flex justify-center items-center gap-2 shadow-lg shadow-slate-900/10 dark:shadow-none hover:-translate-y-0.5 active:scale-95"
            >
              {activeTab === 'physical' ? 'Simpan & Hitung Ulang' : 'Simpan Target Manual'} <ArrowRight className="w-4 h-4 ml-1" />
            </button>
        </div>
      </motion.div>
    </div>
  );
}
