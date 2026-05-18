import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  UserPlus, 
  Search, 
  Filter, 
  Building2, 
  Briefcase, 
  Shield, 
  Edit2, 
  Trash2, 
  Power, 
  History, 
  X, 
  MoreVertical,
  CheckCircle2,
  XCircle,
  ChevronDown,
  Download,
  Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { ProfileCard } from '@/components/ui/info-card';
import { cn } from '@/lib/utils';
import SEO from '@/components/SEO';

const MySwal = withReactContent(Swal);

interface User {
  id: number;
  name: string;
  email: string;
  is_active: number | boolean;
  role_name: string;
  college_name: string;
  college_id: number;
  role_id: number;
  department_id?: number | null;
  department_name?: string;
  is_current_hod?: number;
}

interface College {
  id: number;
  name: string;
  short_name: string;
}

interface Department {
  id: number;
  name: string;
  college_id: number;
}

interface Role {
  id: number;
  name: string;
}

interface CustomSelectProps {
  label?: string;
  value: string | number;
  onChange: (value: string | number) => void;
  options: { value: string | number; label: string }[];
  placeholder?: string;
  icon?: React.ElementType;
  disabled?: boolean;
  className?: string;
}

const CustomSelect: React.FC<CustomSelectProps> = ({ 
  label, value, onChange, options, placeholder, icon: Icon, disabled, className 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.value.toString() === value.toString());

  return (
    <div className={`relative flex flex-col gap-1.5 ${className}`} ref={containerRef}>
      {label && <label className="text-[10px] font-black text-[#4C1D95]/60 uppercase tracking-widest ml-1">{label}</label>}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center justify-between w-full px-5 py-3.5 bg-white border rounded-2xl transition-all text-sm font-bold text-[#1E1B4B]
          ${isOpen ? 'border-[#7C3AED] ring-4 ring-[#7C3AED]/5' : 'border-[#7C3AED]/10 hover:border-[#7C3AED]/30'}
          ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-50' : 'cursor-pointer'}
        `}
      >
        <div className="flex items-center gap-3 truncate">
          {Icon && <Icon className="w-4 h-4 text-[#7C3AED] opacity-40" />}
          <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
        </div>
        <ChevronDown className={`w-4 h-4 text-[#7C3AED] transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute top-full left-0 w-full mt-2 bg-white rounded-2xl border border-[#7C3AED]/10 shadow-2xl z-[100] overflow-hidden py-2"
          >
            <div className="max-h-60 overflow-y-auto">
              {options.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={`
                    w-full px-5 py-3 text-left text-sm font-bold transition-all flex items-center justify-between
                    ${opt.value.toString() === value.toString() ? 'bg-[#7C3AED] text-white' : 'text-[#1E1B4B] hover:bg-[#7C3AED]/5 hover:text-[#7C3AED]'}
                  `}
                >
                  {opt.label}
                  {opt.value.toString() === value.toString() && <CheckCircle2 className="w-4 h-4 text-white" />}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const UsersManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [colleges, setColleges] = useState<College[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [roles, setRoles] = useState<Role[]>([
    { id: 1, name: 'Admin' },
    { id: 2, name: 'HOD' },
    { id: 3, name: 'Faculty' }
  ]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCollege, setSelectedCollege] = useState<string>('all');
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role_id: 3,
    college_id: '',
    department_id: '',
    is_active: 1
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [usersRes, collegesRes, deptsRes] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_URL}/admin/users.php`, { credentials: 'include' }),
        fetch(`${import.meta.env.VITE_API_URL}/admin/colleges.php`, { credentials: 'include' }),
        fetch(`${import.meta.env.VITE_API_URL}/admin/departments.php`, { credentials: 'include' })
      ]);

      const usersData = await usersRes.json();
      const collegesData = await collegesRes.json();
      const deptsData = await deptsRes.json();

      if (usersData.status === 'success') setUsers(usersData.data);
      if (collegesData.status === 'success') setColleges(collegesData.data);
      if (deptsData.status === 'success') setDepartments(deptsData.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter logic
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch = 
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCollege = selectedCollege === 'all' || user.college_id.toString() === selectedCollege;
      const matchesRole = selectedRole === 'all' || user.role_id.toString() === selectedRole;
      const matchesDept = selectedDept === 'all' || user.department_id?.toString() === selectedDept;
      
      return matchesSearch && matchesCollege && matchesRole && matchesDept;
    });
  }, [users, searchQuery, selectedCollege, selectedRole, selectedDept]);

  const filteredDepts = useMemo(() => {
    if (selectedCollege === 'all') return departments;
    return departments.filter(d => d.college_id.toString() === selectedCollege);
  }, [departments, selectedCollege]);

  // Actions
  const handleToggleStatus = async (user: User) => {
    if (user.id === 1) {
      MySwal.fire('Protected!', 'The Super Admin account cannot be deactivated.', 'warning');
      return;
    }
    const newStatus = user.is_active ? 0 : 1;
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/admin/users.php`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          id: user.id,
          name: user.name,
          email: user.email,
          role_id: user.role_id,
          college_id: user.college_id,
          department_id: user.department_id,
          is_active: newStatus
        })
      });
      const data = await response.json();
      if (data.status === 'success') {
        setUsers(users.map(u => u.id === user.id ? { ...u, is_active: newStatus } : u));
        MySwal.fire({
          title: 'Updated!',
          text: `User is now ${newStatus ? 'active' : 'inactive'}.`,
          icon: 'success',
          timer: 1500,
          showConfirmButton: false,
          toast: true,
          position: 'top-end'
        });
      }
    } catch (error) {
      console.error('Toggle status failed:', error);
    }
  };

  const handleDeleteUser = async (id: number) => {
    if (id === 1) {
      MySwal.fire('Protected!', 'The Super Admin account cannot be deleted.', 'warning');
      return;
    }
    const result = await MySwal.fire({
      title: 'Are you sure?',
      text: "This action cannot be undone!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#7C3AED',
      cancelButtonColor: '#EF4444',
      confirmButtonText: 'Yes, delete it!'
    });

    if (result.isConfirmed) {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/admin/users.php?id=${id}`, {
          method: 'DELETE',
          credentials: 'include'
        });
        const data = await response.json();
        if (data.status === 'success') {
          setUsers(users.filter(u => u.id !== id));
          MySwal.fire('Deleted!', 'User has been removed.', 'success');
        } else {
          MySwal.fire('Error!', data.message, 'error');
        }
      } catch (error) {
        console.error('Delete failed:', error);
      }
    }
  };

  const handleOpenModal = (user?: User) => {
    if (user?.id === 1) {
      MySwal.fire('Protected!', 'The Super Admin account cannot be updated from this interface.', 'warning');
      return;
    }
    
    // Check if they are a current HOD
    if (user && (user.is_current_hod ?? 0) > 0) {
      // We can allow editing name/email but should warn or block role change if they try to change it.
      // Actually, let's just show a toast warning when they open the modal.
      MySwal.fire({
        title: 'HOD Protection Active',
        text: 'This user is currently assigned as an HOD. Role changes are disabled until they are unassigned from their department.',
        icon: 'info',
        timer: 3000,
        toast: true,
        position: 'top-end',
        showConfirmButton: false
      });
    }

    if (user) {
      setEditingUser(user);
      setFormData({
        name: user.name,
        email: user.email,
        password: '',
        role_id: user.role_id,
        college_id: user.college_id.toString(),
        department_id: user.department_id?.toString() || '',
        is_active: Number(user.is_active)
      });
    } else {
      setEditingUser(null);
      setFormData({
        name: '',
        email: '',
        password: '',
        role_id: 3,
        college_id: '',
        department_id: '',
        is_active: 1
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = editingUser ? 'PUT' : 'POST';
    const payload = editingUser ? { ...formData, id: editingUser.id } : formData;

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/admin/users.php`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (data.status === 'success') {
        fetchData();
        setIsModalOpen(false);
        MySwal.fire('Success!', `User ${editingUser ? 'updated' : 'created'} successfully.`, 'success');
      } else {
        MySwal.fire('Error!', data.message, 'error');
      }
    } catch (error) {
      console.error('Operation failed:', error);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      <SEO title="User Management" description="Manage institutional accounts, roles, and access permissions within FlowSync." />
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-[#1E1B4B] tracking-tight">
            User Management
          </h1>
          <p className="text-[#4C1D95]/60 mt-1 font-medium">Manage institutional accounts and access permissions.</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center justify-center gap-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white px-6 py-3 rounded-2xl font-bold transition-all shadow-xl shadow-purple-500/20 active:scale-95"
        >
          <UserPlus className="w-5 h-5" />
          Add New User
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white/70 backdrop-blur-md rounded-3xl p-4 border border-[#7C3AED]/10 shadow-sm flex flex-col lg:flex-row gap-4 relative z-[50]">
        <div className="flex-1 relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#7C3AED] opacity-40 group-focus-within:opacity-100 transition-opacity" />
          <input 
            type="text" 
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-[#7C3AED]/5 rounded-2xl outline-none focus:border-[#7C3AED] focus:ring-4 focus:ring-[#7C3AED]/5 transition-all text-sm font-medium"
          />
        </div>
        
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <CustomSelect
            value={selectedCollege}
            onChange={(val) => {
              setSelectedCollege(val.toString());
              setSelectedDept('all');
            }}
            options={[
              { value: 'all', label: 'All Colleges' },
              ...colleges.map(c => ({ value: c.id, label: c.name }))
            ]}
            icon={Building2}
          />

          <CustomSelect
            value={selectedDept}
            onChange={(val) => setSelectedDept(val.toString())}
            options={[
              { value: 'all', label: 'All Departments' },
              ...filteredDepts.map(d => ({ value: d.id, label: d.name }))
            ]}
            icon={Briefcase}
          />

          <CustomSelect
            value={selectedRole}
            onChange={(val) => setSelectedRole(val.toString())}
            options={[
              { value: 'all', label: 'All Roles' },
              ...roles.map(r => ({ value: r.id, label: r.name }))
            ]}
            icon={Shield}
          />
        </div>
      </div>

      {/* Content Grid */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-12 h-12 border-4 border-[#7C3AED]/20 border-t-[#7C3AED] rounded-full animate-spin" />
          <p className="text-[#4C1D95]/60 font-black text-xs uppercase tracking-widest">Synchronizing Records...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredUsers.map((user) => (
              <motion.div
                key={user.id}
                layout
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="flex"
              >
                <ProfileCard
                  id={user.id}
                  name={user.name}
                  email={user.email}
                  role={user.role_name}
                  status={user.is_active ? "online" : "offline"}
                  avatar="" // Using initial letter fallback in ProfileCard
                  college={user.college_name}
                  department={user.department_name}
                  onEdit={user.id === 1 ? undefined : () => handleOpenModal(user)}
                  onToggleStatus={user.id === 1 ? undefined : () => handleToggleStatus(user)}
                  onDelete={user.id === 1 ? undefined : () => handleDeleteUser(user.id)}
                  onLogs={() => MySwal.fire({
                    title: 'Activity Logs',
                    text: `Viewing activity protocol for ${user.name}...`,
                    icon: 'info',
                    timer: 2000,
                    showConfirmButton: false,
                    toast: true,
                    position: 'top-end'
                  })}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* No Results */}
      {!isLoading && filteredUsers.length === 0 && (
        <div className="text-center py-20 space-y-4 bg-white/40 rounded-[3rem] border border-dashed border-[#7C3AED]/20">
          <div className="w-20 h-20 bg-[#7C3AED]/10 rounded-full flex items-center justify-center mx-auto">
            <Users className="w-10 h-10 text-[#7C3AED] opacity-20" />
          </div>
          <h3 className="text-xl font-black text-[#1E1B4B]">No records synchronized</h3>
          <p className="text-sm font-bold text-[#4C1D95]/60 max-w-xs mx-auto">
            Adjust your filters or try a different search query to find the users you're looking for.
          </p>
        </div>
      )}

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-[#1E1B4B]/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white rounded-[2.5rem] w-full max-w-xl p-8 md:p-10 shadow-2xl"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-[#7C3AED] rounded-t-[2.5rem]" />
              
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h2 className="text-2xl font-black text-[#1E1B4B]">{editingUser ? 'Edit User Credentials' : 'Create New User'}</h2>
                  <p className="text-xs font-bold text-[#4C1D95]/60 uppercase tracking-widest mt-1">Identity Management Protocol</p>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-3 hover:bg-slate-100 rounded-2xl transition-colors"
                >
                  <X className="w-6 h-6 text-[#1E1B4B]/40" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-[#4C1D95]/60 uppercase tracking-widest ml-1">Full Name</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:border-[#7C3AED] focus:ring-4 focus:ring-[#7C3AED]/5 transition-all text-sm font-bold"
                      placeholder="e.g. John Doe"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-[#4C1D95]/60 uppercase tracking-widest ml-1">Email Address</label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:border-[#7C3AED] focus:ring-4 focus:ring-[#7C3AED]/5 transition-all text-sm font-bold"
                      placeholder="john@example.com"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="relative">
                    <CustomSelect
                      label="Access Role"
                      value={formData.role_id}
                      onChange={(val) => setFormData({ ...formData, role_id: Number(val) })}
                      options={roles.map(r => ({ value: r.id, label: r.name }))}
                      disabled={!!(editingUser && editingUser.is_current_hod && editingUser.is_current_hod > 0)}
                      icon={Shield}
                    />
                    {editingUser && editingUser.is_current_hod && editingUser.is_current_hod > 0 && (
                      <p className="text-[9px] text-amber-600 font-bold mt-1 ml-1 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> HOD of {editingUser.department_name} (Role Protected)
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-[#4C1D95]/60 uppercase tracking-widest ml-1">{editingUser ? 'New Password (Optional)' : 'Initial Password'}</label>
                    <input
                      type="password"
                      required={!editingUser}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:border-[#7C3AED] focus:ring-4 focus:ring-[#7C3AED]/5 transition-all text-sm font-bold"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <CustomSelect
                    label="College Assignment"
                    value={formData.college_id}
                    onChange={(val) => setFormData({ ...formData, college_id: val.toString(), department_id: '' })}
                    options={[
                      { value: '', label: 'Select College' },
                      ...colleges.map(c => ({ value: c.id, label: c.name }))
                    ]}
                    disabled={!!(editingUser && editingUser.is_current_hod && editingUser.is_current_hod > 0)}
                  />

                  <CustomSelect
                    label="Department Assignment"
                    value={formData.department_id}
                    onChange={(val) => setFormData({ ...formData, department_id: val.toString() })}
                    disabled={!formData.college_id || !!(editingUser && editingUser.is_current_hod && editingUser.is_current_hod > 0)}
                    options={[
                      { value: '', label: 'Select Department' },
                      ...departments
                        .filter(d => d.college_id.toString() === formData.college_id)
                        .map(d => ({ value: d.id, label: d.name }))
                    ]}
                  />
                </div>

                <div className="flex items-center gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 py-4 bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-2xl font-black shadow-xl shadow-purple-500/20 transition-all uppercase tracking-widest text-xs"
                  >
                    {editingUser ? 'Update Protocol' : 'Initialize Account'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-8 py-4 bg-slate-100 hover:bg-slate-200 text-[#1E1B4B] rounded-2xl font-black transition-all uppercase tracking-widest text-xs"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default UsersManagement;
