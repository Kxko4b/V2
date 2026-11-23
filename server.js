/* Server manager (Admin → Server). Preset buttons, PM2 start/restart, and a command bar.
   Every request is stored in Supabase and answered by the server script. Owner only. */
(() => {
  'use strict';
  const PRESETS = [
    { id: 'status', label: 'Server status', hint: 'Uptime, memory and disk' },
    { id: 'processes', label: 'Running processes', hint: 'Top processes on the server' },
    { id: 'logs', label: 'Recent logs', hint: 'Last 50 lines of the server log' },
    { id: 'pm2_list', label: 'PM2 list', hint: 'Managed processes and restart counts' },
    { id: 'pm2_restart', label: 'Restart kxko-test', hint: 'Restarts the PM2 process', target: 'kxko-test', danger: true },
    { id: 'pm2_start', label: 'Start kxko-test', hint: 'Starts the PM2 process if stopped', target: 'kxko-test', danger: true },
  ];
  const LABELS = Object.fromEntries(PRESETS.map((p) => [p.id, p.label]));
  const out = () => document.getElementById('server-output');
  const section = () => document.getElementById('admin-server');
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function renderPresets() {
    const box = document.getElementById('server-presets');
    if (!box) return;
    box.innerHTML = PRESETS.map((p) =>
      `<button class="preset ${p.danger ? 'warn' : ''}" type="button" data-preset="${p.id}"${p.target ? ` data-target="${esc(p.target)}"` : ''}><b>${esc(p.label)}</b><small class="muted">${esc(p.hint)}</small></button>`
    ).join('');
  }

  // Command bar: type a shell command, confirm it, and it runs on the server.
  function renderCommandBar() {
    if (document.getElementById('server-command-form')) return;
    const host = section();
    if (!host) return;
    const form = document.createElement('form');
    form.id = 'server-command-form';
    form.className = 'command-bar';
    form.innerHTML = `
      <label class="field">Command
        <input id="server-command" maxlength="500" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="e.g. ls ~/server">
      </label>
      <button class="btn primary wide" type="submit">Run command</button>
      <p class="muted small">Runs as the Termux user on your phone. Each command asks for confirmation first. Commands longer than 20 seconds are stopped.</p>`;
    const pre = document.getElementById('server-output');
    host.querySelector('.panel').insertBefore(form, pre);
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const command = document.getElementById('server-command').value.trim();
      if (!command) return;
      if (!confirm(`Run this command on the server?\n\n${command}`)) return;
      send({ preset: 'custom', command }, `Command: ${command}`);
    });
  }

  async function sendRequest(body) {
    const api = window.kbApi;
    if (!api) throw new Error('The app is still loading. Try again in a moment.');
    if (!api.session()?.access_token) throw new Error('Sign in under Settings first.');
    if (!api.isOwner()) throw new Error('Only the owner account can use the server manager.');
    await api.ensureFresh();
    const rows = await api.call('/rest/v1/server_requests?select=id', { method: 'POST', body, prefer: 'return=representation' });
    if (!rows?.[0]?.id) throw new Error('The request was not created.');
    return rows[0].id;
  }

  async function waitForResult(id) {
    const started = Date.now();
    while (Date.now() - started < 90000) {
      await sleep(2000);
      const rows = await window.kbApi.call(`/rest/v1/server_requests?id=eq.${encodeURIComponent(id)}&select=status,output`);
      const row = rows?.[0];
      if (!row) throw new Error('The request disappeared.');
      if (row.status === 'done') return row.output || '(no output)';
      if (row.status === 'error') return `Error:\n${row.output || 'The server reported an error.'}`;
      out().textContent = `Waiting for the server… (${row.status})`;
    }
    throw new Error('The server did not answer in time. Check that the server script is running in Termux.');
  }

  async function send(body, label) {
    out().textContent = `${label}: sending request…`;
    try {
      const id = await sendRequest(body);
      out().textContent = `${label}: waiting for the server…`;
      const result = await waitForResult(id);
      out().textContent = `${label}\n\n${result}`;
    } catch (err) {
      out().textContent = `${label}: ${err.message}`;
    }
  }

  document.addEventListener('click', (e) => {
    const tab = e.target.closest('[data-admin-tab]');
    if (tab) {
      const isServer = tab.dataset.adminTab === 'server';
      section()?.classList.toggle('hidden', !isServer);
      if (isServer) { renderPresets(); renderCommandBar(); }
      return;
    }
    const button = e.target.closest('[data-preset]');
    if (!button) return;
    const preset = button.dataset.preset;
    const item = PRESETS.find((p) => p.id === preset);
    if (!item) { out().textContent = 'Unknown preset.'; return; }
    if (item.danger && !confirm(`${item.label}?\n\nThis affects the running server.`)) return;
    const body = { preset };
    if (button.dataset.target) body.target = button.dataset.target;
    send(body, LABELS[preset]);
  });

  renderPresets();
  renderCommandBar();
})();
