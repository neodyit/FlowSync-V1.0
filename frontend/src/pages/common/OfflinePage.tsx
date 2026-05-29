import React, { useState } from 'react';
import { WifiOff, RefreshCw, Signal, Globe } from 'lucide-react';

const OfflinePage: React.FC = () => {
  const [isChecking, setIsChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<'offline' | 'online' | null>(null);

  const handleRetry = async () => {
    setIsChecking(true);
    setCheckResult(null);
    
    try {
      // Fetch manifest or generic route with a cache buster to bypass SW/browser cache and verify internet access
      const response = await fetch('/manifest.json?t=' + Date.now(), {
        method: 'HEAD',
        cache: 'no-store',
      });
      if (response.ok) {
        setCheckResult('online');
        // Instantly reload page to restore normal application flow
        setTimeout(() => {
          window.location.reload();
        }, 800);
      } else {
        setCheckResult('offline');
      }
    } catch (e) {
      setTimeout(() => {
        setCheckResult('offline');
        setIsChecking(false);
      }, 1000); // Give user a tactile feel of checking
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans transition-colors duration-300">
      {/* Abstract Background Blurs for Premium Feel */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 opacity-60 dark:opacity-40">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[var(--accent)]/10 blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[var(--accent)]/5 blur-[120px] animate-pulse delay-1000" />
      </div>

      <div className="max-w-md w-full glass-card relative z-10 p-10 flex flex-col items-center text-center shadow-2xl">
        {/* Decorative Tag */}
        <span className="pill mb-6 animate-pulse">Connection Lost</span>

        {/* Animated Icon Container */}
        <div className="relative mb-8">
          <div className="w-24 h-24 bg-[var(--accent)]/10 dark:bg-[var(--accent)]/20 rounded-3xl flex items-center justify-center animate-shake">
            <WifiOff className="w-12 h-12 text-[var(--accent)]" />
          </div>
          {/* Pulsing signal halo */}
          <div className="absolute inset-0 rounded-3xl border-2 border-[var(--accent)]/20 animate-ping opacity-75" style={{ animationDuration: '3s' }} />
        </div>

        <h1 className="text-3xl font-black text-[var(--text-main)] mb-3 tracking-tight">Offline Mode</h1>
        <p className="text-sm text-[var(--text-muted)] dark:text-violet-300/80 mb-8 font-medium leading-relaxed max-w-xs">
          Your internet connection is currently down. FlowSync will resume synchronization automatically when connectivity is restored.
        </p>

        {/* Status indicator panel */}
        <div className="w-full bg-[var(--bg-secondary)] border border-[var(--card-border)] rounded-2xl p-4 flex items-center gap-4 mb-8">
          <div className="w-10 h-10 rounded-xl bg-[var(--card-bg)] flex items-center justify-center shadow-sm">
            {isChecking ? (
              <RefreshCw className="w-5 h-5 text-[var(--accent)] animate-spin" />
            ) : checkResult === 'online' ? (
              <Signal className="w-5 h-5 text-emerald-500 animate-bounce" />
            ) : (
              <Globe className="w-5 h-5 text-rose-500" />
            )}
          </div>
          <div className="text-left flex-1">
            <p className="text-[10px] font-black text-[var(--accent)] uppercase tracking-widest mb-0.5">Network Status</p>
            <p className="text-xs font-bold text-[var(--text-main)]">
              {isChecking
                ? 'Testing connection...'
                : checkResult === 'online'
                ? 'Back online! Reloading...'
                : 'Disconnected from server'}
            </p>
          </div>
        </div>

        {/* Action Button */}
        <button 
          onClick={handleRetry}
          disabled={isChecking}
          className="btn-primary w-full flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
          <span>{isChecking ? 'Verifying...' : 'Check Connection'}</span>
        </button>
      </div>

      {/* Footer Info */}
      <div className="mt-12 text-center relative z-10">
        <p className="text-xs font-bold text-[var(--text-main)]/40 uppercase tracking-widest mb-2">FlowSync Core Engine</p>
        <div className="flex items-center justify-center gap-2 text-[10px] text-[var(--accent)]/80">
          <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${checkResult === 'online' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
          <span>Offline Interceptor Active</span>
        </div>
      </div>
    </div>
  );
};

export default OfflinePage;
