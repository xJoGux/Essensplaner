import { useState, useEffect, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../contexts/AuthContext';

interface Plan {
  id: number;
  name: string;
  role: 'manager' | 'admin' | 'viewer';
  created_at: string;
}

const ROLE_LABELS: Record<string, string> = {
  manager: 'Manager',
  admin: 'Admin',
  viewer: 'Zuschauer',
};

const ROLE_COLORS: Record<string, string> = {
  manager: 'badge-manager',
  admin: 'badge-admin',
  viewer: 'badge-viewer',
};

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  const [showCreate, setShowCreate] = useState(false);
  const [newPlanName, setNewPlanName] = useState('');
  const [createError, setCreateError] = useState('');

  const [showJoin, setShowJoin] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [joinError, setJoinError] = useState('');

  useEffect(() => {
    api.get('/plans').then(setPlans).finally(() => setLoading(false));
  }, []);

  async function createPlan(e: FormEvent) {
    e.preventDefault();
    setCreateError('');
    try {
      const plan = await api.post('/plans', { name: newPlanName });
      setPlans(p => [plan, ...p]);
      setNewPlanName('');
      setShowCreate(false);
      navigate(`/plan/${plan.id}`);
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : 'Fehler');
    }
  }

  async function joinPlan(e: FormEvent) {
    e.preventDefault();
    setJoinError('');
    try {
      const { plan } = await api.post('/plans/join', { inviteCode });
      setPlans(p => [...p, plan]);
      setInviteCode('');
      setShowJoin(false);
      navigate(`/plan/${plan.id}`);
    } catch (err: unknown) {
      setJoinError(err instanceof Error ? err.message : 'Fehler');
    }
  }

  return (
    <div className="app-layout">
      <header className="app-header">
        <div className="header-brand">
          <span className="header-logo">🍽️</span>
          <span className="header-title">Essensplaner</span>
        </div>
        <div className="header-user">
          <span className="username">👤 {user?.username}</span>
          <button className="btn btn-ghost" onClick={logout}>Abmelden</button>
        </div>
      </header>

      <main className="dashboard">
        <div className="dashboard-header">
          <h2>Meine Essenspläne</h2>
          <div className="dashboard-actions">
            <button className="btn btn-secondary" onClick={() => { setShowJoin(true); setShowCreate(false); }}>
              + Plan beitreten
            </button>
            <button className="btn btn-primary" onClick={() => { setShowCreate(true); setShowJoin(false); }}>
              + Neuer Plan
            </button>
          </div>
        </div>

        {showCreate && (
          <div className="modal-overlay" onClick={() => setShowCreate(false)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <h3>Neuen Essensplan erstellen</h3>
              {createError && <div className="alert alert-error">{createError}</div>}
              <form onSubmit={createPlan}>
                <div className="form-group">
                  <label>Name des Plans</label>
                  <input
                    type="text"
                    value={newPlanName}
                    onChange={e => setNewPlanName(e.target.value)}
                    placeholder="z.B. Familie Müller"
                    required
                    autoFocus
                  />
                </div>
                <div className="modal-actions">
                  <button type="button" className="btn btn-ghost" onClick={() => setShowCreate(false)}>Abbrechen</button>
                  <button type="submit" className="btn btn-primary">Erstellen</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showJoin && (
          <div className="modal-overlay" onClick={() => setShowJoin(false)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <h3>Plan beitreten</h3>
              <p className="modal-hint">Gib den Einladungscode ein, den du erhalten hast.</p>
              {joinError && <div className="alert alert-error">{joinError}</div>}
              <form onSubmit={joinPlan}>
                <div className="form-group">
                  <label>Einladungscode</label>
                  <input
                    type="text"
                    value={inviteCode}
                    onChange={e => setInviteCode(e.target.value.toUpperCase())}
                    placeholder="z.B. A1B2C3D4"
                    required
                    autoFocus
                    className="code-input"
                  />
                </div>
                <div className="modal-actions">
                  <button type="button" className="btn btn-ghost" onClick={() => setShowJoin(false)}>Abbrechen</button>
                  <button type="submit" className="btn btn-primary">Beitreten</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {loading ? (
          <div className="empty-state">Laden...</div>
        ) : plans.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🍽️</div>
            <p>Du hast noch keine Essenspläne.</p>
            <p>Erstelle einen neuen Plan oder tritt einem bestehenden bei.</p>
          </div>
        ) : (
          <div className="plans-grid">
            {plans.map(plan => (
              <div key={plan.id} className="plan-card" onClick={() => navigate(`/plan/${plan.id}`)}>
                <div className="plan-card-header">
                  <h3>{plan.name}</h3>
                  <span className={`badge ${ROLE_COLORS[plan.role]}`}>{ROLE_LABELS[plan.role]}</span>
                </div>
                <div className="plan-card-footer">
                  <span>Erstellt {new Date(plan.created_at).toLocaleDateString('de-DE')}</span>
                  <span className="plan-card-arrow">→</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
