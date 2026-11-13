# Konto & Fortschritt auf allen Geräten (Supabase)

Mit einem Eltern-Konto wird der Fortschritt jedes Kindes gespeichert: XP, Ränge, Fehlerliste und angefangene Runden. Auf Tablet, Handy und Computer ist er dann gleich.

Solange `config.js` leer ist, läuft das Quiz genau wie bisher. Der Fortschritt bleibt dann nur auf dem Gerät.

## So funktioniert es

- **Ein Login pro Familie** (E-Mail + Passwort der Eltern).
- **Ein Profil pro Kind**, nur mit Vorname. Weitere Angaben zu den Kindern werden nicht gespeichert.
- Jedes Gerät merkt sich das zuletzt gewählte Profil. Das Kind landet beim Öffnen also direkt bei sich und muss sich nicht anmelden.
- Ohne Internet wird lokal weitergespeichert und später automatisch hochgeladen.
- Beim ersten Profil kann der bisherige Fortschritt auf dem Gerät übernommen werden. Das Häkchen ist vorgewählt.
- Jede Familie sieht nur ihre eigenen Profile. Das ist in der Datenbank abgesichert (Row Level Security).
- **Grenze:** Übt dasselbe Kind gleichzeitig auf zwei Geräten, gewinnt der zuletzt gespeicherte Stand.

## Einrichtung (einmalig, ca. 15 Minuten)

1. **Projekt anlegen:** Auf [supabase.com](https://supabase.com) ein neues Projekt anlegen, z.B. `sprachen-quiz`. Ein Gratis-Konto erlaubt zwei Projekte, die Boulder-App nutzt das andere. Als Region eine europäische wählen (Zürich, falls angeboten, sonst Frankfurt).
2. **Tabellen anlegen:** Im **SQL Editor** den Inhalt von [`setup.sql`](setup.sql) einfügen und **Run** klicken. Das Skript darf später erneut laufen.
3. **Adresse eintragen (wichtig für die Mails):** Unter **Authentication → URL Configuration**:
   - *Site URL*: die GitHub-Pages-Adresse des Quiz, z.B. `https://maendeni.github.io/Franz_Quiz_4KL_Wetter/`
   - *Redirect URLs*: dieselbe Adresse nochmals hinzufügen.

   Ohne diesen Schritt führen die Links in der Bestätigungs- und der Passwort-Mail ins Leere.
4. **App verbinden:** Unter **Project Settings → API Keys** die **Project URL** und den **anon / publishable** Key in [`config.js`](../config.js) eintragen. Committen.
   - Der anon/publishable Key darf öffentlich sein. Den **service_role / secret** Key **nie** eintragen.
5. **Wach halten:** Gratis-Projekte pausieren nach 7 Tagen ohne Zugriff. Gerade in den Ferien kann das passieren. Der Workflow [`supabase-wach-halten.yml`](../.github/workflows/supabase-wach-halten.yml) fragt die Datenbank zweimal pro Woche an. Unter **Actions** einmal manuell starten (*Run workflow*) und prüfen, ob er grün wird.

## Wer darf ein Konto erstellen?

- **Standard:** Jeder mit dem Link kann über *Konto erstellen* ein Eltern-Konto anlegen und bekommt eine Bestätigungs-Mail.
- **Nur eingeladene Familien:** Unter **Authentication → Sign In / Providers** die Option *Allow new users to sign up* ausschalten und in `config.js` `registrierungErlaubt: false` setzen. Eltern lädst Du dann unter **Authentication → Users → Invite user** ein.

Der eingebaute Mailversand von Supabase ist stark begrenzt (nur wenige Mails pro Stunde). Für ein paar Familien reicht das. Wenn Bestätigungs-Mails nicht ankommen:
- etwas warten, oder
- unter **Authentication → Sign In / Providers → Email** die Option *Confirm email* ausschalten, oder
- den Benutzer direkt unter **Authentication → Users → Add user** mit *Auto Confirm User* anlegen.

## Erste Anmeldung auf einem Gerät mit bisherigem Fortschritt

1. Im Menü oben auf **Fortschritt auf allen Geräten** tippen.
2. Anmelden (oder Konto erstellen).
3. Profil für das Kind anlegen. Das Häkchen **Bisherigen Fortschritt übernehmen** steht schon.
4. Auf den anderen Geräten anmelden und dasselbe Profil wählen. Fertig.
