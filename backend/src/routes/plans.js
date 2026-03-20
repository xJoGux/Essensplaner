const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

function getMemberRole(planId, userId) {
  const member = db.prepare('SELECT role FROM plan_members WHERE plan_id = ? AND user_id = ?').get(planId, userId);
  return member ? member.role : null;
}

function requireMember(req, res, next) {
  const role = getMemberRole(req.params.id, req.user.id);
  if (!role) return res.status(403).json({ error: 'Kein Zugriff auf diesen Plan' });
  req.role = role;
  next();
}

function requireAdmin(req, res, next) {
  const role = getMemberRole(req.params.id, req.user.id);
  if (!role) return res.status(403).json({ error: 'Kein Zugriff auf diesen Plan' });
  if (role === 'viewer') return res.status(403).json({ error: 'Keine Berechtigung zum Bearbeiten' });
  req.role = role;
  next();
}

function requireManager(req, res, next) {
  const role = getMemberRole(req.params.id, req.user.id);
  if (role !== 'manager') return res.status(403).json({ error: 'Nur der Manager hat diese Berechtigung' });
  req.role = role;
  next();
}

// Alle Pläne des Nutzers
router.get('/', (req, res) => {
  const plans = db.prepare(`
    SELECT mp.id, mp.name, mp.created_at, pm.role
    FROM meal_plans mp
    JOIN plan_members pm ON mp.id = pm.plan_id
    WHERE pm.user_id = ?
    ORDER BY mp.created_at DESC
  `).all(req.user.id);
  res.json(plans);
});

// Neuen Plan erstellen
router.post('/', (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Name erforderlich' });

  const inviteCode = uuidv4().split('-')[0].toUpperCase();
  const result = db.prepare('INSERT INTO meal_plans (name, invite_code) VALUES (?, ?)').run(name.trim(), inviteCode);
  db.prepare('INSERT INTO plan_members (plan_id, user_id, role) VALUES (?, ?, ?)').run(result.lastInsertRowid, req.user.id, 'manager');

  const plan = db.prepare('SELECT * FROM meal_plans WHERE id = ?').get(result.lastInsertRowid);
  res.json({ ...plan, role: 'manager' });
});

// Plan-Details abrufen
router.get('/:id', requireMember, (req, res) => {
  const plan = db.prepare('SELECT id, name, created_at FROM meal_plans WHERE id = ?').get(req.params.id);
  if (!plan) return res.status(404).json({ error: 'Plan nicht gefunden' });
  res.json({ ...plan, role: req.role });
});

// Plan umbenennen
router.put('/:id', requireAdmin, (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Name erforderlich' });
  db.prepare('UPDATE meal_plans SET name = ? WHERE id = ?').run(name.trim(), req.params.id);
  res.json({ success: true });
});

// Plan löschen (nur Manager)
router.delete('/:id', requireManager, (req, res) => {
  db.prepare('DELETE FROM meal_plans WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Invite-Code abrufen (nur Manager)
router.get('/:id/invite-code', requireManager, (req, res) => {
  const plan = db.prepare('SELECT invite_code FROM meal_plans WHERE id = ?').get(req.params.id);
  res.json({ inviteCode: plan.invite_code });
});

// Invite-Code neu generieren (nur Manager)
router.post('/:id/invite-code/regenerate', requireManager, (req, res) => {
  const newCode = uuidv4().split('-')[0].toUpperCase();
  db.prepare('UPDATE meal_plans SET invite_code = ? WHERE id = ?').run(newCode, req.params.id);
  res.json({ inviteCode: newCode });
});

// Plan beitreten über Invite-Code
router.post('/join', (req, res) => {
  const { inviteCode } = req.body;
  if (!inviteCode) return res.status(400).json({ error: 'Einladungscode erforderlich' });

  const plan = db.prepare('SELECT * FROM meal_plans WHERE invite_code = ?').get(inviteCode.toUpperCase());
  if (!plan) return res.status(404).json({ error: 'Ungültiger Einladungscode' });

  const existing = db.prepare('SELECT role FROM plan_members WHERE plan_id = ? AND user_id = ?').get(plan.id, req.user.id);
  if (existing) return res.status(409).json({ error: 'Du bist bereits Mitglied dieses Plans', plan: { id: plan.id, name: plan.name, role: existing.role } });

  db.prepare('INSERT INTO plan_members (plan_id, user_id, role) VALUES (?, ?, ?)').run(plan.id, req.user.id, 'viewer');
  res.json({ plan: { id: plan.id, name: plan.name, role: 'viewer' } });
});

// Mitglieder abrufen
router.get('/:id/members', requireMember, (req, res) => {
  const members = db.prepare(`
    SELECT u.id, u.username, pm.role, pm.joined_at
    FROM plan_members pm
    JOIN users u ON pm.user_id = u.id
    WHERE pm.plan_id = ?
    ORDER BY CASE pm.role WHEN 'manager' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END, pm.joined_at
  `).all(req.params.id);
  res.json(members);
});

// Mitglieder-Rolle ändern (nur Manager)
router.put('/:id/members/:userId', requireManager, (req, res) => {
  const { role } = req.body;
  if (!['admin', 'viewer'].includes(role)) return res.status(400).json({ error: 'Ungültige Rolle (admin oder viewer erlaubt)' });

  const targetMember = db.prepare('SELECT role FROM plan_members WHERE plan_id = ? AND user_id = ?').get(req.params.id, req.params.userId);
  if (!targetMember) return res.status(404).json({ error: 'Mitglied nicht gefunden' });
  if (targetMember.role === 'manager') return res.status(403).json({ error: 'Manager-Rolle kann nicht geändert werden' });

  db.prepare('UPDATE plan_members SET role = ? WHERE plan_id = ? AND user_id = ?').run(role, req.params.id, req.params.userId);
  res.json({ success: true });
});

// Mitglied entfernen (nur Manager)
router.delete('/:id/members/:userId', requireManager, (req, res) => {
  if (Number(req.params.userId) === req.user.id) return res.status(400).json({ error: 'Manager kann sich nicht selbst entfernen' });

  const target = db.prepare('SELECT role FROM plan_members WHERE plan_id = ? AND user_id = ?').get(req.params.id, req.params.userId);
  if (!target) return res.status(404).json({ error: 'Mitglied nicht gefunden' });
  if (target.role === 'manager') return res.status(403).json({ error: 'Manager kann nicht entfernt werden' });

  db.prepare('DELETE FROM plan_members WHERE plan_id = ? AND user_id = ?').run(req.params.id, req.params.userId);
  res.json({ success: true });
});

// Plan verlassen
router.post('/:id/leave', requireMember, (req, res) => {
  if (req.role === 'manager') return res.status(400).json({ error: 'Manager kann den Plan nicht verlassen. Bitte Plan löschen.' });
  db.prepare('DELETE FROM plan_members WHERE plan_id = ? AND user_id = ?').run(req.params.id, req.user.id);
  res.json({ success: true });
});

module.exports = router;
