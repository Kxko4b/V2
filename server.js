/* Server manager (Admin → Server). Sends fixed preset requests to Supabase; the server script answers them. */
(() => {
  'use strict';
  const LABELS = { status: 'Server status', processes: 'Running processes', logs: 'Recent logs' };
  const out = () => document.getElementById('server-output');
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  async function sendPreset(preset) {
    const api = window.kbApi;
    if (!api) throw new Error('The app is still loading. Try again in a moment.');
    if (!api.session()?.access_token) throw new Error('Sign in under Settings first.');
    if (!api.isOwner()) throw new Error('Only the owner account can use the server manager.');
    await api.ensureFresh();
    const rows = await api.call('/rest/v1/server_requests?select=id', { method: 'POST', body: { preset }, prefer: 'return=representation' });
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

  document.addEventListener('click', async (e) => {
    const button = e.target.closest('[data-preset]');
    if (!button) return;
    const preset = button.dataset.preset;
    if (!LABELS[preset]) { out().textContent = 'Unknown preset.'; return; }
    out().textContent = `${LABELS[preset]}: sending request…`;
    try {
      const id = await sendPreset(preset);
      out().textContent = `${LABELS[preset]}: waiting for the server…`;
      const result = await waitForResult(id);
      out().textContent = `${LABELS[preset]}\n\n${result}`;
    } catch (err) {
      out().textContent = `${LABELS[preset]}: ${err.message}`;
    }
  });
})();
