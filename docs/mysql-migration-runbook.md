# Neon Postgres to Hostinger MySQL Migration Runbook

## Scope

- Source dump: `sql/neondb-20260605-2300.sql`
- Cutoff: `2026-06-05 23:00`
- Target DB: MySQL with `utf8mb4` / `utf8mb4_unicode_ci`
- Required parity: UUIDs, bcrypt password hashes, foreign keys, booking history, timestamps, and row counts must match.

## Local Import

1. Copy `.env.mysql.local.example` to `.env.mysql.local`.
2. Set `DATABASE_URL` to a local MySQL database URL.
3. Run `pnpm db:mysql:parse` to validate the dump file.
4. Run `pnpm db:mysql:import`.
5. If the local target database already contains tables and this is intentional, run `pnpm db:mysql:reset-import`.
6. Verify existing imported data any time with `pnpm db:mysql:verify`.

Expected row counts:

- `activities`: `111`
- `activity_categories`: `9`
- `booking_history`: `15103`
- `bookings`: `3692`
- `profiles`: `12`
- `venues`: `22`

The importer aborts when the target database is not empty unless `--reset` is explicitly used.

## Manual Remote Import

Use this path when the hosting plan cannot run Node.js:

1. Generate the MySQL SQL file with `pnpm db:mysql:write-sql`.
2. Use `sql/mysql-import-from-neon-20260605-2300.sql` as the import file.
3. Execute it against an empty Hostinger MySQL database from your local machine:
   `mysql -h HOST -P 3306 -u USER -p DATABASE < sql/mysql-import-from-neon-20260605-2300.sql`
4. Confirm the final row-count query returns the expected counts listed above.

Do not import `sql/neondb-20260605-2300.sql` directly into MySQL because it is a Postgres dump.

## Application Cutover

1. Keep users off the application until smoke tests pass.
2. Import into the Hostinger MySQL database using the same importer and final Hostinger credentials.
3. Set Vercel `DATABASE_URL` to the Hostinger MySQL URL.
4. Deploy the MySQL-only application.
5. Smoke test production:
   - Existing user login works without password reset.
   - Booking list and detail pages load.
   - Booking history loads.
   - Create/update booking works.
   - Settings master data pages load for admin.
6. Re-open user operations only after production smoke tests pass.

## Post-Migration Backlog

- Replace legacy destructive SQL scripts with non-destructive migrations.
- Enforce booking conflict rules at DB transaction/constraint level.
- Normalize validation for booking create/update payloads.
- Keep `booking_history` retention policy explicit.
