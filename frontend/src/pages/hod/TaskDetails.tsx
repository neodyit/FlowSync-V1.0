import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  CheckCircle2, Clock, Users, ArrowLeft, Loader2, X, Download, Eye, FileText, BookOpen, Layers, Trophy, Bell, AlertTriangle, RotateCcw, Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Swal from 'sweetalert2';
import SEO from '@/components/SEO';
import { cn } from '@/lib/utils';

interface Assignment {
  id: number;
  user_id: number;
  faculty_name: string;
  faculty_email: string;
  faculty_pic: string | null;
  status: string;
  progress: number;
  points: number;
  bonus_points: number;
  public_remarks: string | null;
  private_remarks: string | null;
  submitted_at: string | null;
  submission_link: string | null;
  is_delayed: number;
  reminder_count: number;
  warning_count: number;
}

interface Attachment {
  id: number;
  file_name: string;
  file_path: string;
  file_type: string;
  entity_type: string;
  uploader_id: number | null;
  created_at: string;
}

interface Task {
  category: string;
  id: number;
  title: string;
  description: string;
  task_type: string;
  priority: string;
  deadline: string;
  status: string;
  created_at: string;
  task_link: string | null;
  points: number;
  bonus_points: number;
  aggregated_points?: number;
  aggregated_bonus_points?: number;
  assignment_mode: string;
  assigned_to_id: number | null;
  assignments: Assignment[];
  attachments: Attachment[];
}

export default function HODTaskDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [task, setTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Review states
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<number | null>(null);
  const [selectedAssignmentIds, setSelectedAssignmentIds] = useState<number[]>([]);
  const [bulkReviewData, setBulkReviewData] = useState({ status: 'Approved', points: 0, bonus_points: 0, remarks: '' });
  const [isBulkStatusDropdownOpen, setIsBulkStatusDropdownOpen] = useState(false);
  const [mobileDetailTab, setMobileDetailTab] = useState<'info' | 'evaluation'>('info');

  const fetchTask = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/hod/tasks.php`, { credentials: 'include' });
      const data = await response.json();
      if (data.status === 'success') {
        const found = data.data.find((t: Task) => t.id === parseInt(id || '0'));
        setTask(found || null);
      }
    } catch (error) {
      console.error('Failed to fetch task:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTask();
    const interval = setInterval(fetchTask, 10000);
    return () => clearInterval(interval);
  }, [id]);

  const updateReviewStatus = async (taskId: number, reviewData: any, facultyId: number) => {
    try {
      const formData = new FormData();
      formData.append('task_id', taskId.toString());
      formData.append('faculty_id', facultyId.toString());
      Object.entries(reviewData).forEach(([key, value]) => formData.append(key, String(value)));

      const response = await fetch(`${import.meta.env.VITE_API_URL}/hod/review_task.php`, {
        method: 'POST', body: formData, credentials: 'include'
      });
      const data = await response.json();
      if (data.status === 'success') {
        fetchTask();
        Swal.fire({ title: 'Success', text: data.message, icon: 'success', toast: true, position: 'top-end', timer: 2000, showConfirmButton: false });
      } else {
        Swal.fire('Error', data.message, 'error');
      }
    } catch (error) {
      Swal.fire('Error', 'Failed to update review status', 'error');
    }
  };

  const handleApproveContribution = async (taskId: number, facultyId: number, currentPoints: number) => {
    const { isConfirmed } = await Swal.fire({
      title: 'Approve Contribution?',
      html: `You are about to approve this contribution and award <b>${currentPoints} Merit Points</b>.`,
      icon: 'question', showCancelButton: true, confirmButtonColor: '#10b981', confirmButtonText: 'Yes, Approve'
    });
    if (isConfirmed) updateReviewStatus(taskId, { status: 'Approved', points: currentPoints }, facultyId);
  };

  const handleBulkReviewSubmit = async () => {
    if (selectedAssignmentIds.length === 0) return;
    try {
      const formData = new FormData();
      formData.append('task_id', task!.id.toString());
      formData.append('faculty_ids', JSON.stringify(selectedAssignmentIds));
      formData.append('status', bulkReviewData.status);
      formData.append('points', bulkReviewData.points.toString());
      formData.append('bonus_points', bulkReviewData.bonus_points.toString());
      formData.append('remarks', bulkReviewData.remarks);

      const response = await fetch(`${import.meta.env.VITE_API_URL}/hod/bulk_review.php`, {
        method: 'POST', body: formData, credentials: 'include'
      });
      const data = await response.json();
      if (data.status === 'success') {
        Swal.fire({ title: 'Success', text: data.message, icon: 'success', toast: true, position: 'top-end', timer: 2000, showConfirmButton: false });
        setSelectedAssignmentIds([]);
        setBulkReviewData({ status: 'Approved', points: 0, bonus_points: 0, remarks: '' });
        fetchTask();
      } else {
        Swal.fire('Error', data.message, 'error');
      }
    } catch (error) {
      Swal.fire('Error', 'Failed to process bulk review', 'error');
    }
  };

  const handleSendReminder = async (taskId: number, facultyId: number, type: 'Reminder' | 'Warning' | 'Gentle Reminder') => {
    try {
      const formData = new FormData();
      formData.append('task_id', taskId.toString());
      formData.append('faculty_id', facultyId.toString());
      formData.append('type', type);

      const response = await fetch(`${import.meta.env.VITE_API_URL}/hod/send_reminder.php`, {
        method: 'POST', body: formData, credentials: 'include'
      });
      const data = await response.json();
      if (data.status === 'success') {
        Swal.fire({ title: 'Sent!', text: `${type} sent successfully.`, icon: 'success', toast: true, position: 'top-end', timer: 2000, showConfirmButton: false });
        fetchTask();
      } else {
        Swal.fire('Error', data.message, 'error');
      }
    } catch (error) {
      Swal.fire('Error', 'Failed to send communication', 'error');
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const getDownloadUrl = (path: string) => {
    return `${import.meta.env.VITE_API_URL}/download.php?file=${encodeURIComponent(path)}`;
  };

  const handlePreview = (att: Attachment) => {
    const url = `${import.meta.env.VITE_API_URL}/${att.file_path}`;
    window.open(url, '_blank');
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'Completed': case 'Approved': return { bg: 'bg-emerald-500', icon: <CheckCircle2 className="w-4 h-4" /> };
      case 'Active': case 'Under Review': return { bg: 'bg-[#7C3AED]', icon: <Clock className="w-4 h-4" /> };
      case 'Draft': return { bg: 'bg-slate-400', icon: <FileText className="w-4 h-4" /> };
      case 'Submitted': return { bg: 'bg-amber-500', icon: <CheckCircle2 className="w-4 h-4" /> };
      case 'Rework Required': return { bg: 'bg-rose-500', icon: <RotateCcw className="w-4 h-4" /> };
      default: return { bg: 'bg-slate-400', icon: <Clock className="w-4 h-4" /> };
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50/50 flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-[#7C3AED]" />
        <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-4">Decrypting Task Intelligence...</p>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="min-h-screen bg-slate-50/50 flex flex-col items-center justify-center pb-32">
        <div className="p-8 bg-white rounded-[2rem] border border-slate-100 shadow-xl text-center max-w-sm">
          <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <h2 className="text-xl font-black text-[#1E184B] mb-2">Task Not Found</h2>
          <p className="text-slate-500 text-sm mb-6">The task you are looking for does not exist or you do not have permission to view it.</p>
          <button onClick={() => navigate('/hod/tasks')} className="px-6 py-3 bg-[#7C3AED] text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-[#6D28D9] transition-all">
            Return to Directory
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 pb-32">
      <SEO title={`Mission: ${task.title}`} />
      
      {/* Header Sticky Bar */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 px-4 md:px-8 py-4 shadow-sm">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/hod/tasks')}
              className="p-2.5 bg-slate-50 text-slate-500 hover:text-[#7C3AED] hover:bg-[#7C3AED]/10 rounded-xl transition-all"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-lg md:text-xl font-black text-[#1E184B] truncate max-w-[200px] md:max-w-md">{task.title}</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={cn("px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest text-white", getStatusConfig(task.status).bg)}>
                  {task.status}
                </span>
                <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {formatDate(task.deadline)}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate(`/hod/tasks/edit/${task.id}`)}
              className="px-4 py-2.5 bg-white border-2 border-slate-100 text-slate-600 hover:border-[#7C3AED]/30 hover:text-[#7C3AED] rounded-xl text-xs font-black uppercase tracking-widest transition-all"
            >
              Edit Mission
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 md:px-8 pt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Mission Intelligence & Materials */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-8">
          
          {/* Mission Briefing */}
          <div className="bg-white rounded-[2rem] border-2 border-slate-100 p-6 md:p-10 shadow-xl shadow-slate-200/20">
            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#7C3AED]" /> Mission Intelligence Briefing
            </h2>
            <div className="prose prose-slate max-w-none prose-p:text-slate-600 prose-p:font-medium prose-p:leading-relaxed whitespace-pre-wrap text-sm">
              {task.description || <span className="italic text-slate-400">No additional intelligence provided.</span>}
            </div>

            {/* Badges / Meta */}
            <div className="flex flex-wrap items-center gap-3 mt-8 pt-8 border-t border-slate-100">
              <div className="px-4 py-2 bg-slate-50 rounded-xl flex items-center gap-2">
                <Layers className="w-4 h-4 text-slate-400" />
                <span className="text-xs font-black text-slate-600">{task.category || 'General'}</span>
              </div>
              <div className="px-4 py-2 bg-slate-50 rounded-xl flex items-center gap-2">
                <Info className="w-4 h-4 text-slate-400" />
                <span className="text-xs font-black text-slate-600">{task.task_type}</span>
              </div>
              <div className={cn("px-4 py-2 rounded-xl flex items-center gap-2", 
                task.priority === 'Critical' ? 'bg-rose-50 text-rose-600' :
                task.priority === 'High' ? 'bg-orange-50 text-orange-600' :
                'bg-emerald-50 text-emerald-600'
              )}>
                <AlertTriangle className="w-4 h-4" />
                <span className="text-xs font-black">{task.priority} Priority</span>
              </div>
            </div>
          </div>

          {/* Reference Materials */}
          {(task.task_link || task.attachments.filter(a => a.entity_type === 'Task').length > 0) && (
            <div className="bg-white rounded-[2rem] border-2 border-slate-100 p-6 md:p-8 shadow-xl shadow-slate-200/20">
              <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-500" /> Reference Materials
              </h2>
              <div className="space-y-3">
                {task.task_link && (
                  <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100/50 flex items-center justify-between group hover:border-[#7C3AED]/30 transition-all">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 shadow-sm">
                        <BookOpen className="w-5 h-5" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-indigo-900 uppercase tracking-widest">External URL</span>
                        <a href={task.task_link} target="_blank" rel="noreferrer" className="text-xs font-black text-[#7C3AED] hover:underline truncate max-w-[200px] md:max-w-sm">
                          {task.task_link}
                        </a>
                      </div>
                    </div>
                    <a href={task.task_link} target="_blank" rel="noreferrer" className="px-4 py-2 bg-white text-[#7C3AED] border border-[#7C3AED]/20 hover:bg-[#7C3AED] hover:text-white rounded-xl transition-all shadow-sm font-black text-[9px] uppercase tracking-widest hidden md:block">
                      Visit Link
                    </a>
                  </div>
                )}
                
                {task.attachments.filter(a => a.entity_type === 'Task').map(att => (
                  <div key={att.id} className="flex flex-wrap sm:flex-nowrap items-center justify-between p-4 bg-slate-50/50 rounded-2xl border border-slate-100 group gap-4">
                    <div className="flex items-center gap-3">
                      <FileText className="w-6 h-6 text-slate-400" />
                      <span className="text-xs font-black text-[#1E184B] truncate max-w-[200px] md:max-w-xs">{att.file_name}</span>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <button onClick={() => handlePreview(att)} className="flex-1 sm:flex-none justify-center flex p-2.5 bg-white text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm border border-slate-200"><Eye className="w-4 h-4" /></button>
                      <a href={getDownloadUrl(att.file_path)} download className="flex-1 sm:flex-none justify-center flex p-2.5 bg-white text-[#7C3AED] rounded-xl hover:bg-[#7C3AED] hover:text-white transition-all shadow-sm border border-slate-200"><Download className="w-4 h-4" /></a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Operatives & Evaluation */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-8">
          
          <div className="bg-white rounded-[2rem] border-2 border-slate-100 overflow-hidden shadow-xl shadow-slate-200/20 flex flex-col h-[800px] max-h-[85vh]">
            {/* Header Tabs */}
            <div className="flex items-center border-b border-slate-100 p-2 bg-slate-50/50">
              <button 
                onClick={() => setMobileDetailTab('info')}
                className={cn("flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all", mobileDetailTab === 'info' ? "bg-white text-[#1E184B] shadow-sm border border-slate-100" : "text-slate-400 hover:text-[#1E184B]")}
              >
                Assignment List
              </button>
              <button 
                onClick={() => setMobileDetailTab('evaluation')}
                className={cn("flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all", mobileDetailTab === 'evaluation' ? "bg-white text-[#1E184B] shadow-sm border border-slate-100" : "text-slate-400 hover:text-[#1E184B]")}
              >
                Evaluation Panel
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
              {mobileDetailTab === 'info' ? (
                <div className="space-y-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <Users className="w-4 h-4 text-[#7C3AED]" /> Assigned Personnel
                    </h3>
                    <span className="bg-[#7C3AED]/10 text-[#7C3AED] px-3 py-1 rounded-lg text-[9px] font-black">{task.assignments.length} Total</span>
                  </div>

                  {task.assignments.length > 0 ? (
                    task.assignments.map(assign => (
                      <div 
                        key={assign.id} 
                        onClick={() => { setSelectedAssignmentId(assign.user_id); setMobileDetailTab('evaluation'); }}
                        className={cn(
                          "cursor-pointer flex flex-col p-4 bg-slate-50/50 border-2 rounded-2xl gap-4 transition-all hover:border-[#7C3AED]/30",
                          selectedAssignmentId === assign.user_id ? "border-[#7C3AED] shadow-md shadow-[#7C3AED]/10 bg-white" : "border-slate-100"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center font-black text-indigo-600 shadow-sm border border-slate-100 overflow-hidden">
                              {assign.faculty_pic ? (
                                <img src={`${import.meta.env.VITE_API_URL}/${assign.faculty_pic}`} alt={assign.faculty_name} className="w-full h-full object-cover"/>
                              ) : (
                                assign.faculty_name.charAt(0)
                              )}
                            </div>
                            <div>
                              <p className="text-xs font-black text-[#1E184B]">{assign.faculty_name}</p>
                              <p className="text-[9px] font-bold text-slate-400">{getStatusConfig(assign.status).icon} {assign.status}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-slate-400">
                            <ArrowLeft className="w-4 h-4 rotate-180" />
                          </div>
                        </div>

                        <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                          <div className="h-full bg-[#7C3AED]" style={{ width: `${assign.progress}%` }} />
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 border-2 border-dashed border-slate-200 rounded-3xl text-center">
                      <Users className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No assignments found</p>
                    </div>
                  )}
                </div>
              ) : (
                /* Evaluation Panel */
                <div className="space-y-8 animate-in fade-in">
                  {!selectedAssignmentId && selectedAssignmentIds.length === 0 ? (
                    <div className="p-10 text-center flex flex-col items-center justify-center h-full">
                      <Trophy className="w-12 h-12 text-slate-200 mb-4" />
                      <h3 className="text-sm font-black text-[#1E184B] mb-2">Evaluation Protocol</h3>
                      <p className="text-xs font-medium text-slate-500">Select an operative from the Assignment List to review their submissions and award merit points.</p>
                      <button onClick={() => setMobileDetailTab('info')} className="mt-6 px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200">
                        View Operatives
                      </button>
                    </div>
                  ) : selectedAssignmentId ? (
                    (() => {
                      const currentAssign = task.assignments.find(a => a.user_id === selectedAssignmentId);
                      if (!currentAssign) return null;
                      
                      return (
                        <div className="space-y-8">
                          {/* Selected Operative Header */}
                          <div className="p-4 bg-slate-50 rounded-2xl flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center font-black text-[#1E184B] shadow-sm">
                                {currentAssign.faculty_pic ? <img src={`${import.meta.env.VITE_API_URL}/${currentAssign.faculty_pic}`} className="w-full h-full object-cover rounded-xl" /> : currentAssign.faculty_name.charAt(0)}
                              </div>
                              <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Currently Reviewing</p>
                                <p className="text-xs font-black text-[#1E184B]">{currentAssign.faculty_name}</p>
                              </div>
                            </div>
                            <span className={cn("px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest", getStatusConfig(currentAssign.status).bg, "text-white")}>
                              {currentAssign.status}
                            </span>
                          </div>

                          {/* Submission Evidence */}
                          <div>
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Evidence & Deliverables</h3>
                            <div className="space-y-3">
                              {currentAssign.submission_link && (
                                <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl">
                                  <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1">Submission Link</p>
                                  <a href={currentAssign.submission_link} target="_blank" rel="noreferrer" className="text-xs font-bold text-emerald-700 hover:underline break-all">
                                    {currentAssign.submission_link}
                                  </a>
                                </div>
                              )}
                              
                              {task.attachments.filter(a => a.entity_type === 'Task_Submission' && a.uploader_id === selectedAssignmentId).map(att => (
                                <div key={att.id} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl">
                                  <div className="flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-emerald-500" />
                                    <span className="text-xs font-black text-[#1E184B] truncate max-w-[150px]">{att.file_name}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <button onClick={() => handlePreview(att)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500"><Eye className="w-4 h-4" /></button>
                                  </div>
                                </div>
                              ))}

                              {(!currentAssign.submission_link && task.attachments.filter(a => a.entity_type === 'Task_Submission' && a.uploader_id === selectedAssignmentId).length === 0) && (
                                <p className="text-[10px] italic text-slate-400 p-4 border-2 border-dashed rounded-xl text-center">No evidence submitted.</p>
                              )}
                            </div>
                          </div>

                          {/* Controls based on status */}
                          {['Submitted', 'Under Review'].includes(currentAssign.status) ? (
                            <div className="space-y-3 pt-6 border-t border-slate-100">
                              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Finalize Evaluation</h4>
                              <button onClick={() => handleApproveContribution(task.id, currentAssign.user_id, currentAssign.points)} className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2">
                                <CheckCircle2 className="w-4 h-4" /> Approve Contribution
                              </button>
                              <button onClick={() => updateReviewStatus(task.id, { status: 'Rework Required' }, currentAssign.user_id)} className="w-full py-4 bg-orange-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-orange-500/20 hover:bg-orange-600 transition-all flex items-center justify-center gap-2">
                                <RotateCcw className="w-4 h-4" /> Request Rework
                              </button>
                            </div>
                          ) : currentAssign.status === 'Approved' ? (
                            <div className="space-y-4 pt-6 border-t border-slate-100">
                              <div className="p-6 bg-emerald-50 border border-emerald-100 rounded-3xl text-center">
                                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-3" />
                                <p className="text-[10px] font-black text-emerald-900 uppercase tracking-widest">Contribution Approved</p>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-4 pt-6 border-t border-slate-100">
                              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Active Operations</h4>
                              <p className="text-xs font-medium text-slate-500">Operative is currently deployed on this mission. Waiting for submission.</p>
                              <button onClick={() => handleSendReminder(task.id, currentAssign.user_id, 'Reminder')} className="w-full py-4 bg-amber-50 text-amber-600 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-amber-200 hover:bg-amber-100 transition-all flex items-center justify-center gap-2">
                                <Bell className="w-4 h-4" /> Ping Operative (Reminder)
                              </button>
                            </div>
                          )}

                          {/* Points Configurator */}
                          <div className="space-y-6 pt-6 border-t border-slate-100">
                            <div>
                              <div className="flex justify-between mb-2">
                                <label className="text-[10px] font-black text-[#1E184B] uppercase tracking-widest">Merit Points</label>
                                <span className="text-[10px] font-black text-[#7C3AED] bg-[#7C3AED]/10 px-2 py-0.5 rounded-lg">{currentAssign.points} / 50</span>
                              </div>
                              <input 
                                type="range" min="0" max="50" step="5" 
                                value={currentAssign.points || 0} 
                                onChange={(e) => {
                                  const pts = parseInt(e.target.value);
                                  const updatedAssignments = task.assignments.map(a => 
                                    a.user_id === selectedAssignmentId ? { ...a, points: pts, bonus_points: pts === 0 ? 0 : a.bonus_points } : a
                                  );
                                  setTask({ ...task, assignments: updatedAssignments });
                                }}
                                onMouseUp={() => updateReviewStatus(task.id, { 
                                  points: currentAssign.points,
                                  bonus_points: currentAssign.points === 0 ? 0 : currentAssign.bonus_points
                                }, currentAssign.user_id)}
                                className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-[#7C3AED]" 
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })()
                  ) : null}
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
