import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  MessageSquare, 
  AlertCircle, 
  Send, 
  CheckCircle2, 
  HelpCircle,
  Bug
} from 'lucide-react';
import SEO from '@/components/SEO';

const Feedback: React.FC = () => {
  const [type, setType] = useState<'feedback' | 'issue'>('feedback');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/feedback.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ type, subject, message }),
      });
      
      const data = await response.json();
      
      if (data.status === 'success') {
        setIsSubmitted(true);
      } else {
        alert(data.message || 'Failed to submit feedback. Please try again.');
      }
    } catch (error) {
      console.error('Submission error:', error);
      alert('System connection error. Please try again later.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mb-6"
        >
          <CheckCircle2 className="w-10 h-10 text-emerald-500" />
        </motion.div>
        <h2 className="text-2xl font-black text-[#1E184B] mb-2">Submission Received</h2>
        <p className="text-slate-500 max-w-md mx-auto mb-8 font-medium">
          Thank you for helping us improve FlowSync. Our technical team will review your report shortly.
        </p>
        <button 
          onClick={() => setIsSubmitted(false)}
          className="px-8 py-3 bg-[#7C3AED] text-white rounded-xl font-bold text-sm shadow-lg shadow-[#7C3AED]/20 hover:bg-[#6D28D9] transition-all"
        > 
          Submit Another Report
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8">
      <SEO title="Report & Feedback" description="Submit issues or provide feedback to improve FlowSync." />
      
      <div className="mb-10">
        <h1 className="text-3xl font-black text-[#1E184B] tracking-tight">Report an Issue or Feedback</h1>
        <p className="text-slate-500 mt-2 font-medium">Help us synchronize excellence by reporting bugs or suggesting improvements.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Side - Info */}
        <div className="space-y-6">
          <div className="p-6 bg-white rounded-[24px] border border-[#7C3AED]/10 shadow-sm">
            <h3 className="text-xs font-black text-[#1E184B] uppercase tracking-widest mb-4">Why report?</h3>
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#7C3AED]/10 flex items-center justify-center shrink-0">
                  <Bug className="w-4 h-4 text-[#7C3AED]" />
                </div>
                <div>
                  <p className="text-[12px] font-bold text-[#1E184B]">Bug Fixes</p>
                  <p className="text-[10px] text-slate-400 font-medium">Found a glitch? Let us know.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#7C3AED]/10 flex items-center justify-center shrink-0">
                  <MessageSquare className="w-4 h-4 text-[#7C3AED]" />
                </div>
                <div>
                  <p className="text-[12px] font-bold text-[#1E184B]">New Ideas</p>
                  <p className="text-[10px] text-slate-400 font-medium">Suggest features you'd love.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#7C3AED]/10 flex items-center justify-center shrink-0">
                  <HelpCircle className="w-4 h-4 text-[#7C3AED]" />
                </div>
                <div>
                  <p className="text-[12px] font-bold text-[#1E184B]">UX Feedback</p>
                  <p className="text-[10px] text-slate-400 font-medium">Tell us how the portal feels.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 bg-[#7C3AED] rounded-[24px] text-white shadow-lg shadow-[#7C3AED]/20">
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center mb-4 border border-white/20">
              <AlertCircle className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-sm font-black uppercase tracking-widest mb-2">Priority Support</h3>
            <p className="text-[11px] text-purple-100 font-medium leading-relaxed opacity-80">
              Technical issues reported via this form are routed directly to our team for immediate inspection.
            </p>
            <div className="mt-6 pt-6 border-t border-white/10">
              <p className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-3">Dev & Maintenance Team</p>
              <div className="space-y-2">
                <p className="text-xs font-bold">Mayank Tiwari - CSE 1st year</p>
                <p className="text-xs font-bold">Saurabh Upadhyay - CSE 2nd year</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="bg-white p-8 rounded-[32px] border border-[#7C3AED]/10 shadow-xl shadow-[#7C3AED]/5 space-y-6">
            {/* Report Type */}
            <div className="space-y-3">
              <label className="text-[12px] font-black text-[#1E184B] uppercase tracking-widest ml-1">Report Type</label>
              <div className="flex gap-4">
                <button 
                  type="button"
                  onClick={() => setType('feedback')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border font-bold text-xs transition-all ${type === 'feedback' ? 'bg-[#7C3AED] border-[#7C3AED] text-white shadow-lg shadow-[#7C3AED]/20' : 'bg-white border-slate-100 text-slate-400 hover:border-[#7C3AED]/30'}`}
                >
                  <MessageSquare className="w-4 h-4" />
                  General Feedback
                </button>
                <button 
                  type="button"
                  onClick={() => setType('issue')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border font-bold text-xs transition-all ${type === 'issue' ? 'bg-[#7C3AED] border-[#7C3AED] text-white shadow-lg shadow-[#7C3AED]/20' : 'bg-white border-slate-100 text-slate-400 hover:border-[#7C3AED]/30'}`}
                >
                  <AlertCircle className="w-4 h-4" />
                  Report an Issue
                </button>
              </div>
            </div>

            {/* Subject */}
            <div className="space-y-1.5">
              <label className="text-[12px] font-black text-[#1E184B] uppercase tracking-widest ml-1">Subject Line</label>
              <input 
                type="text" 
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Briefly describe the topic..."
                required
                className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:bg-white focus:border-[#7C3AED] focus:ring-4 focus:ring-[#7C3AED]/5 transition-all text-sm font-medium text-[#1E184B]"
              />
            </div>

            {/* Message */}
            <div className="space-y-1.5">
              <label className="text-[12px] font-black text-[#1E184B] uppercase tracking-widest ml-1">Detailed Description</label>
              <textarea 
                rows={6}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Provide as much detail as possible..."
                required
                className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:bg-white focus:border-[#7C3AED] focus:ring-4 focus:ring-[#7C3AED]/5 transition-all text-sm font-medium text-[#1E184B] resize-none"
              />
            </div>

            <button 
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-2xl font-black text-sm shadow-xl shadow-[#7C3AED]/20 transition-all flex items-center justify-center gap-3 disabled:opacity-70"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-[3px] border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Submit Report
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Feedback;
