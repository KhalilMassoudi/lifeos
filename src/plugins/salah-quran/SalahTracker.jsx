import React, { useState, useEffect } from 'react';
import { format, addDays, subDays, isToday } from 'date-fns';
import { useSalahStore, PRAYERS, PRAYER_STATUS, getDayScore } from './salahStore';

// ─── Icons ───────────────────────────────────────────────────────────────────
const ChevronLeft = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5"/></svg>;
const ChevronRight = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5"/></svg>;
const NoteIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"/></svg>;

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  ontime: { label: 'On Time', emoji: '✅', color: 'bg-emerald-50 text-emerald-400 border-emerald-100', activeColor: 'bg-emerald-100 text-emerald-200 border-emerald-500/60 shadow-emerald-500/20 shadow-md' },
  late:   { label: 'Late',    emoji: '🕐', color: 'bg-amber-50 text-amber-400 border-amber-100', activeColor: 'bg-amber-100 text-amber-200 border-amber-500/60 shadow-amber-500/20 shadow-md' },
  missed: { label: 'Missed',  emoji: '❌', color: 'bg-red-50 text-red-400 border-red-100',    activeColor: 'bg-red-100 text-red-200 border-red-500/50 shadow-red-500/15 shadow-md'  },
};

// ─── Score to color ───────────────────────────────────────────────────────────
const scoreColor = (score) => {
  if (score === 5) return '#8ED9B8';
  if (score >= 3) return '#F9D88B';
  if (score >= 1) return '#F7B7C2';
  return '#F1E6EA';
};

const scoreLabel = (score) => {
  if (score === 5) return 'All 5';
  if (score === 0) return 'None';
  return `${score}/5`;
};

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color = 'gold' }) {
  const colors = {
    gold: 'from-gold-400/10 to-gold-400/5 border-gold-400/15 text-gold-300',
    sage: 'from-sage-400/10 to-sage-400/5 border-sage-400/15 text-sage-300',
    blue: 'from-blue-400/10 to-blue-400/5 border-blue-400/15 text-blue-300',
  };
  return (
    <div className={`glass-card-sm p-4 bg-gradient-to-br ${colors[color]}`}>
      <div className={`text-2xl font-display font-bold ${colors[color].split(' ').pop()}`}>{value}</div>
      <div className="text-xs text-slate-400 mt-0.5">{label}</div>
      {sub && <div className="text-xs text-slate-600 mt-1">{sub}</div>}
    </div>
  );
}

// ─── Prayer Row ───────────────────────────────────────────────────────────────
function PrayerRow({ prayer, prayerEntry, onStatusChange, onNoteChange }) {
  const [showNote, setShowNote] = useState(false);
  const status = prayerEntry?.status || null;
  const note = prayerEntry?.note || '';

  return (
    <div className="glass-card-sm p-4 space-y-3 animate-fade-in">
      <div className="flex items-center justify-between gap-4">
        {/* Prayer name */}
        <div className="flex items-center gap-3 min-w-[120px]">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl" style={{ background: prayer.tint }} aria-hidden="true">
            {prayer.icon}
          </div>
          <div>
            <div className="text-sm font-extrabold text-slate-200">{prayer.name} <span className="font-arabic font-normal text-gold-400/70 ml-1">{prayer.arabic}</span></div>
            <div className="text-xs text-slate-500">{prayer.time}</div>
          </div>
        </div>

        {/* Status buttons */}
        <div className="flex items-center gap-2 flex-1 justify-center">
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
            const isActive = status === key;
            return (
              <button
                key={key}
                id={`prayer-${prayer.id}-${key}`}
                onClick={() => onStatusChange(isActive ? null : key)}
                className={`prayer-btn flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all
                  ${isActive ? cfg.activeColor : cfg.color + ' hover:opacity-80'}`}
              >
                <span>{cfg.emoji}</span>
                <span className="hidden sm:inline">{cfg.label}</span>
              </button>
            );
          })}
        </div>

        {/* Note toggle */}
        <button
          onClick={() => setShowNote(v => !v)}
          className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs border transition-all
            ${showNote || note
              ? 'bg-gold-400/10 text-gold-400 border-gold-400/20'
              : 'bg-transparent text-slate-600 border-transparent hover:text-slate-400'
            }`}
          title="Add note"
        >
          <NoteIcon />
          {note && <span className="w-1.5 h-1.5 rounded-full bg-gold-400 notification-dot" />}
        </button>
      </div>

      {/* Note input */}
      {showNote && (
        <div className="animate-fade-in">
          <input
            type="text"
            value={note}
            onChange={e => onNoteChange(e.target.value)}
            placeholder={`Note for ${prayer.name}… (e.g., "alhamdulillah", "was traveling")`}
            className="lifeos-input text-xs"
          />
        </div>
      )}
    </div>
  );
}

// ─── Weekly Strip ─────────────────────────────────────────────────────────────
function WeeklyStrip({ selectedDate }) {
  const { getWeeklyOverview } = useSalahStore();
  const overview = getWeeklyOverview();
  const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="flex gap-2 justify-between">
      {overview.map(({ date, score }) => {
        const isCurrent = format(date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
        return (
          <div key={format(date, 'yyyy-MM-dd')} className="flex flex-col items-center gap-1.5 flex-1">
            <span className="text-xs text-slate-600">{DAY_NAMES[date.getDay()]}</span>
            <div
              className={`streak-day w-8 h-8 rounded-lg flex items-center justify-center text-xs font-semibold transition-all
                ${isCurrent ? 'ring-2 ring-gold-400/60 ring-offset-1 ring-offset-navy-800' : ''}
              `}
              style={{ backgroundColor: scoreColor(score) }}
              title={`${score}/5 prayers`}
            >
              <span className="text-white/90 text-xs">{score}</span>
            </div>
            <span className="text-xs text-slate-600">{format(date, 'd')}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Monthly Calendar ─────────────────────────────────────────────────────────
function MonthlyCalendar({ year, month }) {
  const { getMonthlyCalendar } = useSalahStore();
  const days = getMonthlyCalendar(year, month);
  const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const firstDow = days[0].date.getDay();

  return (
    <div>
      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">
        {MONTH_NAMES[month - 1]} {year}
      </h3>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {['S','M','T','W','T','F','S'].map((d, i) => (
          <div key={i} className="text-center text-xs text-slate-600 font-medium pb-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: firstDow }).map((_, i) => <div key={`e-${i}`} />)}
        {days.map(({ date, score }) => (
          <div
            key={format(date, 'yyyy-MM-dd')}
            className="streak-day aspect-square rounded-md flex items-center justify-center text-xs"
            style={{ backgroundColor: scoreColor(score), opacity: score === 0 && format(date,'yyyy-MM-dd') > format(new Date(),'yyyy-MM-dd') ? 0.2 : 1 }}
            title={`${format(date, 'MMM d')}: ${scoreLabel(score)}`}
          >
            <span className="text-white/80 text-[10px] font-medium">{format(date, 'd')}</span>
          </div>
        ))}
      </div>
      {/* Legend */}
      <div className="flex items-center gap-4 mt-3">
        {[{ color: '#8ED9B8', label: 'All 5' }, { color: '#F9D88B', label: '3–4' }, { color: '#F7B7C2', label: '1–2' }, { color: '#F1E6EA', label: 'None' }].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
            <span className="text-xs text-slate-500">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main SalahTracker ────────────────────────────────────────────────────────
export default function SalahTracker() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const { getDayEntry, setPrayerStatus, setPrayerNote, getCurrentStreak, getBestStreak, getMonthlyStats, fetchData, isLoaded } = useSalahStore();
  
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

  const dayEntry = getDayEntry(selectedDate);
  const now = new Date();
  const stats = getMonthlyStats(now.getFullYear(), now.getMonth() + 1);

  const navigateDay = (dir) => {
    setSelectedDate(d => dir === 'prev' ? subDays(d, 1) : addDays(d, 1));
  };

  const todayStr = format(now, 'yyyy-MM-dd');
  const selectedStr = format(selectedDate, 'yyyy-MM-dd');
  const isFuture = selectedStr > todayStr;

  return (
    <div className="h-full overflow-y-auto px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl gold-text font-semibold">Daily Prayers</h2>
          <p className="text-slate-500 text-xs mt-0.5 font-arabic">الصلاة عماد الدين</p>
        </div>
        {/* Date navigator */}
        <div className="flex items-center gap-2">
          <button onClick={() => navigateDay('prev')} className="w-8 h-8 rounded-lg bg-navy-700 hover:bg-navy-600 flex items-center justify-center text-slate-400 hover:text-slate-200 transition-all">
            <ChevronLeft />
          </button>
          <div className="text-center min-w-[120px]">
            <div className="text-sm font-semibold text-slate-200">
              {isToday(selectedDate) ? 'Today' : format(selectedDate, 'EEEE')}
            </div>
            <div className="text-xs text-slate-500">{format(selectedDate, 'MMMM d, yyyy')}</div>
          </div>
          <button
            onClick={() => navigateDay('next')}
            disabled={isToday(selectedDate)}
            className="w-8 h-8 rounded-lg bg-navy-700 hover:bg-navy-600 flex items-center justify-center text-slate-400 hover:text-slate-200 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight />
          </button>
          {!isToday(selectedDate) && (
            <button onClick={() => setSelectedDate(new Date())} className="text-xs text-gold-400 hover:text-gold-300 underline underline-offset-2 ml-1">Today</button>
          )}
        </div>
      </div>

      {isFuture ? (
        <div className="glass-card p-8 text-center">
          <p className="text-slate-500 text-sm">You cannot log future prayers.</p>
        </div>
      ) : (
        /* Prayer rows */
        <div className="space-y-2">
          {PRAYERS.map(prayer => (
            <PrayerRow
              key={prayer.id}
              prayer={prayer}
              prayerEntry={dayEntry[prayer.id]}
              onStatusChange={(status) => setPrayerStatus(selectedDate, prayer.id, status)}
              onNoteChange={(note) => setPrayerNote(selectedDate, prayer.id, note)}
            />
          ))}
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Current Streak" value={`${getCurrentStreak()}d`} sub="consecutive days" color="gold" />
        <StatCard label="Best Streak" value={`${getBestStreak()}d`} sub="all time" color="sage" />
        <StatCard label="On Time This Month" value={stats.totalOnTime} sub={`${stats.totalLate} late · ${stats.totalMissed} missed`} color="blue" />
      </div>

      {/* Weekly overview */}
      <div className="glass-card p-5">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4">This Week</h3>
        <WeeklyStrip selectedDate={selectedDate} />
      </div>

      {/* Monthly calendar */}
      <div className="glass-card p-5">
        <MonthlyCalendar year={now.getFullYear()} month={now.getMonth() + 1} />
      </div>
    </div>
  );
}
