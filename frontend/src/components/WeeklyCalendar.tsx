import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';

interface Meal {
  id: number;
  day: number;
  meal_type: string;
  name: string;
  notes: string | null;
}

interface Props {
  planId: string;
  canEdit: boolean;
}

const DAYS = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
const MEAL_TYPES = [
  { key: 'fruehstueck', label: 'Frühstück', icon: '🌅' },
  { key: 'mittagessen', label: 'Mittagessen', icon: '☀️' },
  { key: 'abendessen', label: 'Abendessen', icon: '🌙' },
];

function getMonday(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split('T')[0];
}

function formatWeekRange(monday: string): string {
  const start = new Date(monday);
  const end = new Date(monday);
  end.setDate(end.getDate() + 6);
  return `${start.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })} – ${end.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}`;
}

export default function WeeklyCalendar({ planId, canEdit }: Props) {
  const [weekStart, setWeekStart] = useState(getMonday(new Date()));
  const [meals, setMeals] = useState<Meal[]>([]);
  const [editing, setEditing] = useState<{ day: number; type: string } | null>(null);
  const [editName, setEditName] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const loadMeals = useCallback(() => {
    api.get(`/plans/${planId}/meals?weekStart=${weekStart}`).then(setMeals);
  }, [planId, weekStart]);

  useEffect(() => { loadMeals(); }, [loadMeals]);

  function getMeal(day: number, type: string) {
    return meals.find(m => m.day === day && m.meal_type === type);
  }

  function openEdit(day: number, type: string) {
    if (!canEdit) return;
    const existing = getMeal(day, type);
    setEditName(existing?.name || '');
    setEditNotes(existing?.notes || '');
    setEditing({ day, type });
  }

  async function saveMeal() {
    if (!editing || !editName.trim()) return;
    setSaving(true);
    try {
      await api.put(`/plans/${planId}/meals`, {
        weekStart,
        day: editing.day,
        mealType: editing.type,
        name: editName,
        notes: editNotes || null,
      });
      loadMeals();
      setEditing(null);
    } finally {
      setSaving(false);
    }
  }

  async function deleteMeal(day: number, type: string) {
    await api.delete(`/plans/${planId}/meals`, { weekStart, day, mealType: type });
    loadMeals();
  }

  function changeWeek(delta: number) {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + delta * 7);
    setWeekStart(d.toISOString().split('T')[0]);
  }

  return (
    <div className="calendar-section">
      <div className="calendar-nav">
        <button className="btn btn-ghost" onClick={() => changeWeek(-1)}>← Vorherige</button>
        <div className="week-info">
          <strong>KW {getWeekNumber(weekStart)}</strong>
          <span>{formatWeekRange(weekStart)}</span>
        </div>
        <button className="btn btn-ghost" onClick={() => changeWeek(1)}>Nächste →</button>
        <button className="btn btn-secondary btn-sm" onClick={() => setWeekStart(getMonday(new Date()))}>
          Heute
        </button>
      </div>

      <div className="calendar-grid">
        <div className="calendar-header-row">
          <div className="meal-type-header"></div>
          {DAYS.map(day => (
            <div key={day} className="day-header">{day}</div>
          ))}
        </div>

        {MEAL_TYPES.map(mt => (
          <div key={mt.key} className="meal-row">
            <div className="meal-type-label">
              <span>{mt.icon}</span>
              <span>{mt.label}</span>
            </div>
            {DAYS.map((_, dayIdx) => {
              const meal = getMeal(dayIdx, mt.key);
              return (
                <div
                  key={dayIdx}
                  className={`meal-cell ${meal ? 'has-meal' : 'empty-meal'} ${canEdit ? 'editable' : ''}`}
                  onClick={() => openEdit(dayIdx, mt.key)}
                >
                  {meal ? (
                    <div className="meal-content">
                      <span className="meal-name">{meal.name}</span>
                      {meal.notes && <span className="meal-notes">{meal.notes}</span>}
                      {canEdit && (
                        <button
                          className="meal-delete"
                          onClick={e => { e.stopPropagation(); deleteMeal(dayIdx, mt.key); }}
                          title="Löschen"
                        >×</button>
                      )}
                    </div>
                  ) : (
                    canEdit && <span className="meal-add">+ Hinzufügen</span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {editing && (
        <div className="modal-overlay" onClick={() => setEditing(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>
              {MEAL_TYPES.find(t => t.key === editing.type)?.icon}{' '}
              {MEAL_TYPES.find(t => t.key === editing.type)?.label} am {DAYS[editing.day]}
            </h3>
            <div className="form-group">
              <label>Gericht</label>
              <input
                type="text"
                value={editName}
                onChange={e => setEditName(e.target.value)}
                placeholder="z.B. Spaghetti Bolognese"
                required
                autoFocus
                onKeyDown={e => e.key === 'Enter' && saveMeal()}
              />
            </div>
            <div className="form-group">
              <label>Notizen (optional)</label>
              <input
                type="text"
                value={editNotes}
                onChange={e => setEditNotes(e.target.value)}
                placeholder="z.B. Rezept-Link oder Hinweise"
              />
            </div>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setEditing(null)}>Abbrechen</button>
              <button className="btn btn-primary" onClick={saveMeal} disabled={saving || !editName.trim()}>
                {saving ? 'Speichern...' : 'Speichern'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function getWeekNumber(dateStr: string): number {
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
}
