// End-to-end API check. Needs a server running against an EMPTY database:
//   PORT=3999 DB_NAME=lifeos_test node server.js
//   node tests/smoke.mjs            (or API_URL=http://host:port/api node tests/smoke.mjs)
const B = process.env.API_URL || 'http://localhost:3999/api';
let token;
const results = [];
const req = async (method, path, body) => {
  const r = await fetch(B + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data; try { data = await r.json(); } catch { data = null; }
  return { status: r.status, data };
};
const check = (name, ok, detail = '') => { results.push({ name, ok }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`); };

const D = '2026-10-04';

check('health', (await req('GET', '/health')).status === 200);
check('register w/o password -> 4xx (not 500)', (await req('POST', '/auth/register', {})).status < 500, `got ${(await req('POST', '/auth/register', {})).status}`);
const reg = await req('POST', '/auth/register', { name: 'Tester', password: 'secret123' });
token = reg.data?.token; check('register', !!token);
check('second register rejected', (await req('POST', '/auth/register', { password: 'x' })).status === 400);
check('login', (await req('POST', '/auth/login', { password: 'secret123' })).status === 200);
check('plugins toggle', (await req('POST', '/plugins/toggle', { pluginId: 'habits', isActive: true })).status === 200);

// Salah
await req('POST', '/salah', { date: D, prayerId: 'fajr', status: 'ontime' });
let s = await req('GET', '/salah');
check('salah date round-trip', Object.keys(s.data)[0] === D, `saved ${D}, got ${Object.keys(s.data)}`);

// Quran
let q = await req('POST', '/quran/sessions', { surahNumber: 1, fromAyah: 1, toAyah: 7, duration: 10, sessionType: 'tilawah', difficulty: 3, notes: '', date: D });
check('quran POST date round-trip', String(q.data.date).startsWith(D), `got ${q.data.date}`);
q = await req('GET', '/quran/sessions');
check('quran GET date round-trip', q.data[0].date === D, `got ${q.data[0].date}`);

// Books
const book = (await req('POST', '/books', { title: 'T', author: 'A', total_pages: 100, pages_read: 0, status: 'want_to_read' })).data;
const upd = await req('PUT', `/books/${book.id}`, { status: 'reading', start_date: D });
check('book start_date persisted', upd.data.start_date != null, `start_date=${upd.data.start_date}`);
const sess = await req('POST', '/books/sessions', { book_id: book.id, date: D, pages_read: 20, duration_minutes: 5 });
check('book session date round-trip', sess.data.date === D, `got ${sess.data.date}`);
await req('DELETE', `/books/sessions/${sess.data.id}`);
const bAfter = (await req('GET', '/books')).data.find(b => b.id === book.id);
check('deleting session reverts pages_read', bAfter.pages_read === 0, `pages_read=${bAfter.pages_read}`);

// Habits
const h = (await req('POST', '/habits', { name: 'H', emoji: 'x', frequency_type: 'daily', frequency_days: [], color: 'c' })).data;
const hl = await req('POST', '/habits/logs/toggle', { habit_id: h.id, date: D, completed: true });
check('habit log date round-trip', hl.data.date === D, `got ${hl.data.date}`);

// Routine
const blk = (await req('POST', '/routine/blocks', { time: '08:00:00', title: 'B', duration_minutes: 30, color_category: 'morning' })).data;
const rl = await req('POST', '/routine/logs/toggle', { block_id: blk.id, date: D, completed: true });
check('routine log date round-trip', rl.data.date === D, `got ${rl.data.date}`);
const t = await req('POST', '/routine/tasks', { title: 'T', priority: 'high', date: D });
check('task date round-trip', t.data.date === D, `got ${t.data.date}`);
check('task PUT unknown id -> 404', (await req('PUT', '/routine/tasks/00000000-0000-0000-0000-000000000000', { completed: true })).status === 404,
  `got ${(await req('PUT', '/routine/tasks/00000000-0000-0000-0000-000000000000', { completed: true })).status}`);

// Media
const m = await req('POST', '/media', { title: 'M', status: 'want_to_watch', type: 'movie', genres: [], cast: 'X' });
check('media add', m.status === 200);
check('media patch', (await req('PATCH', `/movies/${m.data.id}`, { status: 'watching', user_rating: 4 })).data.rating === 4);

// Meals
const meal = await req('POST', '/meals', { meal_date: D, meal_type: 'lunch' });
check('meal date round-trip', meal.data.meal_date === D, `got ${meal.data.meal_date}`);
await req('POST', '/meals/entries', { meal_id: meal.data.id, food_name: 'Rice', quantity_g: 200, calories_per_100g: 130, protein_per_100g: 2.7 });
const day = await req('GET', `/meals/day/${D}`);
check('meals day lookup', day.data.length === 1 && day.data[0].entries.length === 1, `meals=${day.data.length}`);
const ent = day.data[0].entries[0];
check('entry macros computed', Number(ent.calories) === 260, `calories=${ent.calories}`);

// Period
await req('POST', '/period/log', { log_date: '2026-09-01', is_period_day: true });
await req('POST', '/period/log', { log_date: '2026-09-02', is_period_day: true });
await req('POST', '/period/log', { log_date: '2026-09-29', is_period_day: true });
const cyc = (await req('GET', '/period/cycles')).data;
check('period cycles', cyc.length === 2 && cyc[1].cycle_length === 28 && cyc[1].start_date === '2026-09-01', JSON.stringify(cyc.map(c => [c.start_date, c.cycle_length, c.period_duration])));
const st = (await req('GET', '/period/stats')).data;
check('period stats', st.nextPeriodStart === '2026-10-27', `next=${st.nextPeriodStart} day=${st.currentCycleDay}`);

// Token expiry handling on server
token = 'garbage';
check('bad token -> 401', (await req('GET', '/habits')).status === 401);

const passed = results.filter(r => r.ok).length;
console.log(`\n${passed}/${results.length} passed`);
process.exitCode = passed === results.length ? 0 : 1;
