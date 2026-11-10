/* Briefing panel for the Today tab: latest briefing, the run log with every check, repair and AI message,
   and a retry button. Owner only; the database and the retry function enforce access. */
(() => {
  'use strict';

  const $ = (s) => document.querySelector(s);
  const api = () => window.kbApi;
  const esc = (v) => api().esc(v);

  const STATUS = {
    healthy: { text: 'Healthy', cls: 'ok' },
    repaired: { text: 'Repaired', cls: 'ok' },
    degraded: { text: 'Needs attention', cls: 'warn' },
    failed: { text: 'Failed', cls: 'bad' },
  };
  const KIND = { check: 'Check', repair: 'Repair', ai: 'AI message', escalation: 'Needs you' };
  const OUTCOME = { ok: 'OK', fixed: 'Fixed automatically', reported: 'Reported', stopped: 'Stopped' };

  let runs = [];
  let openRunId = null;

  const fmtTime = (iso) => new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  // Plain-language summary of what changed.
  function changeSummary(events) {
    const fixes = events.filter((e) => e.outcome === 'fixed');
    const aiMessages = events.filter((e) => e.kind === 'ai');
    const stopped = events.filter((e) => e.outcome === 'stopped');
    if (fixes.length) return { cls: 'ok', text: `Changed automatically: ${fixes.length} fix${fixes.length > 1 ? 'es' : ''}. The AI reviewer only recommends; the fixes come from safe rules.` };
    if (stopped.length) return { cls: 'bad', text: `Not fixed. ${stopped.length} problem${stopped.length > 1 ? 's' : ''} need${stopped.length > 1 ? '' : 's'} you.` };
    if (aiMessages.length) return { cls: 'warn', text: 'Nothing was changed. The AI reviewer left a message below.' };
    return { cls: 'ok', text: 'Nothing needed changing.' };
  }

  function eventCard(e) {
    const kind = KIND[e.kind] || e.kind;
    const outcome = OUTCOME[e.outcome] || e.outcome;
    return `
      <div class="bl-event ${esc(e.outcome)}">
        <div class="bl-meta"><span class="bl-kind">${esc(kind)}</span> <span class="muted small">· ${esc(e.component)} · ${esc(e.severity)} · ${esc(outcome)}</span></div>
        <div class="bl-found">${esc(e.found || '')}</div>
        ${e.action ? `<div class="bl-action">${esc(e.action)}</div>` : ''}
      </div>`;
  }

  async function loadEvents(runId) {
    return api().call(`/rest/v1/briefing_events?select=id,created_at,kind,component,severity,outcome,found,action&run_id=eq.${runId}&order=created_at.asc`);
  }

  async function renderLatest() {
    const box = $('#today-briefing');
    const latest = runs[0];
    if (!latest) { box.textContent = 'No briefing yet.'; return; }
    const st = STATUS[latest.status] || { text: latest.status, cls: '' };
    let events = [];
    try { events = await loadEvents(latest.id); } catch (err) { events = []; }
    const summary = changeSummary(events);
    const needsRetry = latest.status === 'degraded' || latest.status === 'failed';

    box.innerHTML = `
      <div class="bl-head">
        <span class="bl-badge ${st.cls}">${esc(st.text)}</span>
        <span class="muted small">${esc(fmtTime(latest.run_at))} · push ${latest.push_sent ? 'sent' : 'not sent'}</span>
      </div>
      <div class="bl-summary ${summary.cls}">${esc(summary.text)}</div>
      <div class="muted small">${esc(latest.summary || '')}</div>
      ${needsRetry ? `
        <div class="bl-retry">
          <button class="btn primary" id="bl-retry">Try again with the AI reviewer</button>
          <div class="admin-msg" id="bl-retry-msg"></div>
        </div>` : ''}
      <div class="bl-section"><div class="bl-title">What the checks found</div>
        ${events.length ? events.map(eventCard).join('') : '<div class="muted small">No checks were logged for this run.</div>'}
      </div>
      <div class="bl-section"><div class="bl-title">Briefing text</div>
        <div class="briefing">${renderText(latest.briefing)}</div>
      </div>`;
  }

  function renderText(text) {
    return String(text || '').split('\n').map((raw) => {
      const line = raw.trimEnd();
      if (!line.trim()) return '<div class="br-gap"></div>';
      const head = /^[A-ZÄÖÜ][A-ZÄÖÜ \/&-]{2,}$/.test(line.trim());
      return head ? `<div class="br-head">${esc(line.trim())}</div>` : `<div class="br-line">${esc(line)}</div>`;
    }).join('');
  }

  function renderLog() {
    const box = $('#today-briefing-history');
    if (runs.length < 2) { box.innerHTML = ''; return; }
    box.innerHTML = `<div class="bl-title">Run log</div>` + runs.map((r) => {
      const st = STATUS[r.status] || { text: r.status, cls: '' };
      return `
        <div class="bl-run" data-run="${esc(r.id)}">
          <div class="bl-run-row">
            <span>${esc(fmtTime(r.run_at))}</span>
            <span class="bl-badge ${st.cls}">${esc(st.text)}</span>
          </div>
          <div class="muted small">${esc(r.summary || '')}</div>
          <div class="bl-run-events" id="run-events-${esc(r.id)}"></div>
        </div>`;
    }).join('');
  }

  async function toggleRun(id) {
    const box = $(`#run-events-${id}`);
    if (!box) return;
    if (openRunId === id) { box.innerHTML = ''; openRunId = null; return; }
    openRunId = id;
    box.textContent = 'Loading…';
    try {
      const events = await loadEvents(id);
      box.innerHTML = events.length ? events.map(eventCard).join('') : '<div class="muted small">No checks logged.</div>';
    } catch (err) { box.textContent = err.message; }
  }

  async function retry() {
    const btn = $('#bl-retry'), msg = $('#bl-retry-msg');
    btn.disabled = true;
    msg.textContent = 'Running the briefing again… this can take a minute.'; msg.className = 'admin-msg ok';
    try {
      await api().ensureFresh();
      const res = await api().call('/functions/v1/briefing-retry', { method: 'POST', body: {} });
      if (res?.success === false) throw new Error(res.error || 'Retry failed');
      msg.textContent = `Done. Status: ${res.status || res.selfCheck?.status || 'checked'}.`;
      msg.className = 'admin-msg ok';
      await refresh(true);
    } catch (err) {
      msg.textContent = err.message; msg.className = 'admin-msg bad';
    } finally { btn.disabled = false; }
  }

  async function refresh(force = false) {
    if (!window.KB_TODAY?.canSee?.()) return;
    const box = $('#today-briefing');
    if (!force) box.textContent = 'Loading briefing…';
    try {
      runs = await api().call('/rest/v1/briefing_runs?select=id,run_at,date_key,status,summary,briefing,push_sent&order=run_at.desc&limit=14');
      await renderLatest();
      renderLog();
    } catch (err) {
      box.innerHTML = `<p class="bad small">Could not load the briefing: ${esc(err.message)}</p>`;
    }
  }

  document.addEventListener('click', (e) => {
    if (e.target.closest('#bl-retry')) return retry();
    const run = e.target.closest('.bl-run');
    if (run && !e.target.closest('.bl-run-events')) toggleRun(run.dataset.run);
  });

  window.KB_BRIEFING = { refresh };
})();
