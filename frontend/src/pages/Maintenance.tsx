import React from 'react';
import { Settings, ShieldAlert, Clock, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { clearAuthAndRefresh } from '../utils/auth';

const Maintenance: React.FC = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    clearAuthAndRefresh();
  };

  React.useEffect(() => {
    const validate = async () => {
      const { checkSession } = await import('../utils/auth');
      const sessionData = await checkSession();
      if (sessionData && sessionData.session && !sessionData.session.maintenance) {
        // Maintenance mode is off, redirect to their dashboard
        navigate('/');
      }
    };

    const interval = setInterval(validate, 10000); // Check every 10 seconds
    return () => clearInterval(interval);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-[#EDE9FE] flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Abstract Background Shapes */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 opacity-40">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-[#7C3AED]/20 blur-3xl animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[#4C1D95]/10 blur-3xl animate-pulse delay-1000" />
      </div>

      <div className="max-w-md w-full glass-card relative z-10 p-10 flex flex-col items-center text-center">
        {/* Animated Icon */}
        <div className="relative mb-8">
          <div className="w-24 h-24 bg-[#7C3AED]/10 rounded-3xl flex items-center justify-center animate-shake">
            <Settings className="w-12 h-12 text-[#7C3AED] animate-spin-slow" style={{ animationDuration: '4s' }} />
          </div>
          <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-white rounded-xl shadow-lg flex items-center justify-center">
            <ShieldAlert className="w-5 h-5 text-rose-500" />
          </div>
        </div>

        <h1 className="text-3xl font-black text-[#1E1B4B] mb-3 tracking-tight">System Update</h1>
        <p className="text-sm text-[#4C1D95]/70 mb-8 font-medium leading-relaxed">
          FlowSync is currently undergoing scheduled maintenance to upgrade our infrastructure. We'll be back online shortly.
        </p>

        <div className="w-full bg-[#F5F3FF] border border-[#7C3AED]/10 rounded-2xl p-4 flex items-center gap-4 mb-8">
          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm">
            <Clock className="w-5 h-5 text-[#7C3AED]" />
          </div>
          <div className="text-left flex-1">
            <p className="text-[10px] font-black text-[#7C3AED] uppercase tracking-widest mb-0.5">Estimated Time</p>
            <p className="text-xs font-bold text-[#1E1B4B]">Check back in a few minutes</p>
          </div>
        </div>

        <button 
          onClick={handleLogout}
          className="btn-primary w-full flex items-center justify-center gap-3"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>

      {/* Footer Info */}
      <div className="mt-12 text-center relative z-10">
        <p className="text-xs font-bold text-[#1E1B4B]/40 uppercase tracking-widest mb-2">FlowSync Core Engine</p>
        <div className="flex items-center justify-center gap-2 text-[10px] text-[#7C3AED]/60">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
          <span>Maintenance Protocol Active</span>
        </div>
      </div>
    </div>
  );
};

export default Maintenance;
