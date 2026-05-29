import React from 'react';
import { Compass, Home, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const NotFound: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans transition-colors duration-300">
      {/* Abstract Background Blurs for Depth */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 opacity-60 dark:opacity-40">
        <div className="absolute top-[-5%] right-[-5%] w-[45%] h-[45%] rounded-full bg-[var(--accent)]/10 blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-5%] left-[-5%] w-[45%] h-[45%] rounded-full bg-[var(--accent)]/5 blur-[120px] animate-pulse delay-700" />
      </div>

      <div className="max-w-md w-full glass-card relative z-10 p-10 flex flex-col items-center text-center shadow-2xl">
        {/* Decorative Compass Icon */}
        <div className="relative mb-6">
          <div className="w-24 h-24 bg-[var(--accent)]/10 dark:bg-[var(--accent)]/20 rounded-3xl flex items-center justify-center animate-bounce" style={{ animationDuration: '3s' }}>
            <Compass className="w-12 h-12 text-[var(--accent)] animate-spin-slow" style={{ animationDuration: '8s' }} />
          </div>
          <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-[var(--bg-secondary)] border border-[var(--card-border)] rounded-lg shadow-sm flex items-center justify-center">
            <span className="text-xs font-black text-[var(--accent)]">404</span>
          </div>
        </div>

        {/* Big Premium 404 Text */}
        <h1 className="text-8xl font-black tracking-tighter text-[var(--accent)] mb-4 select-none filter drop-shadow-[0_4px_12px_rgba(124,58,237,0.15)]">
          404
        </h1>

        <h2 className="text-2xl font-black text-[var(--text-main)] mb-3 tracking-tight">Lost in the Flow?</h2>
        <p className="text-sm text-[var(--text-muted)] dark:text-violet-300/80 mb-8 font-medium leading-relaxed max-w-xs">
          The coordinates you requested do not exist in our sync databases. Let's redirect you to coordinates with better connectivity.
        </p>

        {/* Dynamic Buttons Container */}
        <div className="w-full flex flex-col gap-3">
          <button 
            onClick={() => navigate('/')}
            className="btn-primary w-full flex items-center justify-center gap-3 cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>Go to Dashboard</span>
          </button>
          
          <button 
            onClick={() => navigate(-1)}
            className="w-full py-3.5 rounded-2xl border border-[var(--card-border)] text-sm font-bold text-[var(--text-main)] hover:bg-[var(--accent)]/5 active:scale-95 transition-all flex items-center justify-center gap-3 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Go Back</span>
          </button>
        </div>
      </div>

      {/* Footer Info */}
      <div className="mt-12 text-center relative z-10">
        <p className="text-xs font-bold text-[var(--text-main)]/40 uppercase tracking-widest mb-2">FlowSync Navigation Core</p>
        <div className="flex items-center justify-center gap-2 text-[10px] text-[var(--accent)]/60">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
          <span>Invalid Address Handled Gracefully</span>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
