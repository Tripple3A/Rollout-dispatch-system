import { useState, useEffect, useMemo } from 'react';
import {
  Package, PackagePlus, PackageMinus, Truck, BarChart3, Settings,
  Plus, X, AlertTriangle, Check, Trash2, Pencil, Mail, Download, Save
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const STORAGE_KEY = 'rollout-data-v1';
const DEFAULT_PALLET_SIZE = 6480000;
const LINE_COLORS = ['#1F6F5C', '#B9790A', '#3A5A9B', '#8E4A9E', '#B3392A', '#4A7C8C'];

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
function fmt(n) {
  return new Intl.NumberFormat('en-US').format(Math.round(n || 0));
}
function fmtPallets(n) {
  const v = Math.round((n || 0) * 100) / 100;
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(v);
}
function fmtDate(ts) {
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function fmtDateTime(ts) {
  return new Date(ts).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}
function exportCSV(filename, rows, headers) {
  const csv = [
    headers.map(h => h.label).join(','),
    ...rows.map(r => headers.map(h => `"${String(r[h.key] ?? '').replace(/"/g, '""')}"`).join(','))
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const fontImports = `
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600;700&display=swap');

* { box-sizing: border-box; }

.rl-root {
  --paper: #EEF0F1;
  --surface: #FFFFFF;
  --ink: #171C24;
  --ink-soft: #5B6472;
  --line: #D8DCE1;
  --accent: #1F6F5C;
  --accent-soft: #E4F0EC;
  --warn: #B9790A;
  --warn-soft: #FBF0DC;
  --danger: #B3392A;
  --danger-soft: #F7E5E1;
  font-family: 'IBM Plex Sans', system-ui, sans-serif;
  color: var(--ink);
  background: var(--paper);
}
.rl-mono { font-family: 'IBM Plex Mono', ui-monospace, monospace; }

.rl-app { display: flex; min-height: 100%; width: 100%; }

.rl-sidebar {
  width: 216px;
  flex-shrink: 0;
  background: var(--ink);
  color: #E8EAED;
  padding: 24px 14px;
  display: flex;
  flex-direction: column;
  gap: 28px;
}
.rl-brand { display: flex; align-items: center; gap: 10px; padding: 0 6px; }
.rl-brand-mark {
  width: 34px; height: 34px; border-radius: 8px;
  background: var(--accent);
  display: flex; align-items: center; justify-content: center;
  font-family: 'IBM Plex Mono', monospace; font-weight: 600; font-size: 16px;
  color: #fff; flex-shrink: 0;
}
.rl-brand-name { font-weight: 600; font-size: 15px; line-height: 1.2; }
.rl-brand-sub { font-size: 11.5px; color: #9099A6; line-height: 1.3; margin-top: 2px; }

.rl-nav { display: flex; flex-direction: column; gap: 2px; }
.rl-nav-item {
  display: flex; align-items: center; gap: 10px;
  padding: 9px 10px; border-radius: 7px;
  border: none; background: transparent; color: #C3C9D1;
  font-size: 13.5px; font-family: inherit; cursor: pointer;
  text-align: left; transition: background 0.12s ease, color 0.12s ease;
}
.rl-nav-item:hover { background: rgba(255,255,255,0.06); color: #fff; }
.rl-nav-item.active { background: var(--accent); color: #fff; }

.rl-main { flex: 1; padding: 32px 40px 60px; max-width: 1180px; overflow-y: auto; }

.rl-page-title { font-size: 22px; font-weight: 600; margin: 0 0 4px; }
.rl-page-sub { color: var(--ink-soft); font-size: 13.5px; margin: 0 0 28px; max-width: 62ch; line-height: 1.5; }

.rl-hero {
  background: var(--ink); color: #fff; border-radius: 14px;
  padding: 26px 28px; display: flex; gap: 44px; flex-wrap: wrap;
  margin-bottom: 26px;
}
.rl-hero-stat-label { font-size: 12px; color: #9099A6; margin-bottom: 6px; }
.rl-hero-stat-value { font-family: 'IBM Plex Mono', monospace; font-size: 30px; font-weight: 600; }
.rl-hero-stat-unit { font-size: 13px; color: #9099A6; margin-left: 6px; font-weight: 400; }

.rl-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 14px; }

.rl-card {
  background: var(--surface); border: 1px solid var(--line); border-radius: 12px;
  padding: 18px 20px;
}
.rl-card-title { font-weight: 600; font-size: 14.5px; margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between; }
.rl-card-qty { font-family: 'IBM Plex Mono', monospace; font-size: 26px; font-weight: 600; line-height: 1.1; }
.rl-card-sub { color: var(--ink-soft); font-size: 12.5px; margin-top: 4px; }
.rl-card-footer { margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--line); font-size: 12px; color: var(--ink-soft); }

.rl-empty {
  border: 1px dashed var(--line); border-radius: 12px; padding: 40px 24px;
  text-align: center; color: var(--ink-soft); font-size: 13.5px; background: var(--surface);
}
.rl-empty-title { color: var(--ink); font-weight: 600; font-size: 15px; margin-bottom: 6px; }

.rl-form {
  background: var(--surface); border: 1px solid var(--line); border-radius: 12px;
  padding: 22px 24px; max-width: 560px; display: flex; flex-direction: column; gap: 15px;
}
.rl-field { display: flex; flex-direction: column; gap: 5px; }
.rl-field label { font-size: 12.5px; font-weight: 500; color: var(--ink-soft); }
.rl-field input, .rl-field select, .rl-field textarea {
  border: 1px solid var(--line); border-radius: 8px; padding: 9px 11px;
  font-size: 14px; font-family: inherit; color: var(--ink); background: #fff;
  outline: none; transition: border-color 0.12s ease;
}
.rl-field input:focus, .rl-field select:focus, .rl-field textarea:focus { border-color: var(--accent); }
.rl-field textarea { resize: vertical; min-height: 56px; }
.rl-row { display: flex; gap: 12px; }
.rl-row .rl-field { flex: 1; }

.rl-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 7px;
  border: none; border-radius: 8px; padding: 10px 16px; font-size: 13.5px;
  font-weight: 500; font-family: inherit; cursor: pointer; transition: filter 0.12s ease, transform 0.05s ease;
}
.rl-btn:active { transform: translateY(1px); }
.rl-btn-primary { background: var(--accent); color: #fff; }
.rl-btn-primary:hover { filter: brightness(1.08); }
.rl-btn-secondary { background: var(--paper); color: var(--ink); border: 1px solid var(--line); }
.rl-btn-secondary:hover { filter: brightness(0.97); }
.rl-btn-danger { background: var(--danger-soft); color: var(--danger); }
.rl-btn-danger:hover { filter: brightness(0.96); }
.rl-btn-ghost { background: transparent; color: var(--ink-soft); padding: 6px 8px; }
.rl-btn-ghost:hover { color: var(--ink); }
.rl-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.rl-live-calc {
  background: var(--accent-soft); border-radius: 8px; padding: 12px 14px;
  font-size: 13px; color: var(--accent); display: flex; flex-direction: column; gap: 3px;
}
.rl-live-calc .rl-big { font-family: 'IBM Plex Mono', monospace; font-size: 17px; font-weight: 600; }
.rl-live-calc.warn { background: var(--danger-soft); color: var(--danger); }

.rl-table-wrap { background: var(--surface); border: 1px solid var(--line); border-radius: 12px; overflow: hidden; }
.rl-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.rl-table th {
  text-align: left; padding: 11px 16px; font-weight: 500; color: var(--ink-soft);
  border-bottom: 1px solid var(--line); font-size: 12px;
}
.rl-table td { padding: 11px 16px; border-bottom: 1px solid var(--line); }
.rl-table tr:last-child td { border-bottom: none; }
.rl-table .rl-num { font-family: 'IBM Plex Mono', monospace; }
.rl-table-empty { padding: 28px 16px; text-align: center; color: var(--ink-soft); font-size: 13px; }

.rl-tag { display: inline-flex; align-items: center; padding: 3px 9px; border-radius: 20px; font-size: 11.5px; font-weight: 500; }
.rl-tag-production { background: var(--accent-soft); color: var(--accent); }
.rl-tag-void { background: var(--warn-soft); color: var(--warn); }
.rl-tag-dispatch { background: #E5EAF6; color: #3A5A9B; }

.rl-section { margin-bottom: 32px; }
.rl-section-title { font-size: 15px; font-weight: 600; margin-bottom: 12px; }

.rl-toast {
  position: fixed; bottom: 22px; right: 26px; background: var(--ink); color: #fff;
  padding: 12px 18px; border-radius: 9px; font-size: 13.5px; display: flex; align-items: center; gap: 9px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.22); z-index: 50;
}
.rl-toast.error { background: var(--danger); }

.rl-filters { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 18px; align-items: flex-end; }
.rl-filters .rl-field { min-width: 160px; }

.rl-email-preview {
  background: var(--paper); border: 1px solid var(--line); border-radius: 10px; padding: 14px 16px;
  font-size: 13px; white-space: pre-wrap; font-family: 'IBM Plex Mono', monospace; line-height: 1.6;
  max-height: 220px; overflow-y: auto;
}
.rl-product-row { display: flex; align-items: center; gap: 10px; padding: 12px 16px; border-bottom: 1px solid var(--line); }
.rl-product-row:last-child { border-bottom: none; }

@media (max-width: 760px) {
  .rl-app { flex-direction: column; }
  .rl-sidebar { width: 100%; flex-direction: row; align-items: center; padding: 14px; }
  .rl-nav { flex-direction: row; flex-wrap: wrap; }
  .rl-main { padding: 22px 18px 50px; }
  .rl-row { flex-direction: column; }
}
`;

function EmptyState({ title, body }) {
  return (
    <div className="rl-empty">
      <div className="rl-empty-title">{title}</div>
      <div>{body}</div>
    </div>
  );
}

function Dashboard({ data }) {
  const totalQty = data.products.reduce((s, p) => s + p.currentQty, 0);
  const totalPallets = data.products.reduce((s, p) => s + p.currentQty / (p.palletSize || DEFAULT_PALLET_SIZE), 0);
  const lastEventByProduct = useMemo(() => {
    const map = {};
    [...data.events].sort((a, b) => b.timestamp - a.timestamp).forEach(e => {
      if (!map[e.productId]) map[e.productId] = e;
    });
    return map;
  }, [data.events]);

  return (
    <div>
      <h1 className="rl-page-title">Production floor</h1>
      <p className="rl-page-sub">Live count of labels on the floor, ready for dispatch, across every product.</p>

      {data.products.length === 0 ? (
        <EmptyState title="No products yet" body="Add your first product in the Products tab to start tracking quantities." />
      ) : (
        <>
          <div className="rl-hero">
            <div>
              <div className="rl-hero-stat-label">Total on the floor</div>
              <div className="rl-hero-stat-value">{fmt(totalQty)}<span className="rl-hero-stat-unit">labels</span></div>
            </div>
            <div>
              <div className="rl-hero-stat-label">Pallet equivalent</div>
              <div className="rl-hero-stat-value">{fmtPallets(totalPallets)}<span className="rl-hero-stat-unit">pallets</span></div>
            </div>
            <div>
              <div className="rl-hero-stat-label">Products tracked</div>
              <div className="rl-hero-stat-value">{data.products.length}</div>
            </div>
          </div>

          <div className="rl-grid">
            {data.products.map(p => {
              const pallets = p.currentQty / (p.palletSize || DEFAULT_PALLET_SIZE);
              const last = lastEventByProduct[p.id];
              return (
                <div className="rl-card" key={p.id}>
                  <div className="rl-card-title">{p.name}</div>
                  <div className="rl-card-qty rl-mono">{fmt(p.currentQty)}</div>
                  <div className="rl-card-sub">≈ {fmtPallets(pallets)} pallets · {fmt(p.palletSize || DEFAULT_PALLET_SIZE)} per pallet</div>
                  <div className="rl-card-footer">
                    {last ? (
                      <span>
                        Last: <span className="rl-mono">{last.type === 'production' ? '+' : '−'}{fmt(last.qty)}</span> ({last.type}) · {fmtDateTime(last.timestamp)}
                      </span>
                    ) : 'No activity logged yet'}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function ProductionView({ data, onAdd, showToast }) {
  const [productId, setProductId] = useState(data.products[0]?.id || '');
  const [qty, setQty] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!productId && data.products[0]) setProductId(data.products[0].id);
  }, [data.products]);

  const recent = useMemo(
    () => data.events.filter(e => e.type === 'production').sort((a, b) => b.timestamp - a.timestamp).slice(0, 12),
    [data.events]
  );
  const productName = id => data.products.find(p => p.id === id)?.name || '—';

  function submit(e) {
    e.preventDefault();
    const q = Number(qty);
    if (!productId) return showToast('Select a product first.', 'error');
    if (!q || q <= 0) return showToast('Enter a quantity greater than zero.', 'error');
    onAdd(productId, q, note);
    showToast(`Added ${fmt(q)} labels to ${productName(productId)}.`);
    setQty('');
    setNote('');
  }

  if (data.products.length === 0) {
    return <EmptyState title="No products yet" body="Add a product first, then you can log production runs against it." />;
  }

  return (
    <div>
      <h1 className="rl-page-title">Log production</h1>
      <p className="rl-page-sub">Add newly produced labels to a product's floor count.</p>

      <form className="rl-form" onSubmit={submit}>
        <div className="rl-field">
          <label>Product</label>
          <select value={productId} onChange={e => setProductId(e.target.value)}>
            {data.products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div className="rl-field">
          <label>Quantity produced (labels)</label>
          <input type="number" min="1" value={qty} onChange={e => setQty(e.target.value)} placeholder="e.g. 500000" />
        </div>
        <div className="rl-field">
          <label>Note (optional)</label>
          <input value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. Run #4, night shift" />
        </div>
        <button className="rl-btn rl-btn-primary" type="submit"><PackagePlus size={16} /> Add to floor</button>
      </form>

      <div className="rl-section" style={{ marginTop: 30 }}>
        <div className="rl-section-title">Recent production</div>
        <div className="rl-table-wrap">
          {recent.length === 0 ? <div className="rl-table-empty">Nothing logged yet.</div> : (
            <table className="rl-table">
              <thead><tr><th>Date</th><th>Product</th><th>Quantity</th><th>Note</th></tr></thead>
              <tbody>
                {recent.map(e => (
                  <tr key={e.id}>
                    <td>{fmtDateTime(e.timestamp)}</td>
                    <td>{productName(e.productId)}</td>
                    <td className="rl-num">+{fmt(e.qty)}</td>
                    <td>{e.note || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function VoidView({ data, onAdd, showToast }) {
  const [productId, setProductId] = useState(data.products[0]?.id || '');
  const [qty, setQty] = useState('');
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (!productId && data.products[0]) setProductId(data.products[0].id);
  }, [data.products]);

  const product = data.products.find(p => p.id === productId);
  const recent = useMemo(
    () => data.events.filter(e => e.type === 'void').sort((a, b) => b.timestamp - a.timestamp).slice(0, 12),
    [data.events]
  );
  const productName = id => data.products.find(p => p.id === id)?.name || '—';

  function submit(e) {
    e.preventDefault();
    const q = Number(qty);
    if (!productId) return showToast('Select a product first.', 'error');
    if (!q || q <= 0) return showToast('Enter a quantity greater than zero.', 'error');
    if (product && q > product.currentQty) {
      return showToast(`Only ${fmt(product.currentQty)} labels are on the floor for ${product.name}.`, 'error');
    }
    onAdd(productId, q, reason);
    showToast(`Voided ${fmt(q)} labels from ${productName(productId)}.`);
    setQty('');
    setReason('');
  }

  if (data.products.length === 0) {
    return <EmptyState title="No products yet" body="Add a product first, then you can log voided labels against it." />;
  }

  return (
    <div>
      <h1 className="rl-page-title">Log void</h1>
      <p className="rl-page-sub">Remove labels that were voided after printing and can't be sent to the warehouse.</p>

      <form className="rl-form" onSubmit={submit}>
        <div className="rl-field">
          <label>Product</label>
          <select value={productId} onChange={e => setProductId(e.target.value)}>
            {data.products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        {product && <div className="rl-card-sub">{fmt(product.currentQty)} currently on the floor</div>}
        <div className="rl-field">
          <label>Quantity voided (labels)</label>
          <input type="number" min="1" value={qty} onChange={e => setQty(e.target.value)} placeholder="e.g. 1200" />
        </div>
        <div className="rl-field">
          <label>Reason (optional)</label>
          <input value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Print misalignment" />
        </div>
        <button className="rl-btn rl-btn-danger" type="submit"><PackageMinus size={16} /> Remove from floor</button>
      </form>

      <div className="rl-section" style={{ marginTop: 30 }}>
        <div className="rl-section-title">Recent voids</div>
        <div className="rl-table-wrap">
          {recent.length === 0 ? <div className="rl-table-empty">Nothing logged yet.</div> : (
            <table className="rl-table">
              <thead><tr><th>Date</th><th>Product</th><th>Quantity</th><th>Reason</th></tr></thead>
              <tbody>
                {recent.map(e => (
                  <tr key={e.id}>
                    <td>{fmtDateTime(e.timestamp)}</td>
                    <td>{productName(e.productId)}</td>
                    <td className="rl-num">−{fmt(e.qty)}</td>
                    <td>{e.note || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function DispatchView({ data, onDispatch, showToast }) {
  const [productId, setProductId] = useState(data.products[0]?.id || '');
  const [pallets, setPallets] = useState('');
  const [dispatchedBy, setDispatchedBy] = useState('');
  const [recipients, setRecipients] = useState('');
  const [note, setNote] = useState('');
  const [lastEmail, setLastEmail] = useState(null);

  useEffect(() => {
    if (!productId && data.products[0]) setProductId(data.products[0].id);
  }, [data.products]);

  const product = data.products.find(p => p.id === productId);
  const palletSize = product?.palletSize || DEFAULT_PALLET_SIZE;
  const palletsNum = Number(pallets) || 0;
  const qty = palletsNum * palletSize;
  const remainingAfter = product ? product.currentQty - qty : 0;
  const overCapacity = product && qty > product.currentQty;

  const recent = useMemo(
    () => data.events.filter(e => e.type === 'dispatch').sort((a, b) => b.timestamp - a.timestamp).slice(0, 12),
    [data.events]
  );
  const productName = id => data.products.find(p => p.id === id)?.name || '—';

  function submit(e) {
    e.preventDefault();
    if (!productId) return showToast('Select a product first.', 'error');
    if (!palletsNum || palletsNum <= 0) return showToast('Enter a number of pallets greater than zero.', 'error');
    if (overCapacity) return showToast(`Only ${fmt(product.currentQty)} labels are available — that's short of ${fmt(qty)}.`, 'error');
    if (!dispatchedBy.trim()) return showToast('Enter who is dispatching this.', 'error');
    const recipientList = recipients.split(',').map(r => r.trim()).filter(Boolean);
    if (recipientList.length === 0) return showToast('Add at least one recipient email.', 'error');

    onDispatch(productId, qty, palletsNum, dispatchedBy.trim(), recipientList, note);

    const subject = `Dispatch confirmation — ${product.name} — ${fmtDate(Date.now())}`;
    const body =
      `Dispatch confirmation\n\n` +
      `Product: ${product.name}\n` +
      `Pallets dispatched: ${fmtPallets(palletsNum)}\n` +
      `Labels dispatched: ${fmt(qty)}\n` +
      `Remaining on production floor: ${fmt(remainingAfter)}\n` +
      `Dispatched by: ${dispatchedBy.trim()}\n` +
      `Date: ${fmtDateTime(Date.now())}` +
      (note ? `\nNote: ${note}` : '');

    setLastEmail({ to: recipientList, subject, body });
    showToast(`Dispatched ${fmt(qty)} labels of ${product.name}.`);
    setPallets('');
    setNote('');
  }

  function openMail() {
    if (!lastEmail) return;
    const url = `mailto:${lastEmail.to.join(',')}?subject=${encodeURIComponent(lastEmail.subject)}&body=${encodeURIComponent(lastEmail.body)}`;
    window.open(url, '_blank');
  }

  function copyEmail() {
    if (!lastEmail) return;
    navigator.clipboard.writeText(`To: ${lastEmail.to.join(', ')}\nSubject: ${lastEmail.subject}\n\n${lastEmail.body}`);
    showToast('Email text copied to clipboard.');
  }

  if (data.products.length === 0) {
    return <EmptyState title="No products yet" body="Add a product first, then you can dispatch pallets against it." />;
  }

  return (
    <div>
      <h1 className="rl-page-title">Dispatch</h1>
      <p className="rl-page-sub">Send pallets to the warehouse. This subtracts from the floor count and prepares a confirmation email.</p>

      <form className="rl-form" onSubmit={submit}>
        <div className="rl-field">
          <label>Product</label>
          <select value={productId} onChange={e => setProductId(e.target.value)}>
            {data.products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        {product && <div className="rl-card-sub">{fmt(product.currentQty)} on the floor · {fmt(palletSize)} labels per pallet</div>}

        <div className="rl-field">
          <label>Pallets to dispatch</label>
          <input type="number" min="0" step="0.01" value={pallets} onChange={e => setPallets(e.target.value)} placeholder="e.g. 2" />
        </div>

        {palletsNum > 0 && (
          <div className={`rl-live-calc ${overCapacity ? 'warn' : ''}`}>
            <div>Labels to dispatch: <span className="rl-big">{fmt(qty)}</span></div>
            <div>Floor remaining after: <span className="rl-big">{fmt(Math.max(remainingAfter, 0))}</span></div>
            {overCapacity && <div>Not enough on the floor to cover this dispatch.</div>}
          </div>
        )}

        <div className="rl-row">
          <div className="rl-field">
            <label>Dispatched by</label>
            <input value={dispatchedBy} onChange={e => setDispatchedBy(e.target.value)} placeholder="Your name" />
          </div>
        </div>

        <div className="rl-field">
          <label>Send confirmation to (comma-separated emails)</label>
          <input value={recipients} onChange={e => setRecipients(e.target.value)} placeholder="warehouse@company.com, manager@company.com" />
        </div>

        <div className="rl-field">
          <label>Note (optional)</label>
          <input value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. PO #4521" />
        </div>

        <button className="rl-btn rl-btn-primary" type="submit" disabled={overCapacity}>
          <Truck size={16} /> Confirm dispatch
        </button>
      </form>

      {lastEmail && (
        <div className="rl-form" style={{ marginTop: 18 }}>
          <div className="rl-card-title" style={{ marginBottom: 0 }}>Confirmation email ready</div>
          <div className="rl-email-preview">
            To: {lastEmail.to.join(', ')}{'\n'}
            Subject: {lastEmail.subject}{'\n\n'}
            {lastEmail.body}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="rl-btn rl-btn-primary" onClick={openMail} type="button"><Mail size={15} /> Open in email app</button>
            <button className="rl-btn rl-btn-secondary" onClick={copyEmail} type="button">Copy text</button>
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
            This app can't send email on its own — "Open in email app" fills a draft in your default mail client so you just hit send.
          </div>
        </div>
      )}

      <div className="rl-section" style={{ marginTop: 30 }}>
        <div className="rl-section-title">Recent dispatches</div>
        <div className="rl-table-wrap">
          {recent.length === 0 ? <div className="rl-table-empty">Nothing dispatched yet.</div> : (
            <table className="rl-table">
              <thead><tr><th>Date</th><th>Product</th><th>Pallets</th><th>Quantity</th><th>By</th><th>Recipients</th></tr></thead>
              <tbody>
                {recent.map(e => (
                  <tr key={e.id}>
                    <td>{fmtDateTime(e.timestamp)}</td>
                    <td>{productName(e.productId)}</td>
                    <td className="rl-num">{fmtPallets(e.pallets)}</td>
                    <td className="rl-num">−{fmt(e.qty)}</td>
                    <td>{e.dispatchedBy}</td>
                    <td>{(e.recipients || []).join(', ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function Reports({ data }) {
  const [productFilter, setProductFilter] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const productName = id => data.products.find(p => p.id === id)?.name || '—';

  const filteredEvents = useMemo(() => {
    return data.events.filter(e => {
      if (productFilter !== 'all' && e.productId !== productFilter) return false;
      if (from && e.timestamp < new Date(from).getTime()) return false;
      if (to && e.timestamp > new Date(to).getTime() + 86400000) return false;
      return true;
    });
  }, [data.events, productFilter, from, to]);

  const totals = useMemo(() => {
    const produced = filteredEvents.filter(e => e.type === 'production').reduce((s, e) => s + e.qty, 0);
    const voided = filteredEvents.filter(e => e.type === 'void').reduce((s, e) => s + e.qty, 0);
    const dispatchEvents = filteredEvents.filter(e => e.type === 'dispatch');
    const dispatched = dispatchEvents.reduce((s, e) => s + e.qty, 0);
    const dispatchedPallets = dispatchEvents.reduce((s, e) => s + (e.pallets || 0), 0);
    return { produced, voided, dispatched, dispatchedPallets };
  }, [filteredEvents]);

  const trendData = useMemo(() => {
    const relevantProducts = productFilter === 'all' ? data.products : data.products.filter(p => p.id === productFilter);
    const sorted = [...data.events].sort((a, b) => a.timestamp - b.timestamp);
    const running = {};
    relevantProducts.forEach(p => { running[p.id] = 0; });
    const timestamps = [...new Set(sorted.map(e => e.timestamp))];
    const points = [];
    let idx = 0;
    for (const ts of timestamps) {
      while (idx < sorted.length && sorted[idx].timestamp === ts) {
        const e = sorted[idx];
        if (relevantProducts.some(p => p.id === e.productId)) {
          const delta = e.type === 'production' ? e.qty : -e.qty;
          running[e.productId] = (running[e.productId] || 0) + delta;
        }
        idx++;
      }
      if (ts >= (from ? new Date(from).getTime() : 0) && ts <= (to ? new Date(to).getTime() + 86400000 : Infinity)) {
        points.push({ timestamp: ts, ...running });
      }
    }
    return { points, products: relevantProducts };
  }, [data.events, data.products, productFilter, from, to]);

  const dispatchRows = filteredEvents.filter(e => e.type === 'dispatch').sort((a, b) => b.timestamp - a.timestamp);
  const voidRows = filteredEvents.filter(e => e.type === 'void').sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div>
      <h1 className="rl-page-title">Reports</h1>
      <p className="rl-page-sub">Dispatch history, voids over time, and the production floor trend.</p>

      <div className="rl-filters">
        <div className="rl-field">
          <label>Product</label>
          <select value={productFilter} onChange={e => setProductFilter(e.target.value)}>
            <option value="all">All products</option>
            {data.products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div className="rl-field">
          <label>From</label>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} />
        </div>
        <div className="rl-field">
          <label>To</label>
          <input type="date" value={to} onChange={e => setTo(e.target.value)} />
        </div>
      </div>

      <div className="rl-grid" style={{ marginBottom: 28 }}>
        <div className="rl-card">
          <div className="rl-card-title">Produced</div>
          <div className="rl-card-qty rl-mono">{fmt(totals.produced)}</div>
          <div className="rl-card-sub">labels, in range</div>
        </div>
        <div className="rl-card">
          <div className="rl-card-title">Voided</div>
          <div className="rl-card-qty rl-mono">{fmt(totals.voided)}</div>
          <div className="rl-card-sub">labels, in range</div>
        </div>
        <div className="rl-card">
          <div className="rl-card-title">Dispatched</div>
          <div className="rl-card-qty rl-mono">{fmt(totals.dispatched)}</div>
          <div className="rl-card-sub">{fmtPallets(totals.dispatchedPallets)} pallets, in range</div>
        </div>
      </div>

      <div className="rl-section">
        <div className="rl-section-title">Production floor trend</div>
        {trendData.points.length === 0 ? (
          <EmptyState title="Not enough data yet" body="Once you log production, voids, or dispatches, the trend will appear here." />
        ) : (
          <div className="rl-table-wrap" style={{ padding: '18px 18px 6px' }}>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={trendData.points}>
                <CartesianGrid stroke="#E4E7EA" vertical={false} />
                <XAxis dataKey="timestamp" tickFormatter={fmtDate} stroke="#5B6472" fontSize={11.5} />
                <YAxis tickFormatter={v => fmt(v)} stroke="#5B6472" fontSize={11.5} width={70} />
                <Tooltip labelFormatter={fmtDate} formatter={v => fmt(v)} />
                <Legend />
                {trendData.products.map((p, i) => (
                  <Line key={p.id} type="monotone" dataKey={p.id} name={p.name} stroke={LINE_COLORS[i % LINE_COLORS.length]} dot={false} strokeWidth={2} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="rl-section">
        <div className="rl-section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Dispatch history</span>
          {dispatchRows.length > 0 && (
            <button className="rl-btn rl-btn-secondary" onClick={() => exportCSV('dispatch-history.csv', dispatchRows.map(e => ({
              date: fmtDateTime(e.timestamp), product: productName(e.productId), pallets: e.pallets, quantity: e.qty, dispatchedBy: e.dispatchedBy, recipients: (e.recipients || []).join('; '), note: e.note
            })), [
              { key: 'date', label: 'Date' }, { key: 'product', label: 'Product' }, { key: 'pallets', label: 'Pallets' },
              { key: 'quantity', label: 'Quantity' }, { key: 'dispatchedBy', label: 'Dispatched By' }, { key: 'recipients', label: 'Recipients' }, { key: 'note', label: 'Note' }
            ])}>
              <Download size={14} /> Export CSV
            </button>
          )}
        </div>
        <div className="rl-table-wrap">
          {dispatchRows.length === 0 ? <div className="rl-table-empty">No dispatches in this range.</div> : (
            <table className="rl-table">
              <thead><tr><th>Date</th><th>Product</th><th>Pallets</th><th>Quantity</th><th>By</th><th>Recipients</th></tr></thead>
              <tbody>
                {dispatchRows.map(e => (
                  <tr key={e.id}>
                    <td>{fmtDateTime(e.timestamp)}</td>
                    <td>{productName(e.productId)}</td>
                    <td className="rl-num">{fmtPallets(e.pallets)}</td>
                    <td className="rl-num">{fmt(e.qty)}</td>
                    <td>{e.dispatchedBy}</td>
                    <td>{(e.recipients || []).join(', ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="rl-section">
        <div className="rl-section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Void history</span>
          {voidRows.length > 0 && (
            <button className="rl-btn rl-btn-secondary" onClick={() => exportCSV('void-history.csv', voidRows.map(e => ({
              date: fmtDateTime(e.timestamp), product: productName(e.productId), quantity: e.qty, reason: e.note
            })), [
              { key: 'date', label: 'Date' }, { key: 'product', label: 'Product' }, { key: 'quantity', label: 'Quantity' }, { key: 'reason', label: 'Reason' }
            ])}>
              <Download size={14} /> Export CSV
            </button>
          )}
        </div>
        <div className="rl-table-wrap">
          {voidRows.length === 0 ? <div className="rl-table-empty">No voids in this range.</div> : (
            <table className="rl-table">
              <thead><tr><th>Date</th><th>Product</th><th>Quantity</th><th>Reason</th></tr></thead>
              <tbody>
                {voidRows.map(e => (
                  <tr key={e.id}>
                    <td>{fmtDateTime(e.timestamp)}</td>
                    <td>{productName(e.productId)}</td>
                    <td className="rl-num">{fmt(e.qty)}</td>
                    <td>{e.note || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function ProductsView({ data, onAdd, onUpdate, onDelete }) {
  const [name, setName] = useState('');
  const [palletSize, setPalletSize] = useState(String(DEFAULT_PALLET_SIZE));
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editPallet, setEditPallet] = useState('');

  function submit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    onAdd(name.trim(), Number(palletSize) || DEFAULT_PALLET_SIZE);
    setName('');
    setPalletSize(String(DEFAULT_PALLET_SIZE));
  }

  function startEdit(p) {
    setEditingId(p.id);
    setEditName(p.name);
    setEditPallet(String(p.palletSize || DEFAULT_PALLET_SIZE));
  }

  function saveEdit(id) {
    onUpdate(id, { name: editName.trim() || 'Untitled product', palletSize: Number(editPallet) || DEFAULT_PALLET_SIZE });
    setEditingId(null);
  }

  return (
    <div>
      <h1 className="rl-page-title">Products</h1>
      <p className="rl-page-sub">Manage the label products you track, and each one's pallet size.</p>

      <form className="rl-form" onSubmit={submit} style={{ marginBottom: 28 }}>
        <div className="rl-row">
          <div className="rl-field">
            <label>Product name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Beverage Co — 500ml wrap label" />
          </div>
          <div className="rl-field">
            <label>Labels per pallet</label>
            <input type="number" min="1" value={palletSize} onChange={e => setPalletSize(e.target.value)} />
          </div>
        </div>
        <button className="rl-btn rl-btn-primary" type="submit"><Plus size={16} /> Add product</button>
      </form>

      <div className="rl-table-wrap">
        {data.products.length === 0 ? <div className="rl-table-empty">No products yet — add one above.</div> : (
          data.products.map(p => (
            <div className="rl-product-row" key={p.id}>
              {editingId === p.id ? (
                <>
                  <input style={{ flex: 2 }} className="rl-mono" value={editName} onChange={e => setEditName(e.target.value)} />
                  <input style={{ flex: 1 }} type="number" value={editPallet} onChange={e => setEditPallet(e.target.value)} />
                  <button className="rl-btn rl-btn-primary" onClick={() => saveEdit(p.id)} type="button"><Save size={14} /></button>
                  <button className="rl-btn rl-btn-ghost" onClick={() => setEditingId(null)} type="button"><X size={14} /></button>
                </>
              ) : (
                <>
                  <div style={{ flex: 2, fontWeight: 500 }}>{p.name}</div>
                  <div style={{ flex: 1, color: 'var(--ink-soft)', fontSize: 13 }} className="rl-mono">{fmt(p.palletSize || DEFAULT_PALLET_SIZE)} / pallet</div>
                  <div style={{ flex: 1, fontSize: 13 }} className="rl-mono">{fmt(p.currentQty)} on floor</div>
                  <button className="rl-btn rl-btn-ghost" onClick={() => startEdit(p)} type="button"><Pencil size={15} /></button>
                  <button
                    className="rl-btn rl-btn-ghost"
                    type="button"
                    onClick={() => { if (confirm(`Delete "${p.name}"? This also removes its logged history.`)) onDelete(p.id); }}
                  >
                    <Trash2 size={15} />
                  </button>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default function RolloutApp() {
  const [data, setData] = useState({ products: [], events: [] });
  const [loaded, setLoaded] = useState(false);
  const [view, setView] = useState('dashboard');
  const [toast, setToast] = useState(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setData(JSON.parse(raw));
    } catch (e) {
      // nothing stored yet
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('save failed', e);
    }
  }, [data, loaded]);

  function showToast(msg, kind = 'success') {
    setToast({ msg, kind });
    setTimeout(() => setToast(null), 3500);
  }

  function addProduct(name, palletSize) {
    setData(d => ({ ...d, products: [...d.products, { id: uid(), name, palletSize: palletSize || DEFAULT_PALLET_SIZE, currentQty: 0 }] }));
  }
  function updateProduct(id, patch) {
    setData(d => ({ ...d, products: d.products.map(p => p.id === id ? { ...p, ...patch } : p) }));
  }
  function deleteProduct(id) {
    setData(d => ({ ...d, products: d.products.filter(p => p.id !== id), events: d.events.filter(e => e.productId !== id) }));
  }
  function addProduction(productId, qty, note) {
    setData(d => ({
      ...d,
      products: d.products.map(p => p.id === productId ? { ...p, currentQty: p.currentQty + qty } : p),
      events: [...d.events, { id: uid(), type: 'production', productId, qty, note: note || '', timestamp: Date.now() }]
    }));
  }
  function addVoid(productId, qty, reason) {
    setData(d => ({
      ...d,
      products: d.products.map(p => p.id === productId ? { ...p, currentQty: Math.max(0, p.currentQty - qty) } : p),
      events: [...d.events, { id: uid(), type: 'void', productId, qty, note: reason || '', timestamp: Date.now() }]
    }));
  }
  function addDispatch(productId, qty, pallets, dispatchedBy, recipients, note) {
    setData(d => ({
      ...d,
      products: d.products.map(p => p.id === productId ? { ...p, currentQty: Math.max(0, p.currentQty - qty) } : p),
      events: [...d.events, { id: uid(), type: 'dispatch', productId, qty, pallets, dispatchedBy, recipients, note: note || '', timestamp: Date.now() }]
    }));
  }

  const nav = [
    { id: 'dashboard', label: 'Production floor', icon: Package },
    { id: 'dispatch', label: 'Dispatch', icon: Truck },
    { id: 'production', label: 'Log production', icon: PackagePlus },
    { id: 'void', label: 'Log void', icon: PackageMinus },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'products', label: 'Products', icon: Settings },
  ];

  return (
    <div className="rl-root">
      <style>{fontImports}</style>
      {!loaded ? (
        <div style={{ padding: 40, fontFamily: 'IBM Plex Sans, sans-serif' }}>Loading floor data…</div>
      ) : (
        <div className="rl-app">
          <aside className="rl-sidebar">
            <div className="rl-brand">
              <div className="rl-brand-mark">R</div>
              <div>
                <div className="rl-brand-name">Rollout</div>
                <div className="rl-brand-sub">Label dispatch control</div>
              </div>
            </div>
            <nav className="rl-nav">
              {nav.map(item => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    className={`rl-nav-item ${view === item.id ? 'active' : ''}`}
                    onClick={() => setView(item.id)}
                    type="button"
                  >
                    <Icon size={17} strokeWidth={2} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </aside>
          <main className="rl-main">
            {view === 'dashboard' && <Dashboard data={data} />}
            {view === 'dispatch' && <DispatchView data={data} onDispatch={addDispatch} showToast={showToast} />}
            {view === 'production' && <ProductionView data={data} onAdd={addProduction} showToast={showToast} />}
            {view === 'void' && <VoidView data={data} onAdd={addVoid} showToast={showToast} />}
            {view === 'reports' && <Reports data={data} />}
            {view === 'products' && <ProductsView data={data} onAdd={addProduct} onUpdate={updateProduct} onDelete={deleteProduct} />}
          </main>
        </div>
      )}
      {toast && (
        <div className={`rl-toast ${toast.kind === 'error' ? 'error' : ''}`}>
          {toast.kind === 'error' ? <AlertTriangle size={16} /> : <Check size={16} />}
          <span>{toast.msg}</span>
        </div>
      )}
    </div>
  );
}
