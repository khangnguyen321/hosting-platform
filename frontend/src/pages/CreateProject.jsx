import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { projectsAPI } from '../api';
import { ArrowLeft, AlertCircle, Loader } from 'lucide-react';

export default function CreateProject() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    github_url: '',
    github_branch: 'main',
    description: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validation
    if (!formData.name.trim()) {
      setError('Project name is required');
      setLoading(false);
      return;
    }

    if (!formData.github_url.trim()) {
      setError('GitHub URL is required');
      setLoading(false);
      return;
    }

    if (!formData.github_url.endsWith('.git')) {
      setError('GitHub URL must end with .git');
      setLoading(false);
      return;
    }

    try {
      await projectsAPI.create(
        formData.name,
        formData.github_url,
        formData.github_branch,
        formData.description
      );

      // Redirect to dashboard
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-slate-400 hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </button>

        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Create Project</h1>
          <p className="text-slate-400">
            Add a new GitHub repository to deploy
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-900/20 border border-red-800 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-red-200">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Project Name */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Project Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g., My API"
                disabled={loading}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                required
              />
              <p className="text-xs text-slate-400 mt-1">
                A friendly name for your project
              </p>
            </div>

            {/* GitHub URL */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                GitHub Repository URL *
              </label>
              <input
                type="url"
                name="github_url"
                value={formData.github_url}
                onChange={handleChange}
                placeholder="https://github.com/username/repo.git"
                disabled={loading}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                required
              />
              <p className="text-xs text-slate-400 mt-1">
                Must be HTTPS and end with .git
              </p>
            </div>

            {/* GitHub Branch */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Branch to Deploy
              </label>
              <input
                type="text"
                name="github_branch"
                value={formData.github_branch}
                onChange={handleChange}
                placeholder="main"
                disabled={loading}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
              />
              <p className="text-xs text-slate-400 mt-1">
                Default: main
              </p>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Optional: Describe what this project does"
                disabled={loading}
                rows={4}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50 resize-none"
              />
            </div>

            {/* Info Box */}
            <div className="p-4 bg-blue-900/20 border border-blue-800/50 rounded-lg">
              <h3 className="text-sm font-semibold text-blue-300 mb-2">
                Requirements:
              </h3>
              <ul className="text-xs text-blue-200 space-y-1">
                <li>✓ Repository must have package.json</li>
                <li>✓ Repository must have a start script</li>
                <li>✓ Node.js 16+ compatible</li>
              </ul>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-700 disabled:opacity-50 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Project'
                )}
              </button>
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                disabled={loading}
                className="bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}