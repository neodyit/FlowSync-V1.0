import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mail, 
  Lock, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle2, 
  Zap, 
  Target, 
  Users,
  Eye,
  EyeOff
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import SEO from '@/components/SEO';
import { clearLocalData } from '../utils/auth';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [version, setVersion] = useState('v1.0.0');
  const navigate = useNavigate();

  useEffect(() => {
    // Forcefully clear all cache, cookies, and local/session storage on entering login screen
    clearLocalData();

    fetch('/version.json?t=' + Date.now())
      .then(res => res.json())
      .then(data => {
        if (data && data.version) {
          setVersion(`v${data.version}`);
        }
      })
      .catch(err => console.error('Failed to load version:', err));
  }, []);

  const getDeviceFingerprint = (): string => {
    const parts = [
      navigator.userAgent,
      navigator.language,
      screen.colorDepth,
      screen.width + "x" + screen.height,
      new Date().getTimezoneOffset(),
      !!window.sessionStorage,
      !!window.localStorage
    ];
    const str = parts.join("###");
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = (hash * 33) ^ str.charCodeAt(i);
    }
    return (hash >>> 0).toString(16);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const fingerprint = getDeviceFingerprint();
      const response = await fetch(`${import.meta.env.VITE_API_URL}/login.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email, password, fingerprint }),
      });

      const data = await response.json();

      if (response.ok && data.status === 'success') {
        setSuccess(true);
        localStorage.setItem('user', JSON.stringify(data.user));
        setTimeout(() => {
          const roleId = parseInt(data.user.role_id);
          if (roleId === 1) navigate('/admin/dashboard');
          else if (roleId === 2) navigate('/hod/dashboard');
          else if (roleId === 3) navigate('/faculty/dashboard');
          else if (roleId === 4) navigate('/ia/dashboard');
          else navigate('/login');
        }, 1500);
      } else {
        setError(data.message || 'Authentication failed. Please check your credentials.');
      }
    } catch (err) {
      setError('System connection error. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  const features = [
    { icon: Zap, title: "Swift Tasking", desc: "Automated distribution workflows." },
    { icon: Target, title: "Precision Metrics", desc: "Real-time analytics dashboards." },
    { icon: Users, title: "Unified Sync", desc: "Seamless inter-department syncing." }
  ];

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#0B091B] font-sans selection:bg-[#7C3AED]/20 py-8 px-4 md:py-12 relative overflow-y-auto">
      <SEO title="Secure Workspace Login" description="Access the FlowSync institutional portal to manage academic workflows and departmental synchronization." />
      
      {/* Premium Background Mesh Blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-[300px] h-[300px] sm:w-[600px] sm:h-[600px] rounded-full bg-gradient-to-tr from-[#7C3AED]/30 to-[#EC4899]/30 blur-3xl -top-32 -left-32 sm:-top-64 sm:-left-64 animate-blob" style={{ animationDelay: '0s' }} />
        <div className="absolute w-[250px] h-[250px] sm:w-[500px] sm:h-[500px] rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-600/20 blur-3xl -bottom-24 sm:-bottom-48 right-0 animate-blob" style={{ animationDelay: '2s' }} />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, type: "spring", stiffness: 60 }}
        className="w-full max-w-[1000px] min-h-[500px] md:h-[620px] flex flex-col md:flex-row bg-white/5 backdrop-blur-2xl rounded-[2rem] sm:rounded-[3rem] shadow-[0_30px_100px_rgba(0,0,0,0.5)] overflow-hidden border border-white/10 relative z-10"
      >
        {/* Left Side - Branding Panel (Frosted Glow) - Hidden on phones, visible on tablets (md) and desktops */}
        <div className="hidden md:flex w-[44%] bg-gradient-to-br from-[#1E1B4B]/80 via-[#3B0764]/80 to-[#0F0829]/90 p-10 lg:p-12 relative overflow-hidden flex-col justify-between border-r border-white/5">
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent pointer-events-none" />
          <div className="absolute -top-32 -left-32 w-80 h-80 bg-[#7C3AED]/20 rounded-full blur-3xl pointer-events-none" />

          {/* Header Branding */}
          <div className="relative z-10">
            <div className="flex items-center gap-3.5 mb-14">
              <div className="w-11 h-11 bg-white/10 backdrop-blur-xl rounded-2xl flex items-center justify-center border border-white/10 shadow-inner hover:scale-105 transition-all cursor-pointer">
                <img src="/logo.png" alt="FlowSync Logo" className="w-6 h-6 object-contain filter brightness-110" />
              </div>
              <span className="text-lg font-black tracking-tight text-white flex items-center gap-1.5">
                FlowSync
                <span className="text-[9px] bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">{version}</span>
              </span>
            </div>

            <div className="space-y-4">
              <h1 className="text-3xl lg:text-4xl font-black text-white leading-tight tracking-tight">
                Institutional <br />
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-violet-300 via-purple-300 to-pink-300">Synchronicity</span>
              </h1>
              <p className="text-[13px] lg:text-[14px] font-bold text-slate-300/80 leading-relaxed max-w-[280px]">
                Orchestrating academic missions and task parameters into a single high-fidelity administrative experience.
              </p>
            </div>
          </div>

          {/* Frosted glass feature checklist */}
          <div className="relative z-10 space-y-5">
            {features.map((f, i) => (
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 + 0.3 }}
                key={f.title} 
                className="flex items-center gap-4 bg-white/5 backdrop-blur-md border border-white/5 p-3 rounded-2xl hover:bg-white/10 hover:border-white/10 hover:scale-[1.02] transition-all duration-300 group cursor-default"
              >
                <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-md">
                  <f.icon className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-xs group-hover:text-violet-300 transition-colors">{f.title}</h3>
                  <p className="text-slate-400 text-[10px] mt-0.5 leading-none">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Footer Metrics */}
          <div className="relative z-10 flex items-center gap-2 bg-emerald-500/5 border border-emerald-500/10 px-4 py-2 rounded-xl w-fit">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
            <p className="text-[9px] font-black text-emerald-300 uppercase tracking-widest">Platform Core Online</p>
          </div>
        </div>

        {/* Right Side - Login Panel */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10 md:p-12 lg:p-14 bg-slate-950/40 backdrop-blur-xl relative w-full h-auto md:h-full">
          {/* Subtle reflection overlay */}
          <div className="absolute inset-0 bg-gradient-to-tr from-white/[0.02] via-transparent to-transparent pointer-events-none" />

          {/* Mobile/Small Screen Branding (Shown only on small screens) */}
          <div className="md:hidden flex items-center gap-3.5 mb-8">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/20 overflow-hidden">
              <img src="/logo.png" alt="FlowSync Logo" className="w-5 h-5 object-contain" />
            </div>
            <span className="text-xl font-black tracking-tight text-white flex items-center gap-1.5">
              FlowSync
              <span className="text-[9px] bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">{version}</span>
            </span>
          </div>

          <div className="w-full max-w-sm relative z-10">
            <div className="mb-8 md:mb-10 text-center md:text-left">
              <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight mb-2">Workspace Access</h2>
              <p className="text-slate-400 text-[10px] sm:text-xs font-bold uppercase tracking-widest">Provide security credentials to sync</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 md:space-y-6">
              {/* Email Input */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4.5 flex items-center pointer-events-none">
                    <Mail className="h-4.5 w-4.5 text-slate-400 group-focus-within:text-violet-400 transition-colors" strokeWidth={2.5} />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 md:py-4 bg-white/5 border border-white/10 rounded-2xl outline-none text-white text-xs font-bold focus:bg-slate-900/60 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 transition-all placeholder:text-slate-500"
                    placeholder="name@institution.edu"
                    required
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-2">
                <div className="flex justify-between items-center ml-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Security Password</label>
                </div>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4.5 flex items-center pointer-events-none">
                    <Lock className="h-4.5 w-4.5 text-slate-400 group-focus-within:text-violet-400 transition-colors" strokeWidth={2.5} />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-12 pr-12 py-3.5 md:py-4 bg-white/5 border border-white/10 rounded-2xl outline-none text-white text-xs font-bold focus:bg-slate-900/60 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 transition-all placeholder:text-slate-500"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4.5 flex items-center text-slate-400 hover:text-violet-400 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4.5 w-4.5" strokeWidth={2} />
                    ) : (
                      <Eye className="h-4.5 w-4.5" strokeWidth={2} />
                    )}
                  </button>
                </div>
              </div>

              {/* Warnings and Alerts */}
              <AnimatePresence mode="wait">
                {error && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-rose-500/10 text-rose-300 p-4 rounded-2xl text-[11px] font-bold flex items-center gap-2.5 border border-rose-500/20"
                  >
                    <AlertCircle className="w-4.5 h-4.5 text-rose-400 flex-shrink-0" />
                    <span>{error}</span>
                  </motion.div>
                )}
                {success && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-emerald-500/10 text-emerald-300 p-4 rounded-2xl text-[11px] font-bold flex items-center gap-2.5 border border-emerald-500/20"
                  >
                    <CheckCircle2 className="w-4.5 h-4.5 text-emerald-400 flex-shrink-0" />
                    <span>Identity Verified. Synchronizing Session...</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Submit Button */}
              <motion.button
                whileHover={{ scale: 1.005 }}
                whileTap={{ scale: 0.995 }}
                type="submit"
                disabled={isLoading || success}
                className="w-full py-3.5 md:py-4 bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-600/10 hover:shadow-indigo-600/20 transition-all flex items-center justify-center gap-2.5 disabled:opacity-70 mt-4"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-[2.5px] border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    Establish Connection
                    <ArrowRight className="w-4 h-4 text-violet-200" strokeWidth={3} />
                  </>
                )}
              </motion.button>
            </form>

            {/* Bottom Credits */}
            <div className="mt-8 md:mt-12 text-center">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1.5">
                FlowSync Institutional Core • © 2026
              </p>
              <p className="text-[8px] font-black text-slate-400/40 uppercase tracking-wider flex items-center justify-center gap-1">
                Engineered by 
                <a href="https://dev.neodyit.in" target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:text-violet-300 transition-colors font-bold underline">
                  Neody IT
                </a>
              </p>
            </div>
          </div>
        </div>
      </motion.div>
      
      {/* CSS Styles for Animated meshes */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(20px, -30px) scale(1.05); }
          66% { transform: translate(-10px, 15px) scale(0.98); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob {
          animation: blob 8s infinite alternate ease-in-out;
        }
      `}} />
    </div>
  );
};

export default Login;
