import React, { useState } from 'react';
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

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/login.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
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
    { icon: Zap, title: "Swift Tasking", desc: "Automated distribution." },
    { icon: Target, title: "Metrics", desc: "Performance tracking." },
    { icon: Users, title: "Unified", desc: "Seamless communication." }
  ];

  return (
    <div className="h-screen w-full flex items-center justify-center bg-[#FDFCFE] font-sans selection:bg-[#7C3AED]/10 overflow-hidden">
      <SEO title="Secure Workspace Login" description="Access the FlowSync institutional portal to manage academic workflows and departmental synchronization." />
      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-[950px] h-[580px] flex bg-white rounded-[32px] shadow-[0_20px_60px_rgba(124,58,237,0.06)] overflow-hidden border border-[#7C3AED]/5 mx-4"
      >
        {/* Left Side - Branding (Split Screen) */}
        <div className="hidden md:flex w-[45%] bg-gradient-to-br from-[#7C3AED] to-[#5B21B6] p-10 relative overflow-hidden flex-col justify-between">
          {/* Subtle background glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-20 -mt-20" />
          
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-12">
              <div className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/20 overflow-hidden">
                <img src="/logo.png" alt="FlowSync Logo" className="w-6 h-6 object-contain" />
              </div>
              <span className="text-xl font-bold tracking-tight text-white">FlowSync</span>
            </div>

            <div className="space-y-4">
              <h1 className="text-4xl font-bold text-white leading-tight">
                Institutional <br />
                <span className="text-purple-200">Efficiency.</span>
              </h1>
              <p className="text-[15px] text-purple-100/70 leading-relaxed max-w-[240px]">
                Orchestrating academic workflows into a singular, intuitive experience.
              </p>
            </div>
          </div>

          <div className="relative z-10 space-y-6">
            {features.map((f) => (
              <div key={f.title} className="flex items-center gap-4">
                <div className="p-2 rounded-lg bg-white/10">
                  <f.icon className="w-4 h-4 text-purple-200" />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-sm">{f.title}</h3>
                  <p className="text-purple-200/40 text-[11px] leading-none mt-1">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="relative z-10 flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <p className="text-[10px] font-bold text-purple-200/30 uppercase tracking-widest">v2.4 Ready</p>
          </div>
        </div>

        {/* Right Side - Login */}
        <div className="flex-1 flex flex-col items-center justify-center p-8 lg:p-12">
          {/* Mobile/Small Screen Branding */}
          <div className="md:hidden flex items-center gap-2 mb-8">
             <div className="w-8 h-8 bg-[#7C3AED] rounded-lg flex items-center justify-center shadow-lg shadow-purple-500/20 overflow-hidden">
                <img src="/logo.png" alt="FlowSync Logo" className="w-5 h-5 object-contain" />
              </div>
              <span className="text-lg font-bold tracking-tight text-gray-900">FlowSync</span>
          </div>

          <div className="w-full max-w-sm">
            <div className="mb-10 text-center md:text-left">
              <h2 className="text-2xl font-bold text-gray-900 tracking-tight mb-2">Workspace Login</h2>
              <p className="text-gray-400 text-sm font-medium">Enter your credentials to continue</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-[12px] font-bold text-gray-600 ml-1">Email Address</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="h-4.5 w-4.5 text-gray-300 group-focus-within:text-[#7C3AED] transition-colors" strokeWidth={2} />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:border-[#7C3AED] transition-all text-gray-900 text-[14px] placeholder:text-gray-300"
                    placeholder="name@institution.edu"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center ml-1">
                  <label className="text-[12px] font-bold text-gray-600">Security Password</label>
                </div>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-4.5 w-4.5 text-gray-300 group-focus-within:text-[#7C3AED] transition-colors" strokeWidth={2} />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-11 pr-12 py-3 bg-gray-50/50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:border-[#7C3AED] transition-all text-gray-900 text-[14px] placeholder:text-gray-300"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-300 hover:text-[#7C3AED] transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4.5 w-4.5" strokeWidth={2} />
                    ) : (
                      <Eye className="h-4.5 w-4.5" strokeWidth={2} />
                    )}
                  </button>
                </div>
              </div>

              <AnimatePresence mode="wait">
                {error && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-rose-50 text-rose-600 p-3 rounded-xl text-[12px] flex items-center gap-2 border border-rose-100"
                  >
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span className="font-semibold">{error}</span>
                  </motion.div>
                )}
                {success && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-emerald-50 text-emerald-600 p-3 rounded-xl text-[12px] flex items-center gap-2 border border-emerald-100"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span className="font-semibold">Authenticated. Redirecting...</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.button
                whileHover={{ scale: 1.005 }}
                whileTap={{ scale: 0.995 }}
                type="submit"
                disabled={isLoading || success}
                className="w-full py-3 bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-xl font-bold text-sm shadow-lg shadow-purple-500/10 transition-all flex items-center justify-center gap-2 disabled:opacity-70 mt-2"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-[2.5px] border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
                  </>
                )}
              </motion.button>
            </form>

            <div className="mt-10 text-center">
              <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest mb-1.5">
                FlowSync Institutional • © 2026
              </p>
              <p className="text-[9px] font-semibold text-gray-400/60 uppercase tracking-wider">
                Created and Managed by <a href="https://neodyit.in" target="_blank" rel="noopener noreferrer" className="text-[#8B5CF6] hover:text-[#A78BFA] transition-colors font-bold">Neody IT</a>
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
