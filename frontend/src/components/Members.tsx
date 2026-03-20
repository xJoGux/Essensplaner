import { useState, useEffect } from 'react';
import { api } from '../api/client';

interface Member {
  id: number;
  username: string;
  role: 'manager' | 'admin' | 'viewer';
  joined_at: string;
}

interface Props {
  planId: string;
  isManager: boolean;
  currentUserId: number;
}

const ROLE_LABELS: Record<string, string> = { manager: 'Manager', admin: 'Admin', viewer: 'Zuschauer' };
const ROLE_ICONS: Record<string, string> = { manager: '👑', admin: '✏️', viewer: '👁️' };

export default function Members({ planId, isManager, currentUserId }: Props) {
  const [members, setMembers] = useState<Member[]>([]);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [showCode, setShowCode] = useState(false);
  const [copied, setCopied] = useState(false);

  function load() {
    api.get(`/plans/${planId}/members`).then(setMembers);
  }

  useEffect(() => { load(); }, [planId]);

  async function loadInviteCode() {
    const data = await api.get(`/plans/${planId}/invite-code`);
    setInviteCode(data.inviteCode);
    setShowCode(true);
  }

  async function regenerateCode() {
    if (!confirm('Neuen Code generieren? Der alte Code wird ungültig.')) return;
    const data = await api.post(`/plans/${planId}/invite-code/regenerate`);
    setInviteCode(data.inviteCode);
  }

  async function changeRole(userId: number, role: string) {
    await api.put(`/plans/${planId}/members/${userId}`, { role });
    load();
  }

  async function removeMember(userId: number, username: string) {
    if (!confirm(`${username} aus dem Plan entfernen?`)) return;
    await api.delete(`/plans/${planId}/members/${userId}`);
    load();
  }

  function copyCode() {
    if (inviteCode) {
      navigator.clipboard.writeText(inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="members-section">
      <div className="section-header">
        <h3>👥 Mitglieder</h3>
        {isManager && (
          <button className="btn btn-secondary btn-sm" onClick={showCode ? () => setShowCode(false) : loadInviteCode}>
            {showCode ? 'Code ausblenden' : '🔗 Einladungscode'}
          </button>
        )}
      </div>

      {isManager && showCode && inviteCode && (
        <div className="invite-code-box">
          <div className="invite-code-label">Einladungscode (nur mit anderen teilen):</div>
          <div className="invite-code-display">
            <code className="invite-code">{inviteCode}</code>
            <button className="btn btn-secondary btn-sm" onClick={copyCode}>
              {copied ? '✓ Kopiert!' : 'Kopieren'}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={regenerateCode}>
              Neu generieren
            </button>
          </div>
          <p className="invite-hint">Neue Mitglieder treten als "Zuschauer" bei. Du kannst ihre Rolle jederzeit ändern.</p>
        </div>
      )}

      <div className="members-list">
        {members.map(member => (
          <div key={member.id} className="member-row">
            <div className="member-info">
              <span className="member-icon">{ROLE_ICONS[member.role]}</span>
              <div>
                <span className="member-name">
                  {member.username}
                  {member.id === currentUserId && <span className="you-badge"> (Du)</span>}
                </span>
                <span className="member-joined">
                  Beigetreten {new Date(member.joined_at).toLocaleDateString('de-DE')}
                </span>
              </div>
            </div>
            <div className="member-actions">
              <span className={`badge badge-${member.role}`}>{ROLE_LABELS[member.role]}</span>
              {isManager && member.role !== 'manager' && member.id !== currentUserId && (
                <>
                  <select
                    value={member.role}
                    onChange={e => changeRole(member.id, e.target.value)}
                    className="role-select"
                  >
                    <option value="admin">Admin</option>
                    <option value="viewer">Zuschauer</option>
                  </select>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => removeMember(member.id, member.username)}
                  >
                    Entfernen
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
