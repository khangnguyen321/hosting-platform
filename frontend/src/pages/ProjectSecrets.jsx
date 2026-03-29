import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { secretsAPI } from '../api';
import { ArrowLeft, Trash2, Plus, Eye, EyeOff, AlertCircle, Loader } from 'lucide-react';

export default function ProjectSecrets() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [secrets, setSecrets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [newSecret, setNewSecret] = useState({ key: '', value: '' });
  const [submitting, setSubmitting] = useState(false);
  const [visibleSecrets, setVisibleSecrets] = useState(new Set());

  useEffect(() => {
    loadSecrets();
  }, [projectId]);

  const loadSecrets = async () => {
    try {
      setLoading(true);
      const response = await secretsAPI.list(projectId);
      setSecrets(response.data || []);
      setError('');
    } catch (err) {
      setError('Failed to load secrets');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSecret = async (e) => {
    e.preventDefault();
    
    if (!newSecret.key.trim() || !newSecret.value.trim()) {
      setError('Key and value are required');
      return;
    }

    try {
      setSubmitting(true);
      await secretsAPI.create(projectId, newSecret.key, newSecret.value);
      setNewSecret({ key: '', value: '' });
      setShowForm(false);
      await loadSecrets();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create secret');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSecret = async (key) => {
    if (!window.confirm(`Delete secret "${key}"?`)) return;

    try {
      await secretsAPI.delete(projectId, key);
      await loadSecrets();
    } catch (err) {
      setError('Failed to delete secret');
    }
  };

  const toggleVisibility = (key) => {
    const newVisible = new Set(visibleSecrets);
    if (newVisible.has(key)) {
      newVisible.delete(key);
    } else {
      newVisible.add(key);
    }
    setVisibleSecrets(newVisible);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-slate-400 hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </button>

        {/* Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Manage Secrets
          </h1>
          <p className="text-slate-400">
            Project #{projectId} - Environment Variables
          </p>
        </div>

        {/* Info Box */}
        <div className="mb-6 p-4 bg-blue-900/20 border border-blue-800/50 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-200">
            <p className="font-semibold mb-1">Encrypted Storage</p>
            <p>Secrets are encrypted with AES-256 and only decrypted when your project runs.</p>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-800 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-red-200 text-sm">{error}</p>
          </div>
        )}

        {/* Add Secret Button */}
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg mb-6 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Secret
          </button>
        )}

        {/* Add Secret Form */}
        {showForm && (
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 mb-6">
            <form onSubmit={handleAddSecret} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Variable Name *
                </label>
                <input
                  type="text"
                  value={newSecret.key}
                  onChange={(e) => setNewSecret({ ...newSecret, key: e.target.value })}
                  placeholder="e.g., DATABASE_URL"
                  disabled={submitting}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Value *
                </label>
                <textarea
                  value={newSecret.value}
                  onChange={(e) => setNewSecret({ ...newSecret, value: e.target.value })}
                  placeholder="e.g., postgresql://user:pass@localhost/db"
                  disabled={submitting}
                  rows={3}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50 resize-none"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-700 disabled:opacity-50 text-white font-semibold py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Secret'
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  disabled={submitting}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Secrets List */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader className="w-6 h-6 text-blue-500 animate-spin" />
            </div>
          ) : secrets.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <p className="mb-4">No secrets yet</p>
              <button
                onClick={() => setShowForm(true)}
                className="text-blue-400 hover:text-blue-300 font-semibold"
              >
                Create your first secret
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-700">
              {secrets.map((secret) => (
                <div
                  key={secret.id}
                  className="p-4 flex items-center justify-between hover:bg-slate-700/50 transition-colors"
                >
                  <div className="flex-1">
                    <p className="text-white font-mono font-medium mb-1">
                      {secret.key}
                    </p>
                    <p className="text-xs text-slate-500">
                      Created {new Date(secret.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleVisibility(secret.key)}
                      className="p-2 hover:bg-slate-600 text-slate-400 hover:text-slate-300 rounded transition-colors"
                      title="Toggle visibility"
                    >
                      {visibleSecrets.has(secret.key) ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => handleDeleteSecret(secret.key)}
                      className="p-2 hover:bg-red-600/20 text-red-400 rounded transition-colors"
                      title="Delete secret"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}