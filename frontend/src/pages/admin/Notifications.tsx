import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Send, Users, Shield, Megaphone, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import SEO from '@/components/SEO';

const Notifications: React.FC = () => {
  const [message, setMessage] = useState('');
  const [audience, setAudience] = useState<'All' | 'HODs' | 'Faculty'>('All');
  const [isSending, setIsSending] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleSend = async () => {
    if (!message.trim()) return;
    setIsSending(true);
    setStatus('idle');
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/notifications.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ message, audience })
      });
      const json = await res.json();
      if (json.status === 'success') {
        setStatus('success');
        setMessage('');
        setTimeout(() => setStatus('idle'), 5000);
      } else {
        setStatus('error');
      }
    } catch (e) {
      console.error(e);
      setStatus('error');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-4xl mx-auto space-y-6 sm:space-y-10">
      <SEO title="Global Broadcasts" description="Send system-wide announcements to all users." />
      
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-[#1E184B] dark:text-indigo-100 tracking-tight">Global Broadcasts</h1>
        <p className="text-[#1E184B]/60 dark:text-violet-400/60 mt-2 font-bold flex items-center gap-2 text-sm">
          <Megaphone className="w-4 h-4 text-indigo-500 dark:text-violet-400" />
          Send high-priority system announcements to the network.
        </p>
      </div>

      {status === 'success' && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-xl border border-emerald-100 dark:border-emerald-500/20 font-bold text-sm flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5" /> Broadcast dispatched successfully across the network!
        </motion.div>
      )}

      {status === 'error' && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 rounded-xl border border-rose-100 dark:border-rose-500/20 font-bold text-sm flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" /> Failed to send broadcast. Please try again.
        </motion.div>
      )}

      <div className="bg-white dark:bg-[#1A0F35]/20 backdrop-blur-md p-5 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] border border-slate-100 dark:border-violet-500/20 shadow-sm space-y-6 sm:space-y-8">
        <div className="space-y-4">
          <label className="text-sm font-black text-[#1E184B] dark:text-indigo-100 uppercase tracking-widest block">Select Audience</label>
          <div className="flex flex-wrap gap-4">
            {[
              { id: 'All', icon: Users, label: 'Entire Network', desc: 'All HODs & Faculties' },
              { id: 'HODs', icon: Shield, label: 'HODs Only', desc: 'Department Heads' },
              { id: 'Faculty', icon: Users, label: 'Faculty Only', desc: 'Teaching Staff' },
            ].map((target) => (
              <button
                key={target.id}
                onClick={() => setAudience(target.id as any)}
                className={`flex-1 flex flex-col items-center gap-2 p-6 rounded-2xl border-2 transition-all cursor-pointer ${
                  audience === target.id 
                    ? 'border-indigo-500 dark:border-violet-400 bg-indigo-50/50 dark:bg-violet-950/30 text-indigo-700 dark:text-indigo-200' 
                    : 'border-slate-100 dark:border-violet-500/10 hover:border-slate-300 dark:hover:border-violet-500/40 text-slate-500 dark:text-violet-400'
                }`}
              >
                <target.icon className={`w-8 h-8 ${audience === target.id ? 'text-indigo-500 dark:text-violet-400' : 'text-slate-400'}`} />
                <span className="font-black text-sm">{target.label}</span>
                <span className="text-[10px] font-bold opacity-70">{target.desc}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <label className="text-sm font-black text-[#1E184B] dark:text-indigo-100 uppercase tracking-widest block">Announcement Message</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your system announcement here..."
            className="w-full h-40 p-6 bg-slate-50 dark:bg-[#110A24] border-none rounded-2xl text-sm font-bold text-[#1E184B] dark:text-indigo-100 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none resize-none placeholder:text-slate-300 dark:placeholder:text-indigo-100/20"
          />
        </div>

        <div className="flex justify-end pt-4">
          <button
            onClick={handleSend}
            disabled={!message.trim() || isSending}
            className="px-10 py-5 bg-[#1E184B] dark:bg-violet-600 hover:bg-[#2D246B] dark:hover:bg-violet-700 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-[#1E184B]/20 dark:shadow-violet-900/10 transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center gap-3 cursor-pointer"
          >
            {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            {isSending ? 'Transmitting...' : 'Dispatch Broadcast'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Notifications;
