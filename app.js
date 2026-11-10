/* Kxko Brief v4 · plain JavaScript, no build step. Data stays in this browser. */
(() => {
  'use strict';

  const KM_TO_MI = 0.621371;
  const DAY = 86_400_000;
  const MAX_ACCURACY_M = 25, MIN_STEP_M = 2, MIN_CLIMB_M = 0.8;
  const STOP_SPEED_MPS = 0.8, STOP_AFTER_SEC = 8;
  const MAX_BOX = 5, QUIZ_SECONDS = 15;
  const K = { rides: 'kb4.rides', study: 'kb4.study', settings: 'kb4.settings' };

  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const read = (k, f) => { try { return JSON.parse(localStorage.getItem(k)) ?? f; } catch { return f; } };
  const write = (k, v) => localStorage.setItem(k, JSON.stringify(v));
  const pad = (n) => String(n).padStart(2, '0');
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const defaults = { goalKm: 100, units: 'km', autoPause: false, theme: 'system' };
  const settings = () => ({ ...defaults, ...read(K.settings, {}) });
  const saveSettings = (p) => write(K.settings, { ...settings(), ...p });
  const rides = () => read(K.rides, []).sort((a, b) => b.startMs - a.startMs);
  const saveRides = (list) => write(K.rides, list);
  const content = window.KB_CONTENT || { study: [], cycling: [] };

  const fmtTime = (sec) => { const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60; return h ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`; };
  const unit = () => settings().units;
  const toDisp = (m) => (unit() === 'mi' ? m / 1000 * KM_TO_MI : m / 1000);
  const fmtDist = (m, d = 1) => toDisp(m).toFixed(d);
  const fmtSpeed = (mps) => (mps * 3.6 * (unit() === 'mi' ? KM_TO_MI : 1)).toFixed(1);
  const speedUnit = () => (unit() === 'mi' ? 'mph' : 'km/h');
  const dayKey = (ms) => { const d = new Date(ms); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
  const startOfDay = (ms) => { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); };
  const haversine = (a, b) => {
    const R = 6_371_000, r = (d) => d * Math.PI / 180;
    const dLat = r(b.lat - a.lat), dLon = r(b.lon - a.lon);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  };

  // ---------- theme ----------
  function applyTheme() {
    const pref = settings().theme;
    const dark = pref === 'dark' || (pref === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    document.querySelector('meta[name="theme-color"]').content = dark ? '#0b0d0c' : '#f4f6f3';
    $('#set-theme').value = pref;
  }
  $('#theme-btn').addEventListener('click', () => {
    const dark = document.documentElement.dataset.theme === 'dark';
    saveSettings({ theme: dark ? 'light' : 'dark' }); applyTheme();
  });
  $('#set-theme').addEventListener('change', (e) => { saveSettings({ theme: e.target.value }); applyTheme(); });
  matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => { if (settings().theme === 'system') applyTheme(); });

  // ---------- navigation ----------
  let currentTab = 'dashboard';
  function go(tab) {
    if (!$(`#view-${tab}`)) tab = 'dashboard';
    currentTab = tab;
    $$('.view').forEach((v) => v.classList.toggle('active', v.id === `view-${tab}`));
    $$('.tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === tab));
    $('#page-title').textContent = $(`#view-${tab}`).dataset.title;
    history.replaceState(null, '', `#${tab}`);
    try { window.scrollTo(0, 0); } catch { /* ignore */ }
    const renders = { dashboard: renderDashboard, study: renderStudy, quiz: () => (quiz.questions.length ? renderQuiz() : startQuiz()), rides: renderRides, settings: renderSettings, ride: renderRideIdle };
    try { renders[tab]?.(); } catch (err) { console.error('Kxko: could not draw', tab, err); }
    if (tab !== 'quiz') stopQuizTimer();
  }
  $$('.tab').forEach((b) => b.addEventListener('click', () => go(b.dataset.tab)));
  // Event delegation, so buttons drawn later (like the banner's Sign in) also work.
  document.addEventListener('click', (e) => { const g = e.target.closest('[data-goto]'); if (g) go(g.dataset.goto); });

  // ---------- dashboard ----------
  function streakDays(list) {
    const days = new Set(list.map((r) => dayKey(r.startMs)));
    let cursor = Date.now(), n = 0;
    if (!days.has(dayKey(cursor))) cursor -= DAY;
    while (days.has(dayKey(cursor))) { n++; cursor -= DAY; }
    return n;
  }

  function records(list) {
    if (!list.length) return [];
    const longest = list.reduce((a, r) => (r.distanceM > a.distanceM ? r : a));
    const climb = list.reduce((a, r) => (r.elevGainM > a.elevGainM ? r : a));
    const long = list.filter((r) => r.distanceM >= 5000);
    const fastest = long.length ? long.reduce((a, r) => (r.distanceM / r.durationSec > a.distanceM / a.durationSec ? r : a)) : null;
    const splitAll = list.flatMap((r) => (r.splits || []).map((s) => ({ ...s, ride: r })));
    const bestSplit = splitAll.length ? splitAll.reduce((a, s) => (s.sec < a.sec ? s : a)) : null;
    return [
      { label: 'Longest ride', value: `${fmtDist(longest.distanceM)} ${unit()}`, note: new Date(longest.startMs).toLocaleDateString() },
      { label: 'Most climb', value: `+${climb.elevGainM.toFixed(0)} m`, note: new Date(climb.startMs).toLocaleDateString() },
      { label: 'Fastest avg (5 km+)', value: fastest ? `${fmtSpeed(fastest.distanceM / fastest.durationSec)} ${speedUnit()}` : '—', note: fastest ? new Date(fastest.startMs).toLocaleDateString() : 'Ride 5 km to qualify' },
      { label: 'Best km split', value: bestSplit ? fmtTime(bestSplit.sec) : '—', note: bestSplit ? `km ${bestSplit.km}` : 'Complete a full km' }
    ];
  }

  function renderDashboard() {
    const s = settings(), list = rides(), now = Date.now(), d = new Date();
    $('#date-line').textContent = d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' });
    const h = d.getHours();
    $('#greeting').textContent = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';

    const week = list.filter((r) => now - r.startMs < 7 * DAY);
    const weekM = week.reduce((a, r) => a + r.distanceM, 0);
    const goalM = s.goalKm * 1000;
    const pct = Math.min(100, Math.round(weekM / goalM * 100));
    $('#ring-arc').style.strokeDashoffset = String(365 * (1 - pct / 100));
    $('#ring-pct').textContent = `${pct}%`;
    const left = Math.max(0, goalM - weekM);
    $('#hero-line').textContent = weekM === 0 ? 'Let’s get rolling this week.'
      : pct >= 100 ? 'Goal reached. Everything from here is a bonus.'
      : `${fmtDist(left)} ${unit()} to go this week.`;
    const streak = streakDays(list);
    $('#streak').textContent = streak ? `${streak} day${streak > 1 ? 's' : ''} in a row` : 'Ride today to start a streak';

    $('#w-km').textContent = fmtDist(weekM);
    $('#w-unit').textContent = unit();
    $('#w-rides').textContent = week.length;
    $('#w-time').textContent = fmtTime(week.reduce((a, r) => a + r.durationSec, 0)).replace(/^00:/, '0:');
    $('#w-climb').textContent = week.reduce((a, r) => a + r.elevGainM, 0).toFixed(0);
    $('#bars-note').textContent = `${unit()} per day`;

    const days = [...Array(7)].map((_, i) => {
      const back = 6 - i, t = now - back * DAY, start = startOfDay(t);
      const m = list.filter((r) => r.startMs >= start && r.startMs < start + DAY).reduce((a, r) => a + r.distanceM, 0);
      return { v: toDisp(m), label: new Date(t).toLocaleDateString(undefined, { weekday: 'short' }), today: back === 0 };
    });
    const max = Math.max(1, ...days.map((x) => x.v));
    $('#bars').innerHTML = days.map((x) => `<div class="bar-col ${x.today ? 'today' : ''}"><div class="bar" data-h="${x.v > 0 ? Math.max(6, x.v / max * 100) : 3}"></div><div class="bar-label">${esc(x.label)}</div></div>`).join('');
    requestAnimationFrame(() => $$('.bar').forEach((b) => (b.style.height = `${b.dataset.h}%`)));

    $('#records').innerHTML = list.length ? records(list).map((r) => `<div class="record"><span>${esc(r.label)}</span><b>${esc(r.value)}</b><br><small>${esc(r.note)}</small></div>`).join('')
      : '<p class="muted small" style="margin:0">Your records appear after your first ride.</p>';

    const last = list[0];
    $('#last-ride').innerHTML = last
      ? `<div class="head"><b style="font:700 22px var(--head)">${esc(rideTitle(last))}</b><span class="muted small">${fmtDist(last.distanceM)} ${unit()}</span></div>
         <p class="muted small" style="margin:0">${fmtTime(last.durationSec)} · avg ${fmtSpeed(last.durationSec ? last.distanceM / last.durationSec : 0)} ${speedUnit()} · climb +${last.elevGainM.toFixed(0)} m</p>`
      : 'No rides yet. Start one from the Ride tab.';
  }

  // ---------- ride recording ----------
  const live = { active: false, paused: false, autoPaused: false, startMs: 0, elapsed: 0, distanceM: 0, climbM: 0, speed: 0, maxSpeed: 0, points: [], splits: [], lastSplitSec: 0, stoppedFor: 0, watchId: null, timer: null, wake: null };

  function onPosition(pos) {
    if (!live.active) return;
    const c = pos.coords;
    if (c.accuracy && c.accuracy > MAX_ACCURACY_M) return;
    const p = { lat: c.latitude, lon: c.longitude, alt: typeof c.altitude === 'number' ? c.altitude : null };
    const last = live.points[live.points.length - 1];
    if (last) {
      const step = haversine(last, p);
      if (step < MIN_STEP_M) return;
      if (!live.paused) {
        live.distanceM += step;
        if (last.alt != null && p.alt != null && p.alt - last.alt > MIN_CLIMB_M) live.climbM += p.alt - last.alt;
      }
    }
    if (!live.paused) live.points.push(p);
    live.speed = typeof c.speed === 'number' && c.speed >= 0 ? c.speed : 0;
    if (!live.paused) live.maxSpeed = Math.max(live.maxSpeed, live.speed);
    while (live.distanceM >= (live.splits.length + 1) * 1000) {
      live.splits.push({ km: live.splits.length + 1, sec: live.elapsed - live.lastSplitSec });
      live.lastSplitSec = live.elapsed;
    }
    updateRideUI();
  }

  function tick() {
    if (!live.active) return;
    const s = settings();
    if (s.autoPause || live.autoPaused) {
      live.stoppedFor = live.speed < STOP_SPEED_MPS ? live.stoppedFor + 1 : 0;
      if (s.autoPause && !live.paused && live.stoppedFor >= STOP_AFTER_SEC) { live.paused = true; live.autoPaused = true; }
      if (live.autoPaused && live.paused && live.speed >= STOP_SPEED_MPS) { live.paused = false; live.autoPaused = false; }
    }
    if (!live.paused) live.elapsed++;
    updateRideUI();
  }

  async function keepAwake(on) {
    try {
      if (on && 'wakeLock' in navigator) live.wake = await navigator.wakeLock.request('screen');
      else if (live.wake) { await live.wake.release(); live.wake = null; }
    } catch { /* optional */ }
  }

  function renderRideIdle() {
    if (live.active) { $('#ride-idle').classList.add('hidden'); $('#ride-active').classList.remove('hidden'); updateRideUI(); return; }
    $('#ride-idle').classList.remove('hidden'); $('#ride-active').classList.add('hidden');
    $('#opt-autopause').checked = settings().autoPause;
  }

  function startRide() {
    if (!('geolocation' in navigator)) { $('#ride-note').textContent = 'This browser cannot access GPS.'; return; }
    saveSettings({ autoPause: $('#opt-autopause').checked });
    Object.assign(live, { active: true, paused: false, autoPaused: false, startMs: Date.now(), elapsed: 0, distanceM: 0, climbM: 0, speed: 0, maxSpeed: 0, points: [], splits: [], lastSplitSec: 0, stoppedFor: 0 });
    live.watchId = navigator.geolocation.watchPosition(onPosition, (err) => { $('#ride-note').textContent = `GPS: ${err.message}`; }, { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 });
    live.timer = setInterval(tick, 1000);
    keepAwake(true);
    renderRideIdle();
  }

  function finishRide() {
    if (!live.active) return;
    navigator.geolocation.clearWatch(live.watchId);
    clearInterval(live.timer); keepAwake(false);
    live.active = false;
    if (live.points.length >= 2 && live.distanceM > 20) {
      const ride = { id: live.startMs, startMs: live.startMs, durationSec: live.elapsed, distanceM: live.distanceM, elevGainM: live.climbM, maxSpeedMps: live.maxSpeed, splits: live.splits, points: live.points, name: '', notes: '' };
      saveRides([ride, ...rides()]);
      $('#ride-note').textContent = 'Ride saved. Name it in the Rides tab.';
    } else {
      $('#ride-note').textContent = 'Too short to save.';
    }
    renderRideIdle();
  }

  function updateRideUI() {
    if (!live.active) return;
    $('#timer').textContent = fmtTime(live.elapsed);
    $('#speed').textContent = live.paused ? '0.0' : fmtSpeed(live.speed);
    $('#dist').textContent = fmtDist(live.distanceM, 2);
    $('#dist').parentElement.querySelector('.unit').textContent = unit();
    $('#avg').textContent = fmtSpeed(live.elapsed > 0 ? live.distanceM / live.elapsed : 0);
    $('#climb').textContent = live.climbM.toFixed(0);
    $('#pause-btn').textContent = live.paused ? 'Resume' : 'Pause';
    $('#rec-label').textContent = live.autoPaused ? 'Auto-paused' : live.paused ? 'Paused' : 'Recording';
    $('#rec-dot').classList.toggle('paused', live.paused);
    $('#autopause-tag').textContent = settings().autoPause ? 'auto-pause on' : '';
    renderSplits(live.splits, $('#splits'));
    if ($('#live-route').offsetParent) drawRoute($('#live-route'), live.points);
  }

  function renderSplits(splits, box) {
    if (!splits.length) { box.innerHTML = 'Splits appear every kilometre.'; return; }
    const best = Math.min(...splits.map((s) => s.sec));
    box.innerHTML = splits.map((s) => `<div class="split ${s.sec === best ? 'best' : ''}"><span>${s.km} km</span><div class="track"><div class="fill" style="width:${Math.max(8, best / s.sec * 100)}%"></div></div><span>${fmtTime(s.sec)}</span></div>`).join('');
    requestAnimationFrame(() => box.querySelectorAll('.fill').forEach((f) => (f.style.width = f.style.width)));
  }

  $('#start-btn').addEventListener('click', startRide);
  $('#pause-btn').addEventListener('click', () => { live.paused = !live.paused; live.autoPaused = false; updateRideUI(); });
  $('#finish-btn').addEventListener('click', finishRide);
  $('#opt-autopause').addEventListener('change', (e) => saveSettings({ autoPause: e.target.checked }));
  window.addEventListener('resize', () => { if (live.active) updateRideUI(); });
  window.addEventListener('pagehide', () => { if (live.active) finishRide(); });

  function drawRoute(canvas, pts, { empty = 'Route appears once GPS locks on' } = {}) {
    const dpr = window.devicePixelRatio || 1, w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    canvas.width = w * dpr; canvas.height = h * dpr;
    const ctx = canvas.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
    if (pts.length < 2) { ctx.fillStyle = getComputedStyle(canvas).color; ctx.globalAlpha = .45; ctx.font = '14px Inter, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(empty, w / 2, h / 2); ctx.globalAlpha = 1; return; }
    const pad = 24;
    const lats = pts.map((p) => p.lat), lons = pts.map((p) => p.lon);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats), minLon = Math.min(...lons), maxLon = Math.max(...lons);
    const cos = Math.max(0.2, Math.cos((minLat + maxLat) / 2 * Math.PI / 180));
    const rx = Math.max((maxLon - minLon) * cos, 1e-6), ry = Math.max(maxLat - minLat, 1e-6);
    const sc = Math.min((w - 2 * pad) / rx, (h - 2 * pad) / ry), ox = (w - rx * sc) / 2, oy = (h - ry * sc) / 2;
    const P = (p) => [ox + (p.lon - minLon) * cos * sc, oy + (maxLat - p.lat) * sc];
    const lime = getComputedStyle(document.documentElement).getPropertyValue('--lime').trim() || '#c6f432';
    ctx.lineWidth = 4; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.strokeStyle = lime;
    ctx.beginPath(); pts.forEach((p, i) => { const [x, y] = P(p); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke();
    const [sx, sy] = P(pts[0]), [ex, ey] = P(pts[pts.length - 1]);
    ctx.fillStyle = '#7be0a4'; ctx.beginPath(); ctx.arc(sx, sy, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = lime; ctx.beginPath(); ctx.arc(ex, ey, 6, 0, Math.PI * 2); ctx.fill();
  }

  // ---------- rides ----------
  const rideTitle = (r) => r.name || `Ride · ${new Date(r.startMs).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}`;

  function gpxFor(r) {
    const pts = r.points.map((p) => `      <trkpt lat="${p.lat}" lon="${p.lon}">${p.alt != null ? `<ele>${p.alt.toFixed(1)}</ele>` : ''}</trkpt>`).join('\n');
    return `<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="Kxko Brief" xmlns="http://www.topografix.com/GPX/1/1">\n  <trk><name>${esc(rideTitle(r))}</name>\n    <trkseg>\n${pts}\n    </trkseg>\n  </trk>\n</gpx>`;
  }

  function download(name, text, type = 'application/octet-stream') {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const a = Object.assign(document.createElement('a'),
