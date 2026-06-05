import { useAuth } from "../contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { ChefHat, Chrome } from "lucide-react";
import { motion } from "motion/react";

export default function Login() {
  const { user, profile, signIn, logOut } = useAuth();

  if (user && profile) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-500/20 dark:bg-emerald-500/10 blur-[100px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-300/20 dark:bg-emerald-600/10 blur-[100px]" />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md relative z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-3xl p-8 sm:p-10 shadow-2xl shadow-emerald-900/5 dark:shadow-none text-center"
      >
        <div className="w-24 h-24 bg-gradient-to-br from-emerald-100 to-emerald-50 dark:from-emerald-900/40 dark:to-emerald-800/20 border border-emerald-200/50 dark:border-emerald-700/30 shadow-inner rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-400 mx-auto mb-8 relative">
          <ChefHat className="w-12 h-12" />
        </div>
        <h1 className="text-4xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight mb-3">Nutri AI</h1>
        <p className="text-slate-500 dark:text-slate-400 mb-10 leading-relaxed">
          {user && !profile 
            ? "Gagal memuat profil. Silakan coba lagi atau daftar ulang." 
            : "Platform cerdas untuk analisa dan panduan nutrisi asupan harianmu."}
        </p>
        
        {user && !profile ? (
          <button
            onClick={logOut}
            className="w-full bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 py-4 px-6 rounded-2xl font-semibold hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-all flex items-center justify-center gap-3"
          >
            Keluar dan Coba Lagi
          </button>
        ) : (
          <button
            onClick={signIn}
            className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-4 px-6 rounded-2xl font-semibold shadow-lg shadow-slate-900/20 dark:shadow-white/10 hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center justify-center gap-3"
          >
            <Chrome className="w-5 h-5 text-current" /> Lanjutkan dengan Google
          </button>
        )}
      </motion.div>
    </div>
  );
}
