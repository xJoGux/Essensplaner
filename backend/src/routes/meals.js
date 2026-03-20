const express = require('express');
const db = require('../database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router({ mergeParams: true });
router.use(authMiddleware);

function getMemberRole(planId, userId) {
  const member = db.prepare('SELECT role FROM plan_members WHERE plan_id = ? AND user_id = ?').get(planId, userId);
  return member ? member.role : null;
}

// Wochenplan abrufen
router.get('/', (req, res) => {
  const role = getMemberRole(req.params.planId, req.user.id);
  if (!role) return res.status(403).json({ error: 'Kein Zugriff' });

  const { weekStart } = req.query;
  if (!weekStart) return res.status(400).json({ error: 'weekStart erforderlich (YYYY-MM-DD)' });

  const meals = db.prepare('SELECT * FROM meals WHERE plan_id = ? AND week_start = ? ORDER BY day, meal_type').all(req.params.planId, weekStart);
  res.json(meals);
});

// Mahlzeit setzen
router.put('/', (req, res) => {
  const role = getMemberRole(req.params.planId, req.user.id);
  if (!role) return res.status(403).json({ error: 'Kein Zugriff' });
  if (role === 'viewer') return res.status(403).json({ error: 'Keine Berechtigung zum Bearbeiten' });

  const { weekStart, day, mealType, name, notes } = req.body;
  const validTypes = ['fruehstueck', 'mittagessen', 'abendessen'];

  if (!weekStart || day === undefined || !mealType || !name) return res.status(400).json({ error: 'weekStart, day, mealType und name erforderlich' });
  if (!validTypes.includes(mealType)) return res.status(400).json({ error: 'Ungültiger mealType' });
  if (day < 0 || day > 6) return res.status(400).json({ error: 'day muss zwischen 0 und 6 liegen' });

  const result = db.prepare(`
    INSERT INTO meals (plan_id, week_start, day, meal_type, name, notes)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(plan_id, week_start, day, meal_type) DO UPDATE SET name = excluded.name, notes = excluded.notes
  `).run(req.params.planId, weekStart, day, mealType, name.trim(), notes || null);

  const meal = db.prepare('SELECT * FROM meals WHERE id = ?').get(result.lastInsertRowid || db.prepare('SELECT id FROM meals WHERE plan_id = ? AND week_start = ? AND day = ? AND meal_type = ?').get(req.params.planId, weekStart, day, mealType).id);
  res.json(meal);
});

// Mahlzeit löschen
router.delete('/', (req, res) => {
  const role = getMemberRole(req.params.planId, req.user.id);
  if (!role) return res.status(403).json({ error: 'Kein Zugriff' });
  if (role === 'viewer') return res.status(403).json({ error: 'Keine Berechtigung zum Bearbeiten' });

  const { weekStart, day, mealType } = req.body;
  db.prepare('DELETE FROM meals WHERE plan_id = ? AND week_start = ? AND day = ? AND meal_type = ?').run(req.params.planId, weekStart, day, mealType);
  res.json({ success: true });
});

module.exports = router;
