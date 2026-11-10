<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="theme-color" content="#0b0d0c">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="apple-mobile-web-app-title" content="Kxko">
  <meta name="description" content="Kxko Brief: rides, study cards and a cycling quiz. Works offline.">
  <title>Kxko Brief</title>
  <link rel="manifest" href="manifest.json">
  <link rel="icon" href="icon.svg" type="image/svg+xml">
  <link rel="apple-touch-icon" href="icon.svg">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div class="shell">
    <header class="top">
      <div class="brand"><span class="logo">K</span><div><small id="date-line"></small><h1 id="page-title">Home</h1></div></div>
      <button class="chip-btn" id="theme-btn" aria-label="Toggle theme">Theme</button>
    </header>

    <!-- HOME -->
    <section class="view active" id="view-dashboard" data-title="Home">
      <div class="panel hero">
        <div class="ring-wrap">
          <svg viewBox="0 0 140 140" class="ring" aria-hidden="true">
            <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#c6f432"/><stop offset="1" stop-color="#7dd3fc"/></linearGradient></defs>
            <circle cx="70" cy="70" r="58" class="ring-track"/>
            <circle id="ring-arc" cx="70" cy="70" r="58" class="ring-arc"/>
          </svg>
          <div class="ring-center"><b id="ring-pct">0%</b><small>of goal</small></div>
        </div>
        <div class="hero-text">
          <p class="eyebrow" id="greeting"></p>
          <p class="hero-line" id="hero-line"></p>
          <p class="streak" id="streak"></p>
        </div>
      </div>

      <div class="grid4">
        <div class="panel kpi"><span>This week</span><b id="w-km">0</b><small id="w-unit">km</small></div>
        <div class="panel kpi"><span>Rides</span><b id="w-rides">0</b><small>this week</small></div>
        <div class="panel kpi"><span>Time</span><b id="w-time">0:00</b><small>hours</small></div>
        <div class="panel kpi"><span>Climb</span><b id="w-climb">0</b><small>m</small></div>
      </div>

      <div class="panel">
        <div class="head"><h2>Last 7 days</h2><small class="muted" id="bars-note"></small></div>
        <div class="bars" id="bars"></div>
      </div>

      <div class="panel">
        <div class="head"><h2>Personal records</h2><small class="muted">all rides</small></div>
        <div class="records" id="records"></div>
      </div>

      <div class="panel" id="last-card">
        <div class="head"><h2>Last ride</h2></div>
        <div id="last-ride" class="muted">No rides yet. Start one from the Ride tab.</div>
      </div>

      <div class="actions-col">
        <button class="action primary" data-goto="ride"><span>Start a ride</span><b>→</b></button>
        <button class="action" data-goto="study"><span>Study cards</span><b>→</b></button>
        <button class="action" data-goto="quiz"><span>Cycling quiz</span><b>→</b></button>
      </div>
    </section>

    <!-- RIDE -->
    <section class="view" id="view-ride" data-title="Ride">
      <div id="ride-idle" class="ride-idle">
        <p class="muted">GPS records distance, speed and climb. Keep this page open while you ride.</p>
        <button class="go" id="start-btn"><span>GO</span></button>
        <p class="muted small" id="ride-note"></p>
        <label class="toggle"><input type="checkbox" id="opt-autopause"> Auto-pause when stopped</label>
      </div>

      <div id="ride-active" class="hidden">
        <div class="status"><span class="dot" id="rec-dot"></span><span id="rec-label">Recording</span><span class="muted small" id="autopause-tag"></span></div>
        <div class="timer" id="timer">00:00</div>
        <div class="speedline"><b id="speed">0.0</b><span class="unit">km/h</span></div>
        <div class="grid3">
          <div class="panel kpi"><span>Distance</span><b id="dist">0.00</b><small class="unit">km</small></div>
          <div class="panel kpi"><span>Avg</span><b id="avg">0.0</b><small class="unit">km/h</small></div>
          <div class="panel kpi"><span>Climb</span><b id="climb">0</b><small class="unit">m</small></div>
        </div>
        <div class="panel map"><canvas id="live-route" class="route"></canvas></div>
        <div class="panel">
          <div class="head"><h2>Splits</h2><small class="muted">per km</small></div>
          <div id="splits" class="splits muted">Splits appear every kilometre.</div>
        </div>
        <div class="row">
          <button class="btn" id="pause-btn">Pause</button>
          <button class="btn danger" id="finish-btn">Finish</button>
        </div>
      </div>
    </section>

    <!-- STUDY -->
    <section class="view" id="view-study" data-title="Study">
      <div class="banner" id="study-banner"></div>
      <div class="panel">
        <div class="head"><h2 id="study-progress-label"></h2><small class="muted" id="study-topic"></small></div>
        <div class="meter"><div id="study-bar" class="meter-fill"></div></div>
        <div class="filters" id="study-filters"></div>
        <p class="muted small">Got it moves a card up. Again sends it back to the start.</p>
      </div>

      <div class="flashwrap">
        <div class="flash" id="flash" role="button" tabindex="0">
          <div class="face front"><span class="label" id="flash-label">Question</span><p id="flash-front"></p><small class="muted">Tap to flip</small></div>
          <div class="face back"><span class="label">Answer</span><p id="flash-back"></p></div>
        </div>
      </div>
      <div class="flash-actions">
        <button class="btn primary wide" id="show-btn">Show answer</button>
        <div id="grade-btns" class="row hidden">
          <button class="btn danger grow" id="again-btn">Again</button>
          <button class="btn primary grow" id="gotit-btn">Got it</button>
        </div>
      </div>
      <div class="panel done hidden" id="study-done">
        <h2>Deck complete</h2>
        <p class="muted">Every card in this topic has reached the top box.</p>
        <button class="btn" id="reset-study">Start over</button>
      </div>
    </section>

    <!-- QUIZ -->
    <section class="view" id="view-quiz" data-title="Test quiz">
      <div class="banner" id="quiz-banner"></div>
      <div class="panel">
        <div class="head"><h2 id="quiz-progress"></h2><small class="muted" id="quiz-score"></small></div>
        <div class="meter"><div id="quiz-bar" class="meter-fill"></div></div>
        <div class="meter timer-bar"><div id="quiz-timer" class="meter-fill"></div></div>
        <small class="muted">15 seconds per question. Running out counts as a miss.</small>
      </div>
      <div id="quiz-body"></div>
    </section>

    <!-- RIDES -->
    <section class="view" id="view-rides" data-title="Rides">
      <div class="grid3">
        <div class="panel kpi"><span>Rides</span><b id="r-count">0</b></div>
        <div class="panel kpi"><span>Distance</span><b id="r-km">0</b><small class="unit" id="r-unit">km</small></div>
        <div class="panel kpi"><span>Climb</span><b id="r-climb">0</b><small class="unit">m</small></div>
      </div>
      <div id="ride-list"></div>
    </section>

    <!-- SETTINGS -->
    <section class="view" id="view-settings" data-title="Settings">
      <div class="panel">
        <h2>Goals and units</h2>
        <label class="field">Weekly goal (km)<input type="number" id="set-goal" min="10" step="5"></label>
        <label class="field">Units<select id="set-units"><option value="km">Kilometres</option><option value="mi">Miles</option></select></label>
        <label class="toggle"><input type="checkbox" id="set-autopause"> Auto-pause by default</label>
      </div>
      <div class="panel">
        <h2>Theme</h2>
        <label class="field">Appearance<select id="set-theme"><option value="system">Match system</option><option value="dark">Dark</option><option value="light">Light</option></select></label>
      </div>
      <div class="panel" id="account-panel">
        <h2>Account</h2>
        <p class="muted small" id="set-role"></p>
        <form id="signin-form" class="signin">
          <label class="field">Email<input type="email" id="si-email" autocomplete="username" required></label>
          <label class="field">Password<input type="password" id="si-password" autocomplete="current-password" required></label>
          <button class="btn primary wide" type="submit" id="si-submit">Sign in</button>
          <p class="small" id="si-error" role="alert"></p>
        </form>
        <button class="btn wide hidden" id="signout-btn">Sign out</button>
      </div>
      <div class="panel">
        <h2>Backup</h2>
        <p class="muted small">Study and quiz content comes from your Supabase account after you sign in. Rides and progress stay in this browser. Export a file to keep them safe.</p>
        <div class="row">
          <button class="btn grow" id="export-btn">Export backup</button>
          <label class="btn grow file">Import backup<input type="file" id="import-file" accept="application/json" hidden></label>
        </div>
        <button class="btn danger wide" id="wipe-btn">Erase all data</button>
      </div>
      <p class="muted small center">Kxko Brief · works offline once installed</p>
    </section>
  </div>

  <nav class="tabbar" aria-label="Main">
    <button class="tab active" data-tab="dashboard"><svg viewBox="0 0 24 24"><path d="M4 11.5 12 5l8 6.5V20h-5v-5h-6v5H4z"/></svg><span>Home</span></button>
    <button class="tab" data-tab="ride"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/></svg><span>Ride</span></button>
    <button class="tab" data-tab="study"><svg viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="13" rx="3"/><path d="M8 10h8M8 14h5"/></svg><span>Study</span></button>
    <button class="tab" data-tab="quiz"><svg viewBox="0 0 24 24"><path d="M9 9a3 3 0 1 1 4 2.8c-.7.3-1 .9-1 1.7V15"/><circle cx="12" cy="18" r=".6"/></svg><span>Quiz</span></button>
    <button class="tab" data-tab="rides"><svg viewBox="0 0 24 24"><path d="M5 19V9M12 19V5M19 19v-7"/></svg><span>Rides</span></button>
    <button class="tab" data-tab="settings"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3"/></svg><span>Settings</span></button>
  </nav>

  <script src="data/config.js"></script>
  <script src="data/content.js"></script>
  <script src="app.js"></script>
</body>
</html>
