import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import WeeklyCalendar from '../components/WeeklyCalendar';
import ShoppingList from '../components/ShoppingList';
import Members from '../components/Members';

interface Plan {
  id: number;
  name: string;
  role: 'manager' | 'admin' | 'viewer';
}

type Tab = 'calendar' | 'shopping' | 'members';

const ROLE_LABELS: Record<string, string> = { manager: 'Manager', admin: 'Admin', viewer: 'Zuschauer' };

export default function MealPlan() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('calendar');
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (!id) return;
    api.get(`/plans/${id}`)
      .then(setPlan)
      .catch(() => navigate('/'))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  if (loading) return <div className="loading-screen">Laden...</div>;
  if (!plan) return null;

  const canEdit = plan.role === 'manager' || plan.role === 'admin';
  const isManager = plan.role === 'manager';

  async function renamePlan() {
    if (!newName.trim() || !id) return;
    await api.put(`/plans/${id}`, { name: newName });
    setPlan(p => p ? { ...p, name: newName } : p);
    setEditingName(false);
  }

  async function leavePlan() {
    if (!id) return;
    await api.post(`/plans/${id}/leave`);
    navigate('/');
  }

  async function deletePlan() {
    if (!id) return;
    await api.delete(`/plans/${id}`);
    navigate('/');
  }

  return (
    <div className="app-layout">
      <header className="app-header">
        <div className="header-brand">
          <Link to="/" className="back-link">← Zurück</Link>
          {editingName ? (
            <div className="plan-name-edit">
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') renamePlan(); if (e.key === 'Escape') setEditingName(false); }}
                autoFocus
              />
              <button className="btn btn-primary btn-sm" onClick={renamePlan}>✓</button>
              <button className="btn btn-ghost btn-sm" onClick={() => setEditingName(false)}>✕</button>
            </div>
          ) : (
            <div className="plan-title-group">
              <h1 className="plan-title">{plan.name}</h1>
              {canEdit && (
                <button className="edit-title-btn" onClick={() => { setNewName(plan.name); setEditingName(true); }} title="Umbenennen">
                  ✏️
                </button>
              )}
            </div>
          )}
        </div>
        <div className="header-right">
          <span className={`badge badge-${plan.role}`}>{ROLE_LABELS[plan.role]}</span>
          {!isManager && (
            <button className="btn btn-ghost" onClick={() => setShowLeaveConfirm(true)}>
              Plan verlassen
            </button>
          )}
          {isManager && (
            <button className="btn btn-danger-ghost" onClick={() => setShowDeleteConfirm(true)}>
              Plan löschen
            </button>
          )}
        </div>
      </header>

      <div className="plan-tabs">
        <button className={`tab ${activeTab === 'calendar' ? 'active' : ''}`} onClick={() => setActiveTab('calendar')}>
          📅 Wochenplan
        </button>
        <button className={`tab ${activeTab === 'shopping' ? 'active' : ''}`} onClick={() => setActiveTab('shopping')}>
          🛒 Einkaufsliste
        </button>
        <button className={`tab ${activeTab === 'members' ? 'active' : ''}`} onClick={() => setActiveTab('members')}>
          👥 Mitglieder
        </button>
      </div>

      <main className="plan-content">
        {activeTab === 'calendar' && <WeeklyCalendar planId={id!} canEdit={canEdit} />}
        {activeTab === 'shopping' && <ShoppingList planId={id!} canEdit={canEdit} />}
        {activeTab === 'members' && <Members planId={id!} isManager={isManager} currentUserId={user!.id} />}
      </main>

      {showLeaveConfirm && (
        <div className="modal-overlay" onClick={() => setShowLeaveConfirm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Plan verlassen?</h3>
            <p>Möchtest du "{plan.name}" wirklich verlassen?</p>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setShowLeaveConfirm(false)}>Abbrechen</button>
              <button className="btn btn-danger" onClick={leavePlan}>Plan verlassen</button>
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Plan löschen?</h3>
            <p>Möchtest du "{plan.name}" dauerhaft löschen? Alle Mahlzeiten und die Einkaufsliste werden ebenfalls gelöscht.</p>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setShowDeleteConfirm(false)}>Abbrechen</button>
              <button className="btn btn-danger" onClick={deletePlan}>Endgültig löschen</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
