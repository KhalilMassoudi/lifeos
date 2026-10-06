import React, { useEffect, useState } from 'react';
import { format, startOfWeek, addDays, parseISO, isBefore } from 'date-fns';
import { Plus, Pencil, Trash2, Check, Loader2, Instagram, ClipboardPaste, RefreshCw, Unplug, ExternalLink, CalendarDays } from 'lucide-react';
import Modal, { btn } from '../../../components/ui/Modal';
import { api } from '../../../utils/api';
import { useBjjStore, CLASS_TYPES } from './bjjStore';
import ImportModal from './ImportModal';

const DAYS = [[1, 'Monday'], [2, 'Tuesday'], [3, 'Wednesday'], [4, 'Thursday'], [5, 'Friday'], [6, 'Saturday'], [0, 'Sunday']];
const minutesBetween = (a, b) => {
  if (!a || !b) return null;
  const toMin = (t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
  const diff = toMin(b) - toMin(a);
  return diff > 0 ? diff : null;
};

// Date of a weekday in the current Monday-first week
const dateThisWeek = (weekday) => addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), (weekday + 6) % 7);

function ClassModal({ klass, onClose }) {
  const { saveClass } = useBjjStore();
  const [form, setForm] = useState({
    weekday: klass?.weekday ?? 1, start_time: klass?.start_time || '19:00', end_time: klass?.end_time || '20:30',
    class_type: klass?.class_type || 'gi', title: klass?.title || '',
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const save = async () => {
    setSaving(true);
    try { await saveClass({ ...form, end_time: form.end_time || null }, klass?.id); onClose(); } catch { setSaving(false); }
  };

  return (
    <Modal title={klass ? 'Edit class' : 'Add a class'} icon={<CalendarDays className="w-5 h-5" />} onClose={onClose}
      footer={<>
        <button className={btn.secondary} onClick={onClose}>Cancel</button>
        <button className={btn.primary} onClick={save} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Save</button>
      </>}>
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <label className="block"><span className="block text-xs font-bold text-ink-soft mb-1.5">Day</span>
            <select className="lifeos-input" value={form.weekday} onChange={e => set('weekday', Number(e.target.value))}>
              {DAYS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select></label>
          <label className="block"><span className="block text-xs font-bold text-ink-soft mb-1.5">Starts</span>
            <input type="time" className="lifeos-input" value={form.start_time} onChange={e => set('start_time', e.target.value)} /></label>
          <label className="block"><span className="block text-xs font-bold text-ink-soft mb-1.5">Ends</span>
            <input type="time" className="lifeos-input" value={form.end_time || ''} onChange={e => set('end_time', e.target.value)} /></label>
        </div>
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Class type">
          {Object.entries(CLASS_TYPES).map(([k, c]) => (
            <button key={k} type="button" role="radio" aria-checked={form.class_type === k} onClick={() => set('class_type', k)}
              className={`px-3 py-1.5 rounded-2xl text-xs font-extrabold ${form.class_type === k ? 'shadow-soft scale-105 text-ink' : 'opacity-60 hover:opacity-100 text-ink-soft'}`} style={{ background: c.tint }}>
              {c.emoji} {c.label}
            </button>
          ))}
        </div>
        <label className="block"><span className="block text-xs font-bold text-ink-soft mb-1.5">Title (optional)</span>
          <input className="lifeos-input" value={form.title} maxLength={255} onChange={e => set('title', e.target.value)} placeholder={`${CLASS_TYPES[form.class_type].label} class`} /></label>
      </div>
    </Modal>
  );
}

function Timetable({ onAttend }) {
  const { classes, deleteClass } = useBjjStore();
  const [editing, setEditing] = useState(null);
  const today = new Date();
  const now = format(today, 'HH:mm');

  return (
    <section className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-xl font-semibold text-ink">Weekly timetable</h3>
        <button className={btn.secondary} onClick={() => setEditing({ klass: null })}><Plus className="w-4 h-4" /> Class</button>
      </div>
      {classes.length === 0 ? (
        <p className="text-sm text-ink-muted text-center py-6">No classes yet — import them from your gym's Instagram below, paste the schedule, or add them by hand.</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-2.5">
          {DAYS.map(([weekday, label]) => {
            const dayClasses = classes.filter(c => c.weekday === weekday).sort((a, b) => a.start_time.localeCompare(b.start_time));
            const date = dateThisWeek(weekday);
            const isToday = format(date, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');
            return (
              <div key={weekday} className={`rounded-2xl p-2.5 min-h-[120px] ${isToday ? 'bg-accent-50 ring-2 ring-accent-200' : 'bg-surface-sunken/50'}`}>
                <p className={`text-xs font-extrabold mb-2 ${isToday ? 'text-accent-600' : 'text-ink-muted'}`}>{label.slice(0, 3)} <span className="font-semibold text-ink-faint">{format(date, 'd')}</span></p>
                <div className="space-y-1.5">
                  {dayClasses.map(c => {
                    const type = CLASS_TYPES[c.class_type] || CLASS_TYPES.gi;
                    const started = isBefore(date, today) && (!isToday || c.start_time <= now);
                    return (
                      <div key={c.id} className="group rounded-xl p-2 text-xs" style={{ background: type.tint }}>
                        <div className="flex items-start gap-1">
                          <div className="flex-1 min-w-0">
                            <p className="font-extrabold text-ink">{c.start_time}{c.end_time && `–${c.end_time}`}</p>
                            <p className="font-bold text-ink-soft truncate" title={c.title}>{type.emoji} {c.title}</p>
                          </div>
                          <div className="flex flex-col opacity-0 group-hover:opacity-100 focus-within:opacity-100">
                            <button onClick={() => setEditing({ klass: c })} className="p-0.5 text-ink-muted hover:text-ink" aria-label="Edit class"><Pencil className="w-3 h-3" /></button>
                            <button onClick={() => { if (window.confirm('Remove this class?')) deleteClass(c.id); }} className="p-0.5 text-red-400" aria-label="Remove class"><Trash2 className="w-3 h-3" /></button>
                          </div>
                        </div>
                        {started && (
                          <button
                            onClick={() => onAttend({ date: format(date, 'yyyy-MM-dd'), class_type: c.class_type, duration_minutes: minutesBetween(c.start_time, c.end_time) ?? 60 })}
                            className="mt-1.5 w-full py-1 rounded-lg bg-paper/70 hover:bg-paper text-[11px] font-extrabold text-ink"
                          >
                            ✓ I attended
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {editing && <ClassModal klass={editing.klass} onClose={() => setEditing(null)} />}
    </section>
  );
}

function ConnectModal({ onClose, onConnected }) {
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const connect = async () => {
    setBusy(true);
    setError(null);
    try {
      onConnected(await api.post('/instagram/connect', { access_token: token.trim() }));
      onClose();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  const Step = ({ n, children }) => (
    <li className="flex gap-3">
      <span className="w-6 h-6 rounded-full bg-accent-100 text-accent-600 text-xs font-extrabold flex items-center justify-center flex-shrink-0">{n}</span>
      <span className="text-sm text-ink-soft leading-relaxed">{children}</span>
    </li>
  );

  return (
    <Modal title="Connect Instagram" subtitle="One-time setup with Meta's official API" icon={<Instagram className="w-5 h-5" />} onClose={onClose}
      footer={<>
        {error && <p role="alert" className="mr-auto self-center text-sm font-semibold text-red-400 max-w-xs">{error}</p>}
        <button className={btn.secondary} onClick={onClose}>Cancel</button>
        <button className={btn.primary} onClick={connect} disabled={busy || token.trim().length < 20}>{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Connect</button>
      </>}>
      <ol className="space-y-3 mb-5">
        <Step n={1}>In the Instagram app: <b>Settings → Account type and tools → Switch to professional account</b> (Creator or Business, it's free).</Step>
        <Step n={2}>Link it to a <b>Facebook Page</b> you manage (Instagram → Settings → Accounts Center, or create a simple Page).</Step>
        <Step n={3}>At <a href="https://developers.facebook.com/apps" target="_blank" rel="noopener noreferrer" className="font-bold text-accent-500 underline">developers.facebook.com/apps</a> create an app (type "Business"). You stay the only user, no review needed for personal use.</Step>
        <Step n={4}>Open the <a href="https://developers.facebook.com/tools/explorer" target="_blank" rel="noopener noreferrer" className="font-bold text-accent-500 underline">Graph API Explorer</a>, pick your app, add the permissions <code className="text-xs bg-surface-sunken px-1 rounded">instagram_basic</code>, <code className="text-xs bg-surface-sunken px-1 rounded">instagram_manage_insights</code>, <code className="text-xs bg-surface-sunken px-1 rounded">pages_show_list</code>, <code className="text-xs bg-surface-sunken px-1 rounded">pages_read_engagement</code>, then <b>Generate Access Token</b> and paste it below.</Step>
      </ol>
      <textarea value={token} onChange={e => setToken(e.target.value)} rows={3} placeholder="EAAG…" aria-label="Access token" className="lifeos-input font-mono text-xs resize-none" />
      <p className="text-xs text-ink-muted mt-2">
        The token is stored only on your LifeOS server and never shown again. Explorer tokens last about an hour —
        add <code className="bg-surface-sunken px-1 rounded">META_APP_ID</code> and <code className="bg-surface-sunken px-1 rounded">META_APP_SECRET</code> to <code className="bg-surface-sunken px-1 rounded">server/.env</code> and LifeOS swaps it for a 60-day one automatically.
      </p>
    </Modal>
  );
}

function InstagramImport({ onImport }) {
  const { profile, saveProfile } = useBjjStore();
  const [status, setStatus] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [gym, setGym] = useState(profile?.gym_instagram || '');
  const [feed, setFeed] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => { api.get('/instagram/status').then(setStatus).catch(() => setStatus({ connected: false })); }, []);

  const fetchPosts = async (refresh = false) => {
    const username = gym.trim().replace(/^@/, '');
    if (!username) return;
    setLoading(true);
    setError(null);
    try {
      setFeed(await api.get(`/instagram/posts?username=${encodeURIComponent(username)}${refresh ? '&refresh=1' : ''}`));
      if (username !== profile?.gym_instagram) saveProfile({ ...profile, gym_instagram: username }).catch(() => {});
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const disconnect = async () => {
    if (!window.confirm('Disconnect Instagram? You can connect again any time.')) return;
    setStatus(await api.delete('/instagram/connect'));
    setFeed(null);
  };

  return (
    <section className="glass-card p-5">
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-paper" style={{ background: 'linear-gradient(135deg,#F9CE34,#EE2A7B,#6228D7)' }}>
          <Instagram className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-display text-xl font-semibold text-ink">Import from your gym</h3>
          <p className="text-xs text-ink-muted">
            {status?.connected
              ? <>Connected as <b>@{status.username}</b>{status.expires_at && ` · token valid until ${format(parseISO(status.expires_at), 'MMM d')}`}</>
              : 'Pull the timetable, curriculum or workouts straight from their posts'}
          </p>
        </div>
        <button className={btn.secondary} onClick={() => onImport(null)}><ClipboardPaste className="w-4 h-4" /> Paste text</button>
        {status?.connected
          ? <button className={btn.ghost} onClick={disconnect} aria-label="Disconnect Instagram"><Unplug className="w-4 h-4" /></button>
          : status && <button className={btn.primary} onClick={() => setConnecting(true)}><Instagram className="w-4 h-4" /> Connect</button>}
      </div>

      {status?.connected && (
        <form onSubmit={e => { e.preventDefault(); fetchPosts(); }} className="flex flex-wrap items-center gap-2 mb-4">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint font-bold">@</span>
            <input value={gym} onChange={e => setGym(e.target.value)} placeholder="gym_username" aria-label="Gym's Instagram username" className="lifeos-input pl-8 py-2" />
          </div>
          <button type="submit" className={btn.primary} disabled={!gym.trim() || loading}>{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Latest posts</button>
          {feed && <button type="button" className={btn.ghost} onClick={() => fetchPosts(true)} disabled={loading}>Refresh</button>}
        </form>
      )}

      {error && <p role="alert" className="text-sm font-semibold text-red-400 mb-3">{error}</p>}

      {feed && (
        feed.posts.length === 0 ? <p className="text-sm text-ink-muted">@{feed.account.username} has no posts yet.</p> : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
            {feed.posts.map(p => (
              <button key={p.id} onClick={() => onImport(p)} className="group text-left rounded-2xl overflow-hidden bg-surface-sunken hover:ring-2 hover:ring-accent-300 transition-shadow">
                <div className="aspect-square bg-surface-hover overflow-hidden">
                  {p.image_url
                    ? <img src={p.image_url} alt="" referrerPolicy="no-referrer" loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    : <div className="w-full h-full flex items-center justify-center text-3xl">📝</div>}
                </div>
                <div className="p-2">
                  <p className="text-[11px] font-bold text-ink-faint">{format(parseISO(p.timestamp), 'MMM d')}</p>
                  <p className="text-xs text-ink-soft line-clamp-2">{p.caption || 'No caption'}</p>
                </div>
              </button>
            ))}
          </div>
        )
      )}

      {!status?.connected && status && (
        <p className="text-xs text-ink-muted">
          Instagram only lets apps read posts through its official API, which needs a free one-time setup.
          No setup? Copy the post's caption and use <b>Paste text</b> — it works the same way.
          {' '}<a href="https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/business_discovery" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 font-bold text-accent-500">How it works <ExternalLink className="w-3 h-3" /></a>
        </p>
      )}

      {connecting && <ConnectModal onClose={() => setConnecting(false)} onConnected={(s) => setStatus({ ...s, connected: true })} />}
    </section>
  );
}

export default function GymView({ onAttend }) {
  const [importing, setImporting] = useState(null); // null | { post }
  return (
    <div className="space-y-6">
      <Timetable onAttend={onAttend} />
      <InstagramImport onImport={(post) => setImporting({ post })} />
      {importing && <ImportModal post={importing.post} onClose={() => setImporting(null)} />}
    </div>
  );
}
