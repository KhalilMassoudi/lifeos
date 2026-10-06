// Turns a gym's Instagram caption (or any pasted text) into structured data:
//   classes    — weekly timetable entries  { weekday, start_time, end_time, title, class_type }
//   techniques — curriculum items          { name, position, category }
//   exercises  — conditioning workout      { name, sets, reps, duration_minutes }
// Understands English, French and Arabic day names and the usual time formats
// (19:00, 19h, 19h30, 7pm, 19h-20h30, 7–8:30pm). Pure function, no dependencies.

// JS weekday numbers: Sunday = 0
const DAY_WORDS = [
  [1, ['monday', 'mon', 'lundi', 'lun', 'الاثنين', 'الإثنين', 'الأثنين', 'اثنين']],
  [2, ['tuesday', 'tues', 'tue', 'mardi', 'الثلاثاء', 'ثلاثاء']],
  [3, ['wednesday', 'wed', 'mercredi', 'mer', 'الأربعاء', 'الاربعاء', 'اربعاء', 'أربعاء']],
  [4, ['thursday', 'thurs', 'thur', 'thu', 'jeudi', 'jeu', 'الخميس', 'خميس']],
  [5, ['friday', 'fri', 'vendredi', 'ven', 'الجمعة', 'جمعة']],
  [6, ['saturday', 'sat', 'samedi', 'sam', 'السبت', 'سبت']],
  [0, ['sunday', 'sun', 'dimanche', 'dim', 'الأحد', 'الاحد', 'أحد']],
];
const ARABIC = /[؀-ۿ]/;
// Latin words need word boundaries; Arabic words are matched as substrings
const DAY_PATTERNS = DAY_WORDS.flatMap(([day, words]) => words.map(w => ({
  day,
  re: ARABIC.test(w) ? new RegExp(w, 'g') : new RegExp(`(?<![a-zà-ÿ])${w}(?![a-zà-ÿ])\\.?`, 'gi'),
})));
const RANGE_SEP = /^\s*(?:-|–|—|à|a|au|to|till|until|through|thru|→|>|إلى|الى)\s*$/i;

const CLASS_TYPES = [
  ['nogi', /\bno[\s-]?gi\b|sans\s+kimono|\bgrappling\b|\bsubmission\s+only\b/i],
  ['open_mat', /open[\s-]?mat|sparring\s+libre|\brandori\b|\bsparring\b/i],
  ['kids', /\bkids?\b|enfants?|juniors?|\bteens?\b|ados?\b|أطفال/i],
  ['women', /\bwomen|ladies|femmes?|girls?\b|نساء|سيدات/i],
  ['fundamentals', /fundamental|fondamentaux|d[ée]butants?|beginners?|basics?|\bbase\b|مبتدئين/i],
  ['advanced', /advanced|avanc[ée]s?|confirm[ée]s?|experts?|متقدم/i],
  ['competition', /comp(?:etition|étition|\b)|compet\b/i],
  ['drilling', /\bdrill/i],
  ['private', /\bprivate|priv[ée]\b|cours\s+particulier/i],
  ['gi', /\bgi\b|kimono|\bbjj\b|jiu[\s-]?jitsu/i],
];
export const CLASS_TYPE_LABELS = {
  gi: 'Gi class', nogi: 'No-Gi class', open_mat: 'Open mat', fundamentals: 'Fundamentals', advanced: 'Advanced class',
  competition: 'Competition class', kids: 'Kids class', women: "Women's class", private: 'Private lesson', drilling: 'Drilling session',
};

// ── Techniques ──────────────────────────────────────────────────────────────

const CATEGORY_RULES = [
  ['submission', /armbar|arm\s*bar|arm[\s-]?lock|cl[ée]f?\s+de\s+bras|juji|triangle|kimura|americana|guillotine|rear[\s-]?naked|\brnc\b|mata[\s-]?le[aã]o|omoplata|ezekiel|d'?arce|anaconda|bow\s+and\s+arrow|cross[\s-]?collar|loop\s+choke|baseball|choke|strangle|[ée]tranglement|heel\s*hook|ankle\s*lock|knee\s*bar|toe\s*hold|calf\s*slicer|wrist\s*lock|straight\s+foot|banana\s+split|\bsub(?:mission)?s?\b|soumission|chave|finalisation/i],
  ['sweep', /sweep|balayage|renversement|raspagem|berimbolo|hip\s*bump|flower|pendulum|scissor/i],
  ['pass', /\bpass(?:ing|e|es)?\b|passage|knee\s*(?:slice|cut)|torr?eando|toreando|leg\s*drag|over[\s-]?under|stack\s*pass|smash\s*pass|long\s*step|x[\s-]?pass|bullfight/i],
  ['escape', /escape|sortie|\bsortir\b|shrimp|upa\b|elbow[\s-]?knee|recover(?:y|ing)?/i],
  ['takedown', /takedown|take[\s-]?down|projection|single[\s-]?leg|double[\s-]?leg|ankle\s*pick|osoto|ouchi|uchi[\s-]?mata|seoi|guard\s*pull|tirer\s+la\s+garde|snap[\s-]?down|arm[\s-]?drag|wrestl/i],
  ['transition', /back\s*take|take\s+the\s+back|prise\s+(?:de|du)\s+dos|transition|mount\s+transition|technical\s+mount/i],
  ['guard_retention', /retention|r[ée]tention|framing|frames?\b/i],
  ['control', /\bcontrol|contr[ôo]le|pin\b|pressure/i],
  ['drill', /\bdrills?\b|exercice/i],
];
const POSITION_RULES = [
  ['half_guard', /half[\s-]?guard|demi[\s-]?garde|meia[\s-]?guarda|deep\s*half|lockdown|z[\s-]?guard|knee\s*shield/i],
  ['butterfly', /butterfly|papillon/i],
  ['de_la_riva', /de\s*la\s*riva|\bdlr\b|reverse\s+de\s+la\s+riva|\brdlr\b|berimbolo/i],
  ['x_guard', /single[\s-]?leg\s+x|\bslx\b|x[\s-]?guard|garde\s+x/i],
  ['spider_lasso', /spider|lasso|araign[ée]e/i],
  ['leg_entanglement', /heel\s*hook|ankle\s*lock|knee\s*bar|toe\s*hold|calf\s*slicer|leg\s*lock|ashi|saddle|411|50[\s/-]50|inside\s+sankaku/i],
  ['mount', /\bmount|mont[ée]e|mont[ée]\b|montada|technical\s+mount/i],
  ['side_control', /side[\s-]?control|100\s*kg|cem\s*quilos|contr[ôo]le\s+lat[ée]ral|scarf\s*hold|kesa/i],
  ['back', /\bback\b|\bdos\b|rear[\s-]?naked|\brnc\b|bow\s+and\s+arrow|mata[\s-]?le[aã]o|body\s*triangle|seat\s*belt/i],
  ['north_south', /north[\s-]?south|nord[\s-]?sud/i],
  ['knee_on_belly', /knee[\s-]?on[\s-]?(?:belly|stomach)|genou\s+(?:sur|au)\s+ventre/i],
  ['turtle', /turtle|tortue/i],
  ['standing', /takedown|take[\s-]?down|standing|debout|single[\s-]?leg|double[\s-]?leg|projection|guard\s*pull|ankle\s*pick|osoto|uchi[\s-]?mata|seoi|arm[\s-]?drag|snap[\s-]?down/i],
  ['closed_guard', /closed[\s-]?guard|garde\s+ferm[ée]e|guarda\s+fechada|\bguard\b|\bgarde\b/i],
  ['open_guard', /open[\s-]?guard|garde\s+ouverte|guarda\s+aberta|collar[\s-]?sleeve|\bcollar\b/i],
];
const match = (rules, text, fallback) => (rules.find(([, re]) => re.test(text)) || [fallback])[0];

// ── Conditioning ────────────────────────────────────────────────────────────

const EXERCISE_WORDS = /burpee|push[\s-]?ups?|pull[\s-]?ups?|chin[\s-]?ups?|squats?|lunges?|sit[\s-]?ups?|crunch|plank|jumping|jump|sprints?|\brun\b|running|rowing|\brow\b|deadlift|kettlebell|\bkb\b|swing|rope|shrimp|bridges?|mountain\s+climbers?|bear\s+crawl|dips?|pompes|tractions?|fentes|gainage|abdos|corde|course|sauts?|pull\s*ups|press|curl|thrusters?|wall\s+balls?|box\s+jumps?|hip\s+escape|sprawls?/i;
const ROUNDS = /(\d+)\s*(?:rounds?|tours?|sets?|séries?|series|x)\b(?!\s*\d)/i;

// ── Times ───────────────────────────────────────────────────────────────────

// A clock time: 19:00, 19h, 19h30, 19.30, 7pm, 7:30 pm, 7 pm
// "h" must touch the digits and not start a word ("10 hip escapes" is not 10:00)
const TIME_RE = /(?<![\d:.,])(\d{1,2})(?:\s*:\s*(\d{2})|[hH](\d{2})?(?![a-zà-ÿ])|\.(\d{2})(?!\d))?\s*(am|pm|a\.m\.|p\.m\.)?(?![a-z\d:])/gi;

function parseTimes(line) {
  const found = [];
  for (const m of line.matchAll(TIME_RE)) {
    let hour = Number(m[1]);
    const minute = Number(m[2] || m[3] || m[4] || 0);
    const meridiem = m[5]?.toLowerCase().replace(/\./g, '');
    const hasClockMark = m[2] !== undefined || m[4] !== undefined || /^\d{1,2}[hH]/.test(m[0]) || Boolean(meridiem);
    if (meridiem === 'pm' && hour < 12) hour += 12;
    if (meridiem === 'am' && hour === 12) hour = 0;
    if (hour > 23 || minute > 59) continue;
    found.push({ hour, minute, hasClockMark, index: m.index, end: m.index + m[0].length, meridiem });
  }
  // Pair "start – end"; a bare number counts as a time only next to a marked one ("19-20h30")
  const slots = [];
  for (let i = 0; i < found.length; i++) {
    const a = found[i];
    const b = found[i + 1];
    const between = b ? line.slice(a.end, b.index) : '';
    if (b && RANGE_SEP.test(between) && (a.hasClockMark || b.hasClockMark)) {
      // "7-8:30pm": the start inherits pm when that keeps it before the end
      if (!a.meridiem && b.meridiem === 'pm' && a.hour < 12 && a.hour + 12 <= b.hour) a.hour += 12;
      slots.push({ start: a, end: b, index: a.index, after: b.end });
      i++;
    } else if (a.hasClockMark) {
      slots.push({ start: a, end: null, index: a.index, after: a.end });
    }
  }
  return slots;
}

const hhmm = ({ hour, minute }) => `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

// ── Days ────────────────────────────────────────────────────────────────────

function findDays(line) {
  const hits = [];
  for (const { day, re } of DAY_PATTERNS) {
    re.lastIndex = 0;
    for (const m of line.matchAll(re)) hits.push({ day, index: m.index, end: m.index + m[0].length });
  }
  hits.sort((a, b) => a.index - b.index || b.end - a.end);
  // Drop overlaps (e.g. "mon" inside "monday" never happens thanks to boundaries, but Arabic can overlap)
  const unique = hits.filter((h, i) => i === 0 || h.index >= hits[i - 1].end);

  // Expand ranges: "Mon–Fri", "lundi au vendredi", "من الاثنين إلى الجمعة"
  const days = [];
  for (let i = 0; i < unique.length; i++) {
    const a = unique[i];
    const b = unique[i + 1];
    if (b && RANGE_SEP.test(line.slice(a.end, b.index))) {
      for (let d = a.day; ; d = (d + 1) % 7) { days.push(d); if (d === b.day) break; }
      i++;
    } else {
      days.push(a.day);
    }
  }
  return { days: [...new Set(days)], spans: unique };
}

// ── Helpers ─────────────────────────────────────────────────────────────────

const stripDecorations = (line) => line
  .replace(/#[\p{L}\p{N}_]+/gu, ' ')                 // hashtags
  .replace(/@[\w.]+/g, ' ')                           // mentions
  .replace(/[\p{Extended_Pictographic}️‍]/gu, ' ')
  .replace(/^[\s\-–—•·*>▪️◾●○✅✔️]+/u, '')
  .replace(/^\s*\d+[.)]\s+/, '')                      // "1. " / "2) "
  .replace(/\s+/g, ' ')
  .trim();

const cleanTitle = (text) => text
  .replace(/^[\s:|,\-–—/&+]+|[\s:|,\-–—/&+]+$/g, '')
  .replace(/\s{2,}/g, ' ')
  .trim();

const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

const LABEL_RE = /(week|semaine|semana|month|mois|الأسبوع|أسبوع)\s*(\d+)/i;
const HEADER_WORDS = /^(?:technique|techniques|curriculum|programme?|program|this\s+week|cette\s+semaine|au\s+programme|th[èe]me|focus|planning|schedule|horaires?|timetable|wod|workout|conditioning|circuit|warm[\s-]?up|échauffement)\b[^:]*:?\s*/i;

// ── Main ────────────────────────────────────────────────────────────────────

export function parseGymPost(text) {
  const lines = String(text || '').split(/\r?\n|(?<=[.;!?])\s+(?=[A-ZÀ-Ý؀-ۿ])|\s+\|\s+/);
  const classes = [];
  const techniques = [];
  const exercises = [];
  const label = text?.match(LABEL_RE)?.[0] || null;

  let currentDays = [];
  let roundsForBlock = null;
  let sectionPosition = null; // from headers like "Closed guard:"

  for (const raw of lines) {
    const line = stripDecorations(raw);
    if (!line) { roundsForBlock = null; sectionPosition = null; continue; }

    const { days, spans } = findDays(line);
    const slots = parseTimes(line);

    // Timetable: day(s) + time(s), or times under a day header
    if (slots.length > 0 && (days.length > 0 || currentDays.length > 0)) {
      const applyDays = days.length > 0 ? days : currentDays;
      // Remove day words so they don't end up in class titles
      let titleSource = line;
      for (const s of [...spans].reverse()) titleSource = titleSource.slice(0, s.index) + ' '.repeat(s.end - s.index) + titleSource.slice(s.end);
      titleSource = titleSource.replace(/\b(?:de|from|du|من)\b/gi, ' ');

      slots.forEach((slot, i) => {
        const next = slots[i + 1];
        let title = cleanTitle(titleSource.slice(slot.after, next ? next.index : undefined));
        if (!title && i === 0) title = cleanTitle(titleSource.slice(0, slot.index));
        const classType = match(CLASS_TYPES, title || line, 'gi');
        for (const weekday of applyDays) {
          classes.push({
            weekday,
            start_time: hhmm(slot.start),
            end_time: slot.end ? hhmm(slot.end) : null,
            title: title && title.length <= 60 ? capitalize(title) : CLASS_TYPE_LABELS[classType],
            class_type: classType,
          });
        }
      });
      continue;
    }

    // A line that is only day names → header for the times below it
    if (days.length > 0 && slots.length === 0) {
      let rest = line;
      for (const s of [...spans].reverse()) rest = rest.slice(0, s.index) + rest.slice(s.end);
      if (cleanTitle(rest.replace(/[&,/+]|et|and|و/gi, '')).length <= 3) { currentDays = days; continue; }
    }

    // Section labels: "Closed guard:", "5 rounds:", "Finisher: 3x10 pull-ups", "Escapes - …"
    let content = line;
    const labelled = line.match(/^([^:]{1,30}):\s*(.*)$/) || line.match(/^([A-Za-zÀ-ÿ' ]{3,25})\s+[-–—]\s+(.+)$/);
    if (labelled) {
      const [, head, rest] = labelled;
      const rounds = head.match(ROUNDS);
      roundsForBlock = rounds ? Number(rounds[1]) : null;
      sectionPosition = match(POSITION_RULES, `${head} ${rest}`, null);
      content = rest;
      if (!content.trim()) continue;
    }

    const body = content.replace(HEADER_WORDS, '').replace(LABEL_RE, '').replace(/^[\s:–—-]+/, '');

    // Conditioning: "5 rounds" header, "3x10 push-ups", "20 burpees", "1 min plank"
    const roundsOnly = body.match(new RegExp(`^${ROUNDS.source}\\s*:?\\s*$`, 'i'));
    if (roundsOnly) { roundsForBlock = Number(roundsOnly[1]); continue; }

    const fragments = body.split(/\s*(?:,|;|•|·|\/|\+|&|\bet\b|\band\b|،)\s*/i).map(f => f.trim()).filter(Boolean);
    let matchedSomething = false;

    for (const fragment of fragments) {
      const setsReps = fragment.match(/^(\d+)\s*[x×]\s*(\d+)\s*(.+)$/i);
      const repsName = fragment.match(/^(\d+)\s+(?!min|sec|s\b|mn\b)(.+)$/i);
      const timed = fragment.match(/^(\d+(?:[.,]\d+)?)\s*(min(?:utes?)?|mn|sec(?:ondes?|onds?)?|s)\b\s*(.*)$/i)
        || fragment.match(/^(.+?)\s+(\d+(?:[.,]\d+)?)\s*(min(?:utes?)?|mn|sec(?:ondes?|onds?)?|s)\b$/i);

      if (setsReps && EXERCISE_WORDS.test(setsReps[3])) {
        exercises.push({ name: capitalize(cleanTitle(setsReps[3])), sets: Number(setsReps[1]), reps: Number(setsReps[2]), duration_minutes: null });
        matchedSomething = true;
      } else if (timed && EXERCISE_WORDS.test(fragment)) {
        const [amount, unit, name] = timed[1] && /^\d/.test(timed[1]) ? [timed[1], timed[2], timed[3]] : [timed[2], timed[3], timed[1]];
        const minutes = /^s|sec/i.test(unit) ? Math.max(1, Math.round(parseFloat(amount.replace(',', '.')) / 60)) : Math.round(parseFloat(amount.replace(',', '.')));
        exercises.push({ name: capitalize(cleanTitle(name)) || 'Interval', sets: roundsForBlock, reps: null, duration_minutes: minutes });
        matchedSomething = true;
      } else if (repsName && EXERCISE_WORDS.test(repsName[2])) {
        exercises.push({ name: capitalize(cleanTitle(repsName[2])), sets: roundsForBlock, reps: Number(repsName[1]), duration_minutes: null });
        matchedSomething = true;
      } else {
        const category = match(CATEGORY_RULES, fragment, null);
        if (category && fragment.length <= 80 && fragment.split(' ').length <= 10) {
          const name = capitalize(cleanTitle(fragment.replace(/^(?:\d+\s*[.)-]?\s*)/, '').replace(/\s*\([^)]*\)/g, '')));
          if (name.length >= 3) {
            techniques.push({ name, position: match(POSITION_RULES, fragment, sectionPosition || 'other'), category });
            matchedSomething = true;
          }
        }
      }
    }
    if (!matchedSomething) roundsForBlock = roundsForBlock && /^\s*$/.test(body) ? null : roundsForBlock;
  }

  // De-duplicate
  const seen = new Set();
  const uniq = (list, key) => list.filter(item => { const k = key(item); if (seen.has(k)) return false; seen.add(k); return true; });
  const result = {
    classes: uniq(classes, c => `c|${c.weekday}|${c.start_time}|${c.title.toLowerCase()}`)
      .sort((a, b) => ((a.weekday + 6) % 7) - ((b.weekday + 6) % 7) || a.start_time.localeCompare(b.start_time)),
    techniques: uniq(techniques, t => `t|${t.name.toLowerCase()}`),
    exercises: uniq(exercises, e => `e|${e.name.toLowerCase()}|${e.sets}|${e.reps}|${e.duration_minutes}`),
    label,
  };
  const counts = [['timetable', result.classes.length], ['curriculum', result.techniques.length], ['workout', result.exercises.length]].filter(([, n]) => n > 0);
  result.kind = counts.length === 0 ? 'unknown' : counts.length === 1 ? counts[0][0] : 'mixed';
  return result;
}
