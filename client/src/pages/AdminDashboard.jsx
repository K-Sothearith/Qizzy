import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchAdminQuizzes, deleteQuiz } from '../services/quizService';
import { 
  PlusCircle, 
  Play, 
  ShieldCheck, 
  Library, 
  Layers, 
  Edit3, 
  Trash2, 
  Search, 
  Clock, 
  Award, 
  HelpCircle,
  AlertTriangle,
  X
} from 'lucide-react';

export default function AdminDashboard() {
  const { user, token } = useAuth();
  const navigate = useNavigate();

  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');
  
  // Deletion modal state
  const [quizToDelete, setQuizToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Fetch quizzes on mount
  useEffect(() => {
    loadQuizzes();
  }, [token]);

  async function loadQuizzes() {
    try {
      setLoading(true);
      setError('');
      const data = await fetchAdminQuizzes(token);
      setQuizzes(data || []);
    } catch (err) {
      console.error('Failed to load quizzes:', err);
      setError(err.message || 'Failed to load your quizzes.');
    } finally {
      setLoading(false);
    }
  }

  // Handle Delete Confirmation
  async function confirmDelete() {
    if (!quizToDelete) return;
    try {
      setDeleting(true);
      await deleteQuiz(quizToDelete.id, token);
      setQuizzes(prev => prev.filter(q => q.id !== quizToDelete.id));
      setQuizToDelete(null);
    } catch (err) {
      setError(err.message || 'Failed to delete quiz.');
    } finally {
      setDeleting(false);
    }
  }

  // Filter quizzes by title or description
  const filteredQuizzes = quizzes.filter(q => {
    const qTitle = (q.title || '').toLowerCase();
    const qDesc = (q.description || '').toLowerCase();
    const term = searchQuery.toLowerCase();
    return qTitle.includes(term) || qDesc.includes(term);
  });

  return (
    <div style={styles.container}>
      {/* Teacher Banner */}
      <div className="glass-panel" style={styles.banner}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <h1 style={styles.bannerTitle}>Teacher Workspace</h1>
            <span className="badge badge-admin">
              <ShieldCheck size={14} /> Admin Privileges
            </span>
          </div>
          <p style={styles.bannerSubtitle}>
            Welcome, {user?.name}! Build interactive quizzes and host live games for your students.
          </p>
        </div>

        <div style={styles.bannerActions}>
          <button 
            className="btn btn-primary" 
            onClick={() => navigate('/quizzes/new')}
          >
            <PlusCircle size={18} /> Create Quiz
          </button>
        </div>
      </div>

      {/* Quiz Library Container */}
      <div className="glass-panel" style={{ padding: '32px' }}>
        <div style={styles.libraryHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Library size={22} color="#6c5ce7" />
            <h2 style={{ fontSize: '1.4rem' }}>Your Quiz Library ({quizzes.length})</h2>
          </div>

          {/* Search bar */}
          {quizzes.length > 0 && (
            <div className="search-input-wrapper">
              <Search size={16} className="search-icon-inside" />
              <input
                type="text"
                className="form-input"
                placeholder="Search your quizzes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          )}
        </div>

        {/* Error Notification */}
        {error && (
          <div className="error-banner" style={{ marginBottom: '20px' }}>
            <span>{error}</span>
          </div>
        )}

        {/* Loading Skeleton */}
        {loading ? (
          <div style={styles.emptyState}>
            <div style={{ fontSize: '1.1rem', color: 'var(--text-muted)' }}>
              Loading your quiz library...
            </div>
          </div>
        ) : quizzes.length === 0 ? (
          /* Empty State */
          <div style={styles.emptyState}>
            <Layers size={48} color="#a0a5b5" style={{ opacity: 0.5, marginBottom: '16px' }} />
            <h3 style={{ fontSize: '1.2rem', marginBottom: '8px' }}>No quizzes created yet</h3>
            <p style={{ color: 'var(--text-muted)', maxWidth: '420px', marginBottom: '24px', fontSize: '0.92rem' }}>
              Get started by creating your first interactive quiz with custom questions, timers, and Kahoot-style color buttons.
            </p>
            <button 
              className="btn btn-primary" 
              onClick={() => navigate('/quizzes/new')}
            >
              <PlusCircle size={18} /> Create First Quiz
            </button>
          </div>
        ) : filteredQuizzes.length === 0 ? (
          /* Search No Match State */
          <div style={styles.emptyState}>
            <p style={{ color: 'var(--text-muted)', marginBottom: '12px' }}>
              No quizzes match "{searchQuery}".
            </p>
            <button className="btn btn-secondary" onClick={() => setSearchQuery('')}>
              Clear Search
            </button>
          </div>
        ) : (
          /* Quiz Grid */
          <div className="quiz-grid">
            {filteredQuizzes.map((quiz) => (
              <div key={quiz.id} className="quiz-card">
                {/* Cover Image or Gradient */}
                <div className="quiz-card-cover">
                  {quiz.cover_image ? (
                    <img 
                      src={quiz.cover_image} 
                      alt={quiz.title} 
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="quiz-card-cover-placeholder">
                      <HelpCircle size={36} color="#6c5ce7" style={{ opacity: 0.7 }} />
                      <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Qizzy Live</span>
                    </div>
                  )}
                </div>

                {/* Card Body */}
                <div className="quiz-card-body">
                  <h3 className="quiz-card-title">{quiz.title}</h3>
                  <p className="quiz-card-desc">
                    {quiz.description || 'No description provided.'}
                  </p>

                  {/* Metadata Row */}
                  <div className="quiz-card-meta">
                    <div className="quiz-meta-item" title="Question Count">
                      <Layers size={14} color="#6c5ce7" />
                      <span>{quiz.question_count || 0} Questions</span>
                    </div>
                    <div className="quiz-meta-item" title="Total Duration">
                      <Clock size={14} color="#00cec9" />
                      <span>{quiz.total_duration_seconds || 0}s</span>
                    </div>
                    <div className="quiz-meta-item" title="Total Potential Points">
                      <Award size={14} color="#f39c12" />
                      <span>{quiz.total_points || 0} pts</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="quiz-card-actions">
                    <button
                      className="btn btn-accent"
                      onClick={() => alert(`Launching live session for "${quiz.title}"! (Sprint 3 Live Room integration coming next)`)}
                      title="Host Live Game"
                    >
                      <Play size={16} /> Host
                    </button>

                    <button
                      className="btn btn-secondary"
                      onClick={() => navigate(`/quizzes/${quiz.id}/edit`)}
                      title="Edit Quiz"
                    >
                      <Edit3 size={15} /> Edit
                    </button>

                    <button
                      className="btn-icon-danger"
                      onClick={() => setQuizToDelete(quiz)}
                      title="Delete Quiz"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {quizToDelete && (
        <div className="modal-overlay" onClick={() => setQuizToDelete(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#ff7675' }}>
                <AlertTriangle size={22} />
                <h3 style={{ fontSize: '1.2rem' }}>Delete Quiz</h3>
              </div>
              <button 
                onClick={() => setQuizToDelete(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ color: 'var(--text-main)', marginBottom: '14px', lineHeight: 1.5 }}>
              Are you sure you want to delete <strong>"{quizToDelete.title}"</strong>?
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '20px' }}>
              This action cannot be undone. All associated questions and options will be permanently removed.
            </p>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setQuizToDelete(null)}>
                Cancel
              </button>
              <button 
                className="btn btn-primary" 
                style={{ background: '#e74c3c', borderColor: '#c0392b' }}
                onClick={confirmDelete}
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '1100px',
    margin: '0 auto',
    padding: '36px 24px'
  },
  banner: {
    padding: '32px',
    marginBottom: '28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '20px'
  },
  bannerTitle: {
    fontSize: '2.1rem'
  },
  bannerSubtitle: {
    color: 'var(--text-muted)',
    fontSize: '1rem'
  },
  bannerActions: {
    display: 'flex',
    gap: '12px'
  },
  libraryHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '16px',
    paddingBottom: '20px',
    borderBottom: '1px solid var(--border-glass)',
    marginBottom: '32px'
  },
  emptyState: {
    padding: '60px 20px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center'
  }
};
