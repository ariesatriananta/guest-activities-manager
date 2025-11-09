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




BEGIN;

-- 1) Categories
INSERT INTO activity_categories (name, description) VALUES
  ('Culinary Experiences', NULL),
  ('Spiritual Immersion', NULL),
  ('Wellness', NULL),
  ('Cultural Journeys', NULL),
  ('Sports and Adventures', NULL),
  ('Tours and Transportation', NULL),
  ('Miscellaneous', NULL)
ON CONFLICT (name) DO NOTHING;

-- 2) Activities
INSERT INTO activities (name, category_id, is_active, description, duration, max_capacity)
SELECT v.activity_name, c.id, TRUE, NULL, NULL, NULL
FROM (
  VALUES
  /* Culinary Experiences */
  ('Progo Breakfast / Lunch Picnic',               'Culinary Experiences'),
  ('Menoreh Hill Breakfast / Lunch Picnic',        'Culinary Experiences'),
  ('Selogriyo Picnic',                             'Culinary Experiences'),
  ('Takeaway Picnic Lunch',                        'Culinary Experiences'),
  ('Breakfast at Gubuk Sawah',                     'Culinary Experiences'),
  ('Chef''s Table Dinner',                         'Culinary Experiences'),
  ('Menoreh Hill Sunset Cocktail',                 'Culinary Experiences'),
  ('Dinner at Pak Bilal''s House',                 'Culinary Experiences'),
  ('Ramayana Royal Feast',                         'Culinary Experiences'),
  ('Private Barbecue Dinner',                      'Culinary Experiences'),
  ('Satay Barbecue Dinner',                        'Culinary Experiences'),
  ('Romantic Dinner',                              'Culinary Experiences'),
  ('Wood Fire Pizza Dinner',                       'Culinary Experiences'),
  ('Sunset Martini',                               'Culinary Experiences'),
  ('Kambing Menoreh Feast',                        'Culinary Experiences'),
  ('Javanese Wayang Dinner',                       'Culinary Experiences'),
  ('Chocolate',                                    'Culinary Experiences'),
  ('Indonesian Food',                              'Culinary Experiences'),

  /* Spiritual Immersion */
  ('Javanese Blessing',                            'Spiritual Immersion'),
  ('Semedi Meditation Class',                      'Spiritual Immersion'),
  ('Tolak Balak',                                  'Spiritual Immersion'),
  ('Javanese Healer Experience',                   'Spiritual Immersion'),
  ('Pradakshina at Mendut',                        'Spiritual Immersion'),
  ('Ruwatan',                                      'Spiritual Immersion'),
  ('Meditation in Sacred Sites Tour',              'Spiritual Immersion'),
  ('Sound Healing',                                'Spiritual Immersion'),

  /* Wellness */
  ('Private Yoga Class',                           'Wellness'),
  ('Private Yoga Class with Breakfast at Progo Riverbank', 'Wellness'),

  /* Cultural Journeys */
  ('Drop off and pick-up to Borobudur',            'Cultural Journeys'),
  ('Borobudur Tour',                               'Cultural Journeys'),
  ('Selogriyo Temple Tour',                        'Cultural Journeys'),
  ('Temples of Prambanan Valley',                  'Cultural Journeys'),
  ('Temples of Kedu Plain',                        'Cultural Journeys'),
  ('Journey through Java by Train',                'Cultural Journeys'),
  ('Aksara Jawa',                                  'Cultural Journeys'),
  ('Jathilan',                                     'Cultural Journeys'),
  ('Sengkalan',                                    'Cultural Journeys'),
  ('Sengkalan with Prambanan Tour',                'Cultural Journeys'),

  /* Sports and Adventures */
  ('Jemparingan',                                  'Sports and Adventures'),
  ('Hiking to Menoreh Hills',                      'Sports and Adventures'),
  ('Mount Andong',                                 'Sports and Adventures'),
  ('Mount Merbabu',                                'Sports and Adventures'),
  ('Mount Prau',                                   'Sports and Adventures'),
  ('Mount Merapi',                                 'Sports and Adventures'),
  ('Mount Sumbing / Mount Sindoro',                'Sports and Adventures'),
  ('To nearby village',                            'Sports and Adventures'),
  ('Banyu Trip',                                   'Sports and Adventures'),
  ('Trekking to the village',                      'Sports and Adventures'),
  ('Kite making',                                  'Sports and Adventures'),
  ('Pony ride by the Pool Terrace',                'Sports and Adventures'),
  ('Gamelan Lesson',                               'Sports and Adventures'),
  ('Javanese Dance Class',                         'Sports and Adventures'),
  ('Janur Making Class',                           'Sports and Adventures'),

  /* Tours and Transportation */
  ('Toyota Innova',                                'Tours and Transportation'),
  ('Hiace - Half day',                             'Tours and Transportation'),
  ('Hiace - Full day',                             'Tours and Transportation'),
  ('Hiace - Additional hour',                      'Tours and Transportation'),
  ('Alphard - Half day',                           'Tours and Transportation'),
  ('Alphard - Additional hour',                    'Tours and Transportation'),
  ('Andong / Horsecart',                           'Tours and Transportation'),

  /* Miscellaneous */
  ('Babysitting',                                  'Miscellaneous')

) AS v(activity_name, category_name)
JOIN activity_categories c ON c.name = v.category_name
ON CONFLICT (name, category_id) DO NOTHING;

COMMIT;


BEGIN;

INSERT INTO venues (name, is_single_booking_per_day, location, capacity) VALUES
  ('Progo River Bank', FALSE, NULL, NULL),
  ('Pool Club',        FALSE, NULL, NULL),
  ('Gubug Sawah',      FALSE, NULL, NULL),
  ('Joglo Sawah',      FALSE, NULL, NULL),
  ('Sasana Tama',      FALSE, NULL, NULL),
  ('Pak Bilal House',  FALSE, NULL, NULL),
  ('Dalem Jiwo Suite', FALSE, NULL, NULL),
  ('Restaurant',       FALSE, NULL, NULL),
  ('Omah Ndeso',       FALSE, NULL, NULL),
  ('Padmasana',        FALSE, NULL, NULL),
  ('Art Room',         FALSE, NULL, NULL)
ON CONFLICT (name) DO NOTHING;

COMMIT;


UPDATE venues
SET is_single_booking_per_day = TRUE
WHERE name IN ('Dalem Jiwo Suite', 'Pak Bilal House', 'Gubug Sawah');  -- sesuaikan daftar sesuai kebijakanmu
