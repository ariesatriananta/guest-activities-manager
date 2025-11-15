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
  status       text NOT NULL CHECK (status IN ('tentative','confirmed','cancelled')),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  created_by   uuid REFERENCES profiles(id),
  updated_by   uuid REFERENCES profiles(id)
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

ALTER TABLE IF EXISTS bookings
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES profiles(id);

ALTER TABLE IF EXISTS bookings
  ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES profiles(id);

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


-- buang constraint lama
ALTER TABLE bookings
  DROP CONSTRAINT IF EXISTS bookings_status_check;

-- bikin constraint baru termasuk 'tentative'
ALTER TABLE bookings
  ADD CONSTRAINT bookings_status_check
  CHECK (status IN ('tentative','confirmed','cancelled'));



-- NEW DATA

BEGIN;

WITH payload AS (
  SELECT *
  FROM (VALUES
    /* date, start, end, activity_name, category_name, venue_name, guest, suite, pax, ga, driver, remark, status */

    -- 2025-11-10 (Senin)
    (DATE '2025-11-10', TIME '07:00', TIME '08:30', 'Private Yoga Class', 'Wellness', 'Progo River Bank', 'John Smith', '101', 2, 'Sarah', 'Made', 'Prefer quiet area', 'confirmed'),
    (DATE '2025-11-10', TIME '10:00', TIME '12:00', 'Chocolate', 'Culinary Experiences', 'Art Room', 'Amelia Hartono', '302', 4, 'Rina', NULL, NULL, 'tentative'),
    (DATE '2025-11-10', TIME '17:30', TIME '19:30', 'Chef''s Table Dinner', 'Culinary Experiences', 'Restaurant', 'Lukas Meyer', 'Villa 3', 2, NULL, NULL, 'Anniversary', 'confirmed'),

    -- 2025-11-11 (Selasa)
    (DATE '2025-11-11', TIME '06:30', TIME '09:30', 'Hiking to Menoreh Hills', 'Sports and Adventures', 'Progo River Bank', 'Sinta Dewi', 'A12', 3, 'Budi', 'Andi', 'Early start', 'tentative'),
    (DATE '2025-11-11', TIME '11:00', TIME '12:30', 'Sound Healing', 'Spiritual Immersion', 'Sasana Tama', 'Michael Tan', '205', 1, 'Rina', NULL, NULL, 'confirmed'),
    (DATE '2025-11-11', TIME '18:00', TIME '21:00', 'Private Barbecue Dinner', 'Culinary Experiences', 'Gubug Sawah', 'Agnes Putri', 'D07', 6, 'Galuh', 'Wawan', 'Birthday dinner', 'confirmed'),

    -- 2025-11-12 (Rabu)
    (DATE '2025-11-12', TIME '07:30', TIME '09:00', 'Private Yoga Class with Breakfast at Progo Riverbank', 'Wellness', 'Progo River Bank', 'Kenji Sato', 'Suite 110', 2, 'Sarah', 'Made', NULL, 'tentative'),
    (DATE '2025-11-12', TIME '10:00', TIME '12:00', 'Javanese Blessing', 'Spiritual Immersion', 'Padmasana', 'Ibu Ratna', 'Family 2', 5, 'Rina', NULL, 'With elder', 'confirmed'),
    (DATE '2025-11-12', TIME '16:00', TIME '18:00', 'Sunset Martini', 'Culinary Experiences', 'Pool Club', 'Darren Koh', '402', 2, NULL, NULL, 'No olives', 'cancelled'),

    -- 2025-11-13 (Kamis)
    (DATE '2025-11-13', TIME '08:00', TIME '10:30', 'Selogriyo Temple Tour', 'Cultural Journeys', 'Dalem Jiwo Suite', 'Martha Lee', 'DJ-2', 2, 'Budi', 'Slamet', NULL, 'confirmed'),
    (DATE '2025-11-13', TIME '11:30', TIME '13:00', 'Indonesian Food', 'Culinary Experiences', 'Restaurant', 'Rudi Hart', '309', 2, NULL, NULL, 'Vegetarian menu', 'tentative'),
    (DATE '2025-11-13', TIME '17:00', TIME '19:00', 'Menoreh Hill Sunset Cocktail', 'Culinary Experiences', 'Pool Club', 'Farah Aziz', 'C08', 3, 'Galuh', NULL, NULL, 'confirmed'),

    -- 2025-11-14 (Jumat)
    (DATE '2025-11-14', TIME '07:00', TIME '08:30', 'Progo Breakfast / Lunch Picnic', 'Culinary Experiences', 'Progo River Bank', 'Yosefina', '115', 2, 'Sarah', 'Made', 'Riverside spot', 'confirmed'),
    (DATE '2025-11-14', TIME '09:30', TIME '11:00', 'Semedi Meditation Class', 'Spiritual Immersion', 'Sasana Tama', 'Pak Tono', 'B18', 1, 'Rina', NULL, NULL, 'tentative'),
    (DATE '2025-11-14', TIME '15:00', TIME '17:00', 'Jemparingan', 'Sports and Adventures', 'Omah Ndeso', 'Andre Widjaja', '221', 4, 'Budi', NULL, 'Safety brief at 14:45', 'confirmed'),
    (DATE '2025-11-14', TIME '18:30', TIME '21:30', 'Romantic Dinner', 'Culinary Experiences', 'Gubug Sawah', 'Nur Aini', 'Honeymoon', 2, 'Galuh', 'Wawan', 'Flower setup', 'confirmed'),

    -- 2025-11-15 (Sabtu)
    (DATE '2025-11-15', TIME '06:00', TIME '10:00', 'Borobudur Tour', 'Cultural Journeys', 'Dalem Jiwo Suite', 'Chris Wong', 'DJ-1', 2, 'Budi', 'Agus', 'Sunrise focus', 'confirmed'),
    (DATE '2025-11-15', TIME '11:00', TIME '12:00', 'Kite making', 'Sports and Adventures', 'Art Room', 'Putra K', 'Kids-3', 5, 'Rina', NULL, 'Kids activity', 'tentative'),
    (DATE '2025-11-15', TIME '16:30', TIME '18:00', 'Javanese Dance Class', 'Sports and Adventures', 'Sasana Tama', 'Sophie Millar', 'Suite 209', 2, 'Galuh', NULL, NULL, 'confirmed'),
    (DATE '2025-11-15', TIME '19:00', TIME '21:00', 'Dinner at Pak Bilal''s House', 'Culinary Experiences', 'Pak Bilal House', 'Gerald Tan', 'VIP', 4, 'Rina', 'Bayu', NULL, 'confirmed'),

    -- 2025-11-16 (Minggu)
    (DATE '2025-11-16', TIME '07:30', TIME '09:00', 'Meditation in Sacred Sites Tour', 'Spiritual Immersion', 'Padmasana', 'Karin Susilo', 'C12', 3, 'Rina', NULL, NULL, 'confirmed'),
    (DATE '2025-11-16', TIME '09:30', TIME '12:30', 'Journey through Java by Train', 'Cultural Journeys', 'Dalem Jiwo Suite', 'Raka D', 'DJ-3', 2, 'Budi', 'Slamet', 'Station pickup', 'tentative'),
    (DATE '2025-11-16', TIME '13:00', TIME '14:30', 'Gamelan Lesson', 'Sports and Adventures', 'Omah Ndeso', 'Family Chen', 'Villa 5', 4, 'Galuh', NULL, NULL, 'confirmed'),
    (DATE '2025-11-16', TIME '15:00', TIME '17:00', 'Private Barbecue Dinner', 'Culinary Experiences', 'Joglo Sawah', 'Irfan Maulana', 'Teras 1', 6, 'Galuh', 'Wawan', 'Rain plan ready', 'tentative'),
    (DATE '2025-11-16', TIME '18:00', TIME '20:30', 'Javanese Healer Experience', 'Spiritual Immersion', 'Sasana Tama', 'Clara Widya', 'Suite 318', 2, 'Rina', NULL, 'Translator needed', 'confirmed')
  ) AS t(
    date, start_time, end_time, activity_name, category_name, venue_name,
    guest_name, suite_number, pax, ga_name, driver_name, remark, status
)
),
resolved AS (
  SELECT
    p.*,
    a.id  AS activity_id,
    v.id  AS venue_id
  FROM payload p
  JOIN activity_categories c ON c.name = p.category_name
  JOIN activities a ON a.name = p.activity_name AND a.category_id = c.id
  JOIN venues v ON v.name = p.venue_name
)
INSERT INTO bookings (
  date, start_time, end_time, activity_id, venue_id,
  guest_name, suite_number, pax, ga_name, driver_name, remark, status
)
SELECT
  date, start_time, end_time, activity_id, venue_id,
  guest_name, suite_number, pax, ga_name, driver_name, remark, status
FROM resolved
RETURNING id;

COMMIT;
