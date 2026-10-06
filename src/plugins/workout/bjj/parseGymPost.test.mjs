// Run: npm run test:parser
import { parseGymPost } from './parseGymPost.js';

const results = [];
const check = (name, ok, detail = '') => {
  results.push(ok);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : '  — ' + detail}`);
};
const has = (list, partial) => list.some(item => Object.entries(partial).every(([k, v]) => item[k] === v));
const show = (x) => JSON.stringify(x);

// 1. French weekly timetable, day per line, mixed formats
{
  const r = parseGymPost(`📅 PLANNING DE LA SEMAINE 🥋
Lundi : 19h-20h30 Gi tous niveaux
Mardi 12h15 No-Gi / 19h Fondamentaux
Mercredi: 19:00 – 20:30 Gi avancés
Jeudi 19h No Gi
Vendredi 18h30 Open Mat
Samedi 10h Kids 👶
#bjj #jiujitsu #tunis`);
  check('FR: Monday Gi with range', has(r.classes, { weekday: 1, start_time: '19:00', end_time: '20:30', class_type: 'fundamentals' }), show(r.classes));
  check('FR: two classes on one line', has(r.classes, { weekday: 2, start_time: '12:15', class_type: 'nogi' }) && has(r.classes, { weekday: 2, start_time: '19:00', class_type: 'fundamentals' }), show(r.classes.filter(c => c.weekday === 2)));
  check('FR: advanced class', has(r.classes, { weekday: 3, start_time: '19:00', end_time: '20:30', class_type: 'advanced' }));
  check('FR: open mat + kids', has(r.classes, { weekday: 5, start_time: '18:30', class_type: 'open_mat' }) && has(r.classes, { weekday: 6, start_time: '10:00', class_type: 'kids' }));
  check('FR: exactly 7 classes, no hashtags as techniques', r.classes.length === 7 && r.techniques.length === 0, `${r.classes.length} classes, ${show(r.techniques)}`);
  check('FR: kind = timetable', r.kind === 'timetable', r.kind);
}

// 2. English with day ranges and am/pm
{
  const r = parseGymPost(`New schedule starting Monday!
Mon/Wed/Fri 7-8:30pm Gi Fundamentals
Tue & Thu 6:30pm No-Gi
Saturday 11am Open Mat`);
  check('EN: Mon/Wed/Fri expanded', [1, 3, 5].every(d => has(r.classes, { weekday: d, start_time: '19:00', end_time: '20:30', class_type: 'fundamentals' })), show(r.classes));
  check('EN: Tue & Thu pm', [2, 4].every(d => has(r.classes, { weekday: d, start_time: '18:30', class_type: 'nogi' })));
  check('EN: 11am open mat', has(r.classes, { weekday: 6, start_time: '11:00', class_type: 'open_mat' }));
  check('EN: "starting Monday!" is not a class', r.classes.length === 6, `${r.classes.length}`);
}

// 3. Day header with times underneath, and "Mon–Fri" range
{
  const r = parseGymPost(`Lundi au Vendredi
12h Lunch class
19h Gi

Samedi & Dimanche
10h30 Open mat`);
  check('header range applies to following lines', [1, 2, 3, 4, 5].every(d => has(r.classes, { weekday: d, start_time: '12:00' }) && has(r.classes, { weekday: d, start_time: '19:00', class_type: 'gi' })), show(r.classes));
  check('weekend header', has(r.classes, { weekday: 6, start_time: '10:30', class_type: 'open_mat' }) && has(r.classes, { weekday: 0, start_time: '10:30' }));
}

// 4. Arabic timetable
{
  const r = parseGymPost(`مواعيد الحصص
الاثنين 19:00 جيو جيتسو
الأربعاء 19:00 بدون كيمونو no-gi
السبت 10:00 أطفال`);
  check('AR: Monday', has(r.classes, { weekday: 1, start_time: '19:00' }), show(r.classes));
  check('AR: Wednesday no-gi', has(r.classes, { weekday: 3, start_time: '19:00', class_type: 'nogi' }));
  check('AR: Saturday kids', has(r.classes, { weekday: 6, start_time: '10:00', class_type: 'kids' }));
}

// 5. Technique curriculum (English)
{
  const r = parseGymPost(`Week 3 curriculum 🔥
Closed guard:
1. Armbar from closed guard
2. Triangle choke
3. Hip bump sweep
Passing: knee slice pass, torreando
Escapes - side control escape (shrimp to guard)`);
  check('curriculum label', r.label === 'Week 3', r.label);
  check('armbar → submission / closed guard', has(r.techniques, { name: 'Armbar from closed guard', category: 'submission', position: 'closed_guard' }), show(r.techniques));
  check('triangle', has(r.techniques, { name: 'Triangle choke', category: 'submission' }));
  check('hip bump → sweep', has(r.techniques, { name: 'Hip bump sweep', category: 'sweep' }));
  check('passes split from one line', has(r.techniques, { name: 'Knee slice pass', category: 'pass' }) && has(r.techniques, { name: 'Torreando', category: 'pass' }), show(r.techniques));
  check('escape → side control', r.techniques.some(t => t.category === 'escape' && t.position === 'side_control'), show(r.techniques));
  check('no classes or exercises invented', r.classes.length === 0 && r.exercises.length === 0, show({ c: r.classes, e: r.exercises }));
  check('kind = curriculum', r.kind === 'curriculum', r.kind);
}

// 6. Technique curriculum (French)
{
  const r = parseGymPost(`Thème de la semaine : la garde fermée
- Clé de bras depuis la garde
- Triangle
- Balayage ciseaux
- Passage de garde debout`);
  check('FR: clé de bras → submission', has(r.techniques, { category: 'submission', position: 'closed_guard' }), show(r.techniques));
  check('FR: balayage → sweep', r.techniques.some(t => t.category === 'sweep'));
  check('FR: passage → pass', r.techniques.some(t => t.category === 'pass'));
}

// 7. Conditioning workout
{
  const r = parseGymPost(`WOD 💪
5 rounds:
10 burpees
20 push-ups
30 squats
1 min plank
Finisher: 3x10 pull-ups, 10 hip escapes`);
  check('rounds apply to block', has(r.exercises, { name: 'Burpees', sets: 5, reps: 10 }) && has(r.exercises, { name: 'Push-ups', sets: 5, reps: 20 }), show(r.exercises));
  check('timed exercise', has(r.exercises, { name: 'Plank', duration_minutes: 1 }), show(r.exercises));
  check('sets × reps', has(r.exercises, { name: 'Pull-ups', sets: 3, reps: 10 }), show(r.exercises));
  check('"10 hip escapes" is not a 10:00 class', r.classes.length === 0, show(r.classes));
  check('kind = workout', r.kind === 'workout' || r.kind === 'mixed', r.kind);
}

// 8. Noise: promo post shouldn't produce anything
{
  const r = parseGymPost(`Congrats to our new blue belts! 🔵🥋 So proud of you all. Black Friday deal: 20% off memberships until 30/11 #bjj`);
  check('promo post → nothing', r.classes.length === 0 && r.exercises.length === 0 && r.kind === 'unknown', show(r));
}

const passed = results.filter(Boolean).length;
console.log(`\n${passed}/${results.length} passed`);
process.exitCode = passed === results.length ? 0 : 1;
