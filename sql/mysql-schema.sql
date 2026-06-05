-- Guest Activities Manager - MySQL schema
-- Target charset/collation: utf8mb4 / utf8mb4_unicode_ci

CREATE TABLE activity_categories (
  id CHAR(36) NOT NULL,
  name TEXT NOT NULL,
  description TEXT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uq_activity_categories_name (name(255))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE profiles (
  id CHAR(36) NOT NULL,
  email VARCHAR(255) NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role VARCHAR(20) NOT NULL,
  avatar_img TEXT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY profiles_email_key (email),
  CONSTRAINT profiles_role_check CHECK (role IN ('admin', 'staff', 'viewer'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE venues (
  id CHAR(36) NOT NULL,
  name TEXT NOT NULL,
  is_single_booking_per_day TINYINT(1) NOT NULL DEFAULT 0,
  location TEXT NULL,
  capacity INT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  is_exclusive_by_time TINYINT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uq_venues_name (name(255)),
  KEY idx_venues_single_day (is_single_booking_per_day)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE activities (
  id CHAR(36) NOT NULL,
  category_id CHAR(36) NOT NULL,
  name TEXT NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  description TEXT NULL,
  duration INT NULL,
  max_capacity INT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uq_activities_name_category (name(255), category_id),
  KEY idx_activities_category (category_id),
  KEY idx_activities_active (is_active),
  CONSTRAINT activities_category_id_fkey FOREIGN KEY (category_id) REFERENCES activity_categories(id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE bookings (
  id CHAR(36) NOT NULL,
  date DATE NOT NULL,
  start_time TIME(6) NOT NULL,
  end_time TIME(6) NULL,
  activity_id CHAR(36) NOT NULL,
  venue_id CHAR(36) NOT NULL,
  guest_name TEXT NOT NULL,
  suite_number TEXT NOT NULL,
  pax INT NOT NULL,
  ga_name TEXT NULL,
  driver_name TEXT NULL,
  remark TEXT NULL,
  status VARCHAR(20) NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  created_by CHAR(36) NULL,
  updated_by CHAR(36) NULL,
  bill TEXT NULL,
  PRIMARY KEY (id),
  KEY idx_bookings_date (date),
  KEY idx_bookings_status (status),
  KEY idx_bookings_venue_date (venue_id, date),
  CONSTRAINT bookings_pax_check CHECK (pax > 0),
  CONSTRAINT bookings_status_check CHECK (status IN ('tentative', 'confirmed', 'cancelled', 'done')),
  CONSTRAINT bookings_activity_id_fkey FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT bookings_venue_id_fkey FOREIGN KEY (venue_id) REFERENCES venues(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT bookings_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT bookings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES profiles(id) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE booking_history (
  id CHAR(36) NOT NULL,
  booking_id CHAR(36) NOT NULL,
  actor_id CHAR(36) NULL,
  action TEXT NOT NULL,
  changes JSON NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  KEY idx_booking_history_booking (booking_id),
  CONSTRAINT booking_history_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT booking_history_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES profiles(id) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TRIGGER trg_ac_set_updated_at BEFORE UPDATE ON activity_categories FOR EACH ROW SET NEW.updated_at = CURRENT_TIMESTAMP(6);
CREATE TRIGGER trg_set_updated_at BEFORE UPDATE ON profiles FOR EACH ROW SET NEW.updated_at = CURRENT_TIMESTAMP(6);
CREATE TRIGGER trg_venues_set_updated_at BEFORE UPDATE ON venues FOR EACH ROW SET NEW.updated_at = CURRENT_TIMESTAMP(6);
CREATE TRIGGER trg_act_set_updated_at BEFORE UPDATE ON activities FOR EACH ROW SET NEW.updated_at = CURRENT_TIMESTAMP(6);
CREATE TRIGGER trg_bookings_set_updated_at BEFORE UPDATE ON bookings FOR EACH ROW SET NEW.updated_at = CURRENT_TIMESTAMP(6);
