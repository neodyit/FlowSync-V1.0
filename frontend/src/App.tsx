import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import MainLayout from './layouts/MainLayout';
import ProtectedRoute from './components/ProtectedRoute';
import Maintenance from './pages/Maintenance';

// Admin Pages
import Dashboard from './pages/admin/Dashboard';
import InstitutionManagement from './pages/admin/InstitutionManagement';
import CollegeDetails from './pages/admin/CollegeDetails';
import DepartmentDetails from './pages/admin/DepartmentDetails';
import UsersManagement from './pages/admin/UsersManagement';
import Tasks from './pages/admin/Tasks';
import Notifications from './pages/admin/Notifications';
import Leaderboard from './pages/admin/Leaderboard';
import AuditLogs from './pages/admin/AuditLogs';
import Settings from './pages/admin/Settings';
import AdminDashboard from './pages/admin/AdminDashboard';
import ControlsPage from './pages/admin/ControlsPage';
import Feedbacks from './pages/admin/Feedbacks';

// HOD Pages
import HODLayout from './layouts/HODLayout';
import HODDashboard from './pages/hod/Dashboard';
import HODDepartment from './pages/hod/Department';
import HODFaculty from './pages/hod/Faculty';
import HODTasks from './pages/hod/Tasks';
import HODNotifications from './pages/hod/Notifications';
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

// Root Redirect Helper
const RootRedirect = () => {
  const rawUser = localStorage.getItem('user');
  if (!rawUser) return <Navigate to="/login" replace />;
  
  const user = JSON.parse(rawUser);
  const roleId = parseInt(user.role_id);
  
  if (roleId === 1) return <Navigate to="/admin/dashboard" replace />;
  if (roleId === 2) return <Navigate to="/hod/dashboard" replace />;
  if (roleId === 3) return <Navigate to="/faculty/dashboard" replace />;
  
  return <Navigate to="/login" replace />;
};

function App() {
  return (
    <Router>
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
            <Route path="notifications" element={<Notifications />} />
            <Route path="leaderboard" element={<Leaderboard />} />
            <Route path="audit" element={<AuditLogs />} />
            <Route path="controls" element={<ControlsPage />} />
            <Route path="feedbacks" element={<Feedbacks />} />
          </Route>
        </Route>

        {/* Protected HOD Routes (Role 2) */}
        <Route element={<ProtectedRoute allowedRoles={[2]} />}>
          <Route path="/hod" element={<HODLayout />}>
            <Route index element={<Navigate to="/hod/dashboard" replace />} />
            <Route path="dashboard" element={<HODDashboard />} />
            <Route path="department" element={<HODDepartment />} />
            <Route path="faculty" element={<HODFaculty />} />
            <Route path="tasks" element={<HODTasks />} />
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

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
