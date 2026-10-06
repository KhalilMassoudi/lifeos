// Checks that two profiles can't see or change each other's data. Needs a server
// running against an EMPTY database (see smoke.mjs for how to start one).
const B = process.env.API_URL || 'http://localhost:3999/api';
const results = [];

const call = async (token, method, path, body) => {
  const r = await fetch(B + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data; try { data = await r.json(); } catch { data = null; }
  return { status: r.status, data };
};
const check = (name, ok, detail = '') => {
  results.push(ok);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
};

const D = '2026-10-05';

// ── Setup: first profile registers, then adds the second one ────────────────
const first = await call(null, 'POST', '/auth/register', { name: 'Khalil', avatar: '🦊', color: 'lavender', password: 'khalil123' });
const A = first.data?.token;
check('first profile registers', !!A && first.data.user.name === 'Khalil');
check('public register closed afterwards',
  (await call(null, 'POST', '/auth/register', { name: 'X', password: 'xxxxxx' })).status === 400);
check('adding a profile requires sign-in',
  (await call(null, 'POST', '/auth/profiles', { name: 'X', password: 'xxxxxx' })).status === 401);

const added = await call(A, 'POST', '/auth/profiles', { name: 'Her', avatar: '🌸', color: 'blush', password: 'her12345' });
check('second profile added', added.status === 200 && added.data.name === 'Her', `status ${added.status}`);

const status = await call(null, 'GET', '/auth/status');
check('status lists both profiles', status.data.profiles?.length === 2 && !('password_hash' in status.data.profiles[0]));

const herId = added.data.id;
check('wrong password rejected', (await call(null, 'POST', '/auth/login', { userId: herId, password: 'nope' })).status === 401);
const login = await call(null, 'POST', '/auth/login', { userId: herId, password: 'her12345' });
const H = login.data?.token;
check('second profile logs in', !!H && login.data.user.id === herId);
check('/me returns the right profile', (await call(H, 'GET', '/auth/me')).data.user?.name === 'Her');

// ── Each profile writes on the same day ─────────────────────────────────────
await call(A, 'POST', '/salah', { date: D, prayerId: 'fajr', status: 'ontime' });
await call(H, 'POST', '/salah', { date: D, prayerId: 'fajr', status: 'late' });
const salahA = (await call(A, 'GET', '/salah')).data;
const salahH = (await call(H, 'GET', '/salah')).data;
check('same-day salah kept separate', salahA[D]?.fajr.status === 'ontime' && salahH[D]?.fajr.status === 'late');

await call(H, 'POST', '/salah', { date: D, prayerId: 'fajr', note: 'alhamdulillah' });
const salahH2 = (await call(H, 'GET', '/salah')).data;
check('note update keeps status', salahH2[D].fajr.status === 'late' && salahH2[D].fajr.note === 'alhamdulillah');

await call(A, 'POST', '/plugins/toggle', { pluginId: 'books', isActive: true });
check('plugins are per profile',
  (await call(A, 'GET', '/plugins')).data.includes('books') && !(await call(H, 'GET', '/plugins')).data.includes('books'));

const bookA = (await call(A, 'POST', '/books', { title: 'Mine', status: 'reading', total_pages: 100, pages_read: 0 })).data;
check("can't see the other profile's books", (await call(H, 'GET', '/books')).data.length === 0);
check("can't update the other profile's book",
  (await call(H, 'PUT', `/books/${bookA.id}`, { title: 'Hacked' })).status === 404);
check("can't log a session on the other profile's book",
  (await call(H, 'POST', '/books/sessions', { book_id: bookA.id, date: D, pages_read: 5 })).status === 404);
await call(H, 'DELETE', `/books/${bookA.id}`);
check("can't delete the other profile's book", (await call(A, 'GET', '/books')).data.length === 1);

const habitA = (await call(A, 'POST', '/habits', { name: 'Run', frequency_type: 'daily', frequency_days: [] })).data;
check("can't tick the other profile's habit",
  (await call(H, 'POST', '/habits/logs/toggle', { habit_id: habitA.id, date: D, completed: true })).status === 404);

const mealA = (await call(A, 'POST', '/meals', { meal_date: D, meal_type: 'lunch' })).data;
check("can't add food to the other profile's meal",
  (await call(H, 'POST', '/meals/entries', { meal_id: mealA.id, food_name: 'x', quantity_g: 100 })).status === 404);
check('meals day is per profile', (await call(H, 'GET', `/meals/day/${D}`)).data.length === 0);

await call(H, 'POST', '/meals/goals', { calories: 1800, protein_g: 90, carbs_g: 200, fat_g: 60, fiber_g: 25, water_ml: 2500 });
check('nutrition goals are per profile',
  (await call(H, 'GET', '/meals/goals')).data.calories === 1800 && (await call(A, 'GET', '/meals/goals')).data.calories === 2000);

await call(H, 'POST', '/period/log', { log_date: D, is_period_day: true });
check('period data is per profile',
  (await call(H, 'GET', '/period/cycles')).data.length === 1 && (await call(A, 'GET', '/period/cycles')).data.length === 0);
await call(H, 'PUT', '/period/settings', { average_cycle_length: 30 });
check('period settings are per profile',
  (await call(H, 'GET', '/period/settings')).data.average_cycle_length === 30 &&
  (await call(A, 'GET', '/period/settings')).data.average_cycle_length === 28);

// ── Profile management ──────────────────────────────────────────────────────
const renamed = await call(H, 'PATCH', '/auth/me', { avatar: '🌷', color: 'peach' });
check('edit own profile', renamed.data.avatar === '🌷' && renamed.data.name === 'Her');
check('password change needs current password',
  (await call(H, 'POST', '/auth/me/password', { currentPassword: 'wrong', newPassword: 'newpass1' })).status === 401);
await call(H, 'POST', '/auth/me/password', { currentPassword: 'her12345', newPassword: 'newpass1' });
check('password changed',
  (await call(null, 'POST', '/auth/login', { userId: herId, password: 'newpass1' })).status === 200);

// ── Notes & Journal sharing ─────────────────────────────────────────────────
const H2 = (await call(null, 'POST', '/auth/login', { userId: herId, password: 'newpass1' })).data.token;
const privateEntry = await call(A, 'POST', '/notes', { type: 'journal', title: 'Private', content: 'Only mine', mood: '😌', date: D, tags: ['Gratitude', '#work', 'gratitude'] });
check('journal entry created with clean tags', privateEntry.status === 200 && JSON.stringify(privateEntry.data.tags) === '["gratitude","work"]',
  JSON.stringify(privateEntry.data?.tags));
await call(A, 'POST', '/notes', { type: 'journal', content: 'For both of us', date: D, is_shared: true });
const herJournal = (await call(H2, 'GET', '/notes?type=journal')).data;
check('partner sees only shared journal entries', herJournal.length === 1 && herJournal[0].content === 'For both of us' && herJournal[0].author.name === 'Khalil');
check("partner can't edit a shared entry",
  (await call(H2, 'PUT', `/notes/${herJournal[0].id}`, { content: 'edited' })).status === 404);
check("partner can't delete a shared entry",
  (await call(H2, 'DELETE', `/notes/${herJournal[0].id}`)).status === 404);

const sticky = (await call(H2, 'POST', '/notes', { type: 'quick_note', content: 'Buy milk', color_tag: 'mint', is_shared: true })).data;
check('quick notes stay private even if marked shared',
  sticky.is_shared === false && (await call(A, 'GET', '/notes?type=quick_note')).data.length === 0);
const pinned = await call(H2, 'PUT', `/notes/${sticky.id}`, { is_pinned: true, tags: [] });
check('pin a quick note', pinned.data.is_pinned === true && pinned.data.content === 'Buy milk');

await call(H2, 'POST', '/notes', { type: 'love_note', content: 'I love you 💌' });
const wall = (await call(A, 'GET', '/notes?type=love_note')).data;
check('love notes are visible to both', wall.length === 1 && wall[0].author.name === 'Her');
check('empty note rejected', (await call(A, 'POST', '/notes', { type: 'journal', content: '  ' })).status === 400);
check('tags listed per profile', JSON.stringify((await call(A, 'GET', '/notes/tags')).data) === '["gratitude","work"]' &&
  (await call(H2, 'GET', '/notes/tags')).data.length === 0);
await call(A, 'PUT', `/notes/${privateEntry.data.id}`, { tags: ['work'] });
check('unused tags are cleaned up', JSON.stringify((await call(A, 'GET', '/notes/tags')).data) === '["work"]');

// ── Workouts ────────────────────────────────────────────────────────────────
const workout = await call(A, 'POST', '/workouts/sessions', {
  title: 'Leg day', type: 'strength', date: D, duration_minutes: 50, feeling: 4,
  exercises: [{ name: 'Squat', sets: 4, reps: 8, weight: 60 }, { name: '  ' }, { name: 'Lunges', sets: 3, reps: 12 }],
  save_as_template: 'Legs',
});
check('workout saved with exercises (blank rows ignored)',
  workout.status === 200 && workout.data.exercises.length === 2 && workout.data.exercises[0].name === 'Squat' && Number(workout.data.exercises[0].weight) === 60,
  JSON.stringify(workout.data?.exercises));
const templates = (await call(A, 'GET', '/workouts/templates')).data;
check('saved as template', templates.length === 1 && templates[0].name === 'Legs' && templates[0].exercises.length === 2 && workout.data.template_id === templates[0].id);
check('workouts are per profile', (await call(H2, 'GET', '/workouts/sessions')).data.length === 0 && (await call(H2, 'GET', '/workouts/templates')).data.length === 0);
check("can't edit the other profile's workout",
  (await call(H2, 'PUT', `/workouts/sessions/${workout.data.id}`, { type: 'cardio', date: D })).status === 404);
const edited = await call(A, 'PUT', `/workouts/sessions/${workout.data.id}`, {
  title: 'Run', type: 'cardio', date: D, exercises: [{ name: 'Run', duration_minutes: 30, distance_km: 5.2 }],
});
check('workout edited (exercises replaced)', edited.data.exercises.length === 1 && Number(edited.data.exercises[0].distance_km) === 5.2 && edited.data.title === 'Run');
check('invalid workout rejected',
  (await call(A, 'POST', '/workouts/sessions', { type: 'strength', date: D, exercises: [{ name: 'Bench', reps: -3 }] })).status === 400 &&
  (await call(A, 'POST', '/workouts/sessions', { type: 'yoga!', date: D })).status === 400);
await call(A, 'DELETE', `/workouts/templates/${templates[0].id}`);
check('deleting a template keeps its workouts', (await call(A, 'GET', '/workouts/sessions')).data.length === 1);

// ── Password vault (server only ever sees ciphertext) ───────────────────────
const vaultKey = { salt: 'c2FsdHNhbHRzYWx0c2FsdA==', iterations: 600000, wrapped_key: 'd3JhcHBlZGtleXdyYXBwZWRrZXl3cmFwcGVka2V5d3JhcHBlZGtleQ==', wrap_iv: 'aXZpdml2aXZpdml2' };
check('vault starts empty', (await call(A, 'GET', '/vault/key')).data === null);
check('vault set up', (await call(A, 'POST', '/vault/key', vaultKey)).status === 200);
check('vault setup only once', (await call(A, 'POST', '/vault/key', vaultKey)).status === 409);
check('weak key-derivation params rejected', (await call(H2, 'POST', '/vault/key', { ...vaultKey, iterations: 1000 })).status === 400);
check('non-base64 entry rejected', (await call(A, 'POST', '/vault/items', { ciphertext: 'not base64!', iv: 'aXZpdml2aXZpdml2' })).status === 400);
const item = (await call(A, 'POST', '/vault/items', { ciphertext: 'Y2lwaGVydGV4dA==', iv: 'aXZpdml2aXZpdml2' })).data;
check('vault entry stored', item.ciphertext === 'Y2lwaGVydGV4dA==');
check("partner can't see the vault", (await call(H2, 'GET', '/vault/items')).data.length === 0 && (await call(H2, 'GET', '/vault/key')).data === null);
check("partner can't overwrite a vault entry", (await call(H2, 'PUT', `/vault/items/${item.id}`, { ciphertext: 'eA==', iv: 'aXZpdml2aXZpdml2' })).status === 404);
check("partner can't delete a vault entry", (await call(H2, 'DELETE', `/vault/items/${item.id}`)).status === 404);
check('vault key re-wrapped', (await call(A, 'PUT', '/vault/key', { ...vaultKey, salt: 'bmV3c2FsdG5ld3NhbHQ=' })).data.salt === 'bmV3c2FsdG5ld3NhbHQ=');

const passed = results.filter(Boolean).length;
console.log(`\n${passed}/${results.length} passed`);
process.exitCode = passed === results.length ? 0 : 1;
