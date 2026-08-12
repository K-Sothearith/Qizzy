import { useAuth } from '../context/AuthContext';
import { PlusCircle, Play, ShieldCheck, Library, Layers } from 'lucide-react';

export default function AdminDashboard() {
  const { user } = useAuth();

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
          <p style={styles.bannerSubtitle}>Hello {user?.name}! Create quizzes and host live game sessions for your juniors.</p>
        </div>

        <div style={styles.bannerActions}>
          <button className="btn btn-primary">
            <PlusCircle size={18} /> Create Quiz
          </button>
        </div>
      </div>

      {/* Quiz Library Container */}
      <div className="glass-panel" style={{ padding: '32px' }}>
        <div style={styles.libraryHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Library size={22} color="#6c5ce7" />
            <h2 style={{ fontSize: '1.4rem' }}>Your Quiz Library</h2>
          </div>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Storage-Optimized</span>
        </div>

        {/* Empty State / Library Placeholder */}
        <div style={styles.emptyState}>
          <Layers size={48} color="#a0a5b5" style={{ opacity: 0.5, marginBottom: '16px' }} />
          <h3 style={{ fontSize: '1.2rem', marginBottom: '8px' }}>No quizzes created yet</h3>
          <p style={{ color: 'var(--text-muted)', maxWidth: '420px', marginBottom: '24px', fontSize: '0.92rem' }}>
            Get started by creating your first quiz with custom questions, time limits, and Kahoot-style color options.
          </p>
          <button className="btn btn-primary">
            <PlusCircle size={18} /> Create First Quiz
          </button>
        </div>
      </div>
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
