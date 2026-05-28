import React, { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { checkSession } from '../utils/auth';

interface ProtectedRouteProps {
  allowedRoles?: number[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const validate = async () => {
      const userData = await checkSession();
      setUser(userData); 
      setIsLoading(false);
    };
    validate();
  }, []);

  if (isLoading) {
    return ( 
      <div className="min-h-screen flex items-center justify-center bg-[#EDE9FE] dark:bg-[#0E0820] transition-colors duration-200">
        <div className="w-12 h-12 border-4 border-[#7C3AED]/20 border-t-[#7C3AED] dark:border-violet-500/20 dark:border-t-violet-400 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const session = user.session;

  if (session.maintenance && session.role_id !== 1) {
    return <Navigate to="/maintenance" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(session.role_id)) {
    // Redirect based on role to their appropriate dashboard
    if (session.role_id === 1) return <Navigate to="/admin/dashboard" replace />;
    if (session.role_id === 2) return <Navigate to="/hod/dashboard" replace />;
    if (session.role_id === 3) return <Navigate to="/faculty/dashboard" replace />;
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
