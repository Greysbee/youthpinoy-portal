# CSMS Portal (youthpinoy-portal)

Participant portal for the Catholic Social Media Summit (CSMS): one participant
database, a gated video library, event registration + payments, and group tickets.
Built on **Next.js 16** (App Router) + **Supabase** (Postgres, Auth, RLS).

> Access is keyed to the **participant** (by normalized email), not the auth user.
> A participant row + entitlements can exist before anyone signs up; when they
> create a login (or accept an invite) with the same email, the account links to
> that participant and inherits everything. All access logic lives in
> [`src/lib/access.ts`](src/lib/access.ts) and the SQL helpers it calls.

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000.

### Environment variables (`.env.local`)

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (browser + server) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (browser + server, RLS-scoped) |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server only.** Bypasses RLS; used by `createAdminClient()` for access grants and reading secret columns (`videos.provider_ref`). Never exposed to the browser. |

Supabase MCP is scoped to this project via [`.mcp.json`](.mcp.json) (`--project-ref`)
with the token in the `SUPABASE_ACCESS_TOKEN` env var.

## Database

Migrations live in [`supabase/migrations/`](supabase/migrations) and are applied via
the Supabase MCP (`apply_migration`). Milestone 1 added the participant/event model
**alongside** the original `courses/lessons/enrollments` tables (which still run):

- `participants`, `events`, `event_includes`, `videos`, `entitlements`,
  `registrations`, `orders`, `groups`, `group_members`
- Helpers: `accessible_event_ids(participant)` (direct + transitive `event_includes`
  + `all_access`), `can_watch(participant, video)`, `is_admin()`,
  `current_participant_id()`
- Trigger: on profile insert, find-or-create the participant by normalized email,
  link it, and auto-join any pending group invites for that email.

### Video security

A playable URL is **only** produced server-side by `getPlaybackUrl()` when
`can_watch()` is true. `videos.provider_ref` is hidden from `anon`/`authenticated`
by column grants, so the browser never receives a playable reference for a locked
video. The player is structured so Bunny signed/token URLs can be swapped in later
inside `buildEmbedUrl()` without touching any page.

## Seed / test accounts

Seeded by [`supabase/seed.sql`](supabase/seed.sql): events CSMSv8–v16 (v12 includes
v8–v11; v16 includes all prior), 2 videos per event (Session 1 = free preview,
Session 2 = locked).

All test accounts use the password **`CsmsTest!2026`**:

| Email | Role | Access |
| --- | --- | --- |
| `admin@csms.test` | admin | (admin) |
| `member1@csms.test` | member | CSMSv8 only |
| `member2@csms.test` | member | CSMSv12 → unlocks v8–v12 (via includes) |
| `member3@csms.test` | member | all-access → every event |

## Milestone 1 — manual test script

1. Open http://localhost:3000/library while logged out → you're redirected to
   **/login?next=/library**.
2. Log in as **member1@csms.test** / `CsmsTest!2026`. You land on **/library**.
3. In the library you should see events grouped **newest first (v16 → v8)**. Every
   **Session 1** is badged **Free**; every **Session 2** is **Locked** — *except*
   **CSMSv8 — Session 2**, which is **Unlocked** (member1's only entitlement).
4. Click **CSMSv8 — Session 2** (Unlocked) → the Vimeo player loads.
5. Go back and click **CSMSv9 — Session 2** (Locked) → you see "This session is
   locked" + a **Get access** button, and **no video player**.
6. Click any **Session 1 (Free Preview)** on any event → it plays for everyone.
7. Log out, log in as **member2@csms.test** → now **CSMSv8–CSMSv12** Session 2s are
   Unlocked (v12 entitlement cascades to v8–v11); v13–v16 Session 2 stay Locked.
8. Log out, log in as **member3@csms.test** → **every** Session 2 is Unlocked
   (all-access).
9. Magic link: on /login, enter an email and click **Email me a magic link**.
   (Delivery depends on the project's Auth email settings; the confirmation link
   lands on `/auth/confirm` and signs you in.)
10. Admin check: log in as **admin@csms.test** and open **/admin/events**.

## Milestone 2 — admin backend + participant import

Admin sections (admin role only) under `/admin`: **Events**, **Videos**,
**Participants**, **Import**, **Orders**. All writes run server-side via server
actions using the service-role client behind `requireAdmin()`.

- **Events** — create/edit/publish, price/capacity/dates/cover, an "Includes access
  to" multi-select (writes `event_includes`), and a registration-question builder.
- **Videos** — create/edit, assign to event, free toggle, reorder (↑/↓), provider +
  ref; **CSV bulk import** at `/admin/videos/import`.
- **Participants** — search by name/email; detail shows entitlements, registrations,
  orders, and groups; manual grant/revoke of event or all-access.
- **Import** (`/admin/import`) — upload CSV(s) → map columns → preview → commit.
  Deduped by normalized email across files and existing rows; existing values kept,
  blanks filled; event columns parse `CSMSv12` / `v12` / `12` / `CSMS 12` / lists;
  `legacy_import` entitlements created; a merge report (new / merged / duplicates /
  invalid emails / unmapped events) is shown and downloadable as CSV. **Idempotent.**

### Milestone 2 — manual test script

Log in as **admin@csms.test** (`CsmsTest!2026`).

1. **/admin/events** → 9 events listed with prices (v8 Free, v12 ₱1,500, v16 ₱2,500).
   Open **CSMSv12 → Edit** → confirm "Includes access to" has v8–v11 checked.
2. **+ New Event** → fill code/title/price, add a registration question, check a few
   "includes", Save → it appears in the list.
3. **/admin/videos** → 18 videos grouped by event; try the ↑/↓ reorder on a pair.
4. **/admin/videos/import** → upload a CSV with columns
   `title,event_code,provider,provider_ref,is_free,thumbnail_url,sort_order`
   → see the inserted/skipped report.
5. **/admin/import** → upload [`docs/sample-participants.csv`](docs/sample-participants.csv)
   → columns auto-map → **Commit**. Expect: 6 rows, 4 unique, 3 new + (ana.lim
   deduped), 1 invalid (`not-an-email`), 1 unmapped event (`CSMSv99`), all-access for
   Pedro. **Download report CSV.** Re-commit the same file → **0 new, 0 entitlements
   created** (idempotent).
6. **/admin/participants** → search "maria" → open her → she has CSMSv12 (which
   cascades to v8–v11). Click **Grant all-access**, then **Revoke** it.
7. **/admin/orders** → empty (payments arrive in Milestone 3).

> Note: importing `sample-participants.csv` creates real participant rows in your DB.
> Delete them from **/admin/participants** (or via SQL) afterward if you want a clean slate.
