import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { projectsAPI } from '../api';
import { ArrowLeft, Loader, RefreshCw } from 'lucide-react';

export default function ProjectLogs() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    loadLogs();
  }, [projectId]);

  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(loadLogs, 2000);
    return () => clearInterval(interval);
  }, [autoRefresh, projectId]);

  const loadLogs = async () => {
    try {
      const response = await projectsAPI.getLogs(projectId);
      setLogs(response.data || []);
      setError('');
    } catch (err) {
      setError('Failed to load logs');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>
          <button
            onClick={loadLogs}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {/* Title */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">Deployment Logs</h1>
          <p className="text-slate-400">Project #{projectId}</p>
        </div>

        {/* Auto-refresh Toggle */}
        <div className="mb-6 flex items-center gap-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm text-slate-300">Auto-refresh (2s)</span>
          </label>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-800 rounded-lg text-red-200">
            {error}
          </div>
        )}

        {/* Logs Container */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader className="w-6 h-6 text-blue-500 animate-spin" />
            </div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              No logs yet. Deploy a project to see logs here.
            </div>
          ) : (
            <div className="divide-y divide-slate-700 max-h-96 overflow-y-auto">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className={`p-4 font-mono text-sm ${
                    log.log_type === 'error'
                      ? 'bg-red-900/10 text-red-300'
                      : log.log_type === 'warn'
                      ? 'bg-yellow-900/10 text-yellow-300'
                      : 'text-slate-300'
                  }`}
                >
                  <span className="text-slate-500">
                    {new Date(log.created_at).toLocaleTimeString()}
                  </span>
                  {' '}
                  <span>{log.log_message}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <p className="text-xs text-slate-400 mt-4">
          Logs are stored for the last 100 entries
        </p>
      </div>
    </div>
  );
}