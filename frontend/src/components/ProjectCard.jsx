import React from 'react';
import './ProjectCard.css';

function ProjectCard({ project, onStart, onStop, onRestart, onDelete, onViewLogs }) {
  const isRunning = project.status === 'running' || project.is_running;
  const isDeploying = project.status === 'deploying';
  const isStopped = !isRunning && !isDeploying;

  const statusClass = isRunning ? 'running' : isDeploying ? 'deploying' : 'stopped';
  const statusText = isRunning ? 'Running' : isDeploying ? 'Deploying' : 'Stopped';

  const projectUrl = `https://${project.name}.launchport.org`;

  return (
    <div className={`project-card ${statusClass}`}>
      <div className="project-header">
        <div className="project-info">
          <h3 className="project-name">{project.name}</h3>
          <a 
            href={projectUrl} 
            className="project-url" 
            target="_blank" 
            rel="noopener noreferrer"
          >
            {project.name}.launchport.org →
          </a>
        </div>
        <span className={`status-badge status-${statusClass}`}>
          <span className="status-dot"></span>
          {statusText}
        </span>
      </div>

      <div className="project-meta">
        <div className="meta-item">
          <div className="meta-label">Port</div>
          <div className="meta-value">{project.port || 'N/A'}</div>
        </div>
        <div className="meta-item">
          <div className="meta-label">Branch</div>
          <div className="meta-value">{project.github_branch || 'main'}</div>
        </div>
        <div className="meta-item">
          <div className="meta-label">Repository</div>
          <div className="meta-value" title={project.github_url}>
            {project.github_url?.split('/').pop()?.replace('.git', '') || 'N/A'}
          </div>
        </div>
      </div>

      {isRunning && (
        <div className="terminal-preview">
          <div className="terminal-line">
            <span className="terminal-prompt">$</span> npm start
          </div>
          <div className="terminal-line">
            <span className="terminal-success">✓</span> Server running on port {project.port}
          </div>
          <div className="terminal-line">
            <span className="terminal-info">[{project.name}]</span> Application started successfully
          </div>
        </div>
      )}

      <div className="project-actions">
        {isStopped && (
          <button 
            className="btn btn-primary" 
            onClick={() => onStart(project.id)}
          >
            ▶ Start
          </button>
        )}
        {isRunning && (
          <>
            <button 
              className="btn btn-secondary btn-icon" 
              onClick={() => onRestart(project.id)}
              title="Restart"
            >
              🔄
            </button>
            <button 
              className="btn btn-danger btn-icon" 
              onClick={() => onStop(project.id)}
              title="Stop"
            >
              ⏹
            </button>
          </>
        )}
        <button 
          className="btn btn-secondary btn-icon" 
          onClick={() => onViewLogs(project.id)}
          title="View Logs"
        >
          📄
        </button>
        <button 
          className="btn btn-secondary btn-icon" 
          title="Settings"
        >
          ⚙️
        </button>
        {isStopped && (
          <button 
            className="btn btn-danger btn-icon" 
            onClick={() => onDelete(project.id)}
            title="Delete"
          >
            🗑
          </button>
        )}
      </div>
    </div>
  );
}

export default ProjectCard;
