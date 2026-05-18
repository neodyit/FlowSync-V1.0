import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, 
  ChevronLeft, 
  Plus, 
  Trash2, 
  Edit2, 
  X, 
  Users, 
  ArrowRight 
} from 'lucide-react';

interface Department {
  id: number;
  name: string;
  college_id: number;
  hod_id: number | null;
  hod_name?: string;
  faculty_count?: number;
}

interface College {
  id: number;
  name: string;
  short_name: string;
  address: string;
}

const CollegeDetails: React.FC = () => {
  const { shortName } = useParams<{ shortName: string }>();
  const [college, setCollege] = useState<College | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [formData, setFormData] = useState({ name: '', hod_id: '' });
  const navigate = useNavigate();

  const fetchData = async () => {
    try {
      // Fetch college info first
      const cRes = await fetch(`${import.meta.env.VITE_API_URL}/admin/colleges.php`, {
        credentials: 'include'
      });
      const cData = await cRes.json();
      
      if (cData.status === 'success' && cData.data) {
        const found = cData.data.find((c: College) => c.short_name === shortName || c.id.toString() === shortName);
        
        if (found) {
          setCollege(found);
          // Fetch departments for this college
          const dRes = await fetch(`${import.meta.env.VITE_API_URL}/admin/departments.php?college_id=${found.id}`, {
            credentials: 'include'
          });
          const dData = await dRes.json();
          if (dData.status === 'success') {
            setDepartments(dData.data);
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
  }, [shortName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!college) return;

    const method = editingDept ? 'PUT' : 'POST';
    const body = editingDept 
      ? { ...formData, id: editingDept.id } 
      : { ...formData, college_id: college.id };

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/admin/departments.php`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (data.status === 'success') {
        fetchData();
        handleCloseModal();
      }
    } catch (error) {
      console.error('Operation failed:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this department?')) return;
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/admin/departments.php?id=${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await response.json();
      if (data.status === 'success') {
        fetchData();
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  const handleOpenModal = (dept?: Department) => {
    if (dept) {
      setEditingDept(dept);
      setFormData({ name: dept.name, hod_id: dept.hod_id?.toString() || '' });
    } else {
      setEditingDept(null);
      setFormData({ name: '', hod_id: '' });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingDept(null);
    setFormData({ name: '', hod_id: '' });
  };

  if (isLoading) return (
    <div className="flex justify-center py-20">
      <div className="w-10 h-10 border-4 border-[#7C3AED]/20 border-t-[#7C3AED] rounded-full animate-spin" />
    </div>
  );

  if (!college) return <div className="p-8 text-center text-gray-500 font-bold">College not found.</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <button 
        onClick={() => navigate('/admin/institution')}
        className="flex items-center gap-2 text-[#7C3AED] font-bold mb-8 hover:gap-3 transition-all"
      >
        <ChevronLeft className="w-5 h-5" />
        Back to Colleges
      </button>

      <div className="bg-white rounded-[32px] p-8 border border-[#7C3AED]/10 shadow-sm mb-12 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 bg-[#7C3AED]/10 rounded-[24px] flex items-center justify-center">
            <Building2 className="w-10 h-10 text-[#7C3AED]" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-[#1E1B4B]">{college.name}</h1>
            <div className="flex items-center gap-3 mt-1">
              <span className="px-3 py-1 rounded-full bg-[#7C3AED]/5 text-[#7C3AED] text-[12px] font-black tracking-wider uppercase">
                {college.short_name}
              </span>
              <p className="text-gray-400 text-sm font-medium">{college.address}</p>
            </div>
          </div>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-purple-500/20"
        >
          <Plus className="w-5 h-5" />
          Add Department
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {departments.map((dept) => (
          <motion.div
            key={dept.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-[24px] border border-gray-100 p-6 hover:border-[#7C3AED]/30 transition-all group"
          >
            <div className="flex justify-between items-start mb-6">
              <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center group-hover:bg-[#7C3AED]/10 transition-colors">
                <Users className="w-6 h-6 text-gray-400 group-hover:text-[#7C3AED]" />
              </div>
              <div className="flex gap-1">
                <button onClick={() => handleOpenModal(dept)} className="p-2 text-gray-400 hover:text-[#7C3AED]">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(dept.id)} className="p-2 text-gray-400 hover:text-rose-500">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <h3 className="text-lg font-bold text-gray-900 mb-2">{dept.name}</h3>
            <div className="space-y-2">
               <div className="flex items-center gap-2 text-xs font-medium text-gray-400">
                 <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                 HOD: <span className="text-gray-900">{dept.hod_name || 'Not Assigned'}</span>
               </div>
            </div>

            <button 
              onClick={() => navigate(`/admin/colleges/${shortName}/${dept.id}`)}
              className="w-full mt-6 py-2.5 bg-gray-50 group-hover:bg-[#7C3AED] text-gray-500 group-hover:text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
            >
              Manage Department
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        ))}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={handleCloseModal} className="absolute inset-0 bg-[#1E1B4B]/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-white rounded-[32px] w-full max-w-md p-8 shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">{editingDept ? 'Edit Dept' : 'New Dept'}</h2>
                <button onClick={handleCloseModal} className="p-2 hover:bg-gray-100 rounded-full"><X className="w-6 h-6 text-gray-400" /></button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-[12px] font-bold text-gray-600 ml-1">Department Name</label>
                  <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:border-[#7C3AED] text-sm" placeholder="e.g. Computer Science" />
                </div>
                <button type="submit" className="w-full py-3 bg-[#7C3AED] text-white rounded-xl font-bold shadow-lg shadow-purple-500/20 mt-4">{editingDept ? 'Update' : 'Create'}</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CollegeDetails;
