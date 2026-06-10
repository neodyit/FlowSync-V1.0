import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import MainLayout from './layouts/MainLayout';
import ProtectedRoute from './components/ProtectedRoute';
import Maintenance from './pages/Maintenance';
import { ThemeProvider } from './components/ThemeProvider';
import OfflinePage from './pages/common/OfflinePage';
import NotFound from './pages/common/NotFound';

// Admin Pages
import Dashboard from './pages/admin/Dashboard';
import InstitutionManagement from './pages/admin/InstitutionManagement';
import CollegeDetails from './pages/admin/CollegeDetails';
import DepartmentDetails from './pages/admin/DepartmentDetails';
import UsersManagement from './pages/admin/UsersManagement';
import Tasks from './pages/admin/Tasks';
import AdminTaskDetails from './pages/admin/TaskDetails';
import Notifications from './pages/admin/Notifications';
import Leaderboard from './pages/admin/Leaderboard';
import AuditLogs from './pages/admin/AuditLogs';
import Settings from './pages/admin/Settings';
import AdminDashboard from './pages/admin/AdminDashboard';
import ControlsPage from './pages/admin/ControlsPage';
import Feedbacks from './pages/admin/Feedbacks';
import EngagementTracker from './pages/admin/EngagementTracker';
import AcademicSeasons from './pages/admin/AcademicSeasons';

// HOD Pages
import HODLayout from './layouts/HODLayout';
import HODDashboard from './pages/hod/Dashboard';
import HODDepartment from './pages/hod/Department';
import HODFaculty from './pages/hod/Faculty';
import HODTasks from './pages/hod/Tasks';
import HODTaskForm from './pages/hod/TaskForm';
import HODTaskDetails from './pages/hod/TaskDetails';
import HODNotifications from './pages/hod/Notifications';
import HODGroups from './pages/hod/Groups';
import HODLeaderboard from './pages/hod/Leaderboard';
import HODSettings from './pages/hod/Settings';
import HODReports from './pages/hod/Reports';

// Faculty Pages
import FacultyLayout from './layouts/FacultyLayout';
import FacultyDashboard from './pages/faculty/Dashboard';
import FacultyDepartment from './pages/faculty/Department';
import FacultyTasks from './pages/faculty/Tasks';
import FacultyMyTasks from './pages/faculty/MyTasks';
import FacultyNotifications from './pages/faculty/Notifications';
import FacultyLeaderboard from './pages/faculty/Leaderboard';
import FacultySettings from './pages/faculty/Settings';

// Common Pages
import Feedback from './pages/common/Feedback';
import Profile from './pages/common/Profile';
import PublicProfile from './pages/common/PublicProfile';

// IA Pages
import IALayout from './layouts/IALayout';
import IADashboard from './pages/ia/Dashboard';
import IAUsers from './pages/ia/Users';
import IADepartments from './pages/ia/Departments';
import IATasks from './pages/ia/Tasks';
import IANotices from './pages/ia/Notices';
import IAReports from './pages/ia/Reports';

// Root Redirect Helper
const RootRedirect = () => {
  const rawUser = localStorage.getItem('user');
  if (!rawUser) return <Navigate to="/login" replace />;
  
  const user = JSON.parse(rawUser);
  const roleId = parseInt(user.role_id);
  
  if (roleId === 1) return <Navigate to="/admin/dashboard" replace />;
  if (roleId === 2) return <Navigate to="/hod/dashboard" replace />;
  if (roleId === 3) return <Navigate to="/faculty/dashboard" replace />;
  if (roleId === 4) return <Navigate to="/ia/dashboard" replace />;
  
  return <Navigate to="/login" replace />;
};

import { useEngagementTracker } from './hooks/useEngagementTracker';

const GlobalTracker = () => {
  useEngagementTracker();
  return null;
};

function App() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const checkVersion = async () => {
      try {
        const response = await fetch(`/version.json?t=${Date.now()}`, {
          cache: 'no-store'
        });
        if (!response.ok) return;
        const data = await response.json();
        const serverVersion = data.version;
        const localVersion = localStorage.getItem('flowsync_version');

        if (localVersion && localVersion !== serverVersion) {
          console.log(`Version mismatch detected! Local: ${localVersion}, Server: ${serverVersion}. Clearing cache and reloading...`);
          
          // Clear all caches in Cache Storage API
          if ('caches' in window) {
            const keys = await caches.keys();
            await Promise.all(keys.map(key => caches.delete(key)));
          }

          // Update local version reference
          localStorage.setItem('flowsync_version', serverVersion);

          // Force reload
          window.location.reload();
        } else if (!localVersion) {
          localStorage.setItem('flowsync_version', serverVersion);
        }
      } catch (err) {
        console.error('Failed to verify version:', err);
      }
    };

    checkVersion();
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);


  return (
    <ThemeProvider>
      {isOffline ? (
        <OfflinePage />
      ) : (
        <Router>
          <GlobalTracker />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/maintenance" element={<Maintenance />} />
            
            {/* Root redirect */}
            <Route path="/" element={<RootRedirect />} />

            {/* Protected Admin Routes (Role 1) */}
            <Route element={<ProtectedRoute allowedRoles={[1]} />}>
              <Route path="/admin" element={<MainLayout />}>
                <Route index element={<Navigate to="/admin/dashboard" replace />} />
                <Route path="dashboard" element={<AdminDashboard />} />
                <Route path="institution" element={<InstitutionManagement />} />
                <Route path="users" element={<UsersManagement />} />
                <Route path="colleges/:shortName" element={<CollegeDetails />} />
                <Route path="colleges/:shortName/:deptId" element={<DepartmentDetails />} />
                <Route path="tasks" element={<Tasks />} />
                <Route path="tasks/:id" element={<AdminTaskDetails />} />
                <Route path="notifications" element={<Notifications />} />
                <Route path="leaderboard" element={<Leaderboard />} />
                <Route path="audit" element={<AuditLogs />} />
                <Route path="controls" element={<ControlsPage />} />
                <Route path="feedbacks" element={<Feedbacks />} />
                <Route path="engagement" element={<EngagementTracker />} />
                <Route path="seasons" element={<AcademicSeasons />} />
                <Route path="profile" element={<Profile />} />
                <Route path="profile/:id" element={<PublicProfile />} />
              </Route>
            </Route>

            {/* Protected HOD Routes (Role 2) */}
            <Route element={<ProtectedRoute allowedRoles={[2]} />}>
              <Route path="/hod" element={<HODLayout />}>
                <Route index element={<Navigate to="/hod/dashboard" replace />} />
                <Route path="dashboard" element={<HODDashboard />} />
                <Route path="department" element={<HODDepartment />} />
                <Route path="faculty" element={<HODFaculty />} />
                <Route path="groups" element={<HODGroups />} />
                <Route path="tasks" element={<HODTasks />} />
                <Route path="tasks/new" element={<HODTaskForm />} />
                <Route path="tasks/edit/:id" element={<HODTaskForm />} />
                <Route path="tasks/:id" element={<HODTaskDetails />} />
                <Route path="notifications" element={<HODNotifications />} />
                <Route path="leaderboard" element={<HODLeaderboard />} />
                <Route path="reports" element={<HODReports />} />
                <Route path="settings" element={<HODSettings />} />
                <Route path="profile" element={<Profile />} />
                <Route path="profile/:id" element={<PublicProfile />} />
                <Route path="feedback" element={<Feedback />} />
              </Route>
            </Route>

            {/* Protected Faculty Routes (Role 3) */}
            <Route element={<ProtectedRoute allowedRoles={[3]} />}>
              <Route path="/faculty" element={<FacultyLayout />}>
                <Route index element={<Navigate to="/faculty/dashboard" replace />} />
                <Route path="dashboard" element={<FacultyDashboard />} />
                <Route path="department" element={<FacultyDepartment />} />
                <Route path="tasks" element={<FacultyTasks />} />
                <Route path="my-tasks" element={<FacultyMyTasks />} />
                <Route path="notifications" element={<FacultyNotifications />} />
                <Route path="leaderboard" element={<FacultyLeaderboard />} />
                <Route path="settings" element={<FacultySettings />} />
                <Route path="profile" element={<Profile />} />
                <Route path="profile/:id" element={<PublicProfile />} />
                <Route path="feedback" element={<Feedback />} />
              </Route>
            </Route>

            {/* Protected Institution Admin Routes (Role 4) */}
            <Route element={<ProtectedRoute allowedRoles={[4]} />}>
              <Route path="/ia" element={<IALayout />}>
                <Route index element={<Navigate to="/ia/dashboard" replace />} />
                <Route path="dashboard" element={<IADashboard />} />
                <Route path="users" element={<IAUsers />} />
                <Route path="departments" element={<IADepartments />} />
                <Route path="tasks" element={<IATasks />} />
                <Route path="notices" element={<IANotices />} />
                <Route path="reports" element={<IAReports />} />
                <Route path="profile" element={<Profile />} />
                <Route path="profile/:id" element={<PublicProfile />} />
              </Route>
            </Route>

            {/* Catch-all 404 Route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Router>
      )}
    </ThemeProvider>
  );
}

export default App;

