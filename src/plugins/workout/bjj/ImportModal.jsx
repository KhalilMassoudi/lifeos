import React, { useEffect, useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Download, Loader2, ExternalLink, CalendarDays, BookOpen, Dumbbell, Wand2 } from 'lucide-react';
import Modal, { btn } from '../../../components/ui/Modal';
import { useToastStore } from '../../../store/toastStore';
import { useBjjStore, CLASS_TYPES, POSITIONS, CATEGORIES } from './bjjStore';
import { useWorkoutStore } from '../workoutStore';
import { parseGymPost } from './parseGymPost';

const WEEKDAYS = [[1, 'Mon'], [2, 'Tue'], [3, 'Wed'], [4, 'Thu'], [5, 'Fri'], [6, 'Sat'], [0, 'Sun']];
const cellCls = 'bg-surface rounded-xl px-2 py-1.5 text-sm font-bold text-ink focus:outline-none focus:ring-2 focus:ring-accent-200';

let seq = 0;
const withKeys = (list, extra = () => ({})) => list.map(item => ({ key: `i${++seq}`, include: true, ...item, ...extra(item) }));

function Section({ icon, title, count, children }) {
  return (
    <section className="rounded-3xl border-2 border-line/60 p-4">
      <h3 className="flex items-center gap-2 font-display text-lg font-semibold text-ink mb-3">
        {icon} {title} <span className="text-sm font-body font-bold text-ink-faint">({count})</span>
      </h3>
      {children}
    </section>
  );
}

// `post`: an Instagram post { caption, image_url, permalink, timestamp }; without it, paste text
export default function ImportModal({ post, onClose }) {
  const { classes: existingClasses, techniques: library, importClasses, importTechniques } = useBjjStore();
  const { sports, saveProgram } = useWorkoutStore();
  const [text, setText] = useState(post?.caption || '');
  const [parsedFrom, setParsedFrom] = useState(null);
  const [classes, setClasses] = useState([]);
  const [techniques, setTechniques] = useState([]);
  const [exercises, setExercises] = useState([]);
  const [replace, setReplace] = useState(true);
  const [programName, setProgramName] = useState('');
  const [importing, setImporting] = useState(false);

  const known = useMemo(() => new Set(library.map(t => t.name.toLowerCase())), [library]);
  const hasImportedClasses = existingClasses.some(c => c.source !== 'manual');
  const sourceDate = post?.timestamp ? format(parseISO(post.timestamp), 'MMM d') : format(new Date(), 'MMM d');

  const parse = (value) => {
    const result = parseGymPost(value);
    setClasses(withKeys(result.classes));
    setTechniques(withKeys(result.techniques, t => ({ include: !known.has(t.name.toLowerCase()) })));
    setExercises(withKeys(result.exercises));
    setProgramName(`Gym conditioning — ${result.label || sourceDate}`);
    setParsedFrom({ label: result.label, kind: result.kind });
  };

  // Instagram posts parse straight away; pasted text parses on demand
  useEffect(() => { if (post) parse(post.caption || ''); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const update = (setter) => (key, patch) => setter(list => list.map(x => (x.key === key ? { ...x, ...patch } : x)));
  const updateClass = update(setClasses);
  const updateTechnique = update(setTechniques);
  const updateExercise = update(setExercises);

  const chosen = {
    classes: classes.filter(c => c.include),
    techniques: techniques.filter(t => t.include && t.name.trim()),
    exercises: exercises.filter(e => e.include && e.name.trim()),
  };
  const total = chosen.classes.length + chosen.techniques.length + chosen.exercises.length;

  const doImport = async () => {
    setImporting(true);
    const done = [];
    const source = post ? 'instagram' : 'text';
    try {
      if (chosen.classes.length) {
        await importClasses(chosen.classes.map(({ key, include, ...c }) => c), { replace: replace && hasImportedClasses, source });
        done.push(`${chosen.classes.length} class${chosen.classes.length !== 1 ? 'es' : ''}`);
      }
      if (chosen.techniques.length) {
        const label = parsedFrom?.label || `Gym post ${sourceDate}`;
        const { created } = await importTechniques(chosen.techniques.map(t => ({
          name: t.name.trim(), position: t.position, category: t.category, status: 'to_learn', source: 'gym', source_label: label,
          notes: post?.permalink ? `From the gym's post: ${post.permalink}` : null,
        })));
        done.push(`${created} technique${created !== 1 ? 's' : ''}`);
      }
      if (chosen.exercises.length) {
        const bjjSport = sports.find(s => s.kind === 'bjj');
        await saveProgram({
          name: programName.trim() || `Gym conditioning — ${sourceDate}`,
          sport_id: bjjSport?.id || null,
          description: post?.permalink ? `Imported from ${post.permalink}` : 'Imported from pasted text',
          source: post ? 'instagram' : 'text',
          source_url: post?.permalink || null,
          days: [{ label: 'Conditioning', type: 'strength', exercises: chosen.exercises.map(({ key, include, ...e }) => e) }],
        });
        done.push('1 program');
      }
      useToastStore.getState().addToast(`Imported ${done.join(', ')} 🥋`, 'success');
      onClose();
    } catch {
      setImporting(false); // the api already showed what went wrong
    }
  };

  return (
    <Modal
      size="xl"
      title={post ? 'Import from Instagram' : 'Import from text'}
      subtitle="Check what was found, fix anything, then import"
      icon={<Download className="w-5 h-5" />}
      onClose={onClose}
      footer={<>
        <span className="mr-auto self-center text-xs font-semibold text-ink-muted">{total} item{total !== 1 ? 's' : ''} selected</span>
        <button className={btn.secondary} onClick={onClose}>Cancel</button>
        <button className={btn.primary} onClick={doImport} disabled={total === 0 || importing}>
          {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} Import
        </button>
      </>}
    >
      <div className="space-y-5">
        {/* Source */}
        {post ? (
          <div className="flex gap-4 p-3 rounded-3xl bg-surface-sunken/60">
            {post.image_url && <img src={post.image_url} alt="" referrerPolicy="no-referrer" className="w-32 h-32 object-cover rounded-2xl flex-shrink-0 bg-surface" />}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-ink-faint mb-1 flex items-center gap-2">
                {post.timestamp && format(parseISO(post.timestamp), 'EEE, MMM d')}
                {post.permalink && <a href={post.permalink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-accent-500 hover:text-accent-600"><ExternalLink className="w-3 h-3" /> Open post</a>}
              </p>
              <p className="text-sm text-ink whitespace-pre-wrap max-h-32 overflow-y-auto">{post.caption || <i className="text-ink-muted">No caption — the schedule is probably only in the image. Paste it as text instead.</i>}</p>
            </div>
          </div>
        ) : (
          <div>
            <textarea
              autoFocus value={text} onChange={e => setText(e.target.value)} rows={6}
              placeholder={'Paste the gym\'s caption or schedule here, e.g.\nLundi 19h-20h30 Gi\nMercredi 19h No-Gi\nSemaine 3 : armbar, triangle, hip bump sweep'}
              aria-label="Text to import" className="lifeos-input resize-y font-mono text-[13px]"
            />
            <button className={`${btn.primary} mt-2`} onClick={() => parse(text)} disabled={!text.trim()}><Wand2 className="w-4 h-4" /> Read it</button>
          </div>
        )}

        {parsedFrom && total === 0 && classes.length + techniques.length + exercises.length === 0 && (
          <p className="text-sm font-semibold text-ink-muted p-4 rounded-2xl bg-amber-50 border border-amber-100">
            Nothing recognisable found. LifeOS looks for days + times (classes), BJJ technique names (curriculum) and reps/sets (workouts).
          </p>
        )}

        {classes.length > 0 && (
          <Section icon={<CalendarDays className="w-4 h-4 text-sky-400" />} title="Timetable" count={chosen.classes.length}>
            <div className="space-y-1.5">
              {classes.map(c => (
                <div key={c.key} className={`flex flex-wrap items-center gap-1.5 ${c.include ? '' : 'opacity-45'}`}>
                  <input type="checkbox" checked={c.include} onChange={e => updateClass(c.key, { include: e.target.checked })} aria-label="Include class" className="accent-[rgb(var(--accent-400))]" />
                  <select value={c.weekday} onChange={e => updateClass(c.key, { weekday: Number(e.target.value) })} aria-label="Day" className={cellCls}>
                    {WEEKDAYS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                  <input type="time" value={c.start_time} onChange={e => updateClass(c.key, { start_time: e.target.value })} aria-label="Start" className={cellCls} />
                  <span className="text-ink-faint">–</span>
                  <input type="time" value={c.end_time || ''} onChange={e => updateClass(c.key, { end_time: e.target.value || null })} aria-label="End" className={cellCls} />
                  <select value={c.class_type} onChange={e => updateClass(c.key, { class_type: e.target.value })} aria-label="Class type" className={cellCls}>
                    {Object.entries(CLASS_TYPES).map(([k, t]) => <option key={k} value={k}>{t.emoji} {t.label}</option>)}
                  </select>
                  <input value={c.title} onChange={e => updateClass(c.key, { title: e.target.value })} aria-label="Title" className={`${cellCls} flex-1 min-w-[120px]`} />
                </div>
              ))}
            </div>
            {hasImportedClasses && (
              <label className="flex items-center gap-2 mt-3 text-xs font-bold text-ink-soft">
                <input type="checkbox" checked={replace} onChange={e => setReplace(e.target.checked)} className="accent-[rgb(var(--accent-400))]" />
                Replace the classes I imported before (classes I added by hand are kept)
              </label>
            )}
          </Section>
        )}

        {techniques.length > 0 && (
          <Section icon={<BookOpen className="w-4 h-4 text-accent-400" />} title={`Curriculum${parsedFrom?.label ? ` — ${parsedFrom.label}` : ''}`} count={chosen.techniques.length}>
            <div className="space-y-1.5">
              {techniques.map(t => (
                <div key={t.key} className={`flex flex-wrap items-center gap-1.5 ${t.include ? '' : 'opacity-45'}`}>
                  <input type="checkbox" checked={t.include} onChange={e => updateTechnique(t.key, { include: e.target.checked })} aria-label="Include technique" className="accent-[rgb(var(--accent-400))]" />
                  <input value={t.name} onChange={e => updateTechnique(t.key, { name: e.target.value })} aria-label="Technique" className={`${cellCls} flex-1 min-w-[160px]`} />
                  <select value={t.position} onChange={e => updateTechnique(t.key, { position: e.target.value })} aria-label="Position" className={cellCls}>
                    {Object.entries(POSITIONS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                  </select>
                  <select value={t.category} onChange={e => updateTechnique(t.key, { category: e.target.value })} aria-label="Type" className={cellCls}>
                    {Object.entries(CATEGORIES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                  </select>
                  {known.has(t.name.trim().toLowerCase()) && <span className="text-[11px] font-bold text-ink-faint">already in library</span>}
                </div>
              ))}
            </div>
            <p className="text-xs text-ink-muted mt-2">They're added to your library as 📌 To learn.</p>
          </Section>
        )}

        {exercises.length > 0 && (
          <Section icon={<Dumbbell className="w-4 h-4 text-emerald-400" />} title="Workout" count={chosen.exercises.length}>
            <div className="space-y-1.5">
              {exercises.map(e => (
                <div key={e.key} className={`flex flex-wrap items-center gap-1.5 ${e.include ? '' : 'opacity-45'}`}>
                  <input type="checkbox" checked={e.include} onChange={ev => updateExercise(e.key, { include: ev.target.checked })} aria-label="Include exercise" className="accent-[rgb(var(--accent-400))]" />
                  <input value={e.name} onChange={ev => updateExercise(e.key, { name: ev.target.value })} aria-label="Exercise" className={`${cellCls} flex-1 min-w-[140px]`} />
                  <input type="number" min="0" value={e.sets ?? ''} placeholder="sets" onChange={ev => updateExercise(e.key, { sets: ev.target.value === '' ? null : Number(ev.target.value) })} aria-label="Sets" className={`${cellCls} w-16 text-center`} />
                  <input type="number" min="0" value={e.reps ?? ''} placeholder="reps" onChange={ev => updateExercise(e.key, { reps: ev.target.value === '' ? null : Number(ev.target.value) })} aria-label="Reps" className={`${cellCls} w-16 text-center`} />
                  <input type="number" min="0" value={e.duration_minutes ?? ''} placeholder="min" onChange={ev => updateExercise(e.key, { duration_minutes: ev.target.value === '' ? null : Number(ev.target.value) })} aria-label="Minutes" className={`${cellCls} w-16 text-center`} />
                </div>
              ))}
            </div>
            <label className="block mt-3">
              <span className="block text-xs font-bold text-ink-soft mb-1.5">Saved as the program</span>
              <input value={programName} onChange={e => setProgramName(e.target.value)} className="lifeos-input py-2" />
            </label>
          </Section>
        )}
      </div>
    </Modal>
  );
}
