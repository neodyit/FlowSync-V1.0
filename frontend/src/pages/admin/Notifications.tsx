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
    <div className="p-8 max-w-4xl mx-auto space-y-10">
      <SEO title="Global Broadcasts" description="Send system-wide announcements to all users." />
      
      {/* Header */}
      <div>
        <h1 className="text-4xl font-black text-[#1E184B] tracking-tight">Global Broadcasts</h1>
        <p className="text-[#1E184B]/60 mt-2 font-bold flex items-center gap-2">
          <Megaphone className="w-4 h-4 text-indigo-500" />
          Send high-priority system announcements to the network.
        </p>
      </div>

      {status === 'success' && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100 font-bold text-sm flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5" /> Broadcast dispatched successfully across the network!
        </motion.div>
      )}

      {status === 'error' && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-rose-50 text-rose-600 rounded-xl border border-rose-100 font-bold text-sm flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" /> Failed to send broadcast. Please try again.
        </motion.div>
      )}

      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-8">
        <div className="space-y-4">
          <label className="text-sm font-black text-[#1E184B] uppercase tracking-widest block">Select Audience</label>
          <div className="flex flex-wrap gap-4">
            {[
              { id: 'All', icon: Users, label: 'Entire Network', desc: 'All HODs & Faculties' },
              { id: 'HODs', icon: Shield, label: 'HODs Only', desc: 'Department Heads' },
              { id: 'Faculty', icon: Users, label: 'Faculty Only', desc: 'Teaching Staff' },
            ].map((target) => (
              <button
                key={target.id}
                onClick={() => setAudience(target.id as any)}
                className={`flex-1 flex flex-col items-center gap-2 p-6 rounded-2xl border-2 transition-all ${
                  audience === target.id 
                    ? 'border-indigo-500 bg-indigo-50/50 text-indigo-700' 
                    : 'border-slate-100 hover:border-slate-300 text-slate-500'
                }`}
              >
                <target.icon className={`w-8 h-8 ${audience === target.id ? 'text-indigo-500' : 'text-slate-400'}`} />
                <span className="font-black text-sm">{target.label}</span>
                <span className="text-[10px] font-bold opacity-70">{target.desc}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <label className="text-sm font-black text-[#1E184B] uppercase tracking-widest block">Announcement Message</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your system announcement here..."
            className="w-full h-40 p-6 bg-slate-50 border-none rounded-2xl text-sm font-bold text-[#1E184B] focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none resize-none"
          />
        </div>

        <div className="flex justify-end pt-4">
          <button
            onClick={handleSend}
            disabled={!message.trim() || isSending}
            className="px-10 py-5 bg-[#1E184B] hover:bg-[#2D246B] text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-[#1E184B]/20 transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center gap-3"
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
