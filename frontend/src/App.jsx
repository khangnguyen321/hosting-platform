import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import CreateProject from './pages/CreateProject';
import ProjectLogs from './pages/ProjectLogs';
import ProjectSecrets from './pages/ProjectSecrets';

function App() {
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    setLoading(false);
    
    // Listen for storage changes (both cross-tab and same-window)
    const handleStorageChange = () => {
      setRefreshKey(prev => prev + 1);
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('localStorage-update', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('localStorage-update', handleStorageChange);
    };
  }, []);

  // Check if authenticated in real-time from localStorage
  const isAuthenticated = !!localStorage.getItem('token');

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <BrowserRouter key={refreshKey}>
      <Routes>
        {/* Public Routes */}
        <Route
          path="/login"
          element={
            isAuthenticated ? <Navigate to="/dashboard" /> : <Login />
          }
        />
        
        <Route
          path="/signup"
          element={
            isAuthenticated ? <Navigate to="/dashboard" /> : <Signup />
          }
        />

        {/* Protected Routes */}
        <Route
          path="/dashboard"
          element={
            isAuthenticated ? (
              <Dashboard />
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        
        <Route
          path="/create-project"
          element={
            isAuthenticated ? (
              <CreateProject />
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        
        <Route
          path="/project/:projectId/logs"
          element={
            isAuthenticated ? (
              <ProjectLogs />
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        
        <Route
          path="/project/:projectId/secrets"
          element={
            isAuthenticated ? (
              <ProjectSecrets />
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        {/* Default Route */}
        <Route
          path="/"
          element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;