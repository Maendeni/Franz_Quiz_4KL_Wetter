// ════════════════════════════════════════════════════════════
//  KONTO & SYNCHRONISATION (Supabase) – optional
//
//  Ohne Eintrag in config.js passiert hier nichts: das Quiz
//  speichert wie bisher nur im Browser (Schlüssel franz_quiz_v1).
//
//  Mit Konto:
//  - Ein Eltern-Login (E-Mail + Passwort) pro Familie.
//  - Pro Kind ein Profil. Das Gerät merkt sich das zuletzt
//    gewählte Profil, das Kind landet also direkt bei sich.
//  - Jedes Profil hat seinen eigenen lokalen Speicher
//    (franz_quiz_v1__<profil-id>) und wird mit der Datenbank
//    abgeglichen. Bei zwei Ständen gewinnt der jüngere.
//  - Ohne Netz wird lokal weitergespeichert und später
//    hochgeladen.
// ════════════════════════════════════════════════════════════
const Konto = (() => {
  const cfg = window.QUIZ_CONFIG || {};
  const konfiguriert = !!(cfg.supabaseUrl && cfg.supabaseAnonKey);
  const SUPABASE_JS = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.119.0/dist/umd/supabase.js';
  const GAST = 'franz_quiz_v1';
  const LS_PROFIL = 'franz_quiz_profil';

  let client = null;
  let session = null;
  let profile = [];            // Profile des angemeldeten Kontos
  let profil = leseProfil();   // aktives Profil auf diesem Gerät { id, name }
  let status = 'ok';           // ok | laedt | offline | abgemeldet
  let ansicht = null;          // null = automatisch, sonst 'login' | 'neu-pw' | 'profile'
  let meldung = null;          // { text, fehler }
  let verwalten = false;       // Profile löschen erlauben

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g,
      c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  /* ---------------- Lokaler Zustand ---------------- */

  function leseProfil() {
    if (!konfiguriert) return null;
    try { return JSON.parse(localStorage.getItem(LS_PROFIL)) || null; } catch (e) { return null; }
  }

  function merkeProfil(p) {
    profil = p ? { id: p.id, name: p.name } : null;
    try {
      if (profil) localStorage.setItem(LS_PROFIL, JSON.stringify(profil));
      else localStorage.removeItem(LS_PROFIL);
    } catch (e) {}
  }

  // Speicherschlüssel des aktiven Profils, null = Gast (wie bisher)
  function schluessel() {
    return profil ? `${GAST}__${profil.id}` : null;
  }

  function leseLokal(key) {
    try { const roh = localStorage.getItem(key); return roh ? JSON.parse(roh) : null; } catch (e) { return null; }
  }

  function hatFortschritt(d) {
    return !!d && ((d.xp && (d.xp.fr > 0 || d.xp.en > 0)) || Object.keys(d.decks || {}).length > 0);
  }

  // Gast-Stand inkl. Umzug vom ganz alten Format (quiz_xp)
  function gastStand() {
    const d = leseLokal(GAST);
    if (d) return d;
    const alt = parseInt((() => { try { return localStorage.getItem('quiz_xp'); } catch (e) { return null; } })() || '0');
    return alt > 0 ? { xp: { fr: alt, en: 0 } } : null;
  }

  /* ---------------- Supabase laden ---------------- */

  function ladeBibliothek() {
    if (window.supabase && window.supabase.createClient) return Promise.resolve(true);
    return new Promise(resolve => {
      const s = document.createElement('script');
      s.src = SUPABASE_JS;
      s.onload = () => resolve(!!(window.supabase && window.supabase.createClient));
      s.onerror = () => resolve(false);
      document.head.appendChild(s);
      setTimeout(() => resolve(false), 10000);
    });
  }

  async function start() {
    if (!konfiguriert) return;
    renderLeiste();

    if (!(await ladeBibliothek())) { status = 'offline'; renderLeiste(); return; }

    client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
    client.auth.onAuthStateChange((ev, s) => {
      session = s;
      // Link aus der "Passwort vergessen"-Mail geöffnet
      if (ev === 'PASSWORD_RECOVERY') { ansicht = 'neu-pw'; zeigeKonto(); }
    });

    try { session = (await client.auth.getSession()).data.session; } catch (e) { session = null; }

    window.addEventListener('online', () => { hochladenJetzt(); });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') hochladenJetzt();
      // Zurück in der App: Stand von anderen Geräten holen, aber nie mitten in einer Runde
      else if (!document.body.classList.contains('quiz')) synchronisiere();
    });

    if (!session) {
      if (profil) status = 'abgemeldet';
      renderLeiste();
      return;
    }

    try {
      await ladeProfile();
    } catch (e) {
      console.error(e);
      status = 'offline';
      renderLeiste();
      return;
    }

    // Profil wurde auf einem anderen Gerät gelöscht
    if (profil && !profile.some(p => p.id === profil.id)) wechsleZuGast();

    if (profil) await synchronisiere();
    else if (ansicht !== 'neu-pw') zeigeKonto();   // angemeldet, aber noch kein Kind gewählt
    renderLeiste();
  }

  /* ---------------- Abgleich ---------------- */

  let timer = null;
  let ausstehend = false;
  let kette = Promise.resolve();

  // Wird von speichere() nach jeder Änderung aufgerufen
  function geaendert() {
    if (!profil) return;
    ausstehend = true;
    clearTimeout(timer);
    timer = setTimeout(hochladenJetzt, 2500);
  }

  // Uploads nacheinander, damit ein älterer Stand nie einen neueren überholt
  function hochladenJetzt() {
    clearTimeout(timer);
    timer = null;
    const lauf = kette.then(async () => {
      if (!client || !session || !profil || !ausstehend) return;
      const id = profil.id;
      const stand = JSON.parse(JSON.stringify(daten));
      ausstehend = false;
      try {
        const { error } = await client.from('progress')
          .upsert({ profile_id: id, data: stand, updated_at: new Date().toISOString() });
        if (error) throw error;
        status = 'ok';
      } catch (e) {
        console.error(e);
        ausstehend = true;
        status = istAuthFehler(e) ? 'abgemeldet' : 'offline';
      }
      renderLeiste();
    });
    kette = lauf.catch(() => {});
    return lauf;
  }

  async function synchronisiere() {
    if (!client || !session || !profil) return;
    await hochladenJetzt();   // eigene Änderungen zuerst los werden
    const id = profil.id;
    status = 'laedt';
    renderLeiste();
    try {
      const { data, error } = await client.from('progress')
        .select('data').eq('profile_id', id).maybeSingle();
      if (error) throw error;
      if (!profil || profil.id !== id) return;   // inzwischen gewechselt

      const server = data ? data.data : null;
      const lokal = leseLokal(schluessel());
      const tServer = (server && server.geaendert) || 0;
      const tLokal = (lokal && lokal.geaendert) || 0;

      if (server && (!lokal || tServer > tLokal)) {
        uebernehmeDaten(server);
      } else if (lokal && tLokal > tServer) {
        ausstehend = true;
        await hochladenJetzt();
      }
      if (status === 'laedt') status = 'ok';
    } catch (e) {
      console.error(e);
      status = istAuthFehler(e) ? 'abgemeldet' : 'offline';
    }
    renderLeiste();
  }

  function istAuthFehler(e) {
    const m = String((e && (e.message || e.code)) || '');
    return /JWT|401|42501|permission|row-level/i.test(m);
  }

  /* ---------------- Profile ---------------- */

  async function ladeProfile() {
    const { data, error } = await client.from('profiles').select('id, name').order('created_at', { ascending: true });
    if (error) throw error;
    profile = data || [];
  }

  async function waehleProfil(p) {
    await hochladenJetzt();   // Stand des bisherigen Profils sichern
    merkeProfil(p);
    status = 'ok';
    uebernehmeDaten(leseLokal(schluessel()) || leereDaten());
    ansicht = null;
    meldung = null;
    zumMenu();
    await synchronisiere();
  }

  function wechsleZuGast() {
    merkeProfil(null);
    uebernehmeDaten(gastStand() || leereDaten());
  }

  async function neuesProfil(name, gastUebernehmen) {
    const { data, error } = await client.from('profiles').insert({ name }).select('id, name');
    if (error) throw error;
    const p = data[0];

    if (gastUebernehmen) {
      const gast = gastStand();
      if (gast) {
        gast.geaendert = Date.now();
        try { localStorage.setItem(`${GAST}__${p.id}`, JSON.stringify(gast)); } catch (e) {}
        const { error: e2 } = await client.from('progress').upsert({ profile_id: p.id, data: gast, updated_at: new Date().toISOString() });
        if (e2) throw e2;
      }
    }

    await ladeProfile();
    await waehleProfil(p);
  }

  async function loescheProfil(p) {
    if (!confirm(`Profil «${p.name}» mit dem ganzen Fortschritt löschen?`)) return;
    const { error } = await client.from('profiles').delete().eq('id', p.id);
    if (error) throw error;
    try { localStorage.removeItem(`${GAST}__${p.id}`); } catch (e) {}
    if (profil && profil.id === p.id) wechsleZuGast();
    await ladeProfile();
    renderKonto();
  }

  /* ---------------- Ansicht: Leiste im Menü ---------------- */

  function renderLeiste() {
    const el = document.getElementById('konto-leiste');
    if (!el) return;
    if (!konfiguriert) { el.innerHTML = ''; return; }

    let emoji = '☁️', titel, unter;
    if (profil) {
      emoji = '👤';
      titel = esc(profil.name);
      unter = {
        ok: session ? 'Fortschritt auf allen Geräten gespeichert · wechseln' : 'wechseln',
        laedt: 'wird abgeglichen …',
        offline: '⚠️ Gerade offline – wird später gespeichert',
        abgemeldet: '⚠️ Abgemeldet – tippen zum Anmelden',
      }[status] || 'wechseln';
    } else if (session) {
      titel = 'Wer übt?';
      unter = 'Profil wählen';
    } else {
      titel = 'Fortschritt auf allen Geräten';
      unter = 'Anmelden oder Konto erstellen';
    }

    el.innerHTML = `
      <button class="konto-leiste ${status === 'offline' || status === 'abgemeldet' ? 'warnung' : ''}" onclick="Konto.zeigeKonto()">
        <span class="emoji">${emoji}</span>
        <span class="t"><b>${titel}</b><span>${unter}</span></span>
        <span class="go">›</span>
      </button>`;
  }

  /* ---------------- Ansicht: Konto-Seite ---------------- */

  function zeigeKonto() {
    if (!konfiguriert) return;
    document.body.classList.remove('quiz');
    document.body.classList.add('konto');
    document.getElementById('kopf').textContent = '✦ Konto ✦';
    renderKonto();
    window.scrollTo(0, 0);
  }

  function aktuelleAnsicht() {
    if (ansicht) return ansicht;
    return session ? 'profile' : 'login';
  }

  function renderKonto() {
    const el = document.getElementById('konto');
    if (!el) return;

    const info = meldung
      ? `<p class="konto-meldung ${meldung.fehler ? 'fehler' : ''}">${esc(meldung.text)}</p>`
      : '';

    if (!client) {
      el.innerHTML = `<div class="konto-karte"><h2>Konto</h2>
        <p>Die Verbindung zum Speicher ist gerade nicht möglich. Der Fortschritt wird auf diesem Gerät gesichert.</p></div>`;
      return;
    }

    const v = aktuelleAnsicht();

    if (v === 'neu-pw') {
      el.innerHTML = `
        <form class="konto-karte" onsubmit="event.preventDefault(); Konto.setzePasswort()">
          <h2>Neues Passwort</h2>
          ${info}
          <label>Neues Passwort<input id="k-pw-neu" type="password" autocomplete="new-password" minlength="6" required></label>
          <button class="restart-btn" type="submit">Speichern</button>
        </form>`;
      return;
    }

    if (v === 'login') {
      el.innerHTML = `
        <form class="konto-karte" onsubmit="event.preventDefault(); Konto.anmelden()">
          <h2>Eltern-Login</h2>
          <p>Mit einem Konto wird der Fortschritt jedes Kindes gespeichert und ist auf allen Geräten gleich.</p>
          ${info}
          <label>E-Mail<input id="k-mail" type="email" autocomplete="email" required></label>
          <label>Passwort<input id="k-pw" type="password" autocomplete="current-password" minlength="6" required></label>
          <button class="restart-btn" type="submit">Anmelden</button>
          ${cfg.registrierungErlaubt !== false
            ? `<button class="menu-btn" type="button" onclick="Konto.registrieren()">Konto erstellen</button>` : ''}
          <button class="link-btn" type="button" onclick="Konto.passwortVergessen()">Passwort vergessen?</button>
        </form>
        <button class="link-btn" type="button" onclick="zumMenu()">Ohne Anmeldung üben (nur auf diesem Gerät)</button>`;
      return;
    }

    // Profile
    const gast = gastStand();
    const angebot = hatFortschritt(gast);
    const liste = profile.map(p => `
      <div class="profil-zeile">
        <button class="profil ${profil && profil.id === p.id ? 'aktiv' : ''}" onclick="Konto.waehle('${esc(p.id)}')">
          <span class="emoji">🧙</span><b>${esc(p.name)}</b>
        </button>
        ${verwalten ? `<button class="profil-weg" onclick="Konto.loesche('${esc(p.id)}')" aria-label="${esc(p.name)} löschen">✕</button>` : ''}
      </div>`).join('');

    el.innerHTML = `
      <div class="konto-karte">
        <h2>Wer übt?</h2>
        ${info}
        <div class="profil-liste">${liste || '<p>Noch kein Profil – lege für jedes Kind eines an.</p>'}</div>
        <form class="profil-neu" onsubmit="event.preventDefault(); Konto.neu()">
          <label>Neues Profil (Vorname)<input id="k-name" type="text" maxlength="30" autocomplete="off" required></label>
          ${angebot ? `
            <label class="haken"><input id="k-gast" type="checkbox" ${profile.length === 0 ? 'checked' : ''}>
              Bisherigen Fortschritt von diesem Gerät übernehmen</label>` : ''}
          <button class="menu-btn" type="submit">＋ Profil anlegen</button>
        </form>
      </div>
      <div class="konto-fuss">
        <span>${esc(session && session.user ? session.user.email : '')}</span>
        ${profile.length ? `<button class="link-btn" type="button" onclick="Konto.verwalten()">${verwalten ? 'Fertig' : 'Profile verwalten'}</button>` : ''}
        <button class="link-btn" type="button" onclick="Konto.abmelden()">Abmelden</button>
      </div>`;
  }

  // Neu zeichnen, ohne dass Getipptes (E-Mail, Name) verloren geht
  function zeigeMeldung(text, fehler) {
    meldung = { text, fehler: !!fehler };
    const merken = ['k-mail', 'k-name'].map(id => [id, (document.getElementById(id) || {}).value]);
    renderKonto();
    merken.forEach(([id, wert]) => {
      const el = document.getElementById(id);
      if (el && wert) el.value = wert;
    });
  }

  function fehlerText(e) {
    const m = String((e && e.message) || e || '');
    if (/invalid login credentials/i.test(m)) return 'E-Mail oder Passwort falsch.';
    if (/email not confirmed/i.test(m)) return 'Bitte zuerst den Link in der Bestätigungs-Mail öffnen.';
    if (/already registered|already exists/i.test(m)) return 'Für diese E-Mail gibt es schon ein Konto.';
    if (/signups? not allowed|signup is disabled/i.test(m)) return 'Neue Konten sind nicht freigeschaltet.';
    if (/password/i.test(m) && /6|short|weak/i.test(m)) return 'Das Passwort ist zu kurz (mind. 6 Zeichen).';
    if (/fetch|network|Failed to/i.test(m)) return 'Keine Verbindung zum Speicher.';
    return m || 'Unbekannter Fehler.';
  }

  function eingaben() {
    const mail = (document.getElementById('k-mail') || {}).value || '';
    const pw = (document.getElementById('k-pw') || {}).value || '';
    return { email: mail.trim(), password: pw };
  }

  // Für Links aus Mails: zurück auf genau diese Seite, ohne #...
  function rueckweg() { return location.href.split('#')[0]; }

  /* ---------------- Aktionen ---------------- */

  async function anmelden() {
    const { email, password } = eingaben();
    try {
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) throw error;
      session = data.session;
      meldung = null;
      ansicht = null;
      await ladeProfile();
      // Auf diesem Gerät schon ein Profil gemerkt (z.B. nach Ablauf der Anmeldung)?
      if (profil && profile.some(p => p.id === profil.id)) { await waehleProfil(profil); return; }
      if (profil) wechsleZuGast();
      renderKonto();
      renderLeiste();
    } catch (e) {
      zeigeMeldung(fehlerText(e), true);
    }
  }

  async function registrieren() {
    const { email, password } = eingaben();
    if (!email || password.length < 6) {
      zeigeMeldung('Bitte E-Mail und ein Passwort mit mindestens 6 Zeichen eingeben.', true);
      return;
    }
    try {
      const { data, error } = await client.auth.signUp({ email, password, options: { emailRedirectTo: rueckweg() } });
      if (error) throw error;
      if (data.session) {
        session = data.session;
        await ladeProfile();
        meldung = null;
        renderKonto();
      } else {
        zeigeMeldung('Fast geschafft: Wir haben eine Mail geschickt. Den Link darin öffnen, dann hier anmelden.');
      }
    } catch (e) {
      zeigeMeldung(fehlerText(e), true);
    }
  }

  async function passwortVergessen() {
    const { email } = eingaben();
    if (!email) { zeigeMeldung('Bitte zuerst die E-Mail-Adresse eingeben.', true); return; }
    try {
      const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo: rueckweg() });
      if (error) throw error;
      zeigeMeldung('Mail ist unterwegs. Über den Link darin kannst du ein neues Passwort setzen.');
    } catch (e) {
      zeigeMeldung(fehlerText(e), true);
    }
  }

  async function setzePasswort() {
    const pw = (document.getElementById('k-pw-neu') || {}).value || '';
    try {
      const { error } = await client.auth.updateUser({ password: pw });
      if (error) throw error;
      ansicht = null;
      meldung = { text: 'Passwort geändert.', fehler: false };
      await ladeProfile();
      renderKonto();
    } catch (e) {
      zeigeMeldung(fehlerText(e), true);
    }
  }

  async function abmelden() {
    await hochladenJetzt();
    try { await client.auth.signOut(); } catch (e) {}
    session = null;
    profile = [];
    verwalten = false;
    meldung = null;
    ansicht = null;
    status = 'ok';
    wechsleZuGast();
    renderKonto();
    renderLeiste();
  }

  async function neu() {
    const name = ((document.getElementById('k-name') || {}).value || '').trim();
    const gast = !!(document.getElementById('k-gast') || {}).checked;
    if (!name) return;
    try {
      await neuesProfil(name, gast);
    } catch (e) {
      zeigeMeldung(fehlerText(e), true);
    }
  }

  async function waehle(id) {
    const p = profile.find(x => x.id === id);
    if (p) await waehleProfil(p);
  }

  async function loesche(id) {
    const p = profile.find(x => x.id === id);
    if (!p) return;
    try { await loescheProfil(p); } catch (e) { zeigeMeldung(fehlerText(e), true); }
  }

  return {
    konfiguriert,
    start, schluessel, geaendert, renderLeiste, zeigeKonto,
    anmelden, registrieren, passwortVergessen, setzePasswort, abmelden,
    neu, waehle, loesche,
    verwalten() { verwalten = !verwalten; renderKonto(); },
  };
})();

// Als window.Konto erreichbar machen: index.html prüft mit «window.Konto»,
// damit das Quiz auch ohne diese Datei läuft
window.Konto = Konto;
