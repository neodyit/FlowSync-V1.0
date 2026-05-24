import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  ChevronRight, 
  User,
  ArrowRight,
  Plus,
  Trash2,
  Pencil,
  X,
  Layers
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import SEO from '@/components/SEO';
import { cn } from '@/lib/utils';
import Swal from 'sweetalert2';

interface FacultyMember {
  id: number;
  name: string;
  email: string;
  profile_pic: string | null;
}

interface Group {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
  members: FacultyMember[];
}

const HODGroups: React.FC = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [faculty, setFaculty] = useState<FacultyMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedFacultyIds, setSelectedFacultyIds] = useState<number[]>([]);
  const [facultySearch, setFacultySearch] = useState('');

  const fetchGroups = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/hod/groups.php`, {
        credentials: 'include'
      });
      const data = await response.json();
      if (data.status === 'success') {
        setGroups(data.data);
        if (selectedGroup) {
          const updated = data.data.find((g: Group) => g.id === selectedGroup.id);
          setSelectedGroup(updated || null);
        }
      }
    } catch (error) {
      console.error('Failed to fetch groups:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchFaculty = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/hod/faculty.php`, {
        credentials: 'include'
      });
      const data = await response.json();
      if (data.status === 'success') {
        setFaculty(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch faculty:', error);
    }
  };

  useEffect(() => {
    fetchGroups();
    fetchFaculty();
  }, []);

  const filteredGroups = groups.filter(g => 
    g.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredFacultyList = faculty.filter(f => 
    f.name.toLowerCase().includes(facultySearch.toLowerCase()) ||
    f.email.toLowerCase().includes(facultySearch.toLowerCase())
  );

  const handleSaveGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) {
      Swal.fire('Error', 'Group name is required', 'error');
      return;
    }
    if (selectedFacultyIds.length === 0) {
      Swal.fire('Error', 'Please select at least one member', 'error');
      return;
    }

    try {
      const url = `${import.meta.env.VITE_API_URL}/hod/groups.php`;
      const method = isEditMode ? 'PUT' : 'POST';
      const body = {
        id: isEditMode ? selectedGroup?.id : undefined,
        name: groupName.trim(),
        members: selectedFacultyIds
      };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body)
      });

      const data = await response.json();
      if (data.status === 'success') {
        Swal.fire('Success', data.message, 'success');
        setIsModalOpen(false);
        fetchGroups();
      } else {
        Swal.fire('Error', data.message, 'error');
      }
    } catch (error) {
      Swal.fire('Error', 'Failed to save group', 'error');
    }
  };

  const handleDeleteGroup = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const result = await Swal.fire({
      title: 'Delete Group?',
      text: "This cannot be undone.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#EF4444',
      confirmButtonText: 'Yes, Delete'
    });

    if (result.isConfirmed) {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/hod/groups.php?id=${id}`, {
          method: 'DELETE',
          credentials: 'include'
        });
        const data = await response.json();
        if (data.status === 'success') {
          Swal.fire('Deleted', 'Group has been removed.', 'success');
          if (selectedGroup?.id === id) setSelectedGroup(null);
          fetchGroups();
        }
      } catch (error) {
        Swal.fire('Error', 'Deletion failed', 'error');
      }
    }
  };

  const openCreateModal = () => {
    setIsEditMode(false);
    setGroupName('');
    setSelectedFacultyIds([]);
    setFacultySearch('');
    setIsModalOpen(true);
  };

  const openEditModal = () => {
    if (!selectedGroup) return;
    setIsEditMode(true);
    setGroupName(selectedGroup.name);
    setSelectedFacultyIds(selectedGroup.members.map(m => m.id));
    setFacultySearch('');
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-8 pb-20">
      <SEO title="Faculty Groups" description="Manage department broadcast lists and faculty groups." />
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-[#1E184B] tracking-tight">Faculty Groups</h1>
          <p className="text-[#1E184B]/60 mt-1 font-bold flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#7C3AED]" />
            Manage broadcast lists and team assignments.
          </p>
        </div>
        
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative group flex-1 md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-[#7C3AED] transition-colors" />
            <input 
              type="text" 
              placeholder="Search groups..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3.5 bg-white border border-[#7C3AED]/10 rounded-2xl outline-none focus:ring-4 focus:ring-[#7C3AED]/5 transition-all text-sm font-bold shadow-sm"
            />
          </div>
          <button 
            onClick={openCreateModal}
            className="flex items-center gap-2 px-6 py-3.5 bg-[#7C3AED] text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-[#6D28D9] transition-all shadow-xl shadow-[#7C3AED]/20 shrink-0"
          >
            <Plus className="w-4 h-4" />
            New Group
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Group List */}
        <div className="lg:col-span-4 space-y-4">
          {isLoading ? (
            [1, 2, 3].map(i => <div key={i} className="h-24 bg-white rounded-3xl animate-pulse border border-slate-100" />)
          ) : filteredGroups.length === 0 ? (
            <div className="p-10 text-center bg-white rounded-3xl border border-dashed border-[#7C3AED]/20">
              <Users className="w-10 h-10 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">No groups found</p>
            </div>
          ) : filteredGroups.map((g) => (
            <motion.button
              key={g.id}
              onClick={() => setSelectedGroup(g)}
              className={cn(
                "w-full p-5 rounded-3xl border transition-all text-left group flex items-center gap-4",
                selectedGroup?.id === g.id 
                  ? "bg-[#7C3AED] border-[#7C3AED] shadow-xl shadow-[#7C3AED]/20" 
                  : "bg-white border-slate-100 hover:border-[#7C3AED]/30 hover:shadow-lg"
              )}
            >
              <div className={cn(
                "w-12 h-12 rounded-2xl overflow-hidden flex items-center justify-center font-black text-lg transition-colors shrink-0",
                selectedGroup?.id === g.id ? "bg-white/20 text-white" : "bg-[#7C3AED]/10 text-[#7C3AED]"
              )}>
                {g.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className={cn(
                  "font-black truncate text-sm",
                  selectedGroup?.id === g.id ? "text-white" : "text-[#1E184B]"
                )}>
                  {g.name}
                </h3>
                <p className={cn(
                  "text-[10px] font-bold uppercase tracking-widest mt-1",
                  selectedGroup?.id === g.id ? "text-white/70" : "text-slate-400"
                )}>
                  {g.members.length} Members
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={(e) => handleDeleteGroup(g.id, e)}
                  className={cn(
                    "p-2 rounded-xl transition-colors opacity-0 group-hover:opacity-100",
                    selectedGroup?.id === g.id ? "hover:bg-white/20 text-white" : "hover:bg-rose-50 text-rose-400"
                  )}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <ChevronRight className={cn(
                  "w-5 h-5 transition-transform",
                  selectedGroup?.id === g.id ? "text-white translate-x-1" : "text-slate-300"
                )} />
              </div>
            </motion.button>
          ))}
        </div>

        {/* Right Column: Group Details */}
        <div className="lg:col-span-8">
          <AnimatePresence mode="wait">
            {selectedGroup ? (
              <motion.div
                key={selectedGroup.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="bg-white rounded-[2.5rem] border border-[#7C3AED]/10 p-8 shadow-sm h-full"
              >
                <div className="flex items-center justify-between mb-10 pb-6 border-b border-slate-100">
                  <div className="flex items-center gap-5">
                    <div className="w-16 h-16 bg-[#7C3AED]/10 rounded-[1.5rem] flex items-center justify-center text-[#7C3AED]">
                      <Users className="w-8 h-8" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-[#1E184B]">{selectedGroup.name}</h2>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                        Broadcast List • {selectedGroup.members.length} Members
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={openEditModal}
                    className="flex items-center gap-2 px-5 py-2.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-xl font-black text-[10px] uppercase tracking-widest transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Edit Group
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {selectedGroup.members.map(member => (
                    <div key={member.id} className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                      <div className="w-10 h-10 rounded-xl overflow-hidden bg-white flex items-center justify-center font-black text-[#7C3AED] shadow-sm border border-slate-100 shrink-0">
                        {member.profile_pic ? (
                          <img src={`${import.meta.env.VITE_API_URL}/${member.profile_pic}`} alt="" className="w-full h-full object-cover" />
                        ) : (
                          member.name.charAt(0)
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-[#1E184B] text-sm truncate">{member.name}</p>
                        <p className="text-[10px] font-bold text-slate-400 truncate">{member.email}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            ) : (
              <div className="bg-white rounded-[2.5rem] border border-dashed border-[#7C3AED]/20 p-20 text-center h-full flex flex-col items-center justify-center">
                <div className="w-20 h-20 bg-[#7C3AED]/5 rounded-3xl flex items-center justify-center mb-6">
                  <Users className="w-10 h-10 text-[#7C3AED]/20" />
                </div>
                <h2 className="text-2xl font-black text-[#1E184B]/20 uppercase tracking-widest">Select a Group</h2>
                <p className="text-[#1E184B]/30 font-bold mt-2 max-w-xs">Select a group from the list to view its members or create a new one.</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Modal for Create/Edit */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#1E184B]/80 backdrop-blur-sm"
              onClick={() => setIsModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="px-8 py-6 border-b border-[#7C3AED]/10 flex items-center justify-between bg-slate-50/50">
                <h2 className="text-xl font-black text-[#1E184B]">
                  {isEditMode ? 'Edit Faculty Group' : 'Create New Group'}
                </h2>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-8 overflow-y-auto flex-1">
                <form id="group-form" onSubmit={handleSaveGroup} className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-black text-[#1E184B] uppercase tracking-widest mb-2">Group Name</label>
                    <input 
                      type="text" 
                      value={groupName}
                      onChange={(e) => setGroupName(e.target.value)}
                      placeholder="e.g. AI/ML Research Group"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:bg-white focus:border-[#7C3AED] focus:ring-4 focus:ring-[#7C3AED]/10 transition-all"
                      required
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-[10px] font-black text-[#1E184B] uppercase tracking-widest">Select Members</label>
                      <span className="text-[10px] font-bold text-[#7C3AED] bg-[#7C3AED]/10 px-2 py-0.5 rounded-lg">
                        {selectedFacultyIds.length} Selected
                      </span>
                    </div>
                    
                    <div className="relative mb-3">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        type="text"
                        placeholder="Search faculty to add..."
                        value={facultySearch}
                        onChange={(e) => setFacultySearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:border-[#7C3AED] transition-colors"
                      />
                    </div>

                    <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-[250px] overflow-y-auto custom-scrollbar">
                      {filteredFacultyList.map(f => {
                        const isSelected = selectedFacultyIds.includes(f.id);
                        return (
                          <label 
                            key={f.id}
                            className={cn(
                              "flex items-center gap-3 p-3 border-b border-slate-100 cursor-pointer transition-colors hover:bg-slate-50",
                              isSelected ? "bg-indigo-50/50" : ""
                            )}
                          >
                            <input 
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedFacultyIds(prev => [...prev, f.id]);
                                } else {
                                  setSelectedFacultyIds(prev => prev.filter(id => id !== f.id));
                                }
                              }}
                              className="w-4 h-4 rounded text-[#7C3AED] border-slate-300 focus:ring-[#7C3AED]"
                            />
                            <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center font-black text-[#7C3AED] overflow-hidden shrink-0">
                              {f.profile_pic ? (
                                <img src={`${import.meta.env.VITE_API_URL}/${f.profile_pic}`} alt="" className="w-full h-full object-cover" />
                              ) : (
                                f.name.charAt(0)
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-black text-[#1E184B] truncate">{f.name}</p>
                              <p className="text-[9px] font-bold text-slate-400 truncate">{f.email}</p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </form>
              </div>

              <div className="px-8 py-5 border-t border-[#7C3AED]/10 bg-slate-50/50 flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest text-slate-500 hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  form="group-form"
                  className="px-8 py-3 bg-[#7C3AED] text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-[#6D28D9] transition-all shadow-lg shadow-[#7C3AED]/20"
                >
                  {isEditMode ? 'Update Group' : 'Create Group'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default HODGroups;
