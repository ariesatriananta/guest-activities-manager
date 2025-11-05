-- Bookings schema (UUID) + constraints
-- Run after master-data.sql

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop if migrating from previous non-UUID structure
DROP TABLE IF EXISTS bookings CASCADE;

CREATE TABLE IF NOT EXISTS bookings (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date         date NOT NULL,
  start_time   time NOT NULL,
  end_time     time,
  activity_id  uuid NOT NULL REFERENCES activities(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  venue_id     uuid NOT NULL REFERENCES venues(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  guest_name   text NOT NULL,
  suite_number text NOT NULL,
  pax          integer NOT NULL CHECK (pax > 0),
  ga_name      text,
  driver_name  text,
  remark       text,
  status       text NOT NULL CHECK (status IN ('draft','confirmed','cancelled')),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(date);
CREATE INDEX IF NOT EXISTS idx_bookings_venue_date ON bookings(venue_id, date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);

DROP TRIGGER IF EXISTS trg_bookings_set_updated_at ON bookings;
CREATE TRIGGER trg_bookings_set_updated_at
BEFORE UPDATE ON bookings
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Ensure end_time nullable if table already existed
ALTER TABLE IF EXISTS bookings
  ALTER COLUMN end_time DROP NOT NULL;

-- Seed sample bookings (from mockDB) using Jakarta local date
-- Avoid duplicates using WHERE NOT EXISTS guards

-- Today - Morning Yoga @ Pool Terrace
WITH base AS (SELECT (now() AT TIME ZONE 'Asia/Jakarta')::date AS d)
INSERT INTO bookings (
  date, start_time, end_time, activity_id, venue_id,
  guest_name, suite_number, pax, ga_name, driver_name, remark, status, created_at
)
SELECT base.d, '07:00'::time, '08:30'::time,
       a.id, v.id,
       'John Smith', 'Suite 101', 2, 'Sarah', 'Made', 'Prefer quiet area', 'confirmed', now() - interval '1 day'
FROM base
JOIN (SELECT id FROM activities WHERE name = 'Morning Yoga' LIMIT 1) a ON TRUE
CROSS JOIN (SELECT id, name FROM venues WHERE name = 'Pool Terrace' LIMIT 1) v
WHERE NOT EXISTS (
  SELECT 1 FROM bookings b WHERE b.date = base.d AND b.start_time = '07:00'::time AND b.venue_id = v.id AND b.guest_name = 'John Smith'
);

-- Today - Cycling Tour @ Pak Bilal House
WITH base AS (SELECT (now() AT TIME ZONE 'Asia/Jakarta')::date AS d)
INSERT INTO bookings (
  date, start_time, end_time, activity_id, venue_id,
  guest_name, suite_number, pax, ga_name, driver_name, remark, status, created_at
)
SELECT base.d, '09:00'::time, '12:00'::time,
       a.id, v.id,
       'Emma Wilson', 'Suite 203', 4, 'Wayan', 'Ketut', 'Family with kids', 'confirmed', now() - interval '1 day'
FROM base
JOIN (SELECT id FROM activities WHERE name = 'Cycling Tour' LIMIT 1) a ON TRUE
CROSS JOIN (SELECT id FROM venues WHERE name = 'Pak Bilal House' LIMIT 1) v
WHERE NOT EXISTS (
  SELECT 1 FROM bookings b WHERE b.date = base.d AND b.start_time = '09:00'::time AND b.venue_id = v.id AND b.guest_name = 'Emma Wilson'
);

-- Today - Ramayana Royal Feast Dinner @ Pool Terrace
WITH base AS (SELECT (now() AT TIME ZONE 'Asia/Jakarta')::date AS d)
INSERT INTO bookings (
  date, start_time, end_time, activity_id, venue_id,
  guest_name, suite_number, pax, ga_name, driver_name, remark, status, created_at
)
SELECT base.d, '19:00'::time, '21:00'::time,
       a.id, v.id,
       'Michael Chen', 'Suite 305', 2, 'Komang', 'Nyoman', 'Anniversary celebration', 'confirmed', now() - interval '2 day'
FROM base
JOIN (SELECT id FROM activities WHERE name = 'Ramayana Royal Feast Dinner' LIMIT 1) a ON TRUE
CROSS JOIN (SELECT id FROM venues WHERE name = 'Pool Terrace' LIMIT 1) v
WHERE NOT EXISTS (
  SELECT 1 FROM bookings b WHERE b.date = base.d AND b.start_time = '19:00'::time AND b.venue_id = v.id AND b.guest_name = 'Michael Chen'
);

-- Tomorrow - Private Breakfast @ Gubug Sawah
WITH base AS (SELECT (now() AT TIME ZONE 'Asia/Jakarta')::date AS d)
INSERT INTO bookings (
  date, start_time, end_time, activity_id, venue_id,
  guest_name, suite_number, pax, ga_name, driver_name, remark, status, created_at
)
SELECT base.d + interval '1 day', '08:00'::time, '10:00'::time,
       a.id, v.id,
       'Sophie Martin', 'Suite 102', 2, 'Sarah', 'Made', 'Vegetarian options', 'confirmed', now() - interval '1 day'
FROM base
JOIN (SELECT id FROM activities WHERE name = 'Private Breakfast' LIMIT 1) a ON TRUE
CROSS JOIN (SELECT id FROM venues WHERE name = 'Gubug Sawah' LIMIT 1) v
WHERE NOT EXISTS (
  SELECT 1 FROM bookings b WHERE b.date = base.d + interval '1 day' AND b.start_time = '08:00'::time AND b.venue_id = v.id AND b.guest_name = 'Sophie Martin'
);

-- Tomorrow - River Rafting @ Progo 1
WITH base AS (SELECT (now() AT TIME ZONE 'Asia/Jakarta')::date AS d)
INSERT INTO bookings (
  date, start_time, end_time, activity_id, venue_id,
  guest_name, suite_number, pax, ga_name, driver_name, remark, status, created_at
)
SELECT base.d + interval '1 day', '14:00'::time, '17:00'::time,
       a.id, v.id,
       'David Brown', 'Suite 201', 6, 'Wayan', 'Ketut', 'Group activity', 'confirmed', now() - interval '1 day'
FROM base
JOIN (SELECT id FROM activities WHERE name = 'River Rafting' LIMIT 1) a ON TRUE
CROSS JOIN (SELECT id FROM venues WHERE name = 'Progo 1' LIMIT 1) v
WHERE NOT EXISTS (
  SELECT 1 FROM bookings b WHERE b.date = base.d + interval '1 day' AND b.start_time = '14:00'::time AND b.venue_id = v.id AND b.guest_name = 'David Brown'
);

-- Day after tomorrow - Cooking Class @ Restaurant
WITH base AS (SELECT (now() AT TIME ZONE 'Asia/Jakarta')::date AS d)
INSERT INTO bookings (
  date, start_time, end_time, activity_id, venue_id,
  guest_name, suite_number, pax, ga_name, driver_name, remark, status, created_at
)
SELECT base.d + interval '2 day', '10:00'::time, '13:00'::time,
       a.id, v.id,
       'Lisa Anderson', 'Suite 104', 3, 'Komang', 'Nyoman', 'Interested in traditional recipes', 'confirmed', now() - interval '1 day'
FROM base
JOIN (SELECT id FROM activities WHERE name = 'Cooking Class' LIMIT 1) a ON TRUE
CROSS JOIN (SELECT id FROM venues WHERE name = 'Restaurant' LIMIT 1) v
WHERE NOT EXISTS (
  SELECT 1 FROM bookings b WHERE b.date = base.d + interval '2 day' AND b.start_time = '10:00'::time AND b.venue_id = v.id AND b.guest_name = 'Lisa Anderson'
);
