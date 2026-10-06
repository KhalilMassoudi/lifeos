// Sports, programs, BJJ space and the Instagram import (against a fake Graph API).
// Needs a server on an EMPTY database, started with the fake Graph API as its base:
//   META_GRAPH_BASE=http://localhost:3998 PORT=3999 DB_NAME=lifeos_test node server.js
//   node tests/training.mjs
import http from 'node:http';

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
const D = '2026-10-06';

// ── Fake Meta Graph API ─────────────────────────────────────────────────────
const graphCalls = [];
const fakeGraph = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  graphCalls.push(url);
  const token = url.searchParams.get('access_token');
  const send = (status, body) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(body)); };
  if (token === 'EXPIRED_TOKEN_0123456789abcdef') return send(400, { error: { code: 190, message: 'expired' } });
  if (url.pathname.endsWith('/me/accounts')) {
    return send(200, { data: [{ name: 'My page', instagram_business_account: { id: '17841400000000000', username: 'khalil.trains' } }] });
  }
  if (url.pathname.endsWith('/17841400000000000')) {
    const fields = url.searchParams.get('fields');
    if (!fields.startsWith('business_discovery.username(gracie_gym)')) return send(400, { error: { code: 110, message: 'not found' } });
    return send(200, {
      business_discovery: {
        username: 'gracie_gym', name: 'Gracie Gym',
        media: { data: [{ id: '1', caption: 'Lundi 19h Gi\nMercredi 19:00-20:30 No-Gi', media_type: 'IMAGE', media_url: 'https://cdn.example/1.jpg', permalink: 'https://www.instagram.com/p/1/', timestamp: '2026-10-05T10:00:00+0000' }] },
      },
    });
  }
  send(404, { error: { message: 'unknown' } });
});
await new Promise(r => fakeGraph.listen(3998, r));

// ── Setup ───────────────────────────────────────────────────────────────────
const A = (await call(null, 'POST', '/auth/register', { name: 'Khalil', password: 'khalil123' })).data.token;
await call(A, 'POST', '/auth/profiles', { name: 'Her', password: 'her12345' });
const herId = (await call(null, 'GET', '/auth/status')).data.profiles.find(p => p.name === 'Her').id;
const H = (await call(null, 'POST', '/auth/login', { userId: herId, password: 'her12345' })).data.token;

// ── Sports ──────────────────────────────────────────────────────────────────
const sports = (await call(A, 'GET', '/training/sports')).data;
check('default sports seeded', sports.length === 5 && sports.some(s => s.name === 'Gym'));
const bjj = await call(A, 'POST', '/training/sports', { name: 'Brazilian Jiu-Jitsu', emoji: '🥋' });
check('BJJ sport recognised', bjj.data.kind === 'bjj');
check('duplicate sport rejected', (await call(A, 'POST', '/training/sports', { name: 'Gym' })).status === 409);
check('sports are per profile', (await call(H, 'GET', '/training/sports')).data.every(s => s.kind === 'general'));

// ── Programs ────────────────────────────────────────────────────────────────
const gym = sports.find(s => s.name === 'Gym');
const prog = await call(A, 'POST', '/training/programs', {
  name: 'PPL', sport_id: gym.id,
  days: [
    { label: 'Push', weekday: 1, exercises: [{ name: 'Bench', sets: 4, reps: 8, weight: 60 }] },
    { label: 'Pull', weekday: 3, exercises: [{ name: 'Rows', sets: 4, reps: 10 }] },
  ],
});
check('program created with days', prog.status === 200 && prog.data.days.length === 2 && prog.data.sport.name === 'Gym', JSON.stringify(prog.data?.error));
const push = prog.data.days[0];
const w = await call(A, 'POST', '/workouts/sessions', { type: 'strength', date: D, sport_id: gym.id, program_day_id: push.id, exercises: [{ name: 'Bench', sets: 4, reps: 8, weight: 62.5 }] });
check('workout linked to program day', w.data.program_day_id === push.id && w.data.sport?.name === 'Gym');
const afterWorkout = (await call(A, 'GET', '/training/programs')).data[0];
check('program day knows when it was done', afterWorkout.days[0].last_done === D && Number(afterWorkout.days[0].times_done) === 1);

const edited = await call(A, 'PUT', `/training/programs/${prog.data.id}`, {
  name: 'PPL v2', sport_id: gym.id,
  days: [{ id: push.id, label: 'Push (heavy)', exercises: [{ name: 'Bench', sets: 5, reps: 5 }] }, { label: 'Legs', exercises: [] }],
});
check('editing keeps existing day ids and history', edited.data.days[0].id === push.id && edited.data.days[0].last_done === D && edited.data.days.length === 2);
check("partner can't use my program day",
  (await call(H, 'POST', '/workouts/sessions', { type: 'strength', date: D, program_day_id: push.id })).status === 404);
check("partner can't use my sport", (await call(H, 'POST', '/workouts/sessions', { type: 'strength', date: D, sport_id: gym.id })).status === 404);
check("partner can't see my programs", (await call(H, 'GET', '/training/programs')).data.length === 0);
check('program without days rejected', (await call(A, 'POST', '/training/programs', { name: 'x', days: [] })).status === 400);

// ── BJJ ─────────────────────────────────────────────────────────────────────
check('default belt is white', (await call(A, 'GET', '/bjj/profile')).data.belt === 'white');
const profile = await call(A, 'PUT', '/bjj/profile', { belt: 'blue', stripes: 2, promoted_on: '2026-03-01', gym_name: 'Gracie', gym_instagram: 'https://www.instagram.com/gracie_gym/' });
check('belt saved, gym username cleaned', profile.data.belt === 'blue' && profile.data.gym_instagram === 'gracie_gym');
check('invalid stripes rejected', (await call(A, 'PUT', '/bjj/profile', { belt: 'blue', stripes: 7 })).status === 400);

const armbar = (await call(A, 'POST', '/bjj/techniques', { name: 'Armbar from guard', position: 'closed_guard', category: 'submission', status: 'learning' })).data;
check('technique added', armbar.name === 'Armbar from guard');
check('duplicate technique (any case) rejected', (await call(A, 'POST', '/bjj/techniques', { name: 'ARMBAR FROM GUARD' })).status === 409);
const bulk = await call(A, 'POST', '/bjj/techniques/bulk', { techniques: [{ name: 'Triangle', category: 'submission', source: 'gym', source_label: 'Week 3' }, { name: 'armbar from guard' }] });
check('curriculum import skips known techniques', bulk.data.created === 1 && bulk.data.skipped === 1);
check('non-https video link rejected', (await call(A, 'POST', '/bjj/techniques', { name: 'X', video_url: 'javascript:alert(1)' })).status === 400);

const session = await call(A, 'POST', '/bjj/sessions', { date: D, class_type: 'nogi', duration_minutes: 90, rounds: 6, subs_hit: 2, subs_caught: 1, energy: 4, technique_ids: [armbar.id] });
check('BJJ session logged', session.status === 200 && session.data.technique_ids.length === 1);
const workouts = (await call(A, 'GET', '/workouts/sessions')).data;
const bjjWorkout = workouts.find(x => x.id === session.data.workout_session_id);
check('session also logged as a workout under the BJJ sport', bjjWorkout?.sport?.kind === 'bjj' && bjjWorkout.duration_minutes === 90 && bjjWorkout.title === 'No-Gi class');
check('practiced technique marked reviewed', (await call(A, 'GET', '/bjj/techniques')).data.find(t => t.id === armbar.id).last_reviewed === D);
await call(A, 'PUT', `/bjj/sessions/${session.data.id}`, { date: D, class_type: 'gi', duration_minutes: 60, technique_ids: [] });
check('editing a session updates its workout', (await call(A, 'GET', '/workouts/sessions')).data.find(x => x.id === bjjWorkout.id).duration_minutes === 60);
check("partner can't see my BJJ", (await call(H, 'GET', '/bjj/sessions')).data.length === 0 && (await call(H, 'GET', '/bjj/techniques')).data.length === 0);
const herSession = await call(H, 'POST', '/bjj/sessions', { date: D, class_type: 'gi', technique_ids: [armbar.id], log_workout: false });
check("partner can't attach my techniques", herSession.data.technique_ids.length === 0);
await call(A, 'DELETE', `/bjj/sessions/${session.data.id}`);
check('deleting a session removes its workout', !(await call(A, 'GET', '/workouts/sessions')).data.some(x => x.id === bjjWorkout.id));

const classes = await call(A, 'POST', '/bjj/classes/bulk', { source: 'instagram', classes: [{ weekday: 1, start_time: '19:00', end_time: '20:30', class_type: 'gi' }, { weekday: 3, start_time: '19:00', class_type: 'nogi', title: 'No-Gi' }] });
check('timetable imported', classes.data.length === 2 && classes.data[0].start_time === '19:00' && classes.data[0].title === 'Gi class');
await call(A, 'POST', '/bjj/classes', { weekday: 6, start_time: '11:00', class_type: 'open_mat' });
const replaced = await call(A, 'POST', '/bjj/classes/bulk', { source: 'instagram', replace: true, classes: [{ weekday: 2, start_time: '18:00', class_type: 'fundamentals' }] });
check('re-import replaces imported classes but keeps manual ones', replaced.data.length === 2 && replaced.data.some(c => c.class_type === 'open_mat'));
check('bad class time rejected', (await call(A, 'POST', '/bjj/classes', { weekday: 1, start_time: '25:00' })).status === 400);

// ── Instagram (fake Graph API) ──────────────────────────────────────────────
check('starts disconnected', (await call(A, 'GET', '/instagram/status')).data.connected === false);
check('posts need a connection', (await call(A, 'GET', '/instagram/posts?username=gracie_gym')).status === 400);
const bad = await call(A, 'POST', '/instagram/connect', { access_token: 'EXPIRED_TOKEN_0123456789abcdef' });
check('expired token explained', bad.status === 400 && /expired/i.test(bad.data.error));
const conn = await call(A, 'POST', '/instagram/connect', { access_token: 'GOOD_TOKEN_0123456789abcdefghij' });
check('connects and finds the linked IG account', conn.data.username === 'khalil.trains');
const status = await call(A, 'GET', '/instagram/status');
check('status never exposes the token', status.data.connected && !JSON.stringify(status.data).includes('GOOD_TOKEN'));
const posts = await call(A, 'GET', '/instagram/posts?username=@gracie_gym');
check('gym posts fetched', posts.data.account?.username === 'gracie_gym' && posts.data.posts[0].caption.includes('Lundi'), JSON.stringify(posts.data).slice(0, 120));
check('graph call used the expected version + field syntax',
  graphCalls.some(u => /\/v\d+\.0\/17841400000000000$/.test(u.pathname) && u.searchParams.get('fields').includes('media.limit(12)')));
const before = graphCalls.length;
await call(A, 'GET', '/instagram/posts?username=gracie_gym');
check('repeat fetch served from cache', graphCalls.length === before);
check('username injection rejected', (await call(A, 'GET', '/instagram/posts?username=' + encodeURIComponent('x){access_token}'))).status === 400);
check('unknown account explained', /couldn't find/i.test((await call(A, 'GET', '/instagram/posts?username=nobody_here')).data.error || ''));
check("partner isn't connected", (await call(H, 'GET', '/instagram/status')).data.connected === false);
await call(A, 'DELETE', '/instagram/connect');
check('disconnect', (await call(A, 'GET', '/instagram/status')).data.connected === false);

fakeGraph.close();
const passed = results.filter(Boolean).length;
console.log(`\n${passed}/${results.length} passed`);
process.exitCode = passed === results.length ? 0 : 1;
