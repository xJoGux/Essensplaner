const express = require('express');
const db = require('../database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router({ mergeParams: true });
router.use(authMiddleware);

function getMemberRole(planId, userId) {
  const member = db.prepare('SELECT role FROM plan_members WHERE plan_id = ? AND user_id = ?').get(planId, userId);
  return member ? member.role : null;
}

// Einkaufsliste abrufen
router.get('/', (req, res) => {
  const role = getMemberRole(req.params.planId, req.user.id);
  if (!role) return res.status(403).json({ error: 'Kein Zugriff' });

  const items = db.prepare('SELECT * FROM shopping_items WHERE plan_id = ? ORDER BY checked, created_at').all(req.params.planId);
  res.json(items);
});

// Artikel hinzufügen
router.post('/', (req, res) => {
  const role = getMemberRole(req.params.planId, req.user.id);
  if (!role) return res.status(403).json({ error: 'Kein Zugriff' });
  if (role === 'viewer') return res.status(403).json({ error: 'Keine Berechtigung zum Bearbeiten' });

  const { name, quantity } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Name erforderlich' });

  const result = db.prepare('INSERT INTO shopping_items (plan_id, name, quantity) VALUES (?, ?, ?)').run(req.params.planId, name.trim(), quantity || null);
  const item = db.prepare('SELECT * FROM shopping_items WHERE id = ?').get(result.lastInsertRowid);
  res.json(item);
});

// Artikel aktualisieren (Name, Menge, abgehakt)
router.put('/:itemId', (req, res) => {
  const role = getMemberRole(req.params.planId, req.user.id);
  if (!role) return res.status(403).json({ error: 'Kein Zugriff' });
  if (role === 'viewer') return res.status(403).json({ error: 'Keine Berechtigung zum Bearbeiten' });

  const item = db.prepare('SELECT * FROM shopping_items WHERE id = ? AND plan_id = ?').get(req.params.itemId, req.params.planId);
  if (!item) return res.status(404).json({ error: 'Artikel nicht gefunden' });

  const { name, quantity, checked } = req.body;
  db.prepare('UPDATE shopping_items SET name = ?, quantity = ?, checked = ? WHERE id = ?').run(
    name !== undefined ? name.trim() : item.name,
    quantity !== undefined ? quantity : item.quantity,
    checked !== undefined ? (checked ? 1 : 0) : item.checked,
    req.params.itemId
  );

  const updated = db.prepare('SELECT * FROM shopping_items WHERE id = ?').get(req.params.itemId);
  res.json(updated);
});

// Artikel löschen
router.delete('/:itemId', (req, res) => {
  const role = getMemberRole(req.params.planId, req.user.id);
  if (!role) return res.status(403).json({ error: 'Kein Zugriff' });
  if (role === 'viewer') return res.status(403).json({ error: 'Keine Berechtigung zum Bearbeiten' });

  db.prepare('DELETE FROM shopping_items WHERE id = ? AND plan_id = ?').run(req.params.itemId, req.params.planId);
  res.json({ success: true });
});

// Alle abgehakten Artikel löschen
router.delete('/', (req, res) => {
  const role = getMemberRole(req.params.planId, req.user.id);
  if (!role) return res.status(403).json({ error: 'Kein Zugriff' });
  if (role === 'viewer') return res.status(403).json({ error: 'Keine Berechtigung zum Bearbeiten' });

  db.prepare('DELETE FROM shopping_items WHERE plan_id = ? AND checked = 1').run(req.params.planId);
  res.json({ success: true });
});

module.exports = router;
