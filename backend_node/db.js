import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.SQLITE_DB_PATH || path.resolve(__dirname, '../autocollective.db');

export const db = new DatabaseSync(dbPath);

db.exec('PRAGMA foreign_keys = ON;');
db.exec('PRAGMA journal_mode = WAL;');

export function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('buyer', 'dealer', 'admin')),
      phone TEXT DEFAULT '',
      city TEXT DEFAULT 'Bengaluru',
      is_active INTEGER NOT NULL DEFAULT 1,
      saved_cars TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS cars (
      id TEXT PRIMARY KEY,
      brand TEXT NOT NULL,
      model TEXT NOT NULL,
      variant TEXT NOT NULL,
      segment TEXT NOT NULL,
      fuel_type TEXT NOT NULL,
      transmission TEXT NOT NULL,
      ex_showroom_price REAL NOT NULL,
      mileage TEXT NOT NULL,
      seating_capacity INTEGER NOT NULL DEFAULT 5,
      engine_spec TEXT NOT NULL,
      image_url TEXT NOT NULL,
      is_featured INTEGER NOT NULL DEFAULT 0,
      available_cities TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS groups (
      id TEXT PRIMARY KEY,
      group_code TEXT NOT NULL UNIQUE,
      car_id TEXT NOT NULL,
      brand TEXT NOT NULL,
      model TEXT NOT NULL,
      variant TEXT NOT NULL,
      fuel_type TEXT NOT NULL,
      transmission TEXT NOT NULL,
      city TEXT NOT NULL,
      target_members INTEGER NOT NULL DEFAULT 5,
      current_members INTEGER NOT NULL DEFAULT 0,
      min_budget REAL NOT NULL,
      max_budget REAL NOT NULL,
      timeline TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN (
        'Collecting Buyers',
        'Ready for Negotiation',
        'Negotiating',
        'Offer Received',
        'Deal Completed',
        'Expired'
      )),
      negotiation_notes TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      FOREIGN KEY(car_id) REFERENCES cars(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS buyer_requests (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      car_id TEXT,
      brand TEXT NOT NULL,
      model TEXT NOT NULL,
      variant TEXT NOT NULL,
      fuel_type TEXT NOT NULL,
      transmission TEXT NOT NULL,
      city TEXT NOT NULL,
      preferred_budget REAL NOT NULL,
      timeline TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      additional_requirements TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'Pending',
      group_id TEXT,
      match_reason TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS group_members (
      id TEXT PRIMARY KEY,
      group_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      request_id TEXT,
      joined_at TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Active',
      UNIQUE(group_id, user_id),
      FOREIGN KEY(group_id) REFERENCES groups(id) ON DELETE CASCADE,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS dealers (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE,
      dealership_name TEXT NOT NULL,
      brand_authorized TEXT NOT NULL,
      city TEXT NOT NULL,
      address TEXT NOT NULL,
      gst_number TEXT NOT NULL,
      contact_phone TEXT NOT NULL,
      approval_status TEXT NOT NULL DEFAULT 'Pending' CHECK(approval_status IN ('Pending', 'Approved', 'Rejected')),
      managed_car_ids TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS dealer_offers (
      id TEXT PRIMARY KEY,
      dealer_id TEXT NOT NULL,
      dealer_name TEXT NOT NULL,
      group_id TEXT NOT NULL,
      car_id TEXT NOT NULL,
      brand TEXT NOT NULL,
      model TEXT NOT NULL,
      variant TEXT NOT NULL,
      city TEXT NOT NULL,
      ex_showroom_price REAL NOT NULL,
      insurance_charges REAL NOT NULL,
      registration_charges REAL NOT NULL,
      accessories_cost REAL NOT NULL DEFAULT 0,
      extended_warranty REAL NOT NULL DEFAULT 0,
      group_discount REAL NOT NULL DEFAULT 0,
      exchange_bonus REAL NOT NULL DEFAULT 0,
      corporate_offer REAL NOT NULL DEFAULT 0,
      additional_charges REAL NOT NULL DEFAULT 0,
      final_on_road_price REAL NOT NULL,
      delivery_timeline TEXT NOT NULL,
      validity_date TEXT NOT NULL,
      notes TEXT DEFAULT '',
      is_sample INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'Active',
      created_at TEXT NOT NULL,
      FOREIGN KEY(dealer_id) REFERENCES dealers(id) ON DELETE CASCADE,
      FOREIGN KEY(group_id) REFERENCES groups(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS purchases (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      group_id TEXT NOT NULL,
      offer_id TEXT NOT NULL,
      dealer_id TEXT NOT NULL,
      car_id TEXT NOT NULL,
      brand TEXT NOT NULL,
      model TEXT NOT NULL,
      variant TEXT NOT NULL,
      city TEXT NOT NULL,
      agreed_price REAL NOT NULL,
      booking_amount REAL NOT NULL DEFAULT 25000,
      status TEXT NOT NULL DEFAULT 'Interest Expressed',
      created_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(offer_id) REFERENCES dealer_offers(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'info',
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS price_predictions (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      input_json TEXT NOT NULL,
      result_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS demand_forecasts (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      city TEXT NOT NULL,
      model TEXT NOT NULL,
      horizon_months INTEGER NOT NULL,
      summary_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS password_resets (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      reset_token TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      used INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS contact_inquiries (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      city TEXT NOT NULL,
      subject TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_cars_brand_model ON cars(brand, model);
    CREATE INDEX IF NOT EXISTS idx_groups_city_status ON groups(city, status);
    CREATE INDEX IF NOT EXISTS idx_requests_user ON buyer_requests(user_id);
    CREATE INDEX IF NOT EXISTS idx_offers_group ON dealer_offers(group_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);
  `);
}
