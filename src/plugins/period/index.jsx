import React, { useState, useEffect } from 'react';
import { usePeriodStore } from './periodStore';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  getDay, 
  isSameDay, 
  isToday,
  isFuture,
  parseISO,
  addDays,
  differenceInCalendarDays
} from 'date-fns';
import { 
  ChevronLeft, 
  ChevronRight, 
  X, 
  Heart, 
  Settings as SettingsIcon, 
  Calendar as CalendarIcon, 
  BarChart2, 
  Activity, 
  Info,
  Save,
  Moon,
  Clock,
  Sparkles
} from 'lucide-react';

const SYMPTOMS = [
  'Cramps', 'Headache', 'Bloating', 'Back pain', 'Fatigue', 
  'Nausea', 'Breast tenderness', 'Acne', 'Food cravings', 'Mood swings'
];

const MOODS = [
  { emoji: '😊', label: 'Happy' },
  { emoji: '😐', label: 'Neutral' },
  { emoji: '😢', label: 'Sad' },
  { emoji: '😠', label: 'Angry' },
  { emoji: '😴', label: 'Tired' },
  { emoji: '🤩', label: 'Excited' }
];

const INTENSITIES = [
  { id: 'spotting', label: 'Spotting', color: 'bg-rose-300 border-rose-300/40 text-rose-950' },
  { id: 'light', label: 'Light', color: 'bg-rose-400 border-rose-400/40 text-rose-950' },
  { id: 'medium', label: 'Medium', color: 'bg-rose-500 border-rose-500/40 text-white' },
  { id: 'heavy', label: 'Heavy', color: 'bg-rose-700 border-rose-700/40 text-white' }
];

const PHASES = {
  Menstrual: { color: 'from-rose-600 to-pink-500 text-white', label: 'Menstrual Phase' },
  Follicular: { color: 'from-emerald-500 to-teal-400 text-white', label: 'Follicular Phase' },
  Ovulatory: { color: 'from-fuchsia-600 to-purple-500 text-white', label: 'Ovulatory Phase' },
  Luteal: { color: 'from-amber-600 to-orange-500 text-white', label: 'Luteal Phase' }
};

export default function PeriodTrackerPlugin() {
  const { 
    logs, 
    cycles, 
    settings, 
    stats, 
    isLoaded, 
    currentMonth, 
    setCurrentMonth, 
    fetchData, 
    saveLog, 
    updateSettings 
  } = usePeriodStore();

  const [activeTab, setActiveTab] = useState('calendar'); // 'calendar', 'history', 'settings'
  const [selectedDate, setSelectedDate] = useState(null); // Date object
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [expandedCycleId, setExpandedCycleId] = useState(null);

  // Form states for slide-in panel
  const [isPeriodDay, setIsPeriodDay] = useState(false);
  const [isPeriodStart, setIsPeriodStart] = useState(false);
  const [isPeriodEnd, setIsPeriodEnd] = useState(false);
  const [flowIntensity, setFlowIntensity] = useState(null);
  const [selectedMoods, setSelectedMoods] = useState([]);
  const [selectedSymptoms, setSelectedSymptoms] = useState([]);
  const [energyLevel, setEnergyLevel] = useState(3);
  const [notes, setNotes] = useState('');

  // Settings form states
  const [cycleLengthVal, setCycleLengthVal] = useState(settings.average_cycle_length);
  const [periodDurationVal, setPeriodDurationVal] = useState(settings.average_period_duration);
  const [reminderTimeVal, setReminderTimeVal] = useState(settings.reminder_time);
  const [showFertileVal, setShowFertileVal] = useState(settings.show_fertile_window);

  useEffect(() => {
    fetchData(currentMonth);
  }, [fetchData, currentMonth]);

  useEffect(() => {
    setCycleLengthVal(settings.average_cycle_length);
    setPeriodDurationVal(settings.average_period_duration);
    setReminderTimeVal(settings.reminder_time);
    setShowFertileVal(settings.show_fertile_window);
  }, [settings]);

  if (!isLoaded) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-rose-500/30 border-t-rose-500 animate-spin" />
      </div>
    );
  }

  // Calendar calculations
  const monthDate = parseISO(`${currentMonth}-01`);
  const startMonth = startOfMonth(monthDate);
  const endMonth = endOfMonth(monthDate);
  const daysInMonth = eachDayOfInterval({ start: startMonth, end: endMonth });

  // Padded days at start of month (Monday start vs Sunday start)
  const startDayOfWeek = getDay(startMonth);
  const pads = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1; // Assuming Monday start

  const handleMonthChange = (direction) => {
    const newMonthDate = direction === 'next' ? addMonths(monthDate, 1) : subMonths(monthDate, 1);
    setCurrentMonth(format(newMonthDate, 'yyyy-MM'));
  };

  // Check category for dot indicators
  const getDayStatus = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    
    // Logged period day
    if (logs[dateStr]?.is_period_day) {
      return { type: 'logged-period', color: 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.45)]' };
    }

    if (!stats || !cycles.length) {
      return { type: 'neutral', color: 'bg-transparent' };
    }

    const today = new Date();
    today.setHours(0,0,0,0);
    const lastCycle = cycles[0];
    const lastStart = parseISO(lastCycle.start_date);
    
    const avgLen = stats.averageCycleLength || 28;
    const avgDur = stats.averagePeriodDuration || 5;
    
    const diffDays = differenceInCalendarDays(date, lastStart);
    const cycleIndex = Math.floor(diffDays / avgLen);
    const cycleStart = addDays(lastStart, cycleIndex * avgLen);

    // Calculate day in projected cycle
    const projCycleDay = differenceInCalendarDays(date, cycleStart) + 1;
    
    // 2. Future Predicted Period days
    if (projCycleDay >= 1 && projCycleDay <= avgDur) {
      if (date < today) return { type: 'neutral', color: 'bg-transparent' };
      return { type: 'predicted-period', color: 'bg-sky-400/80 shadow-[0_0_8px_rgba(56,189,248,0.6)] animate-pulse' };
    }
    
    // 3. Fertile Window / Ovulation
    if (settings.show_fertile_window && projCycleDay >= 12 && projCycleDay <= 16) {
      return { type: 'fertile', color: 'bg-fuchsia-400 shadow-[0_0_8px_rgba(232,121,249,0.6)]' };
    }
    
    // 4. PMS Prediction zone
    if (projCycleDay >= (avgLen - 4) && projCycleDay < avgLen) {
      if (date < today) return { type: 'neutral', color: 'bg-transparent' };
      return { type: 'pms', color: 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]' };
    }

    return { type: 'neutral', color: 'bg-transparent' };
  };

  const handleDayClick = (date) => {
    setSelectedDate(date);
    const dateStr = format(date, 'yyyy-MM-dd');
    const existingLog = logs[dateStr];

    if (existingLog) {
      setIsPeriodDay(existingLog.is_period_day);
      setIsPeriodStart(existingLog.is_period_start || false);
      setIsPeriodEnd(existingLog.is_period_end || false);
      setFlowIntensity(existingLog.flow_intensity);
      setSelectedMoods(existingLog.moods || []);
      setSelectedSymptoms(existingLog.symptoms || []);
      setEnergyLevel(existingLog.energy_level || 3);
      setNotes(existingLog.notes || '');
    } else {
      setIsPeriodDay(false);
      setIsPeriodStart(false);
      setIsPeriodEnd(false);
      setFlowIntensity(null);
      setSelectedMoods([]);
      setSelectedSymptoms([]);
      setEnergyLevel(3);
      setNotes('');
    }

    setIsPanelOpen(true);
  };

  const handleSaveDay = async () => {
    if (!selectedDate) return;
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    
    await saveLog({
      log_date: dateStr,
      is_period_day: isPeriodDay,
      is_period_start: isPeriodStart,
      is_period_end: isPeriodEnd,
      flow_intensity: flowIntensity,
      moods: selectedMoods,
      symptoms: selectedSymptoms,
      energy_level: energyLevel,
      notes
    });

    setIsPanelOpen(false);
  };

  const handleMoodToggle = (mood) => {
    if (selectedMoods.includes(mood)) {
      setSelectedMoods(selectedMoods.filter(m => m !== mood));
    } else {
      setSelectedMoods([...selectedMoods, mood]);
    }
  };

  const handleSymptomToggle = (symptom) => {
    if (selectedSymptoms.includes(symptom)) {
      setSelectedSymptoms(selectedSymptoms.filter(s => s !== symptom));
    } else {
      setSelectedSymptoms([...selectedSymptoms, symptom]);
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    await updateSettings({
      average_cycle_length: parseInt(cycleLengthVal, 10),
      average_period_duration: parseInt(periodDurationVal, 10),
      reminder_time: reminderTimeVal,
      show_fertile_window: showFertileVal
    });
  };

  // Helper to fetch day logs for cycle breakdown
  const getCycleDaysLogs = (cycle) => {
    const cycleLogs = [];
    const start = parseISO(cycle.start_date);
    const end = cycle.cycle_length 
      ? addDays(start, cycle.cycle_length)
      : new Date();

    const dates = eachDayOfInterval({ start, end });
    
    dates.forEach(d => {
      const key = format(d, 'yyyy-MM-dd');
      if (logs[key]) {
        cycleLogs.push({ dateStr: key, ...logs[key] });
      }
    });

    return cycleLogs;
  };

  const phaseBadgeClass = stats?.currentPhase ? PHASES[stats.currentPhase]?.color : 'from-slate-700 to-slate-600';
  const phaseLabel = stats?.currentPhase ? PHASES[stats.currentPhase]?.label : 'Unknown Phase';

  return (
    <div className="h-full flex flex-col overflow-hidden bg-navy-950">
      
      {/* Header */}
      <div className="flex-shrink-0 px-6 pt-5 pb-0 border-b border-white/5 bg-navy-900 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="font-display text-2xl text-transparent bg-clip-text bg-gradient-to-r from-rose-400 via-pink-400 to-purple-400 font-semibold leading-tight flex items-center gap-2">
              <span>🌸</span> Cycle & Period Tracker
            </h1>
            <p className="text-slate-500 text-xs mt-1">
              Your private monthly calendar, fertility windows, and symptoms diary
            </p>
          </div>

          {/* Tab selector */}
          <div className="flex gap-1 bg-navy-950 p-1 rounded-xl border border-white/5">
            <button
              onClick={() => setActiveTab('calendar')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'calendar' ? 'bg-rose-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5" /> Calendar
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'history' ? 'bg-rose-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" /> History
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'settings' ? 'bg-rose-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <SettingsIcon className="w-3.5 h-3.5" /> Settings
            </button>
          </div>
        </div>
      </div>

      {/* Main View Container */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6 relative">
        
        {activeTab === 'calendar' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left/Middle: Calendar centerpiece */}
            <div className="lg:col-span-2 flex flex-col bg-navy-900 border border-white/5 rounded-2xl p-5 shadow-lg">
              
              {/* Calendar Month Header */}
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-display font-medium text-lg text-slate-100 flex items-center gap-2">
                  {format(monthDate, 'MMMM yyyy')}
                </h3>
                
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => handleMonthChange('prev')}
                    className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 border border-white/5 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleMonthChange('next')}
                    className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 border border-white/5 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Grid Header: Days of Week */}
              <div className="grid grid-cols-7 gap-1 text-center mb-2">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
                  <span key={d} className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold py-1">
                    {d}
                  </span>
                ))}
              </div>

              {/* Calendar Grid Cells */}
              <div className="grid grid-cols-7 gap-1.5 flex-1 min-h-[300px]">
                {/* Empty cells for offset */}
                {Array.from({ length: pads }).map((_, idx) => (
                  <div key={`pad-${idx}`} className="bg-transparent" />
                ))}

                {/* Actual day cells */}
                {daysInMonth.map(day => {
                  const status = getDayStatus(day);
                  const isCurrent = isToday(day);
                  const isSelected = selectedDate && isSameDay(day, selectedDate);
                  
                  return (
                    <button
                      key={day.toString()}
                      onClick={() => handleDayClick(day)}
                      className={`relative aspect-square rounded-xl border flex flex-col items-center justify-center group transition-all duration-150 hover:bg-white/5
                        ${isCurrent ? 'border-rose-500/50 bg-rose-500/5' : 'border-transparent'}
                        ${isSelected ? 'bg-rose-500/10 border-rose-500' : ''}
                      `}
                    >
                      <span className={`text-sm font-semibold 
                        ${isCurrent ? 'text-rose-400 font-bold' : 'text-slate-300'}
                      `}>
                        {format(day, 'd')}
                      </span>

                      {/* Colored Dot Indicator */}
                      <span className={`absolute bottom-2 w-1.5 h-1.5 rounded-full ${status.color}`} />
                    </button>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex flex-wrap gap-4 mt-6 pt-4 border-t border-white/5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider justify-center">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_5px_rgba(244,63,94,0.35)]" />
                  <span>Period Day</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
                  <span>Predicted Period</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-fuchsia-400 shadow-[0_0_5px_rgba(232,121,249,0.4)]" />
                  <span>Fertile window</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span>PMS Prediction</span>
                </div>
              </div>
            </div>

            {/* Right: Stats & Insights Panel */}
            <div className="flex flex-col gap-6">
              
              {/* Prediction & Phase Card */}
              <div className="bg-navy-900 border border-white/5 rounded-2xl p-5 shadow-lg flex flex-col justify-between relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full blur-2xl" />
                
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Active Cycle Day</span>
                    {stats?.currentPhase && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full bg-gradient-to-r ${phaseBadgeClass}`}>
                        {phaseLabel}
                      </span>
                    )}
                  </div>
                  <h2 className="text-3xl font-extrabold text-slate-100 font-display mt-2">
                    {stats?.currentCycleDay ? `Day ${stats.currentCycleDay}` : 'No logs yet'}
                  </h2>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    {stats?.currentPhaseDesc}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-white/5 space-y-3">
                  {stats?.nextPeriodStart && (
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500">Next expected period:</span>
                      <span className="font-semibold text-sky-400">{format(parseISO(stats.nextPeriodStart), 'MMM d, yyyy')}</span>
                    </div>
                  )}
                  {settings.show_fertile_window && stats?.fertileWindow?.start && (
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500">Estimated fertile window:</span>
                      <span className="font-semibold text-fuchsia-400">
                        {format(parseISO(stats.fertileWindow.start), 'MMM d')} - {format(parseISO(stats.fertileWindow.end), 'MMM d')}
                      </span>
                    </div>
                  )}
                  {stats?.ovulationDate && (
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500">Predicted ovulation:</span>
                      <span className="font-semibold text-purple-400">{format(parseISO(stats.ovulationDate), 'MMM d')}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Insights and Mood Patterns */}
              <div className="bg-navy-900 border border-white/5 rounded-2xl p-5 shadow-lg space-y-4">
                <h3 className="font-display font-medium text-sm text-slate-300 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-rose-400" /> Cycle Insights
                </h3>

                <div className="space-y-3">
                  {/* Mood insight */}
                  {stats?.dominantMoods && Object.values(stats.dominantMoods).some(m => m !== null) ? (
                    Object.entries(stats.dominantMoods).map(([phase, mood]) => {
                      if (!mood) return null;
                      return (
                        <div key={phase} className="p-3 bg-white/5 border border-white/5 rounded-xl text-xs flex items-center gap-3">
                          <span className="text-2xl">{mood}</span>
                          <div>
                            <span className="text-slate-500 block">Dominant Mood in {phase}</span>
                            <span className="text-slate-300 font-medium">You tend to feel more {MOODS.find(m => m.emoji === mood)?.label || 'sensitive'} during this phase.</span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-3 bg-white/5 border border-white/5 rounded-xl text-xs flex items-center gap-3 text-slate-500">
                      <Info className="w-4 h-4 text-rose-400" />
                      <span>Log your mood emojis daily in the calendar to generate personal emotional insights.</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
                  <div className="bg-white/5 border border-white/5 p-3 rounded-xl text-center">
                    <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">Avg Cycle</span>
                    <span className="text-lg font-bold text-rose-400 mt-1 block">
                      {stats?.averageCycleLength || 28} days
                    </span>
                  </div>
                  <div className="bg-white/5 border border-white/5 p-3 rounded-xl text-center">
                    <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">Avg Duration</span>
                    <span className="text-lg font-bold text-rose-400 mt-1 block">
                      {stats?.averagePeriodDuration || 5} days
                    </span>
                  </div>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="max-w-3xl mx-auto space-y-6">
            <h3 className="font-display font-medium text-lg text-slate-200">Cycle History Logs</h3>

            <div className="space-y-4">
              {cycles.length === 0 ? (
                <div className="text-center bg-navy-900 border border-white/5 rounded-2xl p-10 text-slate-500">
                  <Heart className="w-8 h-8 mx-auto text-rose-400/30 mb-3" />
                  <p>No cycles logged yet. Start marking days as period days to generate cycle entries.</p>
                </div>
              ) : (
                cycles.map(cycle => {
                  const isExpanded = expandedCycleId === cycle.id;
                  const cycleDays = getCycleDaysLogs(cycle);
                  
                  return (
                    <div 
                      key={cycle.id}
                      className="bg-navy-900 border border-white/5 rounded-2xl overflow-hidden shadow-md"
                    >
                      {/* Cycle Row Main */}
                      <div 
                        onClick={() => setExpandedCycleId(isExpanded ? null : cycle.id)}
                        className="p-5 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-all"
                      >
                        <div className="space-y-1">
                          <span className="text-xs text-slate-500 font-semibold uppercase">
                            Cycle Started {format(parseISO(cycle.start_date), 'MMMM d, yyyy')}
                          </span>
                          <div className="text-sm font-semibold text-slate-200">
                            {cycle.end_date 
                              ? `Bleeding: ${format(parseISO(cycle.start_date), 'MMM d')} - ${format(parseISO(cycle.end_date), 'MMM d')}`
                              : `Started: ${format(parseISO(cycle.start_date), 'MMM d')} (Active)`
                            }
                          </div>
                        </div>

                        <div className="flex items-center gap-6 text-right">
                          <div>
                            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">Duration</span>
                            <span className="text-sm font-bold text-rose-400">{cycle.period_duration} days</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">Cycle Length</span>
                            <span className="text-sm font-bold text-purple-400">
                              {cycle.cycle_length ? `${cycle.cycle_length} days` : 'Ongoing'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Expanded Day breakdown and Custom Flow Chart */}
                      {isExpanded && (
                        <div className="px-5 pb-5 pt-3 border-t border-white/5 bg-navy-950/40 space-y-4">
                          <h4 className="text-xs uppercase tracking-wider text-slate-500 font-bold">Cycle Daily Flow Breakdown</h4>
                          
                          {/* Custom HTML Bar Chart */}
                          {cycleDays.length > 0 ? (
                            <div className="space-y-4">
                              <div className="h-16 flex items-end gap-1.5 bg-navy-950 p-2 rounded-xl border border-white/5">
                                {cycleDays.map((cd, index) => {
                                  let heightClass = 'h-0';
                                  if (cd.flow_intensity === 'spotting') heightClass = 'h-1/4';
                                  else if (cd.flow_intensity === 'light') heightClass = 'h-2/4';
                                  else if (cd.flow_intensity === 'medium') heightClass = 'h-3/4';
                                  else if (cd.flow_intensity === 'heavy') heightClass = 'h-full';

                                  return (
                                    <div key={cd.id} className="flex-1 flex flex-col justify-end items-center h-full group relative">
                                      {/* Bar */}
                                      <div className={`w-full rounded-t-sm transition-all duration-300 bg-rose-600 ${heightClass}`} />
                                      {/* Tooltip */}
                                      <div className="absolute bottom-full mb-1 bg-navy-900 border border-white/10 text-[9px] px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                                        Day {index + 1}: {cd.flow_intensity}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>

                              {/* Daily Detailed list */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {cycleDays.map((cd, index) => (
                                  <div key={cd.id} className="bg-navy-900/60 p-3 rounded-xl border border-white/5 text-xs flex justify-between items-start gap-4">
                                    <div>
                                      <span className="font-semibold text-slate-300">Day {index + 1} ({format(new Date(cd.dateStr || cd.log_date), 'MMM d')})</span>
                                      <div className="text-slate-500 mt-1 flex flex-wrap gap-1">
                                        {cd.symptoms && cd.symptoms.map(s => (
                                          <span key={s} className="px-1 bg-white/5 text-[9px] rounded text-slate-400">{s}</span>
                                        ))}
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <span className="text-rose-400 capitalize font-medium">{cd.flow_intensity || 'None'}</span>
                                      <div className="flex gap-0.5 justify-end mt-1">
                                        {cd.moods && cd.moods.map(m => <span key={m}>{m}</span>)}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <p className="text-xs text-slate-600 italic">No daily symptoms logged for this cycle.</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="max-w-lg mx-auto bg-navy-900 border border-white/5 rounded-2xl p-6 shadow-lg space-y-6">
            <h3 className="font-display font-medium text-lg text-slate-200">Cycle Settings</h3>

            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Default Cycle Length (days)</label>
                <input 
                  type="number"
                  required
                  min="20"
                  max="45"
                  value={cycleLengthVal}
                  onChange={e => setCycleLengthVal(e.target.value)}
                  className="w-full bg-navy-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-rose-500/50"
                  placeholder="e.g. 28"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">Used for predictions before enough historical data is recorded.</span>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Default Period Duration (days)</label>
                <input 
                  type="number"
                  required
                  min="1"
                  max="15"
                  value={periodDurationVal}
                  onChange={e => setPeriodDurationVal(e.target.value)}
                  className="w-full bg-navy-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-rose-500/50"
                  placeholder="e.g. 5"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Daily Log Reminder Time</label>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-500" />
                  <input 
                    type="time"
                    required
                    value={reminderTimeVal}
                    onChange={e => setReminderTimeVal(e.target.value)}
                    className="flex-1 bg-navy-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-rose-500/50"
                  />
                </div>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input 
                    type="checkbox"
                    checked={showFertileVal}
                    onChange={e => setShowFertileVal(e.target.checked)}
                    className="w-4 h-4 rounded border-white/10 text-rose-600 focus:ring-rose-500/50 bg-navy-950"
                  />
                  <div className="text-xs">
                    <span className="font-semibold text-slate-300 block group-hover:text-slate-200">Show fertile window predictions</span>
                    <span className="text-slate-500">Estimates the 5 highly fertile days on the calendar.</span>
                  </div>
                </label>
              </div>

              <div className="pt-4 border-t border-white/5">
                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-sm font-semibold transition-colors shadow"
                >
                  <Save className="w-4 h-4" /> Save Settings
                </button>
              </div>
            </form>
          </div>
        )}

      </div>

      {/* Slide-in Day Detail Panel (slide from right) */}
      {isPanelOpen && selectedDate && (
        <div 
          className="fixed inset-0 z-50 flex justify-end bg-navy-950/60 backdrop-blur-xs animate-fade-in"
          onClick={() => setIsPanelOpen(false)}
        >
          {/* Panel content */}
          <div 
            className="w-full max-w-md bg-navy-900 border-l border-white/10 h-full flex flex-col shadow-2xl relative animate-slide-left overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            {/* Panel Header */}
            <div className="p-4 border-b border-white/5 flex items-center justify-between bg-navy-800 flex-shrink-0">
              <div>
                <h3 className="font-display font-semibold text-slate-200 text-sm">
                  {format(selectedDate, 'EEEE')}
                </h3>
                <span className="text-xs text-rose-400 font-semibold">
                  {format(selectedDate, 'MMMM d, yyyy')}
                </span>
              </div>
              <button 
                onClick={() => setIsPanelOpen(false)} 
                className="p-1.5 text-slate-500 hover:text-slate-300 rounded-lg hover:bg-white/5 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Panel Body Form */}
            <div className="flex-1 p-5 space-y-6">
              
              {/* Period Day Switch */}
              <div className="space-y-4">
                <label className="flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-xl cursor-pointer hover:border-white/10 transition-colors">
                  <div>
                    <span className="text-xs font-bold text-slate-300 block">Period Bleeding Day</span>
                    <span className="text-[10px] text-slate-500">Toggle if you are experiencing period flow.</span>
                  </div>
                  <input 
                    type="checkbox"
                    checked={isPeriodDay}
                    onChange={e => {
                      setIsPeriodDay(e.target.checked);
                      if (!e.target.checked) {
                        setIsPeriodStart(false);
                        setIsPeriodEnd(false);
                        setFlowIntensity(null);
                      }
                    }}
                    className="w-5 h-5 rounded-md border-white/10 text-rose-600 focus:ring-rose-500/50 bg-navy-950"
                  />
                </label>

                {isPeriodDay && (
                  <div className="grid grid-cols-2 gap-3 p-3 bg-navy-950 border border-white/5 rounded-xl">
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-400">
                      <input 
                        type="checkbox"
                        checked={isPeriodStart}
                        onChange={e => {
                          setIsPeriodStart(e.target.checked);
                          if (e.target.checked) setIsPeriodEnd(false);
                        }}
                        className="w-4 h-4 rounded border-white/10 text-rose-600 focus:ring-rose-500/50 bg-navy-950"
                      />
                      <span>Period Start Day</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-400">
                      <input 
                        type="checkbox"
                        checked={isPeriodEnd}
                        onChange={e => {
                          setIsPeriodEnd(e.target.checked);
                          if (e.target.checked) setIsPeriodStart(false);
                        }}
                        className="w-4 h-4 rounded border-white/10 text-rose-600 focus:ring-rose-500/50 bg-navy-950"
                      />
                      <span>Period End Day</span>
                    </label>
                  </div>
                )}
              </div>

              {/* Flow Intensity (if Period Day) */}
              {isPeriodDay && (
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Flow Intensity</label>
                  <div className="flex gap-2">
                    {INTENSITIES.map(intensity => (
                      <button
                        key={intensity.id}
                        onClick={() => setFlowIntensity(intensity.id)}
                        className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${
                          flowIntensity === intensity.id 
                            ? intensity.color
                            : 'border-white/5 bg-white/5 text-slate-400 hover:bg-white/5'
                        }`}
                      >
                        {intensity.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Mood Grid Selector */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Daily Moods</label>
                <div className="grid grid-cols-6 gap-2">
                  {MOODS.map(m => {
                    const isSelected = selectedMoods.includes(m.emoji);
                    return (
                      <button
                        key={m.emoji}
                        onClick={() => handleMoodToggle(m.emoji)}
                        title={m.label}
                        className={`p-2 rounded-xl text-2xl flex items-center justify-center transition-all ${
                          isSelected 
                            ? 'bg-rose-500/10 border border-rose-500/30 scale-105' 
                            : 'bg-white/5 border border-white/5 opacity-50 hover:opacity-100'
                        }`}
                      >
                        {m.emoji}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Energy Level Slider */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <span>Energy Level</span>
                  <span className="text-slate-300 font-bold">Level {energyLevel}/5</span>
                </div>
                
                <div className="flex items-center gap-3 bg-white/5 border border-white/5 p-3 rounded-xl">
                  <span className="text-xl">🪫</span>
                  <input 
                    type="range"
                    min="1"
                    max="5"
                    value={energyLevel}
                    onChange={e => setEnergyLevel(parseInt(e.target.value, 10))}
                    className="flex-1 accent-rose-600 bg-navy-950 h-1.5 rounded-lg appearance-none cursor-pointer"
                  />
                  <span className="text-xl">⚡</span>
                </div>
              </div>

              {/* Symptom Selector (multi-select grid) */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Symptoms</label>
                <div className="flex flex-wrap gap-2">
                  {SYMPTOMS.map(s => {
                    const isSelected = selectedSymptoms.includes(s);
                    return (
                      <button
                        key={s}
                        onClick={() => handleSymptomToggle(s)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                          isSelected 
                            ? 'bg-rose-600/10 border-rose-600/30 text-rose-300' 
                            : 'border-white/5 bg-white/5 text-slate-400 hover:border-white/10 hover:text-slate-300'
                        }`}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Personal Notes</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Notes, symptoms notes, spotting comments..."
                  className="w-full bg-navy-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-300 placeholder-slate-700 focus:outline-none focus:border-rose-500/50 h-20 resize-none"
                />
              </div>

              {/* Save Button */}
              <div className="pt-2">
                <button
                  onClick={handleSaveDay}
                  className="w-full py-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 shadow"
                >
                  <Save className="w-4 h-4" /> Save Logs
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
