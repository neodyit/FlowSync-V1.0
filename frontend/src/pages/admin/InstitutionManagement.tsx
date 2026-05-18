import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, MapPin, Building2, ExternalLink, Trash2, Edit2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import SEO from '@/components/SEO';

interface College {
  id: number;
  name: string;
  short_name: string;
  address: string;
  created_at: string;
}

const InstitutionManagement: React.FC = () => {
  const [colleges, setColleges] = useState<College[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCollege, setEditingCollege] = useState<College | null>(null);
  const [formData, setFormData] = useState({ name: '', short_name: '', address: '' });
  const navigate = useNavigate();

  const fetchColleges = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/admin/colleges.php`, {
        credentials: 'include'
      });
      const data = await response.json();
      if (data.status === 'success') {
        setColleges(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch colleges:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchColleges();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = editingCollege ? 'PUT' : 'POST';
    const body = editingCollege ? { ...formData, id: editingCollege.id } : formData;

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/admin/colleges.php`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (data.status === 'success') {
        fetchColleges();
        handleCloseModal();
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error('Operation failed:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this college? All departments must be removed first.')) return;
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/admin/colleges.php?id=${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await response.json();
      if (data.status === 'success') {
        fetchColleges();
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  const handleOpenModal = (college?: College) => {
    if (college) {
      setEditingCollege(college);
      setFormData({ name: college.name, short_name: college.short_name, address: college.address });
    } else {
      setEditingCollege(null);
      setFormData({ name: '', short_name: '', address: '' });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCollege(null);
    setFormData({ name: '', short_name: '', address: '' });
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <SEO title="Institution Management" description="Manage colleges and departmental hierarchies within the FlowSync ecosystem." />
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-black text-[#1E1B4B]">Institution Management</h1>
          <p className="text-[#4C1D95]/60 mt-2">Oversee all affiliated colleges and their hierarchies.</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-purple-500/20"
        >
          <Plus className="w-5 h-5" />
          Add College
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-[#7C3AED]/20 border-t-[#7C3AED] rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {colleges.map((college) => (
            <motion.div
              key={college.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-[24px] border border-[#7C3AED]/10 p-6 hover:shadow-xl hover:shadow-purple-500/5 transition-all group relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#7C3AED]/5 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform" />
              
              <div className="flex items-start justify-between relative z-10 mb-4">
                <div className="p-3 bg-[#7C3AED]/10 rounded-2xl">
                  <Building2 className="w-6 h-6 text-[#7C3AED]" />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleOpenModal(college)} className="p-2 text-gray-400 hover:text-[#7C3AED] transition-colors">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(college.id)} className="p-2 text-gray-400 hover:text-rose-500 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="relative z-10 cursor-pointer" onClick={() => navigate(`/admin/colleges/${college.short_name || college.id}`)}>
                <h3 className="text-xl font-bold text-gray-900 group-hover:text-[#7C3AED] transition-colors">{college.name}</h3>
                <span className="inline-block px-2.5 py-1 rounded-lg bg-gray-100 text-gray-500 text-[10px] font-black uppercase tracking-wider mt-2">
                  {college.short_name || 'N/A'}
                </span>
                
                <div className="flex items-start gap-2 mt-4 text-gray-500 text-sm">
                  <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <p className="line-clamp-2">{college.address || 'No address provided'}</p>
                </div>

                <div className="mt-6 pt-4 border-t border-gray-50 flex items-center justify-between text-[#7C3AED] font-bold text-sm">
                  <span>View Departments</span>
                  <ExternalLink className="w-4 h-4" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCloseModal}
              className="absolute inset-0 bg-[#1E1B4B]/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white rounded-[32px] w-full max-w-md p-8 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">{editingCollege ? 'Edit College' : 'Add New College'}</h2>
                <button onClick={handleCloseModal} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-[12px] font-bold text-gray-600 ml-1">College Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:border-[#7C3AED] transition-all text-sm"
                    placeholder="e.g. Imperial Institute of Technology"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[12px] font-bold text-gray-600 ml-1">Short Name / Code</label>
                  <input
                    type="text"
                    required
                    value={formData.short_name}
                    onChange={(e) => setFormData({ ...formData, short_name: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:border-[#7C3AED] transition-all text-sm"
                    placeholder="e.g. IIT"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[12px] font-bold text-gray-600 ml-1">Location Address</label>
                  <textarea
                    rows={3}
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:border-[#7C3AED] transition-all text-sm resize-none"
                    placeholder="Enter full physical address..."
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-xl font-bold shadow-lg shadow-purple-500/20 transition-all mt-4"
                >
                  {editingCollege ? 'Update College' : 'Create College'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default InstitutionManagement;
