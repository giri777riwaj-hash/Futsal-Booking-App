-- =====================================================================
--  Futsal Booking App - Database Schema (SQLite)
--  v2: adds player accounts (optional password), a loyalty counter
--  (every 10 paid bookings earns 1 free game), and split-payment support.
--  Admin/slot/booking rules are unchanged from the week-6 build.
-- =====================================================================

PRAGMA foreign_keys = ON;

DROP VIEW    IF EXISTS v_ground_ratings;
DROP VIEW    IF EXISTS v_booking_details;
DROP VIEW    IF EXISTS v_available_slots;
DROP TABLE   IF EXISTS booking_splits;
DROP TABLE   IF EXISTS notifications;
DROP TABLE   IF EXISTS reviews;
DROP TABLE   IF EXISTS payments;
DROP TABLE   IF EXISTS bookings;
DROP TABLE   IF EXISTS time_slots;
DROP TABLE   IF EXISTS grounds;
DROP TABLE   IF EXISTS users;

-- ---------------------------------------------------------------------
--  Tables
-- ---------------------------------------------------------------------

-- role 'player' covers both guest checkouts and registered accounts —
-- password_hash is NULL for a guest, set for someone who made an account.
-- loyalty_count / free_games_available track the "book 10, get 1 free" deal.
CREATE TABLE users (
    user_id               INTEGER PRIMARY KEY AUTOINCREMENT,
    name                  TEXT    NOT NULL,
    email                 TEXT    NOT NULL UNIQUE,
    phone                 TEXT,
    role                  TEXT    NOT NULL CHECK (role IN ('player', 'owner')),
    password_hash         TEXT,                          -- NULL = guest, never logged in with a password
    loyalty_count         INTEGER NOT NULL DEFAULT 0,     -- paid bookings since the last free game
    free_games_available  INTEGER NOT NULL DEFAULT 0,     -- banked free games, ready to redeem
    created_at            TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE grounds (
    ground_id       INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_id        INTEGER NOT NULL,
    name            TEXT    NOT NULL,
    location        TEXT    NOT NULL,
    price_per_hour  REAL    NOT NULL CHECK (price_per_hour > 0),
    sport_type      TEXT    NOT NULL DEFAULT 'futsal',
    FOREIGN KEY (owner_id) REFERENCES users (user_id) ON DELETE CASCADE
);

CREATE TABLE time_slots (
    slot_id     INTEGER PRIMARY KEY AUTOINCREMENT,
    ground_id   INTEGER NOT NULL,
    slot_date   TEXT    NOT NULL,             -- YYYY-MM-DD
    start_time  TEXT    NOT NULL,             -- HH:MM
    end_time    TEXT    NOT NULL,             -- HH:MM
    status      TEXT    NOT NULL DEFAULT 'available'
                CHECK (status IN ('available', 'booked', 'blocked')),
    FOREIGN KEY (ground_id) REFERENCES grounds (ground_id) ON DELETE CASCADE,
    UNIQUE (ground_id, slot_date, start_time),
    CHECK (end_time > start_time)
);

-- is_free marks a booking redeemed with a loyalty reward (amount = 0,
-- doesn't count back towards the next reward).
CREATE TABLE bookings (
    booking_id  INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id   INTEGER NOT NULL,
    slot_id     INTEGER NOT NULL,
    status      TEXT    NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled')),
    is_free     INTEGER NOT NULL DEFAULT 0 CHECK (is_free IN (0, 1)),
    created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (player_id) REFERENCES users (user_id)       ON DELETE CASCADE,
    FOREIGN KEY (slot_id)   REFERENCES time_slots (slot_id)  ON DELETE CASCADE
);

CREATE UNIQUE INDEX idx_one_active_booking_per_slot
    ON bookings (slot_id) WHERE status = 'confirmed';

CREATE TABLE payments (
    payment_id  INTEGER PRIMARY KEY AUTOINCREMENT,
    booking_id  INTEGER NOT NULL UNIQUE,
    amount      REAL    NOT NULL CHECK (amount >= 0),
    method      TEXT    NOT NULL CHECK (method IN ('esewa', 'khalti', 'cash', 'free_reward')),
    status      TEXT    NOT NULL DEFAULT 'paid' CHECK (status IN ('paid', 'failed', 'refunded')),
    paid_at     TEXT    NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (booking_id) REFERENCES bookings (booking_id) ON DELETE CASCADE
);

-- Optional: a booking's cost split across friends. Purely informational —
-- there's no real payment gateway, so a share is "settled" by the booker
-- marking it paid (e.g. after getting cash or an e-wallet transfer from a
-- friend). A shareable WhatsApp/message link is generated client-side.
CREATE TABLE booking_splits (
    split_id     INTEGER PRIMARY KEY AUTOINCREMENT,
    booking_id   INTEGER NOT NULL,
    friend_name  TEXT    NOT NULL,
    friend_phone TEXT,
    share_amount REAL    NOT NULL CHECK (share_amount >= 0),
    is_settled   INTEGER NOT NULL DEFAULT 0 CHECK (is_settled IN (0, 1)),
    FOREIGN KEY (booking_id) REFERENCES bookings (booking_id) ON DELETE CASCADE
);

CREATE TABLE reviews (
    review_id   INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id   INTEGER NOT NULL,
    ground_id   INTEGER NOT NULL,
    rating      INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment     TEXT,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (player_id) REFERENCES users (user_id)      ON DELETE CASCADE,
    FOREIGN KEY (ground_id) REFERENCES grounds (ground_id)  ON DELETE CASCADE,
    UNIQUE (player_id, ground_id)
);

CREATE TABLE notifications (
    notification_id  INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id          INTEGER NOT NULL,
    message          TEXT    NOT NULL,
    type             TEXT    NOT NULL CHECK (type IN ('booking_confirmation', 'cancellation', 'payment', 'reminder', 'loyalty')),
    is_read          INTEGER NOT NULL DEFAULT 0 CHECK (is_read IN (0, 1)),
    created_at       TEXT    NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE
);

CREATE INDEX idx_slots_ground_date  ON time_slots (ground_id, slot_date);
CREATE INDEX idx_bookings_player    ON bookings (player_id);
CREATE INDEX idx_reviews_ground     ON reviews (ground_id);
CREATE INDEX idx_notifs_user        ON notifications (user_id, is_read);
CREATE INDEX idx_splits_booking     ON booking_splits (booking_id);

-- ---------------------------------------------------------------------
--  Triggers
-- ---------------------------------------------------------------------

CREATE TRIGGER trg_ground_owner_role
BEFORE INSERT ON grounds
BEGIN
    SELECT RAISE(ABORT, 'Only a user with role owner can own a ground')
    WHERE (SELECT role FROM users WHERE user_id = NEW.owner_id) <> 'owner';
END;

CREATE TRIGGER trg_booking_player_role
BEFORE INSERT ON bookings
BEGIN
    SELECT RAISE(ABORT, 'Only a user with role player can make a booking')
    WHERE (SELECT role FROM users WHERE user_id = NEW.player_id) <> 'player';
END;

-- Blocks double-booking AND blocks booking a slot the admin has closed,
-- since both 'booked' and 'blocked' are simply "not available".
CREATE TRIGGER trg_booking_slot_available
BEFORE INSERT ON bookings
WHEN NEW.status = 'confirmed'
BEGIN
    SELECT RAISE(ABORT, 'Slot is not available for booking')
    WHERE (SELECT status FROM time_slots WHERE slot_id = NEW.slot_id) <> 'available';
END;

CREATE TRIGGER trg_booking_confirmed
AFTER INSERT ON bookings
WHEN NEW.status = 'confirmed'
BEGIN
    UPDATE time_slots SET status = 'booked' WHERE slot_id = NEW.slot_id;

    INSERT INTO notifications (user_id, message, type)
    VALUES (NEW.player_id,
            'Your booking #' || NEW.booking_id || ' is confirmed.',
            'booking_confirmation');

    INSERT INTO notifications (user_id, message, type)
    SELECT g.owner_id,
           'New booking #' || NEW.booking_id || ' for ' || g.name ||
           ' on ' || t.slot_date || ' at ' || t.start_time,
           'booking_confirmation'
    FROM time_slots t
    JOIN grounds g ON g.ground_id = t.ground_id
    WHERE t.slot_id = NEW.slot_id;
END;

CREATE TRIGGER trg_booking_cancelled
AFTER UPDATE OF status ON bookings
WHEN OLD.status = 'confirmed' AND NEW.status = 'cancelled'
BEGIN
    UPDATE time_slots SET status = 'available' WHERE slot_id = NEW.slot_id;
    UPDATE payments   SET status = 'refunded'
        WHERE booking_id = NEW.booking_id AND status = 'paid';

    INSERT INTO notifications (user_id, message, type)
    VALUES (NEW.player_id,
            'Your booking #' || NEW.booking_id || ' was cancelled.',
            'cancellation');
END;

-- ---------------------------------------------------------------------
--  Views
-- ---------------------------------------------------------------------

CREATE VIEW v_available_slots AS
SELECT t.slot_id, g.ground_id, g.name AS ground_name,
       t.slot_date, t.start_time, t.end_time, g.price_per_hour
FROM time_slots t
JOIN grounds g ON g.ground_id = t.ground_id
WHERE t.status = 'available';

CREATE VIEW v_booking_details AS
SELECT b.booking_id, u.name AS player_name, u.phone AS player_phone,
       g.name AS ground_name, t.slot_date, t.start_time, t.end_time,
       b.status AS booking_status, b.is_free,
       p.amount, p.method AS payment_method, p.status AS payment_status
FROM bookings b
JOIN users u       ON u.user_id   = b.player_id
JOIN time_slots t  ON t.slot_id   = b.slot_id
JOIN grounds g     ON g.ground_id = t.ground_id
LEFT JOIN payments p ON p.booking_id = b.booking_id;

CREATE VIEW v_ground_ratings AS
SELECT g.ground_id, g.name AS ground_name,
       COUNT(r.review_id)      AS total_reviews,
       ROUND(AVG(r.rating), 2) AS avg_rating
FROM grounds g
LEFT JOIN reviews r ON r.ground_id = g.ground_id
GROUP BY g.ground_id, g.name;

-- ---------------------------------------------------------------------
--  Seed data — ONE owner, ONE ground, a few sample players
-- ---------------------------------------------------------------------

INSERT INTO users (name, email, phone, role) VALUES
 ('Bikash Thapa',    'bikash.owner@example.com', '9801000001', 'owner');

-- sample players — none have a password set (they're "guest" until they
-- choose to create an account from the same email/phone)
INSERT INTO users (name, email, phone, role) VALUES
 ('Riwaj Giri',      'riwaj@example.com',        '9841000001', 'player'),
 ('Kaustuv Shrestha','kaustuv@example.com',      '9841000002', 'player'),
 ('Sambarsh Chhetri','sambarsh@example.com',     '9841000003', 'player');

INSERT INTO grounds (owner_id, name, location, price_per_hour, sport_type) VALUES
 (1, 'Green Kick Futsal', 'Baneshwor, Kathmandu', 1500, 'futsal');

-- Pre-generate the next 7 days with the standard daily time slots
INSERT INTO time_slots (ground_id, slot_date, start_time, end_time)
SELECT 1, d.slot_date, s.start_time, s.end_time
FROM (
    SELECT date('now', '+' || n || ' day') AS slot_date
    FROM (SELECT 0 AS n UNION SELECT 1 UNION SELECT 2 UNION SELECT 3
          UNION SELECT 4 UNION SELECT 5 UNION SELECT 6)
) d
CROSS JOIN (
    SELECT '06:00' AS start_time, '07:00' AS end_time
    UNION ALL SELECT '07:00', '08:00'
    UNION ALL SELECT '17:00', '18:00'
    UNION ALL SELECT '18:00', '19:00'
    UNION ALL SELECT '19:00', '20:00'
    UNION ALL SELECT '20:00', '21:00'
) s;
