import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { projectsAPI } from '../api';
import { Trash2, Rocket, Square, Info, Loader } from 'lucide-react';

export default function ProjectCard({ project, onDelete, onRefresh }) {
  const navigate = useNavigate();
  const [deploying, setDeploying] = useState(false);
  const [stopping, setStop] = useState(false);

  const handleDeploy = async () => {
    if (window.confirm('Deploy this project?')) {
      try {
        setDeploying(true);
        await projectsAPI.deploy(project.id);
        setTimeout(onRefresh, 1000);
      } catch (err) {
        alert('Deployment failed: ' + err.response?.data?.error);
      } finally {
        setDeploying(false);
      }
    }
  };

  const handleStop = async () => {
    try {
      setStop(true);
      await projectsAPI.stop(project.id);
      setTimeout(onRefresh, 1000);
    } catch (err) {
      alert('Failed to stop: ' + err.response?.data?.error);
    } finally {
      setStop(false);
    }
  };

  const handleViewLogs = () => {
    navigate(`/project/${project.id}/logs`);
  };

  const handleViewSecrets = () => {
    navigate(`/project/${project.id}/secrets`);
  };

  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 hover:border-slate-600 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-white mb-1">
            {project.name}
          </h3>
          <p className="text-sm text-slate-400 truncate">
            {project.github_url}
          </p>
        </div>
        <button
          onClick={() => onDelete(project.id)}
          className="p-2 hover:bg-red-600/10 text-red-400 rounded transition-colors"
          title="Delete project"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Status */}
      <div className="mb-4 pb-4 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${
              project.is_running ? 'bg-green-500' : 'bg-gray-500'
            }`}
          />
          <span className="text-sm font-medium text-slate-300">
            {project.is_running ? 'Running' : 'Stopped'}
          </span>
          {project.is_running && project.port && (
            <span className="text-xs text-slate-400">
              → localhost:{project.port}
            </span>
          )}
        </div>
      </div>

      {/* Description */}
      {project.description && (
        <p className="text-sm text-slate-400 mb-4">{project.description}</p>
      )}

      {/* Buttons */}
      <div className="grid grid-cols-2 gap-2">
        {!project.is_running ? (
          <button
            onClick={handleDeploy}
            disabled={deploying}
            className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded transition-colors"
          >
            {deploying ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Deploying
              </>
            ) : (
              <>
                <Rocket className="w-4 h-4" />
                Deploy
              </>
            )}
          </button>
        ) : (
          <button
            onClick={handleStop}
            disabled={stopping}
            className="flex items-center justify-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-700 disabled:opacity-50 text-white text-sm font-medium rounded transition-colors"
          >
            {stopping ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Stopping
              </>
            ) : (
              <>
                <Square className="w-4 h-4" />
                Stop
              </>
            )}
          </button>
        )}

        <button
          onClick={handleViewLogs}
          className="flex items-center justify-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm font-medium rounded transition-colors"
        >
          <Info className="w-4 h-4" />
          Logs
        </button>

        <button
          onClick={handleViewSecrets}
          className="col-span-2 w-full px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm font-medium rounded transition-colors"
        >
          Manage Secrets
        </button>
      </div>
    </div>
  );
}