import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Users, 
  Search, 
  Trash2, 
  Mail, 
  Shield,
  Loader2,
  GraduationCap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import SEO from '@/components/SEO';

interface FacultyMember {
  role_name: string;
  is_active: any;
  id: number;
  name: string;
  email: string;
  is_hod?: boolean | number;
  profile_pic: string | null;
}

interface DeptInfo {
  id: number;
  name: string;
  college_name: string;
}

const Department: React.FC = () => {
  const [deptInfo, setDeptInfo] = useState<DeptInfo | null>(null);
  const [faculty, setFaculty] = useState<FacultyMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [deptRes, facultyRes] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_URL}/hod/department_info.php`, { credentials: 'include' }),
        fetch(`${import.meta.env.VITE_API_URL}/hod/faculty.php`, { credentials: 'include' })
      ]);
      
      const deptData = await deptRes.json();
      const facultyData = await facultyRes.json();

      if (deptData.status === 'success') setDeptInfo(deptData.data);
      if (facultyData.status === 'success') setFaculty(facultyData.data);
    } catch (error) {
      console.error('Failed to fetch department data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);



  const handleRemoveFaculty = async (userId: number) => {
    if (!confirm('Are you sure you want to remove this faculty member from your department? This will not delete their account.')) return;
    
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/hod/faculty.php?user_id=${userId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      const data = await response.json();
      if (data.status === 'success') {
        fetchData();
      }
    } catch (error) {
      console.error('Failed to remove faculty:', error);
    }
  };

  const filteredFaculty = faculty
    .filter(f => 
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      f.email.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      // Pin HOD to top
      if (a.is_hod && !b.is_hod) return -1;
      if (!a.is_hod && b.is_hod) return 1;
      // Then sort by name
      return a.name.localeCompare(b.name);
    });

  return (
    <div className="max-w-7xl mx-auto space-y-6 md:space-y-10">
      <SEO 
        title={`${deptInfo?.name || 'Department'} Details`} 
        description={`Manage faculty and administrative protocols for ${deptInfo?.name} at ${deptInfo?.college_name}.`}
      />
      {/* Header Card */}
      <div className="relative overflow-hidden bg-white rounded-2xl md:rounded-[3rem] p-5 md:p-10 border border-[#7C3AED]/10 shadow-xl shadow-[#1E184B]/5">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-[#7C3AED]/5 rounded-full blur-3xl opacity-50" />
        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6 md:gap-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 md:gap-6">
            <div className="w-14 h-14 md:w-20 md:h-20 bg-[#7C3AED] rounded-2xl md:rounded-[2rem] flex items-center justify-center text-white shadow-2xl shadow-[#7C3AED]/30 shrink-0">
              <Building2 className="w-7 h-7 md:w-10 md:h-10" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 md:px-3 md:py-1 bg-[#7C3AED]/5 text-[#7C3AED] text-[9px] md:text-[10px] font-black uppercase tracking-widest rounded-full border border-[#7C3AED]/10 truncate">
                  {deptInfo?.college_name || 'Loading College...'}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl md:text-4xl font-black text-[#1E184B] tracking-tight leading-tight">
                {deptInfo?.name || 'Loading Department...'}
              </h1>
              <p className="text-[#1E184B]/40 font-bold mt-1 uppercase text-[10px] md:text-xs tracking-widest flex items-center gap-2">
                <Shield className="w-3.5 h-3.5" />
                Departmental Command Center
              </p>
            </div>
          </div>
          
          {faculty.find(f => f.is_hod) && (
            <div className="w-full lg:w-auto flex items-center gap-4 p-4 md:px-6 md:py-3 bg-[#7C3AED]/5 rounded-2xl md:rounded-[2rem] border border-[#7C3AED]/10">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-[#7C3AED] overflow-hidden flex items-center justify-center text-white font-black text-xs md:text-sm shadow-lg shadow-[#7C3AED]/20 shrink-0">
                {faculty.find(f => f.is_hod)?.profile_pic ? (
                  <img src={`${import.meta.env.VITE_API_URL}/${faculty.find(f => f.is_hod)?.profile_pic}`} className="w-full h-full object-cover" alt="" />
                ) : (
                  faculty.find(f => f.is_hod)?.name.charAt(0)
                )}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[9px] md:text-[10px] font-black text-[#7C3AED] uppercase tracking-[0.2em] mb-0.5">Head of Department</span>
                <span className="text-xs md:text-sm font-black text-[#1E184B] truncate">{faculty.find(f => f.is_hod)?.name}</span>
                <span className="text-[9px] md:text-[10px] font-bold text-[#1E184B]/40 flex items-center gap-1 truncate">
                  <Mail className="w-2.5 h-2.5 shrink-0" />
                  {faculty.find(f => f.is_hod)?.email}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 gap-6 md:gap-8">
        {/* Faculty List Section */}
        <div className="bg-white rounded-2xl md:rounded-[2.5rem] border border-[#7C3AED]/10 overflow-hidden shadow-sm">
          <div className="p-5 md:p-8 border-b border-[#7C3AED]/10 flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 md:w-6 md:h-6 text-[#7C3AED]" />
              <h2 className="text-lg md:text-xl font-black text-[#1E184B]">Faculty Roster</h2>
              <span className="px-2 py-0.5 md:px-2.5 md:py-1 bg-[#7C3AED]/5 text-[#7C3AED] text-xs font-black rounded-lg border border-[#7C3AED]/10">
                {faculty.length} Members
              </span>
            </div>
            
            <div className="relative group w-full md:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-[#1E184B]/20 group-focus-within:text-[#7C3AED] transition-colors" />
              <input 
                type="text" 
                placeholder="Find faculty..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 md:py-3 bg-[#7C3AED]/5 border border-[#7C3AED]/10 rounded-xl md:rounded-2xl outline-none focus:bg-white focus:border-[#7C3AED] focus:ring-4 focus:ring-[#7C3AED]/5 transition-all text-xs md:text-sm font-bold"
              />
            </div>
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-8 py-5 text-[10px] font-black text-[#1E184B]/40 uppercase tracking-[0.2em]">Member Info</th>
                  <th className="px-8 py-5 text-[10px] font-black text-[#1E184B]/40 uppercase tracking-[0.2em]">Designation</th>
                  <th className="px-8 py-5 text-[10px] font-black text-[#1E184B]/40 uppercase tracking-[0.2em]">Sync Status</th>
                  <th className="px-8 py-5 text-right text-[10px] font-black text-[#1E184B]/40 uppercase tracking-[0.2em]">Protocols</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#7C3AED]/5">
                {isLoading ? (
                  <tr>
                    <td colSpan={4} className="px-8 py-20 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <Loader2 className="w-10 h-10 text-[#7C3AED] animate-spin" />
                        <p className="text-xs font-black text-[#1E184B]/40 uppercase tracking-widest">Synchronizing Roster...</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredFaculty.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-8 py-20 text-center text-[#1E184B]/30 font-bold italic">
                      No faculty members found matching your search.
                    </td>
                  </tr>
                ) : filteredFaculty.map((f) => (
                  <tr key={f.id} className="group hover:bg-[#7C3AED]/5 transition-colors">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-[#7C3AED]/5 overflow-hidden flex items-center justify-center text-[#7C3AED] font-black text-sm group-hover:bg-[#7C3AED] group-hover:text-white transition-all duration-300">
                          {f.profile_pic ? (
                            <img src={`${import.meta.env.VITE_API_URL}/${f.profile_pic}`} className="w-full h-full object-cover" alt="" />
                          ) : (
                            f.name.charAt(0)
                          )}
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-black text-[#1E184B]">{f.name}</span>
                            {!!f.is_hod && (
                              <span className="px-1.5 py-0.5 bg-[#7C3AED] text-white text-[8px] font-black uppercase rounded shadow-sm">HOD</span>
                            )}
                          </div> 
                          <span className="text-[10px] font-bold text-[#1E184B]/40 flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {f.email}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2">
                        <GraduationCap className="w-4 h-4 text-[#1E184B]/20" />
                        <span className="text-xs font-black text-[#1E184B]/60 uppercase tracking-wider">
                          {f.role_name || 'Faculty'}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2">
                        <div className={cn("w-2 h-2 rounded-full animate-pulse", f.is_active ? "bg-[#7C3AED]" : "bg-slate-300")} />
                        <span className="text-[10px] font-black uppercase tracking-widest text-[#1E184B]/40">
                          {f.is_active ? "Live" : "Inactive"}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <button 
                        onClick={() => handleRemoveFaculty(f.id)}
                        className="p-3 text-rose-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                        title="Remove from Department"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List View */}
          <div className="block md:hidden divide-y divide-[#7C3AED]/5">
            {isLoading ? (
              <div className="p-8 text-center">
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="w-8 h-8 text-[#7C3AED] animate-spin" />
                  <p className="text-[10px] font-black text-[#1E184B]/40 uppercase tracking-widest">Synchronizing Roster...</p>
                </div>
              </div>
            ) : filteredFaculty.length === 0 ? (
              <div className="p-8 text-center text-[#1E184B]/30 font-bold italic text-sm">
                No faculty members found matching your search.
              </div>
            ) : (
              filteredFaculty.map((f) => (
                <div key={f.id} className="p-5 flex flex-col gap-4 hover:bg-[#7C3AED]/5 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-[#7C3AED]/5 overflow-hidden flex items-center justify-center text-[#7C3AED] font-black text-xs shrink-0">
                        {f.profile_pic ? (
                          <img src={`${import.meta.env.VITE_API_URL}/${f.profile_pic}`} className="w-full h-full object-cover" alt="" />
                        ) : (
                          f.name.charAt(0)
                        )}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-black text-[#1E184B] truncate">{f.name}</span>
                          {!!f.is_hod && (
                            <span className="px-1.5 py-0.5 bg-[#7C3AED] text-white text-[8px] font-black uppercase rounded shadow-sm">HOD</span>
                          )}
                        </div>
                        <span className="text-[10px] font-bold text-[#1E184B]/40 flex items-center gap-1 truncate">
                          <Mail className="w-2.5 h-2.5 shrink-0" />
                          {f.email}
                        </span>
                      </div>
                    </div>

                    <button 
                      onClick={() => handleRemoveFaculty(f.id)}
                      className="p-2 text-rose-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all shrink-0"
                      title="Remove from Department"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-4 pt-3 border-t border-[#7C3AED]/5">
                    <div className="flex items-center gap-1.5 text-[#1E184B]/60">
                      <GraduationCap className="w-3.5 h-3.5 text-[#1E184B]/20" />
                      <span className="text-[10px] font-black uppercase tracking-wider">
                        {f.role_name || 'Faculty'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", f.is_active ? "bg-[#7C3AED]" : "bg-slate-300")} />
                      <span className="text-[9px] font-black uppercase tracking-widest text-[#1E184B]/40">
                        {f.is_active ? "Live" : "Inactive"}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Department;
