# Spec: Vacation & Sick Leave Recap Email

> Feature spec. Status: **open questions resolved — awaiting approval** (2026-10-10). Extends `SPEC.md`; on completion, fold the durable parts (settings keys, endpoints, Electron lifecycle change) into `SPEC.md` §3/§4.

## Objective

The team lead periodically tells each team member where they stand: how many vacation days they carried over from last year, how many they have used this year, how many remain, and how many sick days were recorded. Today that is written by hand. This feature generates the text for them.

### User stories

1. **Generate recap.** From the Team Overview, the lead clicks **Recap email**. A dialog lists every active team member. For each one it shows a ready-to-paste Italian email (subject and body) built from a template, with a **Copy** button for each part.
2. **Edit template.** In Settings, the lead edits the subject and body templates (Italian) using placeholders. **Reset to default** restores the built-in template.
3. **Reminder frequency.** In Settings, the lead sets how often the recap is due (in months, default **3**).
4. **Mark as sent.** In the recap dialog, the lead clicks **Mark as sent**, which records today as the last-sent date. The next due date is *last sent + N months* (rolling).
5. **In-app reminder.** When a recap is due, a dismissible banner appears at the top of the app ("Time to send the vacation recap — last sent 10/07/2026") with an **Open recap** action.
6. **Dock badge + notification.** When a recap is due, the Dock icon shows a badge and a macOS notification is shown once a day. This also works after the window is closed, because closing the window no longer quits the app (Cmd+Q still does). Clicking the notification brings the app forward and opens the recap dialog.

### Scope split (build order)

The feature splits into two independently testable parts. B depends on A's settings and "last sent" record.

| Part | Responsibility | Depends on |
|---|---|---|
| **A — recap** | Recap data, template rendering, Settings template editor, dialog with Copy and Mark as sent | — |
| **B — reminder** | Due-date logic, in-app banner, Electron stay-alive, Dock badge, macOS notification | A |

## Recap content

- **Year:** the current calendar year (today's date). The period is 1 January to today.
- **Numbers come from `compute_balance(name, year)`**, so the email always matches what the app shows:
  - `carried_over` → the credit from the year before
  - `entitlement` → days accrued for the year
  - `total`, `used`, `remaining`
- **Vacation detail:** one line per month that has an entry, e.g. `- Marzo: 2 giorni (12/03, 13/03)`, built from `get_leave("vacation", year, name)` (`days_count` + `dates_detail`).
- **Sick leave:** total days and one line per month, from `get_leave("sick_leave", year, name)`.
- **Formatting:** Italian numbers (`2,5`, and whole numbers without decimals, e.g. `26`), dates as `dd/mm/yyyy`, Italian month names.
- **Recipients:** one recap per active member (members of the current year's Summary sheet), **minus anyone excluded in Settings**. Excluded members don't appear in the recap dialog or in `GET /api/recap`. The app never sends email; the user copies and pastes.

### Placeholders

| Placeholder | Value |
|---|---|
| `{nome}` | Team member name |
| `{anno}` | Recap year |
| `{data_oggi}` | Today, `dd/mm/yyyy` |
| `{residuo_anno_precedente}` | `carried_over` |
| `{scadenza_residuo}` | Carry-over deadline, `31/03/{anno}` (derived from `carryover_deadline_month`) |
| `{maturate_anno}` | `entitlement` |
| `{totale_disponibile}` | `total` |
| `{ferie_godute}` | `used` |
| `{ferie_residue}` | `remaining` |
| `{dettaglio_ferie}` | Multi-line month breakdown, or `Nessun giorno di ferie registrato.` |
| `{giorni_malattia}` | Total sick days |
| `{dettaglio_malattia}` | Multi-line month breakdown, or `Nessun giorno di malattia registrato.` |
| `{mittente}` | `current_user` from settings |

Unknown placeholders are left in the text unchanged (no crash). Placeholders are listed as clickable chips under the body field in Settings; clicking a chip inserts the placeholder at the cursor.

### Default template

Subject: `Riepilogo ferie e malattia {anno} – {nome}`

```
Ciao {nome},

ti invio il riepilogo delle tue ferie e dei giorni di malattia dal 1° gennaio {anno} al {data_oggi}.

FERIE
- Residuo dall'anno precedente: {residuo_anno_precedente} giorni (da utilizzare entro il {scadenza_residuo})
- Ferie maturate nel {anno}: {maturate_anno} giorni
- Totale disponibile: {totale_disponibile} giorni
- Ferie godute: {ferie_godute} giorni
- Ferie residue: {ferie_residue} giorni

{dettaglio_ferie}

MALATTIA
- Giorni di malattia: {giorni_malattia}
{dettaglio_malattia}

Per qualsiasi domanda resto a disposizione.

Un saluto,
{mittente}
```

## Data (app_settings.json only — no workbook change)

| Key | Type | Default |
|---|---|---|
| `recap_subject_template` | string | default subject above |
| `recap_body_template` | string | default body above |
| `recap_frequency_months` | int, 1–12 | `3` |
| `recap_last_sent` | ISO date string or `null` | `null` |
| `recap_excluded_members` | list of member names | `[]` |

`recap_last_sent = null` counts as **due now**, so the first reminder fires right after install. *(See Open Questions.)*

## API (new blueprint `api/recap.py`, prefix `/api/recap`)

| Method + path | Behavior |
|---|---|
| `GET /api/recap?year=YYYY` | `[{name, subject, body, data:{…numbers}}]`, one item per active, non-excluded member. `year` defaults to the current year. |
| `GET /api/recap/settings` | `{subject_template, body_template, frequency_months, excluded_members, placeholders:[…], defaults:{subject, body}}` |
| `PUT /api/recap/settings` | Partial update. `frequency_months` outside 1–12 → `400`. `excluded_members` must be a list of strings → otherwise `400`. |
| `GET /api/recap/status` | `{last_sent, frequency_months, next_due, is_due}` |
| `POST /api/recap/sent` | Sets `recap_last_sent` = today and returns the new status. |

Locked workbook → `409` as elsewhere. Rendering and due-date logic live in a new `services/recap_service.py`, which reads data only through `excel_service` functions.

**Due-date rule:** `next_due = last_sent + N calendar months`, clamped to the end of the month (30 Nov + 3 → 28/29 Feb). `is_due = last_sent is null or today >= next_due`. No new dependency (no `dateutil`).

## Frontend

- `components/RecapDialog.jsx`: full-width MUI dialog. On the left, a list of members; on the right, a preview of the selected member with read-only subject and body plus **Copy subject** and **Copy body** buttons (`navigator.clipboard`), and a "Copied" snackbar. The footer has **Mark as sent** and **Close**.
- `TeamOverview.jsx`: **Recap email** button (outlined, with a mail icon) in the page header.
- `SettingsPage.jsx`: new **Recap email** `Paper` section with a subject field, a multiline body field, placeholder chips, a frequency select (1–12 months), an **Include in recap** list of the current year's members with one switch each (on = included; all on by default), **Reset to default** (template only) and **Save**.
- `components/RecapReminderBanner.jsx`: rendered in `App.jsx` next to `UpdateBanner`. Shown when `is_due`. Actions are **Open recap** and **Later** (Later hides it until the next app launch).
- `api/client.js`: `getRecap`, `getRecapSettings`, `updateRecapSettings`, `getRecapStatus`, `markRecapSent`.

## Electron

- **Lifecycle change:** on macOS, `window-all-closed` no longer quits the app or kills Flask. `activate` (Dock click) re-creates the window. `before-quit` still kills Flask.
- **Badge and notification** (main process): poll `GET /api/recap/status` at startup and every hour. When due: `app.dock.setBadge("1")`, plus a native `Notification` ("Promemoria riepilogo ferie") at most once per calendar day. When not due: clear the badge.
- **IPC:** `recap:refresh` (renderer → main, sent after Mark as sent, so the badge clears at once) and `recap:open` (main → renderer, sent when the notification is clicked) are exposed through `preload.js`.
- **Auto-update:** confirm that `updater.applyAndRestart()` still quits and relaunches correctly with the new lifecycle (it must call `app.quit()`/`app.exit()` explicitly rather than rely on window close).

## Commands

```
pytest                                  # backend tests
python app.py                           # backend on :5001
cd frontend && npm run dev              # frontend HMR
cd frontend && npm run build            # frontend build
npm run electron:dev                    # Electron shell (badge/notification checks)
npm run electron:build                  # full .app for release
```

## Project Structure (new/changed files)

```
api/recap.py                         NEW  blueprint
services/recap_service.py            NEW  rendering, Italian formatting, due-date logic
app.py                               register blueprint
frontend/src/components/RecapDialog.jsx           NEW
frontend/src/components/RecapReminderBanner.jsx   NEW
frontend/src/components/TeamOverview.jsx          button
frontend/src/components/SettingsPage.jsx          Recap section
frontend/src/App.jsx                              banner + dialog state
frontend/src/api/client.js                        helpers
electron/main.js, electron/preload.js             lifecycle, badge, notification, IPC
tests/test_recap_service.py          NEW
tests/test_api_recap.py              NEW
SPEC.md, CLAUDE.md                   document settings keys, endpoints, lifecycle
```

## Code Style

Follow existing patterns. Blueprint example:

```python
@recap_bp.route("/status", methods=["GET"])
def status():
    return jsonify(get_recap_status(date.today()))
```

Service functions take `today` as a parameter, so tests can pin the date. Frontend: functional components, MUI primitives, Gmail-like density, typed helpers in `client.js`.

## Testing Strategy

**pytest** (fixture workbook via `conftest.py`):
- Italian number formatting (`2.5 → "2,5"`, `26.0 → "26"`, `0 → "0"`).
- Rendering: every placeholder replaced; an unknown `{foo}` left intact; empty vacation/sick lists render the "Nessuna…" lines.
- Recap numbers equal `compute_balance` for each fixture member.
- Due date: `null` → due; +3 months from 10/07 → 10/10 is due and 09/10 is not; 30/11 + 3 → end of February; frequency of 1 and 12.
- API: settings GET/PUT round-trip, `frequency_months=0` → 400, `excluded_members` round-trip and invalid type → 400, an excluded member is missing from `GET /api/recap` while the others still render, `POST /sent` updates status, `GET /api/recap` shape.

**Manual test plan** (frontend and Electron are not automated):
1. Settings → edit the template and frequency → Save → reload → values persist; Reset restores the default.
1a. Settings → switch off one member → Save → the recap dialog no longer lists them; switch back on → they reappear.
2. Team Overview → Recap email → each member's text is correct against the Vacation and Sick Leave pages → Copy → paste into Outlook keeps the line breaks.
3. With `recap_last_sent: null` → banner shows; Later hides it; Mark as sent hides the banner and clears the Dock badge.
4. Set `recap_last_sent` to more than 3 months ago in the JSON → close the window → the app stays in the Dock with a badge → a notification appears → clicking it opens the window with the recap dialog.
5. Cmd+Q quits the app and Flask (no orphaned process on :5001).
6. Auto-update apply still restarts the app.
7. `attendance.xlsx` is untouched (unchanged modification time).

## Boundaries

- **Always:** read data through `excel_service`; store state only in `app_settings.json`; Italian output; extend pytest; follow the Gmail-like UI.
- **Ask first:** any change to `updater.js`/the release flow beyond verifying it; any new dependency; storing email addresses or other personal data.
- **Never:** send email or make any network call; write to `attendance.xlsx`; add a database; show other members' data in a person's recap.

## Success Criteria

- [ ] Each active member's recap renders in Italian, with numbers identical to the app's balance for the current year.
- [ ] Template subject, body and frequency are editable and persisted in `app_settings.json`, with Reset to default.
- [ ] Members switched off in Settings are left out of the recap; the setting persists in `recap_excluded_members`.
- [ ] Copy puts the exact subject/body text on the clipboard.
- [ ] Mark as sent sets `recap_last_sent`; status reports `next_due = last_sent + N months`.
- [ ] Banner appears exactly when `is_due` is true.
- [ ] With the window closed and the app still running, the Dock badge shows when due and clears after Mark as sent; at most one notification per day.
- [ ] Cmd+Q and auto-update restart behave as before.
- [ ] `pytest` is green with the new tests; `attendance.xlsx` is never written.

## Resolved Decisions (2026-10-10)

1. **Carry-over after 31 March:** show the numbers exactly as the app computes them, with the deadline text in the email. The forfeit rule is not changed.
2. **Future-booked vacation:** counts as "godute", matching the app's `used`.
3. **First run:** `recap_last_sent = null` means due immediately.
4. **"Later":** hides the banner until the next app launch. The Dock badge stays until the recap is marked as sent.
5. **Auto-update:** verified that `electron/updater.js` restarts via an explicit `app.quit()`, so it is compatible with the stay-alive lifecycle. No updater change is needed.
6. **Exclusions:** members can be excluded from the recap in Settings (`recap_excluded_members`). The reminder schedule is global and not affected. A stale name, such as someone who has left, is ignored.
