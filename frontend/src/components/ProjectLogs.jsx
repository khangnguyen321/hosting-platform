import { useState, useEffect } from 'react';
import api from '../api';
import './ProjectLogs.css';

function ProjectLogs({ projectId, isOpen, onClose }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/projects/${projectId}/logs/live?limit=100`);
      setLogs(response.data.logs);
      setIsRunning(response.data.isRunning);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchLogs();
    }
  }, [isOpen, projectId]);

  useEffect(() => {
    if (!autoRefresh || !isOpen) return;
    
    const interval = setInterval(fetchLogs, 5000); // Refresh every 5s
    return () => clearInterval(interval);
  }, [autoRefresh, isOpen, projectId]);

  if (!isOpen) return null;

  return (
    <div className="project-logs-overlay" onClick={onClose}>
      <div className="project-logs-modal" onClick={(e) => e.stopPropagation()}>
        <div className="project-logs-header">
          <div className="project-logs-title">
            <h3>Application Logs</h3>
            {isRunning ? (
              <span className="status-badge running">Running</span>
            ) : (
              <span className="status-badge stopped">Stopped</span>
            )}
          </div>
          
          <div className="project-logs-controls">
            <label className="auto-refresh">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
              />
              Auto-refresh (5s)
            </label>
            
            <button onClick={fetchLogs} className="refresh-btn" disabled={loading}>
              {loading ? '↻' : '⟳'}
            </button>
            
            <button onClick={onClose} className="close-btn">×</button>
          </div>
        </div>

        <div className="project-logs-content">
          {error && (
            <div className="logs-error-message">{error}</div>
          )}
          
          {!error && logs.length === 0 && !loading && (
            <div className="logs-empty">
              {isRunning ? 'No logs yet. Application is starting...' : 'Application is not running. Deploy to see logs.'}
            </div>
          )}
          
          {!error && logs.length > 0 && (
            <div className="logs-entries">
              {logs.map((log, index) => (
                <div key={index} className={`log-entry ${log.type === 'error' ? 'log-error' : 'log-info'}`}>
                  <span className="log-timestamp">{new Date(log.timestamp).toLocaleTimeString()}</span>
                  <span className="log-message">{log.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProjectLogs;
