import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  ChevronLeft, 
  Plus, 
  Trash2, 
  Edit2, 
  X, 
  UserCheck, 
  User, 
  Mail,
  ShieldCheck,
  Search
} from 'lucide-react';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import SEO from '@/components/SEO';

const MySwal = withReactContent(Swal);

// Refreshed module reference

interface Faculty {
  id: number;
  name: string;
  email: string;
  role_name: string;
  is_active: number;
}

interface Department {
  id: number;
  name: string;
  college_id: number;
  hod_id: number | null;
  hod_name?: string;
  college_name?: string;
}

const DepartmentDetails: React.FC = () => {
  const { shortName, deptId } = useParams<{ shortName: string; deptId: string }>();
  const [dept, setDept] = useState<Department | null>(null);
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [availableHODs, setAvailableHODs] = useState<Faculty[]>([]);
  const [availableFaculty, setAvailableFaculty] = useState<Faculty[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isHODMode, setIsHODMode] = useState(false);
  const [editingUser, setEditingUser] = useState<Faculty | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSelectOpen, setIsSelectOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'existing' | 'new'>('new');
  const [userFormData, setUserFormData] = useState({ name: '', email: '', role_id: '3', password: '', existing_user_id: '' });
  const navigate = useNavigate();

  const fetchData = async () => {
    try {
      // Fetch department details
      const dRes = await fetch(`${import.meta.env.VITE_API_URL}/admin/departments.php?id=${deptId}`, {
        credentials: 'include'
      });
      // Wait, departments.php?id=... doesn't exist in the seen code (it only takes college_id)
      // I'll fetch all and filter for now, or update the API.
      const dAllRes = await fetch(`${import.meta.env.VITE_API_URL}/admin/departments.php`, {
        credentials: 'include'
      });
      const dData = await dAllRes.json();
      
      if (dData.status === 'success' && dData.data) {
        const foundDept = dData.data.find((d: any) => d.id.toString() === deptId);
        
        if (foundDept) {
          setDept(foundDept);
          const uRes = await fetch(`${import.meta.env.VITE_API_URL}/admin/users.php`, {
            credentials: 'include'
          });
          const uData = await uRes.json();
          if (uData.status === 'success' && uData.data) {
            // Strictly show only faculty mapped to this specific department
            setFaculties(uData.data.filter((u: any) => u.department_id === foundDept.id));
            
            // Calculate available HODs
            const allAssignedHODIds = dData.data.map((d: any) => d.hod_id).filter(Boolean);
            const hods = uData.data.filter((u: any) => 
              u.role_id === 2 && 
              u.college_id === foundDept.college_id && 
              (!allAssignedHODIds.includes(u.id) || u.id === foundDept.hod_id)
            );
            setAvailableHODs(hods);

            // Calculate available Faculty (unassigned within college)
            const assignedFacultyIds = uData.data.filter((u: any) => u.department_id).map((u: any) => u.id);
            const unassignedFac = uData.data.filter((u: any) => 
              u.role_id === 3 && 
              u.college_id === foundDept.college_id && 
              !assignedFacultyIds.includes(u.id)
            );
            setAvailableFaculty(unassignedFac);
          }
        }
      }
    } catch (error) {
      console.error('Fetch failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [deptId]);

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dept) return;

    const method = editingUser ? 'PUT' : 'POST';
    const currentRoleId = isHODMode ? '2' : '3';
    
    // If selecting existing user (HOD or Faculty)
    if (!editingUser && userFormData.existing_user_id) {
      if (isHODMode) {
        try {
          await fetch(`${import.meta.env.VITE_API_URL}/admin/departments.php`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              id: dept.id,
              name: dept.name,
              hod_id: userFormData.existing_user_id
            }),
          });
          fetchData();
          handleCloseUserModal();
          return;
        } catch (error) {
          console.error('Assign failed:', error);
          return;
        }
      } else {
        // Assign existing faculty
        try {
          // We need an endpoint to just assign. Currently users.php PUT handles it if department_id is sent.
          // But we don't want to change other details.
          // So we use users.php PUT with existing data + new department_id
          const existing = availableFaculty.find(f => f.id === parseInt(userFormData.existing_user_id));
          if (!existing) return;

          await fetch(`${import.meta.env.VITE_API_URL}/admin/users.php`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              id: existing.id,
              name: existing.name,
              email: existing.email,
              role_id: '3',
              college_id: dept.college_id,
              department_id: dept.id
            }),
          });
          fetchData();
          handleCloseUserModal();
          return;
        } catch (error) {
          console.error('Faculty assign failed:', error);
          return;
        }
      }
    }

    const body = editingUser 
      ? { ...userFormData, id: editingUser.id, college_id: dept.college_id, role_id: currentRoleId, department_id: dept.id } 
      : { ...userFormData, college_id: dept.college_id, role_id: currentRoleId, department_id: dept.id };

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/admin/users.php`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      const data = await response.json();
      
      if (data.status === 'success') {
        // If we just created an HOD, assign them to the department
        if (isHODMode && !editingUser) {
          const newUserId = data.id;
          await fetch(`${import.meta.env.VITE_API_URL}/admin/departments.php`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              id: dept.id,
              name: dept.name,
              hod_id: newUserId
            }),
          });
        }
        
        MySwal.fire({
          icon: 'success',
          title: 'Success!',
          text: data.message || 'Operation completed',
          timer: 1500,
          showConfirmButton: false
        });
        
        fetchData();
        handleCloseUserModal();
      } else {
        MySwal.fire({
          icon: 'error',
          title: 'Oops...',
          text: data.message || 'Operation failed'
        });
      }
    } catch (error) {
      console.error('Operation failed:', error);
    }
  };

  const handleRemoveHOD = async () => {
    if (!dept) return;
    
    const result = await MySwal.fire({
      title: 'Are you sure?',
      text: "Unassign current HOD? They will remain as an available HOD.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#7C3AED',
      cancelButtonColor: '#E11D48',
      confirmButtonText: 'Yes, unassign!'
    });

    if (result.isConfirmed) {
      try {
        await fetch(`${import.meta.env.VITE_API_URL}/admin/departments.php`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            id: dept.id,
            name: dept.name,
            hod_id: null
          }),
        });
        fetchData();
        MySwal.fire({
          icon: 'success',
          title: 'Unassigned!',
          timer: 1500,
          showConfirmButton: false
        });
      } catch (error) {
        console.error('Remove HOD failed:', error);
      }
    }
  };

  const handleRemoveFaculty = async (id: number) => {
    if (!dept) return;

    const result = await MySwal.fire({
      title: 'Remove Faculty?',
      text: "The user account will remain active, but they will be removed from this department.",
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#7C3AED',
      cancelButtonColor: '#E11D48',
      confirmButtonText: 'Yes, remove!'
    });

    if (result.isConfirmed) {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/admin/users.php?id=${id}&unassign_dept_id=${dept.id}`, {
          method: 'DELETE',
          credentials: 'include',
        });
        if (response.ok) {
          fetchData();
          MySwal.fire({
            icon: 'success',
            title: 'Removed!',
            timer: 1500,
            showConfirmButton: false
          });
        }
      } catch (error) {
        console.error('Remove failed:', error);
      }
    }
  };

  const handleOpenUserModal = (user?: Faculty, hodMode: boolean = false) => {
    setIsHODMode(hodMode);
    setSearchTerm('');
    setIsSelectOpen(false);
    
    const hasExisting = (hodMode ? availableHODs : availableFaculty).length > 0;
    setActiveTab(hasExisting && !user ? 'existing' : 'new');

    if (user) {
      setEditingUser(user);
      setUserFormData({ name: user.name, email: user.email, role_id: hodMode ? '2' : '3', password: '', existing_user_id: '' });
    } else {
      setEditingUser(null);
      setUserFormData({ name: '', email: '', role_id: hodMode ? '2' : '3', password: '', existing_user_id: '' });
    }
    setIsUserModalOpen(true);
  };


  const handleCloseUserModal = () => {
    setIsUserModalOpen(false);
    setEditingUser(null);
    setIsHODMode(false);
  };

  if (isLoading) return (
    <div className="flex justify-center py-20">
      <div className="w-10 h-10 border-4 border-[#7C3AED]/20 border-t-[#7C3AED] rounded-full animate-spin" />
    </div>
  );

  if (!dept) return <div className="p-8 text-center text-gray-500 font-bold">Department not found.</div>;

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto">
      <SEO 
        title={`${dept?.name || 'Department'} Details`} 
        description={`Manage faculty assignments, HOD leadership, and administrative settings for the ${dept?.name} at ${dept?.college_name}.`}
      />
      <button 
        onClick={() => navigate(`/admin/colleges/${shortName}`)}
        className="flex items-center gap-2 text-[#7C3AED] dark:text-violet-400 font-bold mb-6 sm:mb-8 hover:gap-3 transition-all cursor-pointer text-sm"
      >
        <ChevronLeft className="w-5 h-5" />
        Back to {dept.college_name}
      </button>

      <div className="bg-white dark:bg-[#1A0F35]/20 backdrop-blur-md rounded-[32px] p-6 sm:p-8 border border-[#7C3AED]/10 dark:border-violet-500/20 shadow-sm mb-8 sm:mb-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[#7C3AED]/5 dark:bg-violet-950/40 rounded-[24px] flex items-center justify-center shrink-0 border border-transparent dark:border-violet-500/10">
              <Users className="w-8 h-8 sm:w-10 sm:h-10 text-[#7C3AED] dark:text-violet-400" />
            </div>
            <div>
              <h1 className="text-xl sm:text-3xl font-black text-[#1E1B4B] dark:text-indigo-100 leading-tight">{dept.name}</h1>
              <p className="text-gray-400 dark:text-violet-400/60 text-xs sm:text-sm font-medium mt-1">{dept.college_name} • Faculty Management</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4 self-start md:self-auto">
            <div className="text-right">
              <p className="text-[10px] font-bold text-gray-400 dark:text-violet-400/60 uppercase tracking-widest">Head of Dept</p>
              <p className="text-xs sm:text-sm font-bold text-[#1E1B4B] dark:text-indigo-100">{dept.hod_name || 'Unassigned'}</p>
            </div>
            {dept.hod_id ? (
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => {
                    const hodUser = faculties.find(u => u.id === dept.hod_id) || 
                                    availableHODs.find(u => u.id === dept.hod_id) || 
                                    {
                                      id: dept.hod_id!,
                                      name: dept.hod_name || '',
                                      email: '', 
                                      role_name: 'HOD',
                                      is_active: 1
                                    };
                    handleOpenUserModal(hodUser as Faculty, true);
                  }}
                  className="p-1.5 text-gray-400 dark:text-violet-400/60 hover:text-[#7C3AED] dark:hover:text-violet-300 transition-colors cursor-pointer"
                  title="Edit HOD"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button 
                  onClick={handleRemoveHOD}
                  className="p-1.5 text-gray-400 dark:text-violet-400/60 hover:text-rose-500 transition-colors cursor-pointer"
                  title="Unassign HOD"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center border border-emerald-100 dark:border-emerald-500/20">
                  <UserCheck className="w-6 h-6 text-emerald-500 dark:text-emerald-400" />
                </div>
              </div>
            ) : (
              <button 
                onClick={() => handleOpenUserModal(undefined, true)}
                className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-950/40 flex items-center justify-center border border-rose-100 dark:border-rose-500/20 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors cursor-pointer"
                title="Create HOD"
              >
                <Plus className="w-6 h-6 text-rose-500 dark:text-rose-400" />
              </button>
            )}
          </div>
        </div>
      </div>

      {!dept.hod_id ? (
        <div className="bg-white dark:bg-[#1A0F35]/15 rounded-[32px] p-8 sm:p-12 border-2 border-dashed border-[#7C3AED]/20 dark:border-violet-500/20 text-center">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[#7C3AED]/5 dark:bg-violet-950/40 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShieldCheck className="w-8 h-8 sm:w-10 sm:h-10 text-[#7C3AED] dark:text-violet-400" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#1E1B4B] dark:text-indigo-100 mb-2">HOD Assignment Required</h2>
          <p className="text-gray-500 dark:text-violet-300/60 text-xs sm:text-sm max-w-md mx-auto mb-8 leading-relaxed">
            To manage faculty and departments, you must first create or assign a Head of Department (HOD) for {dept.name}.
          </p>
          <button
            onClick={() => handleOpenUserModal(undefined, true)}
            className="inline-flex items-center gap-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white px-8 py-3.5 rounded-2xl font-bold shadow-lg shadow-purple-500/20 transition-all cursor-pointer text-sm"
          >
            <Plus className="w-5 h-5" />
            Create & Assign HOD
          </button>
        </div>
      ) : (
        <>
          <div className="flex justify-between items-end mb-8">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-indigo-100">Department Faculty</h2>
              <p className="text-sm text-gray-400 dark:text-violet-400/60 mt-1">Manage all educators assigned to this department.</p>
            </div>
            <button
              onClick={() => handleOpenUserModal()}
              className="flex items-center gap-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-purple-500/20 cursor-pointer text-sm shrink-0"
            >
              <Plus className="w-5 h-5" />
              Add Faculty
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {faculties.map((f) => (
              <motion.div
                key={f.id}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white dark:bg-[#1A0F35]/20 backdrop-blur-md rounded-2xl border border-gray-100 dark:border-violet-500/10 p-5 hover:border-[#7C3AED]/20 dark:hover:border-violet-500/30 transition-all group"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-full bg-gray-50 dark:bg-violet-950/40 flex items-center justify-center group-hover:bg-[#7C3AED]/5 transition-colors border border-transparent dark:border-violet-500/10">
                    <User className="w-5 h-5 text-gray-400 dark:text-violet-400/60 group-hover:text-[#7C3AED] dark:group-hover:text-violet-300" />
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleOpenUserModal(f)} className="p-1.5 text-gray-400 dark:text-violet-400/60 hover:text-[#7C3AED] dark:hover:text-violet-300 cursor-pointer" title="Edit Faculty">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleRemoveFaculty(f.id)} className="p-1.5 text-gray-400 dark:text-violet-400/60 hover:text-rose-500 cursor-pointer" title="Remove from Dept">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                
                <h4 className="font-bold text-gray-900 dark:text-indigo-100">{f.name}</h4>
                <div className="flex items-center gap-2 mt-2 text-xs text-gray-400 dark:text-violet-400/70">
                  <Mail className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{f.email}</span>
                </div>
                
                <div className="mt-4 flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-md bg-gray-100 dark:bg-violet-950/40 text-gray-500 dark:text-violet-300 text-[10px] font-bold uppercase tracking-wider">
                    {f.role_name}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <div className={`w-1.5 h-1.5 rounded-full ${f.is_active ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-violet-800'}`} />
                    <span className="text-[10px] font-bold text-gray-400 dark:text-violet-400/60 uppercase">{f.is_active ? 'Active' : 'Inactive'}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </>
      )}

      {/* User Modal */}
      <AnimatePresence>
        {isUserModalOpen && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={handleCloseUserModal} className="absolute inset-0 bg-[#1E1B4B]/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-white dark:bg-[#110A24] border border-[#7C3AED]/10 dark:border-violet-500/20 rounded-[32px] w-full max-w-md p-6 sm:p-8 shadow-2xl z-10">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-indigo-100">
                  {editingUser ? (isHODMode ? 'Edit HOD' : 'Edit Faculty') : (isHODMode ? 'New HOD' : 'New Faculty')}
                </h2>
                <button onClick={handleCloseUserModal} className="p-2 hover:bg-gray-100 dark:hover:bg-violet-950/40 rounded-full cursor-pointer"><X className="w-6 h-6 text-gray-400 dark:text-violet-400" /></button>
              </div>
              <div className="flex p-1 bg-gray-100 dark:bg-violet-950/40 rounded-2xl mb-6">
                {!editingUser && (isHODMode ? availableHODs : availableFaculty).length > 0 && (
                  <button 
                    onClick={() => setActiveTab('existing')}
                    className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${activeTab === 'existing' ? 'bg-white dark:bg-[#110A24] text-[#7C3AED] dark:text-violet-400 shadow-sm' : 'text-gray-400 hover:text-gray-600 dark:text-violet-400/50 dark:hover:text-violet-300'}`}
                  >
                    Select Existing
                  </button>
                )}
                <button 
                  onClick={() => setActiveTab('new')}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${activeTab === 'new' ? 'bg-white dark:bg-[#110A24] text-[#7C3AED] dark:text-violet-400 shadow-sm' : 'text-gray-400 hover:text-gray-600 dark:text-violet-400/50 dark:hover:text-violet-300'}`}
                >
                  {editingUser ? 'Edit Details' : 'Create New'}
                </button>
              </div>

              <form onSubmit={handleUserSubmit} className="space-y-6">
                {activeTab === 'existing' && !editingUser && (
                  <div className="space-y-2 relative animate-in fade-in slide-in-from-left-4 duration-300">
                    <label className="text-[11px] font-bold text-[#1E1B4B]/60 dark:text-violet-400 uppercase tracking-wider ml-1">
                      {isHODMode ? 'Choose HOD' : 'Choose Faculty'}
                    </label>
                    
                    <div 
                      onClick={() => setIsSelectOpen(!isSelectOpen)}
                      className={`w-full px-4 py-4 bg-gray-50/50 dark:bg-[#1A0F35]/30 border ${isSelectOpen ? 'border-[#7C3AED] ring-4 ring-[#7C3AED]/10' : 'border-gray-200 dark:border-violet-500/20'} rounded-2xl outline-none transition-all text-sm font-medium text-gray-700 dark:text-indigo-200 cursor-pointer flex items-center justify-between group`}
                    >
                      <span className={userFormData.existing_user_id ? 'text-gray-900 dark:text-indigo-100 font-bold' : 'text-gray-400 dark:text-violet-400/50'}>
                        {userFormData.existing_user_id 
                          ? (isHODMode ? availableHODs : availableFaculty).find(u => u.id.toString() === userFormData.existing_user_id)?.name || 'Select User'
                          : 'Click to browse staff...'
                        }
                      </span>
                      <ChevronLeft className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${isSelectOpen ? 'rotate-90' : '-rotate-90'}`} />
                    </div>

                    <AnimatePresence>
                      {isSelectOpen && (
                        <motion.div 
                          initial={{ opacity: 0, y: -10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -10, scale: 0.95 }}
                          className="absolute z-[100] left-0 right-0 top-full mt-2 bg-white/95 dark:bg-[#110A24]/95 backdrop-blur-xl border border-gray-100 dark:border-violet-500/20 rounded-[24px] shadow-2xl shadow-purple-500/15 overflow-hidden max-h-[250px] flex flex-col"
                        >
                          <div className="p-3 border-b border-gray-50 dark:border-violet-500/10 flex-shrink-0">
                            <div className="relative">
                              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                              <input 
                                type="text"
                                placeholder="Search by name or email..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-[#1A0F35]/30 border-none rounded-xl outline-none text-xs font-medium text-gray-900 dark:text-indigo-100"
                              />
                            </div>
                          </div>
                          
                          <div className="overflow-y-auto py-2 custom-scrollbar flex-1">
                            {(isHODMode ? availableHODs : availableFaculty)
                              .filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase()) || u.email.toLowerCase().includes(searchTerm.toLowerCase()))
                              .map(h => (
                              <div 
                                key={h.id}
                                onClick={() => {
                                  setUserFormData({ ...userFormData, existing_user_id: h.id.toString() });
                                  setIsSelectOpen(false);
                                }}
                                className="px-4 py-3 hover:bg-[#7C3AED]/5 dark:hover:bg-violet-950/40 cursor-pointer transition-all border-b border-gray-50/50 dark:border-violet-500/10 last:border-0 group text-left"
                              >
                                <div className="text-sm font-bold text-gray-800 dark:text-indigo-200 group-hover:text-[#7C3AED] dark:group-hover:text-violet-300 transition-colors">{h.name}</div>
                                <div className="text-[10px] text-gray-400 dark:text-violet-400/60 font-medium">{h.email}</div>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {activeTab === 'new' && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="space-y-1.5 text-left">
                      <label className="text-[11px] font-bold text-[#1E1B4B]/60 dark:text-violet-400 uppercase tracking-wider ml-1">Full Name</label>
                      <input 
                        type="text" 
                        required 
                        value={userFormData.name} 
                        onChange={(e) => setUserFormData({ ...userFormData, name: e.target.value })} 
                        className="w-full px-4 py-4 bg-gray-50/50 dark:bg-[#1A0F35]/30 border border-gray-200 dark:border-violet-500/20 rounded-2xl outline-none focus:bg-white dark:focus:bg-[#110A24] focus:border-[#7C3AED] dark:focus:border-violet-400 focus:ring-4 focus:ring-[#7C3AED]/10 dark:focus:ring-violet-400/10 transition-all text-sm font-medium text-gray-900 dark:text-indigo-100" 
                        placeholder="Dr. John Doe" 
                      />
                    </div>
                    <div className="space-y-1.5 text-left">
                      <label className="text-[11px] font-bold text-[#1E1B4B]/60 dark:text-violet-400 uppercase tracking-wider ml-1">Email Address</label>
                      <input 
                        type="email" 
                        required 
                        value={userFormData.email} 
                        onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })} 
                        className="w-full px-4 py-4 bg-gray-50/50 dark:bg-[#1A0F35]/30 border border-gray-200 dark:border-violet-500/20 rounded-2xl outline-none focus:bg-white dark:focus:bg-[#110A24] focus:border-[#7C3AED] dark:focus:border-violet-400 focus:ring-4 focus:ring-[#7C3AED]/10 dark:focus:ring-violet-400/10 transition-all text-sm font-medium text-gray-900 dark:text-indigo-100" 
                        placeholder="john.doe@college.edu" 
                      />
                    </div>
                    {!editingUser && (
                      <div className="space-y-1.5 text-left">
                        <label className="text-[11px] font-bold text-[#1E1B4B]/60 dark:text-violet-400 uppercase tracking-wider ml-1">Initial Password</label>
                        <input 
                          type="password" 
                          required 
                          value={userFormData.password} 
                          onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })} 
                          className="w-full px-4 py-4 bg-gray-50/50 dark:bg-[#1A0F35]/30 border border-gray-200 dark:border-violet-500/20 rounded-2xl outline-none focus:bg-white dark:focus:bg-[#110A24] focus:border-[#7C3AED] dark:focus:border-violet-400 focus:ring-4 focus:ring-[#7C3AED]/10 dark:focus:ring-violet-400/10 transition-all text-sm font-medium text-gray-900 dark:text-indigo-100" 
                          placeholder="••••••••" 
                        />
                      </div>
                    )}
                  </div>
                )}
                <button 
                  type="submit" 
                  disabled={activeTab === 'existing' && !userFormData.existing_user_id}
                  className="w-full py-4 bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-2xl font-bold shadow-xl shadow-purple-500/25 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:scale-100 disabled:shadow-none transition-all mt-6 text-sm cursor-pointer"
                >
                  {activeTab === 'existing' ? 'Confirm Assignment' : (editingUser ? 'Save Changes' : 'Create & Assign')}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DepartmentDetails;
