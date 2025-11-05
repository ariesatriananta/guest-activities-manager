-- Guest Activities - Master Data (Categories, Activities, Venues)
-- UUID-based schema. Idempotent and safe to re-run.

-- Extensions (optional but recommended)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Updated-at trigger helper
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop old tables (text ids) if exist to migrate cleanly to UUIDs
DROP TABLE IF EXISTS activities CASCADE;
DROP TABLE IF EXISTS venues CASCADE;
DROP TABLE IF EXISTS activity_categories CASCADE;

-- Table: activity_categories
CREATE TABLE IF NOT EXISTS activity_categories (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  description text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_activity_categories_name UNIQUE(name)
);

DROP TRIGGER IF EXISTS trg_ac_set_updated_at ON activity_categories;
CREATE TRIGGER trg_ac_set_updated_at
BEFORE UPDATE ON activity_categories
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Table: activities (UUID ids)
CREATE TABLE IF NOT EXISTS activities (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id   uuid NOT NULL REFERENCES activity_categories(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  name          text NOT NULL,
  is_active     boolean NOT NULL DEFAULT true,
  description   text,
  duration      integer,
  max_capacity  integer,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activities_category ON activities(category_id);
CREATE INDEX IF NOT EXISTS idx_activities_active ON activities(is_active);
CREATE UNIQUE INDEX IF NOT EXISTS uq_activities_name_category ON activities(name, category_id);

DROP TRIGGER IF EXISTS trg_act_set_updated_at ON activities;
CREATE TRIGGER trg_act_set_updated_at
BEFORE UPDATE ON activities
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Table: venues (UUID ids)
CREATE TABLE IF NOT EXISTS venues (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                        text NOT NULL,
  is_single_booking_per_day   boolean NOT NULL DEFAULT false,
  location                    text,
  capacity                    integer,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_venues_name UNIQUE(name)
);

CREATE INDEX IF NOT EXISTS idx_venues_single_day ON venues(is_single_booking_per_day);

DROP TRIGGER IF EXISTS trg_venues_set_updated_at ON venues;
CREATE TRIGGER trg_venues_set_updated_at
BEFORE UPDATE ON venues
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Seed: Categories (from mock) - UUIDs auto
INSERT INTO activity_categories (name)
VALUES ('Activities'), ('Special Dining'), ('Spiritual')
ON CONFLICT (name) DO NOTHING;

-- Seed: Activities (from mock)
INSERT INTO activities (category_id, name, is_active)
SELECT c.id, v.name, true
FROM (VALUES
  ('Cycling Tour'),
  ('Rice Field Trekking'),
  ('Cooking Class'),
  ('River Rafting'),
  ('Temple Visit')
) AS v(name)
JOIN activity_categories c ON c.name = 'Activities'
ON CONFLICT (name, category_id) DO NOTHING;

INSERT INTO activities (category_id, name, is_active)
SELECT c.id, v.name, true
FROM (VALUES
  ('Ramayana Royal Feast Dinner'),
  ('Private Breakfast'),
  ('BBQ Dinner'),
  ('Romantic Dinner')
) AS v(name)
JOIN activity_categories c ON c.name = 'Special Dining'
ON CONFLICT (name, category_id) DO NOTHING;

INSERT INTO activities (category_id, name, is_active)
SELECT c.id, v.name, true
FROM (VALUES
  ('Morning Yoga'),
  ('Meditation Session'),
  ('Balinese Blessing')
) AS v(name)
JOIN activity_categories c ON c.name = 'Spiritual'
ON CONFLICT (name, category_id) DO NOTHING;

INSERT INTO venues (name, is_single_booking_per_day) VALUES
  ('Pool Terrace', false),
  ('Dalem Jiwo', true),
  ('Gubug Sawah', true),
  ('Joglo Sawah', true),
  ('Pak Bilal House', false),
  ('Restaurant', false),
  ('Own Suite', false),
  ('Progo 1', true),
  ('Progo 2', true)
ON CONFLICT (name) DO NOTHING;

-- Done.
