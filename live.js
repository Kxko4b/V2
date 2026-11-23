/* Live refresh: keeps Home, ride history and Planner current without a reload.
   It skips anything the user is in the middle of (typing, recording, a quiz or flashcard). */
(() => {
  'use strict';
  const EVERY_MS = 60000;

  const activeView = () => document.querySelector('.view.active')?.id.replace('view-', '') || '';
  const activeSub = (view) => document.querySelector(`#view-${view} [data-sub-btn].on`)?.dataset.subBtn || '';
  const typing = () => ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName);
  const recording = () => {
    const active = document.getElementById('ride-active');
    return Boolean(active) && !active.classList.contains('hidden');
  };

  // Re-draws a screen by pressing its own button, keeping the scroll position where it was.
  function redraw(button) {
    if (!button) return;
    const y = window.scrollY;
    button.click();
    window.scrollTo(0, y);
  }

  function refreshNow() {
    if (document.hidden || typing() || recording()) return;
    const view = activeView();
    if (view === 'dashboard') {
      redraw(document.querySelector('.tab[data-tab="dashboard"]'));
    } else if (view === 'rides' && activeSub('rides') === 'history') {
      redraw(document.querySelector('#view-rides [data-sub-btn="history"]'));
    } else if (view === 'planner') {
      if (activeSub('planner') === 'school') window.KB_TIMETABLE?.refresh?.();
      else window.KB_TODAY?.refresh?.();
    }
  }

  setInterval(refreshNow, EVERY_MS);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshNow(); });
})();
