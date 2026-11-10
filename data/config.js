/* Supabase connection. The publishable key is designed for browsers.
   Access to data is controlled by Supabase row-level security, not by this file. */
window.KB_SUPABASE = {
  url: 'https://ggewdpazpeoielbqrcgm.supabase.co',
  key: 'sb_publishable_RZYBKLqjC9UYLNdqlOKZCA_IFX-5Gvm'
};

/* Owner settings. Only this account sees the owner tabs (the database rules still decide what it can read).
   Later, with multi-user accounts, these move into each user's own settings. */
window.KB_CONFIG = {
  ownerEmail: 'haleannson@gmail.com',
  // Default weather place. Can be changed in Settings → Owner settings.
  weather: { name: 'Leonberg', lat: 48.80, lon: 9.02 },
  // Owner tabs that can be switched on or off in Settings.
  modules: [
    { key: 'today', label: 'Today (weather, briefing, homework)' },
    { key: 'timetable', label: 'School (WebUntis)' },
    { key: 'admin', label: 'Admin (examples, reviews, questions, requests)' },
  ],
};
