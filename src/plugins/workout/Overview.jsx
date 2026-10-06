import React, { useMemo, useState } from 'react';
import { format, parseISO, startOfWeek, isSameWeek } from 'date-fns';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Plus, Pencil, Trash2, Clock, Flame, Trophy, Target, Bookmark, Dumbbell } from 'lucide-react';
import { useWorkoutStore, WORKOUT_TYPES, FEELINGS, sessionVolume } from './workoutStore';
import { useAuthStore } from '../../store/authStore';
import { btn } from '../../components/ui/Modal';

const goalKey = (userId) => `lifeos_workout_goal_${userId}`;
const readGoal = (userId) => {
  const n = parseInt(localStorage.getItem(goalKey(userId)) || '3', 10);
  return n >= 1 && n <= 14 ? n : 3;
};

function StatCard({ icon, label, value, sub, tint, children }) {
  return (
    <div className="glass-card p-4 flex items-center gap-3.5">
      <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: tint }}>{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold text-ink-muted">{label}</p>
        <p className="font-display text-2xl font-semibold text-ink leading-tight">{value}</p>
        {sub && <p className="text-[11px] text-ink-faint font-semibold">{sub}</p>}
        {children}
      </div>
    </div>
  );
}

function exerciseSummary(e) {
  const n = (v) => (v === null || v === undefined ? null : Number(v));
  if (n(e.distance_km) || n(e.duration_minutes)) {
    return [n(e.duration_minutes) && `${n(e.duration_minutes)} min`, n(e.distance_km) && `${n(e.distance_km)} km`].filter(Boolean).join(' · ');
  }
  const scheme = n(e.reps) ? `${n(e.sets) || 1}×${n(e.reps)}` : n(e.sets) > 1 ? `${n(e.sets)} sets` : '';
  return [scheme, n(e.weight) && `${n(e.weight)} kg`].filter(Boolean).join(' @ ');
}

function SessionCard({ session, onEdit }) {
  const { deleteSession } = useWorkoutStore();
  const t = WORKOUT_TYPES[session.type] || WORKOUT_TYPES.other;
  const feeling = FEELINGS.find(f => f.value === session.feeling);
  const volume = sessionVolume(session);

  return (
    <article className="group glass-card p-4 flex gap-4">
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0" style={{ background: t.tint }}>{t.emoji}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2">
          <div className="min-w-0">
            <h3 className="font-extrabold text-ink truncate">{session.title || `${t.label} session`}</h3>
            <p className="text-xs text-ink-muted font-semibold flex flex-wrap gap-x-2.5">
              <span>{format(parseISO(session.date), 'EEE, MMM d')}</span>
              {session.sport && <span>{session.sport.emoji} {session.sport.name}</span>}
              {session.duration_minutes > 0 && <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" />{session.duration_minutes} min</span>}
              {volume > 0 && <span>{Math.round(volume).toLocaleString()} kg lifted</span>}
            </p>
          </div>
          {feeling && <span className="ml-auto text-xl" title={feeling.label} aria-label={`Felt ${feeling.label}`}>{feeling.emoji}</span>}
          <div className={`flex gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity ${feeling ? '' : 'ml-auto'}`}>
            <button onClick={() => onEdit(session)} className="p-1.5 rounded-full text-ink-muted hover:text-ink hover:bg-surface-sunken" aria-label="Edit workout">
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => { if (window.confirm('Delete this workout?')) deleteSession(session.id); }}
              className="p-1.5 rounded-full text-red-400 hover:bg-red-50"
              aria-label="Delete workout"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {session.exercises.length > 0 && (
          <ul className="flex flex-wrap gap-1.5 mt-2.5">
            {session.exercises.map(e => (
              <li key={e.id} className="text-xs font-semibold px-2.5 py-1 rounded-full bg-surface-sunken text-ink-soft">
                <span className="font-extrabold text-ink">{e.name}</span>
                {exerciseSummary(e) && <span className="text-ink-muted"> · {exerciseSummary(e)}</span>}
              </li>
            ))}
          </ul>
        )}
        {session.notes && <p className="text-xs text-ink-muted italic mt-2">"{session.notes}"</p>}
      </div>
    </article>
  );
}

// The dashboard tab: stats, history, chart, records and templates
export default function Overview({ onLog, onEdit }) {
  const { sessions, templates, deleteTemplate, getStats, getWeeklyChart, getPersonalRecords } = useWorkoutStore();
  const { currentUser } = useAuthStore();
  const [goal, setGoal] = useState(() => readGoal(currentUser.id));
  const [editingGoal, setEditingGoal] = useState(false);

  const changeGoal = (value) => {
    const n = Math.min(Math.max(parseInt(value, 10) || 1, 1), 14);
    setGoal(n);
    try { localStorage.setItem(goalKey(currentUser.id), String(n)); } catch { /* storage unavailable */ }
  };

  const stats = getStats(goal);
  const chart = getWeeklyChart(8);
  const records = getPersonalRecords(6);

  const weeks = useMemo(() => {
    const groups = [];
    for (const s of sessions) {
      const start = startOfWeek(parseISO(s.date), { weekStartsOn: 1 });
      const last = groups[groups.length - 1];
      if (last && isSameWeek(last.start, start, { weekStartsOn: 1 })) last.list.push(s);
      else groups.push({ start, list: [s] });
    }
    return groups;
  }, [sessions]);

  const goalPct = Math.min(stats.thisWeek / goal, 1);

  return (
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {/* Stats */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          <StatCard
            icon={<Target className="w-5 h-5 text-accent-500" />}
            tint="rgb(var(--accent-50))"
            label="This week"
            value={<>{stats.thisWeek}<span className="text-base text-ink-muted"> / {goal}</span></>}
          >
            <div className="h-1.5 rounded-full bg-surface-sunken mt-1.5 overflow-hidden">
              <div className="progress-bar-fill h-full rounded-full" style={{ width: `${goalPct * 100}%` }} />
            </div>
            {editingGoal ? (
              <label className="flex items-center gap-1.5 mt-1 text-[11px] font-semibold text-ink-muted">
                Goal
                <input
                  type="number" min="1" max="14" autoFocus value={goal}
                  onChange={e => changeGoal(e.target.value)}
                  onBlur={() => setEditingGoal(false)}
                  onKeyDown={e => e.key === 'Enter' && setEditingGoal(false)}
                  className="w-12 bg-surface-sunken rounded-lg px-1.5 py-0.5 text-ink font-bold focus:outline-none"
                /> per week
              </label>
            ) : (
              <button onClick={() => setEditingGoal(true)} className="text-[11px] font-bold text-ink-faint hover:text-accent-500 mt-1">
                {stats.thisWeek >= goal ? 'Goal reached! 🎉 · change goal' : 'Change weekly goal'}
              </button>
            )}
          </StatCard>
          <StatCard icon={<Clock className="w-5 h-5 text-sky-400" />} tint="#E1EFFC" label="This month" value={<>{stats.monthMinutes}<span className="text-base text-ink-muted"> min</span></>} />
          <StatCard icon={<Dumbbell className="w-5 h-5 text-emerald-400" />} tint="#DDF5E9" label="Workouts logged" value={stats.total} />
          <StatCard
            icon={<Flame className="w-5 h-5 text-orange-400" />}
            tint="#FFEBDD"
            label="Week streak"
            value={<>{stats.streak}<span className="text-base text-ink-muted"> {stats.streak === 1 ? 'week' : 'weeks'}</span></>}
            sub={`weeks hitting ${goal}+ workouts`}
          />
        </div>

        <div className="grid lg:grid-cols-[1fr_340px] gap-6 items-start">
          {/* History */}
          <section>
            {sessions.length === 0 ? (
              <div className="glass-card p-10 text-center">
                <div className="text-5xl mb-3">🏃‍♀️</div>
                <p className="font-display text-2xl font-semibold text-ink">No workouts yet</p>
                <p className="text-ink-muted mt-1 mb-5">Log your first one — a walk counts too!</p>
                <button className={btn.primary} onClick={onLog}><Plus className="w-4 h-4" /> Log workout</button>
              </div>
            ) : weeks.map(({ start, list }) => (
              <div key={start.toISOString()} className="mb-6">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-ink-faint mb-2.5 px-1">
                  {isSameWeek(start, new Date(), { weekStartsOn: 1 }) ? 'This week' : `Week of ${format(start, 'MMM d')}`}
                  <span className="normal-case tracking-normal font-bold"> · {list.length} workout{list.length !== 1 ? 's' : ''}</span>
                </p>
                <div className="space-y-3">
                  {list.map(s => <SessionCard key={s.id} session={s} onEdit={onEdit} />)}
                </div>
              </div>
            ))}
          </section>

          {/* Side panel */}
          <aside className="space-y-5">
            <div className="glass-card p-5">
              <h2 className="font-display text-lg font-semibold text-ink mb-3">Minutes per week</h2>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chart} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#7F6F81' }} axisLine={false} tickLine={false} interval={1} />
                    <Tooltip
                      cursor={{ fill: 'rgba(61,44,63,0.05)' }}
                      contentStyle={{ borderRadius: 14, border: 'none', boxShadow: '0 8px 24px -8px rgba(43,29,44,0.25)', fontFamily: 'Nunito', fontWeight: 700 }}
                      formatter={(value, _name, item) => [`${value} min · ${item.payload.workouts} workout${item.payload.workouts !== 1 ? 's' : ''}`, '']}
                      separator=""
                    />
                    <Bar dataKey="minutes" radius={[8, 8, 8, 8]}>
                      {chart.map((d, i) => (
                        <Cell key={d.label} fill={i === chart.length - 1 ? 'rgb(var(--accent-400))' : 'rgb(var(--accent-200))'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="glass-card p-5">
              <h2 className="font-display text-lg font-semibold text-ink mb-3 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-400" /> Personal records
              </h2>
              {records.length === 0 ? (
                <p className="text-sm text-ink-muted">Log a weight on an exercise to start tracking records.</p>
              ) : (
                <ol className="space-y-2">
                  {records.map((r, i) => (
                    <li key={r.name} className="flex items-center gap-3">
                      <span className="w-6 text-center text-sm">{['🥇', '🥈', '🥉'][i] || '•'}</span>
                      <span className="flex-1 min-w-0 text-sm font-bold text-ink truncate">{r.name}</span>
                      <span className="text-sm font-extrabold text-ink">{r.weight} kg</span>
                      <span className="text-[11px] text-ink-faint font-semibold w-12 text-right">{format(parseISO(r.date), 'MMM d')}</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>

            <div className="glass-card p-5">
              <h2 className="font-display text-lg font-semibold text-ink mb-3 flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-accent-400" /> Templates
              </h2>
              {templates.length === 0 ? (
                <p className="text-sm text-ink-muted">Tick "Save as template" when logging to reuse a routine.</p>
              ) : (
                <ul className="space-y-2">
                  {templates.map(t => {
                    const type = WORKOUT_TYPES[t.type] || WORKOUT_TYPES.other;
                    return (
                      <li key={t.id} className="group flex items-center gap-3">
                        <span className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: type.tint }}>{type.emoji}</span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-sm font-bold text-ink truncate">{t.name}</span>
                          <span className="block text-[11px] text-ink-faint font-semibold">{t.exercises.length} exercise{t.exercises.length !== 1 ? 's' : ''}</span>
                        </span>
                        <button
                          onClick={() => { if (window.confirm(`Delete the "${t.name}" template?`)) deleteTemplate(t.id); }}
                          className="p-1.5 rounded-full text-red-400 hover:bg-red-50 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                          aria-label={`Delete template ${t.name}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </aside>
        </div>
      </div>

  );
}
