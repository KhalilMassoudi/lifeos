import React, { useEffect, useState } from 'react';
import { format, parseISO, formatDistanceToNowStrict } from 'date-fns';
import { Plus, Pencil, Trash2, Loader2, Check, Clock, Award } from 'lucide-react';
import Modal, { btn } from '../../../components/ui/Modal';
import { useBjjStore, BELTS, CLASS_TYPES } from './bjjStore';
import { FEELINGS } from '../workoutStore';
import SessionModal from './SessionModal';
import TechniqueLibrary from './TechniqueLibrary';
import GymView from './GymView';

function BeltBar({ belt, stripes, size = 'lg' }) {
  const b = BELTS[belt] || BELTS.white;
  const h = size === 'lg' ? 'h-7' : 'h-4';
  return (
    <div className={`flex ${h} rounded-md overflow-hidden shadow-soft ring-1 ring-black/10`} role="img" aria-label={`${b.label} belt, ${stripes} stripe${stripes !== 1 ? 's' : ''}`}>
      <div className="flex-1" style={{ background: b.color }} />
      <div className={`${size === 'lg' ? 'w-20' : 'w-12'} flex items-center justify-end gap-1 pr-1.5`} style={{ background: belt === 'black' ? '#C0392B' : '#1F1A1F' }}>
        {Array.from({ length: stripes }).map((_, i) => <span key={i} className={`${size === 'lg' ? 'w-1.5 h-5' : 'w-1 h-3'} bg-paper rounded-[1px]`} />)}
      </div>
      <div className={size === 'lg' ? 'w-3' : 'w-2'} style={{ background: b.color }} />
    </div>
  );
}

function BeltModal({ onClose }) {
  const { profile, saveProfile } = useBjjStore();
  const [belt, setBelt] = useState(profile.belt);
  const [stripes, setStripes] = useState(profile.stripes);
  const [promotedOn, setPromotedOn] = useState(profile.promoted_on || '');
  const [gymName, setGymName] = useState(profile.gym_name || '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try { await saveProfile({ ...profile, belt, stripes, promoted_on: promotedOn || null, gym_name: gymName }); onClose(); } catch { setSaving(false); }
  };

  return (
    <Modal title="Your belt" icon={<Award className="w-5 h-5" />} onClose={onClose}
      footer={<>
        <button className={btn.secondary} onClick={onClose}>Cancel</button>
        <button className={btn.primary} onClick={save} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Save</button>
      </>}>
      <div className="space-y-5">
        <BeltBar belt={belt} stripes={stripes} />
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Belt">
          {Object.entries(BELTS).map(([k, b]) => (
            <button key={k} type="button" role="radio" aria-checked={belt === k} onClick={() => setBelt(k)}
              className={`px-4 py-2 rounded-2xl text-sm font-extrabold ring-1 ring-black/10 transition-transform ${belt === k ? 'scale-110 shadow-lift' : 'opacity-70 hover:opacity-100'}`}
              style={{ background: b.color, color: b.ink }}>
              {b.label}
            </button>
          ))}
        </div>
        <div>
          <span className="block text-xs font-bold text-ink-soft mb-1.5">Stripes</span>
          <div className="flex gap-2" role="radiogroup" aria-label="Stripes">
            {[0, 1, 2, 3, 4].map(n => (
              <button key={n} type="button" role="radio" aria-checked={stripes === n} onClick={() => setStripes(n)}
                className={`w-11 h-11 rounded-2xl font-display text-lg font-semibold ${stripes === n ? 'bg-accent-400 text-paper shadow-glow' : 'bg-surface-sunken text-ink-soft'}`}>{n}</button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="block"><span className="block text-xs font-bold text-ink-soft mb-1.5">Promoted on</span>
            <input type="date" className="lifeos-input" value={promotedOn} max={format(new Date(), 'yyyy-MM-dd')} onChange={e => setPromotedOn(e.target.value)} /></label>
          <label className="block"><span className="block text-xs font-bold text-ink-soft mb-1.5">Gym</span>
            <input className="lifeos-input" value={gymName} maxLength={255} onChange={e => setGymName(e.target.value)} placeholder="Your academy" /></label>
        </div>
      </div>
    </Modal>
  );
}

function Stat({ label, value, sub }) {
  return (
    <div className="glass-card-sm p-4">
      <p className="text-xs font-bold text-ink-muted">{label}</p>
      <p className="font-display text-2xl font-semibold text-ink leading-tight">{value}</p>
      {sub && <p className="text-[11px] font-semibold text-ink-faint">{sub}</p>}
    </div>
  );
}

function Journal({ onEdit }) {
  const { sessions, techniques, deleteSession } = useBjjStore();
  const byId = Object.fromEntries(techniques.map(t => [t.id, t]));

  if (sessions.length === 0) {
    return (
      <div className="glass-card p-10 text-center">
        <div className="text-5xl mb-3">🥋</div>
        <p className="font-display text-2xl font-semibold text-ink">Your mat journal</p>
        <p className="text-ink-muted mt-1">Log each class — what you drilled, your rolls, what to work on. It also counts in your workouts.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sessions.map(s => {
        const type = CLASS_TYPES[s.class_type] || CLASS_TYPES.gi;
        const energy = FEELINGS.find(f => f.value === s.energy);
        return (
          <article key={s.id} className="group glass-card p-4 flex gap-4">
            <div className="w-14 flex-shrink-0 text-center">
              <div className="font-display text-2xl font-semibold text-ink leading-none">{format(parseISO(s.date), 'd')}</div>
              <div className="text-[10px] font-extrabold uppercase text-ink-faint">{format(parseISO(s.date), 'MMM')}</div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold text-ink" style={{ background: type.tint }}>{type.emoji} {type.label}</span>
                {s.duration_minutes > 0 && <span className="text-xs font-semibold text-ink-muted inline-flex items-center gap-1"><Clock className="w-3 h-3" /> {s.duration_minutes} min</span>}
                {s.rounds > 0 && <span className="text-xs font-semibold text-ink-muted">🤼 {s.rounds} rounds</span>}
                {(s.subs_hit > 0 || s.subs_caught > 0) && <span className="text-xs font-semibold text-ink-muted">✅ {s.subs_hit || 0} · 🫠 {s.subs_caught || 0}</span>}
                {energy && <span className="text-base" title={energy.label}>{energy.emoji}</span>}
                <div className="ml-auto flex gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                  <button onClick={() => onEdit(s)} className="p-1.5 rounded-full text-ink-muted hover:text-ink hover:bg-surface-sunken" aria-label="Edit session"><Pencil className="w-3.5 h-3.5" /></button>
                  <button onClick={() => { if (window.confirm('Delete this session? Its workout entry is removed too.')) deleteSession(s.id); }} className="p-1.5 rounded-full text-red-400 hover:bg-red-50" aria-label="Delete session"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
              {s.technique_ids.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {s.technique_ids.map(id => byId[id] && <span key={id} className="text-xs font-bold px-2.5 py-1 rounded-full bg-accent-50 text-accent-600">{byId[id].name}</span>)}
                </div>
              )}
              {s.notes && <p className="text-sm text-ink-soft whitespace-pre-wrap mt-2">{s.notes}</p>}
            </div>
          </article>
        );
      })}
    </div>
  );
}

export default function BjjView() {
  const { fetchData, isLoaded, profile, getStats, getNextClass, getDueForReview } = useBjjStore();
  const [tab, setTab] = useState('journal');
  const [sessionModal, setSessionModal] = useState(null); // null | { session } | { initial }
  const [editingBelt, setEditingBelt] = useState(false);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (!isLoaded || !profile) return <div className="h-full flex items-center justify-center"><Loader2 className="w-7 h-7 text-accent-400 animate-spin" /></div>;

  const stats = getStats();
  const next = getNextClass();
  const dueCount = getDueForReview().length;
  const belt = BELTS[profile.belt] || BELTS.white;
  const untilLabel = next && (next.minutesUntil < 60 ? `in ${next.minutesUntil} min`
    : next.minutesUntil < 1440 ? `in ${Math.round(next.minutesUntil / 60)} h` : `in ${Math.round(next.minutesUntil / 1440)} day${Math.round(next.minutesUntil / 1440) !== 1 ? 's' : ''}`);

  const tabs = [['journal', 'Journal'], ['techniques', 'Techniques'], ['gym', 'Gym']];

  return (
    <div className="h-full overflow-y-auto px-6 py-6">
      <div className="grid lg:grid-cols-[minmax(280px,1.2fr)_2fr_minmax(220px,1fr)] gap-4 mb-6">
        <button onClick={() => setEditingBelt(true)} className="glass-card p-5 text-left hover:shadow-lift transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-ink-faint">{profile.gym_name || 'Your belt'}</p>
            <Pencil className="w-3.5 h-3.5 text-ink-faint" />
          </div>
          <BeltBar belt={profile.belt} stripes={profile.stripes} />
          <p className="font-display text-xl font-semibold text-ink mt-3">
            {belt.label} belt{profile.stripes > 0 && ` · ${profile.stripes} stripe${profile.stripes !== 1 ? 's' : ''}`}
          </p>
          <p className="text-xs font-semibold text-ink-muted">
            {profile.promoted_on
              ? `Promoted ${formatDistanceToNowStrict(parseISO(profile.promoted_on), { addSuffix: true })} · ${stats.hoursSincePromotion} h on the mat since`
              : 'Tap to set your belt and promotion date'}
          </p>
        </button>

        <div className="grid grid-cols-3 gap-3">
          <Stat label="This month" value={stats.monthSessions} sub={`session${stats.monthSessions !== 1 ? 's' : ''} · ${stats.monthRounds} rounds`} />
          <Stat label="Mat time" value={<>{stats.totalHours}<span className="text-base text-ink-muted"> h</span></>} sub="all time" />
          <Stat label="Submissions" value={<>{stats.subsHit}<span className="text-base text-ink-muted"> / {stats.subsCaught}</span></>} sub="hit / tapped" />
        </div>

        <div className="glass-card p-5 flex flex-col">
          <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-ink-faint mb-2">Next class</p>
          {next ? (
            <>
              <p className="font-display text-xl font-semibold text-ink">{(CLASS_TYPES[next.class_type] || CLASS_TYPES.gi).emoji} {next.title}</p>
              <p className="text-sm font-bold text-accent-500">{untilLabel} · {next.start_time}</p>
            </>
          ) : (
            <p className="text-sm text-ink-muted">Add your gym's timetable in the Gym tab.</p>
          )}
          <button className={`${btn.primary} mt-auto pt-2.5`} onClick={() => setSessionModal({})}><Plus className="w-4 h-4" /> Log session</button>
        </div>
      </div>

      <nav className="flex gap-1 p-1 rounded-2xl bg-surface-sunken w-fit mb-5" role="tablist" aria-label="BJJ sections">
        {tabs.map(([id, label]) => (
          <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-extrabold transition-all ${tab === id ? 'bg-surface text-ink shadow-soft' : 'text-ink-muted hover:text-ink'}`}>
            {label}
            {id === 'techniques' && dueCount > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-200">{dueCount}</span>}
          </button>
        ))}
      </nav>

      {tab === 'journal' && <Journal onEdit={(session) => setSessionModal({ session })} />}
      {tab === 'techniques' && <TechniqueLibrary />}
      {tab === 'gym' && <GymView onAttend={(initial) => setSessionModal({ initial })} />}

      {sessionModal && <SessionModal session={sessionModal.session} initial={sessionModal.initial} onClose={() => setSessionModal(null)} />}
      {editingBelt && <BeltModal onClose={() => setEditingBelt(false)} />}
    </div>
  );
}
