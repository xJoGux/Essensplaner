import { useState, useEffect, FormEvent } from 'react';
import { api } from '../api/client';

interface Item {
  id: number;
  name: string;
  quantity: string | null;
  checked: number;
}

interface Props {
  planId: string;
  canEdit: boolean;
}

export default function ShoppingList({ planId, canEdit }: Props) {
  const [items, setItems] = useState<Item[]>([]);
  const [newName, setNewName] = useState('');
  const [newQty, setNewQty] = useState('');
  const [loading, setLoading] = useState(true);

  function load() {
    api.get(`/plans/${planId}/shopping`).then(setItems).finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [planId]);

  async function addItem(e: FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    const item = await api.post(`/plans/${planId}/shopping`, { name: newName, quantity: newQty || null });
    setItems(prev => [...prev, item]);
    setNewName('');
    setNewQty('');
  }

  async function toggleItem(item: Item) {
    if (!canEdit) return;
    const updated = await api.put(`/plans/${planId}/shopping/${item.id}`, { checked: !item.checked });
    setItems(prev => prev.map(i => i.id === item.id ? updated : i));
  }

  async function deleteItem(id: number) {
    await api.delete(`/plans/${planId}/shopping/${id}`);
    setItems(prev => prev.filter(i => i.id !== id));
  }

  async function clearChecked() {
    await api.delete(`/plans/${planId}/shopping`);
    setItems(prev => prev.filter(i => !i.checked));
  }

  const unchecked = items.filter(i => !i.checked);
  const checked = items.filter(i => i.checked);

  return (
    <div className="shopping-section">
      <div className="section-header">
        <h3>🛒 Einkaufsliste</h3>
        {checked.length > 0 && canEdit && (
          <button className="btn btn-ghost btn-sm" onClick={clearChecked}>
            Erledigte löschen ({checked.length})
          </button>
        )}
      </div>

      {canEdit && (
        <form className="shopping-add-form" onSubmit={addItem}>
          <input
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Artikel hinzufügen..."
            required
          />
          <input
            type="text"
            value={newQty}
            onChange={e => setNewQty(e.target.value)}
            placeholder="Menge (z.B. 2 kg)"
            className="qty-input"
          />
          <button type="submit" className="btn btn-primary">+</button>
        </form>
      )}

      {loading ? (
        <p className="loading-text">Laden...</p>
      ) : items.length === 0 ? (
        <p className="empty-list">Keine Artikel in der Einkaufsliste.</p>
      ) : (
        <div className="shopping-list">
          {unchecked.map(item => (
            <ShoppingItem key={item.id} item={item} canEdit={canEdit} onToggle={toggleItem} onDelete={deleteItem} />
          ))}
          {checked.length > 0 && (
            <>
              <div className="shopping-divider">Erledigt ({checked.length})</div>
              {checked.map(item => (
                <ShoppingItem key={item.id} item={item} canEdit={canEdit} onToggle={toggleItem} onDelete={deleteItem} />
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function ShoppingItem({ item, canEdit, onToggle, onDelete }: {
  item: Item;
  canEdit: boolean;
  onToggle: (item: Item) => void;
  onDelete: (id: number) => void;
}) {
  return (
    <div className={`shopping-item ${item.checked ? 'checked' : ''}`}>
      <label className="shopping-checkbox">
        <input
          type="checkbox"
          checked={!!item.checked}
          onChange={() => canEdit && onToggle(item)}
          disabled={!canEdit}
        />
        <span className="checkmark"></span>
      </label>
      <div className="shopping-item-content">
        <span className="item-name">{item.name}</span>
        {item.quantity && <span className="item-qty">{item.quantity}</span>}
      </div>
      {canEdit && (
        <button className="item-delete" onClick={() => onDelete(item.id)} title="Löschen">×</button>
      )}
    </div>
  );
}
