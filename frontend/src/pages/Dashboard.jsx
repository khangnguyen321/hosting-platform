import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import ProjectCard from '../components/ProjectCard';
import './Dashboard.css';

function Dashboard() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    fetchProjects();
    // Get user email from token
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUserEmail(payload.email || 'user@example.com');
      } catch (e) {
        setUserEmail('user@example.com');
      }
    }
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const response = await api.get('/projects');
      setProjects(response.data);
      setError('');
    } catch (err) {
      setError('Failed to load projects');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.dispatchEvent(new Event('localStorage-update'));
    navigate('/login');
  };

  const handleStart = async (projectId) => {
    try {
      await api.post(`/projects/${projectId}/start`);
      fetchProjects();
    } catch (err) {
      alert('Failed to start project');
    }
  };

  const handleStop = async (projectId) => {
    try {
      await api.post(`/projects/${projectId}/stop`);
      fetchProjects();
    } catch (err) {
      alert('Failed to stop project');
    }
  };

  const handleRestart = async (projectId) => {
    try {
      await api.post(`/projects/${projectId}/restart`);
      fetchProjects();
    } catch (err) {
      alert('Failed to restart project');
    }
  };

  const handleDelete = async (projectId) => {
    if (!window.confirm('Are you sure you want to delete this project?')) {
      return;
    }
    try {
      await api.delete(`/projects/${projectId}`);
      fetchProjects();
    } catch (err) {
      alert('Failed to delete project');
    }
  };

  const handleViewLogs = (projectId) => {
    alert(`Logs feature coming soon for project ${projectId}`);
  };

  const runningCount = projects.filter(p => p.status === 'running' || p.is_running).length;
  const totalCount = projects.length;

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="logo">
          <div className="logo-icon">LP</div>
          <div className="logo-text">LaunchPort</div>
        </div>
        <div className="header-actions">
          <div className="user-info">{userEmail}</div>
          <button className="btn btn-secondary">Docs</button>
          <button className="btn btn-danger" onClick={handleLogout}>Logout</button>
        </div>
      </header>

      <div className="stats-bar">
        <div className="stat-card">
          <div className="stat-label">Total Projects</div>
          <div className="stat-value">{totalCount}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Running</div>
          <div className="stat-value">{runningCount}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Stopped</div>
          <div className="stat-value">{totalCount - runningCount}</div>
        </div>
      </div>

      <div className="section-header">
        <h2 className="section-title">Your Projects</h2>
        <button className="btn btn-primary" onClick={() => navigate('/create-project')}>
          <span>+</span>
          New Project
        </button>
      </div>

      {loading && (
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading projects...</p>
        </div>
      )}

      {error && (
        <div className="error-state">
          <p>{error}</p>
          <button className="btn btn-primary" onClick={fetchProjects}>Retry</button>
        </div>
      )}

      {!loading && !error && projects.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">📦</div>
          <h3 className="empty-title">No projects yet</h3>
          <p className="empty-description">
            Deploy your first project by connecting a GitHub repository. 
            LaunchPort will handle the rest.
          </p>
          <button className="btn btn-primary" onClick={() => navigate('/create-project')}>
            <span>+</span>
            Create Your First Project
          </button>
        </div>
      )}

      {!loading && !error && projects.length > 0 && (
        <div className="projects-grid">
          {projects.map(project => (
            <ProjectCard
              key={project.id}
              project={project}
              onStart={handleStart}
              onStop={handleStop}
              onRestart={handleRestart}
              onDelete={handleDelete}
              onViewLogs={handleViewLogs}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default Dashboard;
