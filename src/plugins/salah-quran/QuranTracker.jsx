import React, { useState, useRef, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { useQuranStore, SESSION_TYPES, AYAH_STATUS } from './quranStore';
import { SURAHS } from './data/surahs';

// ─── Icons ─────────────────────────────────────────────────────────────────────
const PlusIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15"/></svg>;
const XIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>;
const TrashIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"/></svg>;
const BellIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"/></svg>;

// ─── Star Rating ───────────────────────────────────────────────────────────────
function StarRating({ value, onChange }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1,2,3,4,5].map(star => (
        <button
          key={star}
          type="button"
          className={`star-btn text-xl transition-all ${(hover || value) >= star ? 'text-gold-400' : 'text-navy-600'}`}
          onClick={() => onChange(star)}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
        >★</button>
      ))}
    </div>
  );
}

// ─── Timer ────────────────────────────────────────────────────────────────────
function SessionTimer({ onComplete }) {
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [running]);

  const format = (s) => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;

  return (
    <div className="flex items-center gap-3">
      <div className="font-mono text-lg font-semibold text-gold-400">{format(elapsed)}</div>
      <button
        type="button"
        onClick={() => setRunning(v => !v)}
        className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${running ? 'bg-red-500/15 text-red-400 border-red-500/25' : 'bg-sage-400/15 text-sage-300 border-sage-400/25'}`}
      >
        {running ? '⏸ Pause' : elapsed > 0 ? '▶ Resume' : '▶ Start'}
      </button>
      {elapsed > 0 && (
        <button
          type="button"
          onClick={() => { setRunning(false); onComplete(Math.floor(elapsed / 60)); setElapsed(0); }}
          className="px-3 py-1 rounded-lg text-xs font-semibold border bg-gold-400/15 text-gold-300 border-gold-400/25"
        >
          ✓ Use {format(elapsed)}
        </button>
      )}
    </div>
  );
}

// ─── Log Session Modal ────────────────────────────────────────────────────────
function LogSessionModal({ onClose }) {
  const { addSession } = useQuranStore();
  const [form, setForm] = useState({
    surahNumber: 1,
    fromAyah: 1,
    toAyah: 1,
    duration: '',
    sessionType: 'tilawah',
    difficulty: 3,
    notes: '',
  });

  const selectedSurah = SURAHS.find(s => s.number === parseInt(form.surahNumber)) || SURAHS[0];

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.duration || parseInt(form.duration) < 1) return;
    addSession({
      surahNumber: parseInt(form.surahNumber),
      surahName: selectedSurah.name,
      surahArabic: selectedSurah.arabic,
      fromAyah: parseInt(form.fromAyah),
      toAyah: parseInt(form.toAyah),
      duration: parseInt(form.duration),
      sessionType: form.sessionType,
      difficulty: form.difficulty,
      notes: form.notes,
    });
    onClose();
  };

  return (
    <div className="modal-backdrop fixed inset-0 bg-black/25 backdrop-blur-[3px] flex items-center justify-center z-50 p-4">
      <div className="modal-content glass-card w-full max-w-lg p-6 space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display text-gold-400 font-semibold text-lg">Log Reading Session</h3>
            <p className="text-slate-500 text-xs mt-0.5">سَجِّل جلسة قرآنية</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-navy-700 flex items-center justify-center text-slate-400 hover:text-slate-200"><XIcon /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Surah selector */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Surah</label>
            <select className="lifeos-input" value={form.surahNumber} onChange={e => { setField('surahNumber', e.target.value); setField('fromAyah', 1); setField('toAyah', 1); }}>
              {SURAHS.map(s => (
                <option key={s.number} value={s.number}>
                  {s.number}. {s.name} ({s.arabic}) — {s.ayahs} ayahs
                </option>
              ))}
            </select>
          </div>

          {/* Ayah range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">From Ayah</label>
              <input type="number" min="1" max={selectedSurah.ayahs} value={form.fromAyah}
                onChange={e => setField('fromAyah', Math.min(parseInt(e.target.value)||1, selectedSurah.ayahs))}
                className="lifeos-input" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">To Ayah</label>
              <input type="number" min={form.fromAyah} max={selectedSurah.ayahs} value={form.toAyah}
                onChange={e => setField('toAyah', Math.max(Math.min(parseInt(e.target.value)||1, selectedSurah.ayahs), parseInt(form.fromAyah)))}
                className="lifeos-input" />
            </div>
          </div>

          {/* Session type */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Session Type</label>
            <div className="grid grid-cols-3 gap-2">
              {SESSION_TYPES.map(type => (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => setField('sessionType', type.id)}
                  className={`p-3 rounded-xl border text-center transition-all ${form.sessionType === type.id ? 'bg-gold-400/15 border-gold-400/35 text-gold-300' : 'border-white/10 text-slate-500 hover:border-white/15'}`}
                >
                  <div className="text-xl">{type.icon}</div>
                  <div className="text-xs font-medium mt-1">{type.label}</div>
                  <div className="text-xs text-slate-600 mt-0.5">{type.arabic}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Time Spent (minutes)</label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="1"
                max="480"
                value={form.duration}
                onChange={e => setField('duration', e.target.value)}
                placeholder="e.g. 20"
                className="lifeos-input flex-1"
              />
              <span className="text-slate-500 text-sm">or use timer:</span>
            </div>
            <div className="mt-2">
              <SessionTimer onComplete={(mins) => setField('duration', mins)} />
            </div>
          </div>

          {/* Difficulty */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Focus / Difficulty</label>
            <StarRating value={form.difficulty} onChange={v => setField('difficulty', v)} />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Notes (optional)</label>
            <textarea
              value={form.notes}
              onChange={e => setField('notes', e.target.value)}
              placeholder='e.g. "struggled with ayah 12", "felt very focused today"…'
              rows={2}
              className="lifeos-input resize-none"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={!form.duration || parseInt(form.duration) < 1}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-gold-400 to-gold-300 text-navy-900 font-semibold text-sm transition-all hover:from-gold-300 hover:to-gold-200 disabled:opacity-40 shadow-lg shadow-gold-400/20"
          >
            ✦ Save Session
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Session Log ──────────────────────────────────────────────────────────────
function SessionLog() {
  const { sessions, deleteSession } = useQuranStore();
  const grouped = sessions.reduce((g, s) => { (g[s.date] = g[s.date] || []).push(s); return g; }, {});
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  const typeMap = SESSION_TYPES.reduce((m, t) => { m[t.id] = t; return m; }, {});

  if (sessions.length === 0) {
    return (
      <div className="text-center py-12 text-slate-600">
        <div className="text-4xl mb-3">📖</div>
        <p className="text-sm">No sessions yet. Log your first reading!</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {sortedDates.map(date => (
        <div key={date}>
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2 px-1">
            {format(parseISO(date), 'EEEE, MMMM d, yyyy')}
          </div>
          <div className="space-y-2">
            {grouped[date].map(session => {
              const type = typeMap[session.sessionType] || SESSION_TYPES[0];
              return (
                <div key={session.id} className="glass-card-sm p-4 flex items-start gap-4 animate-fade-in">
                  <div className="text-2xl">{type.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-slate-200">{session.surahName}</span>
                      <span className="font-arabic text-gold-400/60 text-sm">{session.surahArabic}</span>
                      <span className="text-xs text-slate-500">Ayah {session.fromAyah}–{session.toAyah}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <span className="text-xs bg-navy-700 text-slate-400 px-2 py-0.5 rounded-full">{type.label}</span>
                      <span className="text-xs text-slate-500">⏱ {session.duration} min</span>
                      <span className="text-xs text-gold-400/70">{'★'.repeat(session.difficulty)}{'☆'.repeat(5 - session.difficulty)}</span>
                    </div>
                    {session.notes && (
                      <p className="text-xs text-slate-500 mt-1.5 italic">"{session.notes}"</p>
                    )}
                  </div>
                  <button
                    onClick={() => deleteSession(session.id)}
                    className="text-slate-700 hover:text-red-400 transition-colors flex-shrink-0 mt-0.5"
                  >
                    <TrashIcon />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Memorization Map ─────────────────────────────────────────────────────────
function MemorizationMap() {
  const { currentSurahNumber, setCurrentSurah, currentAyah, setCurrentAyah, toggleAyahStatus, getAyahStatus, getSurahProgress, getTotalMemorized, getCompletedSurahs } = useQuranStore();
  const surah = SURAHS.find(s => s.number === (currentSurahNumber || 1)) || SURAHS[0];
  const progress = getSurahProgress(surah.number, surah.ayahs);
  const totalMemorized = getTotalMemorized();
  const completedSurahs = getCompletedSurahs(SURAHS);

  const COLORS = {
    [AYAH_STATUS.MEMORIZED]: '#8ED9B8',
    [AYAH_STATUS.IN_PROGRESS]: '#F9D88B',
    [AYAH_STATUS.NOT_STARTED]: '#F1E6EA',
  };

  return (
    <div className="space-y-6">
      {/* Surah selector */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Currently Memorizing</label>
            <select
              className="lifeos-input"
              value={currentSurahNumber || 1}
              onChange={e => setCurrentSurah(parseInt(e.target.value))}
            >
              {SURAHS.map(s => (
                <option key={s.number} value={s.number}>
                  {s.number}. {s.name} ({s.arabic}) — {s.ayahs} ayahs
                </option>
              ))}
            </select>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-500 mb-1">Current Ayah</div>
            <input
              type="number"
              min="1"
              max={surah.ayahs}
              value={currentAyah}
              onChange={e => setCurrentAyah(Math.min(Math.max(1, parseInt(e.target.value)||1), surah.ayahs))}
              className="lifeos-input w-20 text-center"
            />
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="flex justify-between text-xs text-slate-400 mb-1.5">
            <span>{surah.arabic} — {surah.name}</span>
            <span>{progress.memorized} / {surah.ayahs} memorized ({progress.percentage}%)</span>
          </div>
          <div className="h-2 bg-navy-700 rounded-full overflow-hidden">
            <div className="progress-bar-fill h-full rounded-full" style={{ width: `${progress.percentage}%` }} />
          </div>
          {progress.inProgress > 0 && (
            <p className="text-xs text-gold-400/60 mt-1">{progress.inProgress} ayahs in progress</p>
          )}
        </div>
      </div>

      {/* Ayah grid */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Ayah Map — {surah.name}</h3>
          <div className="flex items-center gap-3 text-xs">
            {[
              { status: AYAH_STATUS.MEMORIZED, label: 'Memorized', color: COLORS[AYAH_STATUS.MEMORIZED] },
              { status: AYAH_STATUS.IN_PROGRESS, label: 'In Progress', color: COLORS[AYAH_STATUS.IN_PROGRESS] },
              { status: AYAH_STATUS.NOT_STARTED, label: 'Not Started', color: COLORS[AYAH_STATUS.NOT_STARTED] },
            ].map(({ label, color }) => (
              <div key={label} className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
                <span className="text-slate-500">{label}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="text-xs text-slate-600 mb-3">Click any block to cycle: Not Started → In Progress → Memorized</p>
        <div className="flex flex-wrap gap-1.5">
          {Array.from({ length: surah.ayahs }, (_, i) => i + 1).map(ayah => {
            const status = getAyahStatus(surah.number, ayah);
            const isCurrent = ayah === currentAyah;
            return (
              <button
                key={ayah}
                onClick={() => toggleAyahStatus(surah.number, ayah)}
                className={`ayah-block w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-medium text-white/80
                  ${isCurrent ? 'ring-2 ring-gold-400 ring-offset-1 ring-offset-navy-800' : ''}`}
                style={{ backgroundColor: COLORS[status] }}
                title={`Ayah ${ayah} — ${status.replace('_', ' ')}`}
              >
                {ayah}
              </button>
            );
          })}
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="glass-card-sm p-4">
          <div className="text-2xl font-display font-bold text-gold-300">{totalMemorized}</div>
          <div className="text-xs text-slate-400 mt-0.5">Total Ayahs Memorized</div>
        </div>
        <div className="glass-card-sm p-4">
          <div className="text-2xl font-display font-bold text-sage-300">{completedSurahs.length}</div>
          <div className="text-xs text-slate-400 mt-0.5">Surahs Completed</div>
          {completedSurahs.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {completedSurahs.map(s => (
                <span key={s.number} className="text-xs bg-sage-400/15 text-sage-300 border border-sage-400/20 px-1.5 py-0.5 rounded-full">
                  {s.name}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Heatmap ──────────────────────────────────────────────────────────────────
function QuranHeatmap() {
  const { getHeatmapData, getTimeStats } = useQuranStore();
  const data = getHeatmapData(84); // 12 weeks
  const stats = getTimeStats();
  const DAYS = ['M','T','W','T','F','S','S'];

  const maxMinutes = Math.max(...data.map(d => d.minutes), 1);
  const getColor = (minutes) => {
    if (minutes === 0) return '#F1E6EA';
    const intensity = Math.min(minutes / maxMinutes, 1);
    // pale mint (#DDF5E9) → deep mint (#3FA37C)
    const r = Math.round(221 + (63 - 221) * intensity);
    const g = Math.round(245 + (163 - 245) * intensity);
    const b = Math.round(233 + (124 - 233) * intensity);
    return `rgb(${r},${g},${b})`;
  };

  // Group into weeks of 7
  const weeks = [];
  for (let i = 0; i < data.length; i += 7) weeks.push(data.slice(i, i + 7));

  return (
    <div className="space-y-5">
      {/* Time stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="glass-card-sm p-4">
          <div className="text-xl font-bold text-gold-300">{stats.weekTotal}<span className="text-sm font-normal text-slate-500 ml-1">min</span></div>
          <div className="text-xs text-slate-400 mt-0.5">This Week</div>
        </div>
        <div className="glass-card-sm p-4">
          <div className="text-xl font-bold text-gold-300">{stats.monthTotal}<span className="text-sm font-normal text-slate-500 ml-1">min</span></div>
          <div className="text-xs text-slate-400 mt-0.5">This Month</div>
        </div>
        <div className="glass-card-sm p-4">
          <div className="text-xl font-bold text-sage-300">{stats.avgSession}<span className="text-sm font-normal text-slate-500 ml-1">min</span></div>
          <div className="text-xs text-slate-400 mt-0.5">Avg Session</div>
        </div>
        <div className="glass-card-sm p-4">
          <div className="text-xl font-bold text-slate-300">{stats.bestDay || '—'}</div>
          <div className="text-xs text-slate-400 mt-0.5">Most Productive Day</div>
        </div>
      </div>

      {/* Heatmap */}
      <div className="glass-card p-5">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4">Activity — Last 12 Weeks</h3>
        <div className="flex gap-1 overflow-x-auto pb-1">
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-1">
              {week.map((day, di) => (
                <div
                  key={day.key}
                  className="heatmap-cell w-4 h-4 rounded-sm cursor-default"
                  style={{ backgroundColor: getColor(day.minutes) }}
                  title={`${format(day.date, 'MMM d')}: ${day.minutes} min`}
                />
              ))}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-3 mt-3">
          <span className="text-xs text-slate-600">Less</span>
          {[0, 15, 30, 60, 90].map(m => (
            <div key={m} className="w-3.5 h-3.5 rounded-sm" style={{ backgroundColor: getColor(m) }} />
          ))}
          <span className="text-xs text-slate-600">More</span>
        </div>
      </div>
    </div>
  );
}

// ─── Reminder Settings ────────────────────────────────────────────────────────
function ReminderSettings() {
  const { reminderEnabled, reminderTime, reminderMessage, setReminder } = useQuranStore();
  const [enabled, setEnabled] = useState(reminderEnabled);
  const [time, setTime] = useState(reminderTime);
  const [message, setMessage] = useState(reminderMessage);
  const [permissionStatus, setPermissionStatus] = useState(Notification?.permission || 'default');

  const requestPermission = async () => {
    const perm = await Notification.requestPermission();
    setPermissionStatus(perm);
  };

  const save = () => {
    setReminder(enabled, time, message);
  };

  return (
    <div className="glass-card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <BellIcon />
        <h3 className="text-sm font-semibold text-slate-200">Daily Reminder</h3>
      </div>

      {permissionStatus !== 'granted' && (
        <div className="p-3 rounded-xl bg-gold-400/10 border border-gold-400/15 flex items-center justify-between gap-3">
          <span className="text-xs text-slate-400">Enable browser notifications to receive Quran reminders.</span>
          <button onClick={requestPermission} className="text-xs bg-gold-400/20 text-gold-300 border border-gold-400/25 px-3 py-1.5 rounded-lg hover:bg-gold-400/30 transition-all flex-shrink-0">
            Allow
          </button>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={() => setEnabled(v => !v)}
          className={`w-11 h-6 rounded-full transition-all relative ${enabled ? 'bg-gold-400' : 'bg-navy-600'}`}
        >
          <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${enabled ? 'left-6' : 'left-1'}`} />
        </button>
        <span className="text-sm text-slate-300">{enabled ? 'Reminder on' : 'Reminder off'}</span>
      </div>

      {enabled && (
        <>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Time</label>
            <input type="time" value={time} onChange={e => setTime(e.target.value)} className="lifeos-input" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Message</label>
            <input type="text" value={message} onChange={e => setMessage(e.target.value)} className="lifeos-input" />
          </div>
        </>
      )}

      <button onClick={save} className="px-4 py-2 rounded-lg bg-gold-400/15 text-gold-300 border border-gold-400/25 text-xs font-semibold hover:bg-gold-400/25 transition-all">
        Save Settings
      </button>
    </div>
  );
}

// ─── Main QuranTracker ────────────────────────────────────────────────────────
export default function QuranTracker() {
  const [tab, setTab] = useState('log');
  const [showModal, setShowModal] = useState(false);
  const { fetchData, isLoaded } = useQuranStore();

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (!isLoaded) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-gold-400/30 border-t-gold-400 animate-spin" />
      </div>
    );
  }

  const TABS = [
    { id: 'log',   label: 'Reading Log',       icon: '📖' },
    { id: 'map',   label: 'Memorization Map',   icon: '🗺' },
    { id: 'stats', label: 'Stats & Heatmap',    icon: '📊' },
  ];

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Sub-tabs */}
      <div className="flex items-center gap-1 px-6 pt-4 pb-0 border-b border-white/5">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium rounded-t-lg transition-all border-b-2 -mb-px
              ${tab === t.id
                ? 'text-gold-400 border-gold-400 bg-gold-400/5'
                : 'text-slate-500 border-transparent hover:text-slate-300'
              }`}
          >
            <span>{t.icon}</span>
            {t.label}
          </button>
        ))}

        {/* Log button */}
        {tab === 'log' && (
          <button
            id="log-quran-session"
            onClick={() => setShowModal(true)}
            className="ml-auto flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-gold-400 to-gold-300 text-navy-900 font-semibold text-xs shadow-lg shadow-gold-400/20 hover:shadow-gold-400/30 transition-all active:scale-[0.98] mb-1"
          >
            <PlusIcon />
            Log Session
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {tab === 'log' && <SessionLog />}
        {tab === 'map' && <MemorizationMap />}
        {tab === 'stats' && (
          <div className="space-y-5">
            <QuranHeatmap />
            <ReminderSettings />
          </div>
        )}
      </div>

      {showModal && <LogSessionModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
