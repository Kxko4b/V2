/* Kxko Brief V2 · web version. Plain JavaScript, no build step. */
(() => {
  'use strict';

  // ---------- constants ----------
  const WEEK_GOAL_M = 100_000;
  const DAY_MS = 86_400_000;
  const MAX_ACCURACY_M = 25;
  const MIN_STEP_M = 2;
  const MIN_CLIMB_M = 0.8;
  const MAX_BOX = 5;
  const RIDES_KEY = 'kxko.rides.v2';
  const STUDY_KEY = 'kxko.study.v2';

  const CARDS = [
    { id: 'tyre', front: 'Rough pressure range for 25 mm road tyres?', back: 'About 80–100 psi (5.5–7 bar), depending on rider weight and surface.' },
    { id: 'cadence', front: 'Cadence most riders find efficient?', back: 'Roughly 80–100 rpm.' },
    { id: 'abc', front: 'What does the ABC bike check cover?', back: 'Air (tyre pressure), Brakes, Chain and cranks.' },
    { id: 'helmet', front: 'How should a helmet fit?', back: 'Snug and level, sitting about two finger-widths above the eyebrows.' },
    { id: 'zone2', front: 'What is Zone 2 training?', back: 'Easy, conversational effort, roughly 60–70 % of max heart rate.' },
    { id: 'fluids', front: 'Typical fluid intake on a long ride?', back: 'Roughly 500–1000 ml per hour, more in heat or hard effort.' },
    { id: 'carbs', front: 'Carbs per hour on rides over 90 minutes?', back: 'Often around 30–60 g per hour.' },
    { id: 'bonk', front: "What is 'bonking'?", back: 'Sudden exhaustion from depleted glycogen stores.' },
    { id: 'left', front: 'Hand signal for turning left?', back: 'Left arm straight out to the side.' },
    { id: 'stop', front: 'Hand signal for stopping?', back: 'Left arm pointing down, palm facing back.' }
  ];

  // ---------- helpers ----------
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => [...document.querySelectorAll(sel)];
  const load = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
  const save = (key, value) => localStorage.setItem(key, JSON.stringify(value));

  const fmtDuration = (sec) => {
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    const p = (n) => String(n).padStart(2, '0');
    return h > 0 ? `${h}:${p(m)}:${p(s)}` : `${p(m)}:${p(s)}`;
  };
  const fmtKm = (m) => (m / 1000).toFixed(1);
  const fmtKmh = (mps) => (mps * 3.6).toFixed(1);
  const fmtDay = (ms) => new Date(ms).toLocaleDateString(undefined, { weekday: 'short' });
  const fmtDate = (ms) => new Date(ms).toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  const startOfDay = (ms) => { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); };
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function haversine(a, b) {
    const R = 6_371_000, toRad = (d) => d * Math.PI / 180;
    const dLat = toRad(b.lat - a.lat), dLon = toRad(b.lon - a.lon);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }

  /** Animates a number element from its current value to a new one. */
  const tweenText = (el, to, fmt = (v) => Math.round(v)) => {
    const from = parseFloat(el.dataset.v ?? '0') || 0;
    el.dataset.v = to;
    const start = performance.now(), dur = 700;
    const step = (now) => {
      const t = Math.min(1, (now - start) / dur), e = 1 - Math.pow(1 - t, 3);
      el.textContent = fmt(from + (to - from) * e);
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  // ---------- navigation ----------
  function show(tab) {
    $$('.view').forEach((v) => v.classList.toggle('active', v.id === `view-${tab}`));
    $$('.nav-item').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
    window.scrollTo({ top: 0, behavior: 'instant' });
    if (tab === 'home') renderHome();
    if (tab === 'study') renderStudy(true);
    if (tab === 'history') renderHistory();
  }
  $$('.nav-item').forEach((b) => b.addEventListener('click', () => show(b.dataset.tab)));
  $$('[data-goto]').forEach((b) => b.addEventListener('click', () => show(b.dataset.goto)));

  // ---------- clock + greeting ----------
  function tickClock() {
    const now = new Date();
    $('#clock').textContent = now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    const h = now.getHours();
    $('#greeting').textContent = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  }
  tickClock(); setInterval(tickClock, 30_000);

  // ---------- rides storage ----------
  const getRides = () => load(RIDES_KEY, []).sort((a, b) => b.startMs - a.startMs);
  const setRides = (r) => save(RIDES_KEY, r);

  // ---------- home ----------
  function renderHome() {
    const rides = getRides();
    const now = Date.now();
    const week = rides.filter((r) => now - r.startMs < 7 * DAY_MS);
    const weekM = week.reduce((s, r) => s + r.distanceM, 0);
    const weekSec = week.reduce((s, r) => s + r.durationSec, 0);
    const weekClimb = week.reduce((s, r) => s + r.elevGainM, 0);

    const frac = Math.min(1, weekM / WEEK_GOAL_M);
    $('#ring-arc').style.strokeDashoffset = String(415 * (1 - frac));
    tweenText($('#week-km'), weekM / 1000, (v) => v.toFixed(0));
    $('#week-rides').textContent = week.length;
    $('#week-time').textContent = fmtDuration(weekSec);
    $('#week-climb').textContent = `${weekClimb.toFixed(0)} m`;

    const days = [...Array(7)].map((_, i) => {
      const back = 6 - i, start = startOfDay(now - back * DAY_MS);
      const m = rides.filter((r) => r.startMs >= start && r.startMs < start + DAY_MS).reduce((s, r) => s + r.distanceM, 0);
      return { km: m / 1000, label: fmtDay(now - back * DAY_MS), today: back === 0 };
    });
    const max = Math.max(1, ...days.map((d) => d.km));
    $('#bars').innerHTML = days.map((d) => `
      <div class="bar-col">
        <div class="bar ${d.today ? 'today' : ''}" style="height:${d.km > 0 ? Math.max(6, (d.km / max) * 100) : 4}%"></div>
        <div class="bar-label">${esc(d.label)}</div>
      </div>`).join('');

    const last = rides[0];
    $('#last-ride').innerHTML = last
      ? `<div class="value">${fmtKm(last.distanceM)} km · ${fmtDuration(last.durationSec)}</div>
         <div class="muted small">Elevation +${last.elevGainM.toFixed(0)} m</div>`
      : 'No rides yet. Your first one will show up here.';

    const { due, mastered } = studyCounts();
    $('#study-status').textContent = due === 0 ? 'All cards mastered. Nice work.' : `${due} cards still in rotation`;
  }

  // ---------- route drawing ----------
  function drawRoute(canvas, points, progress = 1) {
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    canvas.width = w * dpr; canvas.height = h * dpr;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    if (points.length < 2) return;

    const pad = 22;
    const lats = points.map((p) => p.lat), lons = points.map((p) => p.lon);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
    const minLon = Math.min(...lons), maxLon = Math.max(...lons);
    const cosLat = Math.max(0.2, Math.cos(((minLat + maxLat) / 2) * Math.PI / 180));
    const rangeX = Math.max((maxLon - minLon) * cosLat, 1e-6);
    const rangeY = Math.max(maxLat - minLat, 1e-6);
    const scale = Math.min((w - 2 * pad) / rangeX, (h - 2 * pad) / rangeY);
    const offX = (w - rangeX * scale) / 2, offY = (h - rangeY * scale) / 2;
    const proj = (p) => [offX + (p.lon - minLon) * cosLat * scale, offY + (maxLat - p.lat) * scale];

    const n = Math.max(2, Math.floor(points.length * progress));
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#2ec4b6'); grad.addColorStop(1, '#5fe3d5');
    ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = grad;
    ctx.beginPath();
    points.slice(0, n).forEach((p, i) => { const [x, y] = proj(p); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
    ctx.stroke();

    const [sx, sy] = proj(points[0]);
    ctx.fillStyle = '#7be0a4'; ctx.beginPath(); ctx.arc(sx, sy, 6, 0, Math.PI * 2); ctx.fill();
    if (progress >= 1) {
      const [ex, ey] = proj(points[points.length - 1]);
      ctx.fillStyle = '#ff7a7a'; ctx.beginPath(); ctx.arc(ex, ey, 6, 0, Math.PI * 2); ctx.fill();
    }
  }

  function animateRoute(canvas, points) {
    const start = performance.now(), dur = 900;
    const step = (now) => {
      const t = Math.min(1, (now - start) / dur), e = 1 - Math.pow(1 - t, 3);
      drawRoute(canvas, points, e);
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  // ---------- ride recording ----------
  const live = {
    active: false, paused: false, startMs: 0, elapsedSec: 0,
    distanceM: 0, climbM: 0, speedMps: 0, maxSpeedMps: 0, points: [],
    watchId: null, ticker: null, wakeLock: null
  };

  function onPosition(pos) {
    if (!live.active || live.paused) return;
    const { latitude: lat, longitude: lon, accuracy, altitude, speed } = pos.coords;
    if (accuracy && accuracy > MAX_ACCURACY_M) return;
    const p = { lat, lon, alt: typeof altitude === 'number' ? altitude : null };
    const last = live.points[live.points.length - 1];
    if (last) {
      const step = haversine(last, p);
      if (step < MIN_STEP_M) return;
      live.distanceM += step;
      if (last.alt != null && p.alt != null && p.alt - last.alt > MIN_CLIMB_M) live.climbM += p.alt - last.alt;
    }
    live.points.push(p);
    const s = typeof speed === 'number' && speed >= 0 ? speed : 0;
    live.speedMps = s;
    live.maxSpeedMps = Math.max(live.maxSpeedMps, s);
    updateLiveUI();
  }

  function onPositionError(err) {
    $('#gps-note').textContent = `GPS problem: ${err.message}`;
  }

  async function keepAwake(on) {
    try {
      if (on && 'wakeLock' in navigator) live.wakeLock = await navigator.wakeLock.request('screen');
      else if (live.wakeLock) { await live.wakeLock.release(); live.wakeLock = null; }
    } catch { /* not supported or denied: fine */ }
  }

  function startRide() {
    if (!('geolocation' in navigator)) {
      $('#gps-note').textContent = 'This browser has no GPS access.';
      return;
    }
    Object.assign(live, { active: true, paused: false, startMs: Date.now(), elapsedSec: 0, distanceM: 0, climbM: 0, speedMps: 0, maxSpeedMps: 0, points: [] });
    $('#ride-idle').classList.add('hidden');
    $('#ride-active').classList.remove('hidden');
    updateLiveUI();
    live.watchId = navigator.geolocation.watchPosition(onPosition, onPositionError, { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 });
    live.ticker = setInterval(() => {
      if (!live.paused) { live.elapsedSec++; updateLiveUI(); }
    }, 1000);
    keepAwake(true);
  }

  function togglePause() {
    live.paused = !live.paused;
    live.speedMps = 0;
    updateLiveUI();
  }

  function finishRide() {
    if (!live.active) return;
    navigator.geolocation.clearWatch(live.watchId);
    clearInterval(live.ticker);
    keepAwake(false);
    if (live.points.length >= 2) {
      const ride = {
        id: live.startMs, startMs: live.startMs, durationSec: live.elapsedSec,
        distanceM: live.distanceM, elevGainM: live.climbM, maxSpeedMps: live.maxSpeedMps,
        points: live.points
      };
      setRides([ride, ...getRides()]);
    }
    live.active = false;
    $('#ride-active').classList.add('hidden');
    $('#ride-idle').classList.remove('hidden');
    $('#gps-note').textContent = live.points.length >= 2 ? 'Ride saved to History.' : 'Not enough GPS points, ride was not saved.';
  }

  function updateLiveUI() {
    $('#timer').textContent = fmtDuration(live.elapsedSec);
    $('#speed').textContent = fmtKmh(live.speedMps);
    $('#dist').textContent = fmtKm(live.distanceM);
    const avg = live.elapsedSec > 0 ? live.distanceM / live.elapsedSec : 0;
    $('#avg').textContent = fmtKmh(avg);
    $('#climb').textContent = live.climbM.toFixed(0);
    $('#pause-btn').textContent = live.paused ? 'Resume' : 'Pause';
    $('#rec-label').textContent = live.paused ? 'PAUSED' : 'RECORDING';
    $('#rec-label').classList.toggle('paused', live.paused);
    $('#rec-dot').classList.toggle('paused', live.paused);
    const canvas = $('#live-route');
    if (canvas.offsetParent) drawRoute(canvas, live.points);
  }

  $('#start-btn').addEventListener('click', startRide);
  $('#pause-btn').addEventListener('click', togglePause);
  $('#finish-btn').addEventListener('click', finishRide);
  // Pause the timer while the tab is hidden isn't needed: the interval simply keeps counting seconds of ride time.
  window.addEventListener('resize', () => { if (live.active) updateLiveUI(); });

  // ---------- study (Leitner boxes) ----------
  let current = null;
  let flipped = false;

  const getBoxes = () => load(STUDY_KEY, {});
  const boxOf = (boxes, id) => boxes[id] ?? 1;

  function studyCounts() {
    const boxes = getBoxes();
    const mastered = CARDS.filter((c) => boxOf(boxes, c.id) >= MAX_BOX).length;
    return { mastered, due: CARDS.length - mastered };
  }

  function nextCard() {
    const boxes = getBoxes();
    const open = CARDS.filter((c) => boxOf(boxes, c.id) < MAX_BOX);
    if (!open.length) return null;
    return open.reduce((best, c) => (boxOf(boxes, c.id) < boxOf(boxes, best.id) ? c : best));
  }

  function renderStudy(fresh = false) {
    const { mastered } = studyCounts();
    $('#study-bar').style.width = `${(mastered / CARDS.length) * 100}%`;
    $('#study-count').textContent = `${mastered} of ${CARDS.length} mastered`;

    if (fresh || !current) current = nextCard();
    const flash = $('#flash');
    if (!current) {
      flash.classList.add('hidden');
      $('#flash-actions').classList.add('hidden');
      $('#flash-wrap').insertAdjacentHTML('beforeend', '<div class="card done" id="done"><div class="big">Done</div><div class="muted">All cards are in the top box. Every card has reached mastery.</div></div>');
      return;
    }
    $('#done')?.remove();
    flash.classList.remove('hidden');
    $('#flash-actions').classList.remove('hidden');
    showFace(false, true);
  }

  function showFace(back, animate = false) {
    flipped = back;
    const flash = $('#flash');
    flash.classList.toggle('back', back);
    flash.style.transform = back ? 'rotateY(180deg)' : 'rotateY(0deg)';
    $('#flash-label').textContent = back ? 'ANSWER' : 'QUESTION';
    $('#flash-text').textContent = back ? current.back : current.front;
    $('#flash-text').className = 'flash-text';
    $('#flash-hint').classList.toggle('hidden', back);
    $('#show-btn').classList.toggle('hidden', back);
    $('#grade-btns').classList.toggle('hidden', !back);
    if (animate) {
      $('#flash-text').classList.add('flash-enter');
      setTimeout(() => $('#flash-text')?.classList.remove('flash-enter'), 420);
    }
  }

  function grade(gotIt) {
    const boxes = getBoxes();
    const b = boxOf(boxes, current.id);
    boxes[current.id] = gotIt ? Math.min(MAX_BOX, b + 1) : 1;
    save(STUDY_KEY, boxes);
    current = null;
    renderStudy(true);
  }

  $('#flash').addEventListener('click', () => current && showFace(!flipped));
  $('#flash').addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && current) { e.preventDefault(); showFace(!flipped); } });
  $('#show-btn').addEventListener('click', () => current && showFace(true));
  $('#gotit-btn').addEventListener('click', () => grade(true));
  $('#again-btn').addEventListener('click', () => grade(false));

  // ---------- history ----------
  function renderHistory() {
    const rides = getRides();
    const totalM = rides.reduce((s, r) => s + r.distanceM, 0);
    const totalSec = rides.reduce((s, r) => s + r.durationSec, 0);
    const totalClimb = rides.reduce((s, r) => s + r.elevGainM, 0);
    $('#h-count').textContent = rides.length;
    $('#h-km').textContent = fmtKm(totalM);
    $('#h-climb').textContent = totalClimb.toFixed(0);
    $('#h-total').textContent = `${fmtDuration(totalSec)} in the saddle`;

    const list = $('#ride-list');
    if (!rides.length) {
      list.innerHTML = '<div class="card empty"><div class="value">No rides yet</div><div class="muted small">Finished rides appear here with their route.</div></div>';
      return;
    }
    list.innerHTML = rides.map((r) => `
      <div class="card ride-item" data-id="${r.id}">
        <div class="top">
          <div>
            <div class="muted small">${esc(fmtDate(r.startMs))}</div>
            <div class="km">${fmtKm(r.distanceM)} km</div>
            <div class="muted small">${fmtDuration(r.durationSec)} · avg ${fmtKmh(r.durationSec ? r.distanceM / r.durationSec : 0)} km/h</div>
          </div>
        </div>
        <canvas class="route small" data-route="${r.id}"></canvas>
        <div class="ride-details">
          <div class="tiles">
            <div class="tile"><div class="label">Max</div><div class="value-s">${fmtKmh(r.maxSpeedMps)} <small>km/h</small></div></div>
            <div class="tile"><div class="label">Climb</div><div class="value-s">${r.elevGainM.toFixed(0)} <small>m</small></div></div>
            <div class="tile"><div class="label">Energy</div><div class="value-s">≈${Math.round(r.distanceM / 1000 * 32)} <small>kcal</small></div></div>
          </div>
          <button class="btn ghost danger wide" data-delete="${r.id}">Delete ride</button>
        </div>
      </div>`).join('');

    // Draw each thumbnail after layout so canvas sizes are known.
    requestAnimationFrame(() => $$('canvas[data-route]').forEach((c) => {
      const ride = rides.find((r) => String(r.id) === c.dataset.route);
      if (ride) drawRoute(c, ride.points);
    }));
  }

  $('#ride-list').addEventListener('click', (e) => {
    const del = e.target.closest('[data-delete]');
    if (del) {
      e.stopPropagation();
      if (confirm('Delete this ride?')) {
        setRides(getRides().filter((r) => String(r.id) !== del.dataset.delete));
        renderHistory();
      }
      return;
    }
    const item = e.target.closest('.ride-item');
    if (item) item.classList.toggle('open');
  });

  // ---------- start ----------
  show('home');
  window.addEventListener('pagehide', () => { if (live.active) finishRide(); });
})();
