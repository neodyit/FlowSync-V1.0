import React from 'react';
import SEO from '@/components/SEO';

const AdminDashboard: React.FC = () => {
  return (
    <div className="p-8">
      <SEO title="Admin Dashboard" description="System-wide institutional overview and administrative controls." />
      <h1 className="text-3xl font-black text-[#1E1B4B]">Admin Dashboard</h1>
      <p className="text-[#4C1D95]/60 mt-2">System-wide overview and management.</p>
    </div>
  );
};

export default AdminDashboard;
