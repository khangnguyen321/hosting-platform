import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import './CreateProject.css';

function CreateProject() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    githubUrl: '',
    githubBranch: 'main',
    description: ''
  });
  const [error, setError] = useState('');
  const [deploying, setDeploying] = useState(false);
  const [deployLogs, setDeployLogs] = useState([]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const addLog = (message, type = 'info') => {
    setDeployLogs(prev => [...prev, { message, type, timestamp: new Date() }]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setDeploying(true);
    setDeployLogs([]);

    addLog('Initializing deployment...', 'info');

    try {
      // Create project
      addLog('Creating project...', 'info');
      const createResponse = await api.post('/api/projects', {
        name: formData.name,
        github_url: formData.githubUrl,
        github_branch: formData.githubBranch,
        description: formData.description
      });

      const projectId = createResponse.data.id;
      addLog(`✓ Project created (ID: ${projectId})`, 'success');

      // Deploy project
      addLog('Starting deployment...', 'info');
      const deployResponse = await api.post(`/api/projects/${projectId}/deploy`);

      addLog('✓ Cloning repository...', 'success');
      addLog('✓ Installing dependencies...', 'success');
      addLog('✓ Starting application...', 'success');
      
      if (deployResponse.data.url) {
        addLog(`✓ Deployment complete! Live at ${deployResponse.data.url}`, 'success');
      } else {
        addLog('✓ Deployment complete!', 'success');
      }

      // Redirect after short delay
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);

    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Deployment failed. Please try again.';
      setError(errorMsg);
      addLog(`✗ Error: ${errorMsg}`, 'error');
      setDeploying(false);
    }
  };

  const handleCancel = () => {
    navigate('/dashboard');
  };

  return (
    <div className="create-project-container">
      <div className="create-project-header">
        <div className="header-content">
          <button onClick={handleCancel} className="back-button">
            ← Back to Dashboard
          </button>
          <h1 className="page-title">Deploy New Project</h1>
          <p className="page-subtitle">Connect your GitHub repository and deploy in seconds</p>
        </div>
      </div>

      <div className="create-project-content">
        <div className="form-section">
          <form onSubmit={handleSubmit} className="project-form">
            {error && !deploying && (
              <div className="error-banner">
                <span className="error-icon">⚠</span>
                {error}
              </div>
            )}

            <div className="form-group">
              <label htmlFor="name" className="form-label">
                <span className="label-text">Project Name</span>
                <span className="label-required">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="form-input"
                placeholder="my-awesome-app"
                required
                disabled={deploying}
                pattern="[a-z0-9-]+"
                title="Only lowercase letters, numbers, and hyphens"
              />
              <p className="form-hint">
                Will be available at <span className="hint-mono">{formData.name || 'your-project'}.launchport.org</span>
              </p>
            </div>

            <div className="form-group">
              <label htmlFor="githubUrl" className="form-label">
                <span className="label-text">GitHub Repository URL</span>
                <span className="label-required">*</span>
              </label>
              <input
                type="url"
                id="githubUrl"
                name="githubUrl"
                value={formData.githubUrl}
                onChange={handleChange}
                className="form-input"
                placeholder="https://github.com/username/repository.git"
                required
                disabled={deploying}
              />
              <p className="form-hint">
                Public or private repositories (must be accessible)
              </p>
            </div>

            <div className="form-group">
              <label htmlFor="githubBranch" className="form-label">
                <span className="label-text">Branch</span>
              </label>
              <input
                type="text"
                id="githubBranch"
                name="githubBranch"
                value={formData.githubBranch}
                onChange={handleChange}
                className="form-input"
                placeholder="main"
                disabled={deploying}
              />
              <p className="form-hint">
                Default branch to deploy from
              </p>
            </div>

            <div className="form-group">
              <label htmlFor="description" className="form-label">
                <span className="label-text">Description</span>
                <span className="label-optional">(optional)</span>
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                className="form-textarea"
                placeholder="A brief description of your project..."
                rows="3"
                disabled={deploying}
              />
            </div>

            <div className="form-actions">
              <button
                type="button"
                onClick={handleCancel}
                className="btn btn-secondary"
                disabled={deploying}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={deploying}
              >
                {deploying ? (
                  <>
                    <span className="spinner-small"></span>
                    Deploying...
                  </>
                ) : (
                  <>
                    <span>🚀</span>
                    Deploy Project
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {deploying && (
          <div className="deploy-section">
            <div className="deploy-status">
              <div className="status-header">
                <h3 className="status-title">Deployment in Progress</h3>
                <div className="status-indicator">
                  <span className="status-dot deploying"></span>
                  Deploying
                </div>
              </div>

              <div className="terminal-output">
                {deployLogs.map((log, index) => (
                  <div 
                    key={index} 
                    className={`terminal-line terminal-${log.type}`}
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <span className="terminal-prompt">$</span>
                    <span className="terminal-text">{log.message}</span>
                  </div>
                ))}
                <div className="terminal-cursor">_</div>
              </div>
            </div>
          </div>
        )}

        {!deploying && (
          <div className="info-section">
            <h3 className="info-title">What happens next?</h3>
            <div className="info-steps">
              <div className="info-step">
                <div className="step-number">1</div>
                <div className="step-content">
                  <h4 className="step-title">Clone Repository</h4>
                  <p className="step-description">
                    LaunchPort clones your GitHub repository to the server
                  </p>
                </div>
              </div>
              <div className="info-step">
                <div className="step-number">2</div>
                <div className="step-content">
                  <h4 className="step-title">Install Dependencies</h4>
                  <p className="step-description">
                    Automatically runs npm install or yarn install
                  </p>
                </div>
              </div>
              <div className="info-step">
                <div className="step-number">3</div>
                <div className="step-content">
                  <h4 className="step-title">Configure & Deploy</h4>
                  <p className="step-description">
                    Sets up Nginx reverse proxy and SSL certificate
                  </p>
                </div>
              </div>
              <div className="info-step">
                <div className="step-number">4</div>
                <div className="step-content">
                  <h4 className="step-title">Go Live!</h4>
                  <p className="step-description">
                    Your app is live at your-project.launchport.org
                  </p>
                </div>
              </div>
            </div>

            <div className="info-note">
              <div className="note-icon">💡</div>
              <div>
                <h4 className="note-title">Requirements</h4>
                <p className="note-text">
                  Your project must have a <code>package.json</code> with a <code>start</code> script.
                  Make sure your app listens on the PORT environment variable.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CreateProject;