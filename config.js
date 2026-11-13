/* ============================================================
   Konto & Synchronisation (Supabase)
   Leer lassen = Quiz läuft wie bisher, Fortschritt nur auf
   diesem Gerät. Einrichtung: siehe supabase/README.md

   Der "anon"/"publishable" Key ist für den Browser gedacht und
   darf öffentlich im Repo stehen – geschützt wird über die
   Rechte in supabase/setup.sql. Den "service_role"/"secret" Key
   NIE hier eintragen.
   ============================================================ */

window.QUIZ_CONFIG = {
  supabaseUrl: "",              // z.B. "https://abcdefgh.supabase.co"
  supabaseAnonKey: "",          // Project Settings → API Keys → anon / publishable
  registrierungErlaubt: true    // false = nur von Dir eingeladene Eltern können sich anmelden
};
