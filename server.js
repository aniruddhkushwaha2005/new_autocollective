import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import { db, initSchema } from './backend_node/db.js';
import { seedDatabase, resolveCarImage } from './backend_node/seed.js';
import {
  ensureModelsTrained,
  retrainModels,
  getMlStatus,
  predictCarPrice,
  forecastCarDemand
} from './ml_engine/mlService.js';
import { analyzeDealerOffers } from './ml_engine/offerAnalyzer.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3000);
const JWT_SECRET = process.env.JWT_SECRET || 'autocollective_dev_secret_change_in_prod';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

const uid = (prefix) => `${prefix}_${crypto.randomBytes(6).toString('hex')}`;

// Initialize SQLite schema, seed sample records, and ensure ML models are trained
initSchema();
seedDatabase();
ensureModelsTrained();

const app = express();
app.use(
  cors({
    origin: true,
    credentials: true
  })
);
app.use(express.json({ limit: '2mb' }));

// Request logger
app.use((req, _res, next) => {
  if (req.path.startsWith('/api')) {
    console.log(`[API] ${req.method} ${req.path}`);
  }
  next();
});

// Helper: safe user serialization
function sanitizeUser(u) {
  if (!u) return null;
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    phone: u.phone,
    city: u.city,
    is_active: Boolean(u.is_active),
    saved_cars: JSON.parse(u.saved_cars || '[]'),
    created_at: u.created_at
  };
}

function createNotification(userId, title, message, type = 'info') {
  db.prepare(
    `INSERT INTO notifications (id, user_id, title, message, type, is_read, created_at) VALUES (?, ?, ?, ?, ?, 0, ?)`
  ).run(uid('ntf'), userId, title, message, type, new Date().toISOString());
}

// Auth Middleware
function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ detail: 'Authentication required. Missing Bearer token.' });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(decoded.sub);
    if (!user || !user.is_active) {
      return res.status(401).json({ detail: 'Account is inactive or no longer exists.' });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ detail: 'Session expired or invalid token. Please sign in again.' });
  }
}

function optionalAuth(req, _res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(decoded.sub);
      if (user && user.is_active) req.user = user;
    } catch {
      // Ignore invalid optional token
    }
  }
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        detail: `Access restricted. Required role: ${roles.join(' or ')}.`
      });
    }
    next();
  };
}

// ==================== HEALTH ====================
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'AutoCollective API',
    timestamp: new Date().toISOString()
  });
});

// ==================== AUTH ROUTES ====================
app.post('/api/auth/register', (req, res) => {
  const { name, email, password, role = 'buyer', phone = '', city = 'Bengaluru', dealerProfile } = req.body || {};

  if (!name || !email || !password) {
    return res.status(400).json({ detail: 'Name, email, and password are required.' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ detail: 'Please provide a valid email address.' });
  }
  if (String(password).length < 6) {
    return res.status(400).json({ detail: 'Password must be at least 6 characters.' });
  }
  if (!['buyer', 'dealer'].includes(role)) {
    return res.status(400).json({ detail: 'Public registration is allowed for buyer or dealer roles only.' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE LOWER(email) = LOWER(?)').get(email.trim());
  if (existing) {
    return res.status(409).json({ detail: 'An account with this email already exists.' });
  }

  const userId = uid('usr');
  const now = new Date().toISOString();
  const pwHash = bcrypt.hashSync(password, 10);

  db.prepare(
    `INSERT INTO users (id, name, email, password_hash, role, phone, city, is_active, saved_cars, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1, '[]', ?)`
  ).run(userId, name.trim(), email.trim().toLowerCase(), pwHash, role, phone.trim(), city.trim(), now);

  if (role === 'dealer') {
    const dp = dealerProfile || {};
    db.prepare(
      `INSERT INTO dealers (id, user_id, dealership_name, brand_authorized, city, address, gst_number, contact_phone, approval_status, managed_car_ids, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Pending', '[]', ?)`
    ).run(
      uid('dlr'),
      userId,
      dp.dealership_name || `${name.trim()} Motors`,
      dp.brand_authorized || 'Multi-Brand',
      dp.city || city.trim(),
      dp.address || `${city.trim()} Automotive Hub`,
      dp.gst_number || '29PENDING0001Z1',
      dp.contact_phone || phone.trim() || '+91 90000 00000',
      now
    );

    // Notify admins of pending dealer registration
    const admins = db.prepare(`SELECT id FROM users WHERE role = 'admin'`).all();
    admins.forEach((a) =>
      createNotification(
        a.id,
        'New Dealer Awaiting Approval',
        `${dp.dealership_name || name.trim()} registered in ${dp.city || city} and requires verification.`,
        'admin'
      )
    );
  }

  createNotification(
    userId,
    'Welcome to AutoCollective',
    role === 'dealer'
      ? 'Your dealership profile is submitted and awaiting admin verification before publishing quotations.'
      : 'Your buyer account is active. Submit a car purchase request or join an active collective.',
    'info'
  );

  const createdUser = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  const token = jwt.sign({ sub: createdUser.id, role: createdUser.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

  res.status(201).json({
    access_token: token,
    token_type: 'bearer',
    user: sanitizeUser(createdUser)
  });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ detail: 'Email and password are required.' });
  }

  const user = db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)').get(email.trim());
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ detail: 'Invalid email or password.' });
  }
  if (!user.is_active) {
    return res.status(403).json({ detail: 'Your account has been suspended. Contact support.' });
  }

  const token = jwt.sign({ sub: user.id, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  res.json({
    access_token: token,
    token_type: 'bearer',
    user: sanitizeUser(user)
  });
});

app.get('/api/auth/me', authenticate, (req, res) => {
  const dealer =
    req.user.role === 'dealer' ? db.prepare('SELECT * FROM dealers WHERE user_id = ?').get(req.user.id) : null;
  res.json({
    user: sanitizeUser(req.user),
    dealer: dealer
      ? { ...dealer, managed_car_ids: JSON.parse(dealer.managed_car_ids || '[]') }
      : null
  });
});

app.post('/api/auth/forgot-password', (req, res) => {
  const { email } = req.body || {};
  if (!email) {
    return res.status(400).json({ detail: 'Email address is required.' });
  }
  const user = db.prepare('SELECT id, email FROM users WHERE LOWER(email) = LOWER(?)').get(email.trim());
  if (!user) {
    return res.json({
      message: 'If an account matches that email, password reset instructions have been issued.',
      mode: process.env.MAIL_MODE || 'development'
    });
  }

  const resetToken = crypto.randomBytes(16).toString('hex');
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  db.prepare(
    `INSERT INTO password_resets (id, email, reset_token, expires_at, used, created_at) VALUES (?, ?, ?, ?, 0, ?)`
  ).run(uid('rst'), user.email, resetToken, expiresAt, new Date().toISOString());

  res.json({
    message: 'Development mode: password reset token generated (valid for 15 minutes).',
    mode: 'development',
    dev_reset_token: resetToken
  });
});

app.post('/api/auth/reset-password', (req, res) => {
  const { token, newPassword } = req.body || {};
  if (!token || !newPassword || String(newPassword).length < 6) {
    return res.status(400).json({ detail: 'Valid reset token and new password (min 6 chars) are required.' });
  }

  const record = db.prepare('SELECT * FROM password_resets WHERE reset_token = ? AND used = 0').get(token.trim());
  if (!record || new Date(record.expires_at) < new Date()) {
    return res.status(400).json({ detail: 'Reset token is invalid or has expired.' });
  }

  const pwHash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password_hash = ? WHERE email = ?').run(pwHash, record.email);
  db.prepare('UPDATE password_resets SET used = 1 WHERE id = ?').run(record.id);

  res.json({ message: 'Password updated successfully. You may now sign in.' });
});

// ==================== USER PROFILE & SAVED CARS ====================
app.put('/api/users/profile', authenticate, (req, res) => {
  const { name, phone, city } = req.body || {};
  if (!name || !city) {
    return res.status(400).json({ detail: 'Name and city are required.' });
  }
  db.prepare('UPDATE users SET name = ?, phone = ?, city = ? WHERE id = ?').run(
    name.trim(),
    (phone || '').trim(),
    city.trim(),
    req.user.id
  );
  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  res.json({ user: sanitizeUser(updated) });
});

app.post('/api/users/saved-cars/:carId', authenticate, (req, res) => {
  const { carId } = req.params;
  const car = db.prepare('SELECT id FROM cars WHERE id = ?').get(carId);
  if (!car) return res.status(404).json({ detail: 'Car not found.' });

  const current = JSON.parse(req.user.saved_cars || '[]');
  const exists = current.includes(carId);
  const next = exists ? current.filter((id) => id !== carId) : [...current, carId];
  db.prepare('UPDATE users SET saved_cars = ? WHERE id = ?').run(JSON.stringify(next), req.user.id);

  res.json({ saved: !exists, saved_cars: next });
});

// ==================== CARS CATALOG ====================
app.get('/api/cars', (req, res) => {
  const { search = '', brand = '', fuel_type = '', segment = '', transmission = '', city = '', sort = 'featured' } = req.query;

  let rows = db.prepare('SELECT * FROM cars').all().map((c) => ({
    ...c,
    is_featured: Boolean(c.is_featured),
    available_cities: JSON.parse(c.available_cities || '[]')
  }));

  if (search) {
    const q = String(search).toLowerCase();
    rows = rows.filter(
      (c) =>
        c.brand.toLowerCase().includes(q) ||
        c.model.toLowerCase().includes(q) ||
        c.variant.toLowerCase().includes(q) ||
        c.segment.toLowerCase().includes(q)
    );
  }
  if (brand && brand !== 'All') rows = rows.filter((c) => c.brand === brand);
  if (fuel_type && fuel_type !== 'All') rows = rows.filter((c) => c.fuel_type === fuel_type);
  if (segment && segment !== 'All') rows = rows.filter((c) => c.segment === segment);
  if (transmission && transmission !== 'All') rows = rows.filter((c) => c.transmission === transmission);
  if (city && city !== 'All') rows = rows.filter((c) => c.available_cities.includes(city));

  // Attach active group counts per car
  const groups = db.prepare(`SELECT car_id, COUNT(*) as active_groups FROM groups WHERE status NOT IN ('Deal Completed', 'Expired') GROUP BY car_id`).all();
  const groupCountMap = Object.fromEntries(groups.map((g) => [g.car_id, g.active_groups]));
  rows = rows.map((c) => ({ ...c, active_groups_count: groupCountMap[c.id] || 0 }));

  if (sort === 'price_asc') rows.sort((a, b) => a.ex_showroom_price - b.ex_showroom_price);
  else if (sort === 'price_desc') rows.sort((a, b) => b.ex_showroom_price - a.ex_showroom_price);
  else rows.sort((a, b) => Number(b.is_featured) - Number(a.is_featured));

  res.json({ cars: rows, total: rows.length });
});

app.get('/api/cars/:id', (req, res) => {
  const car = db.prepare('SELECT * FROM cars WHERE id = ?').get(req.params.id);
  if (!car) return res.status(404).json({ detail: 'Car model not found.' });

  const relatedGroups = db.prepare('SELECT * FROM groups WHERE car_id = ?').all(car.id);
  res.json({
    car: {
      ...car,
      is_featured: Boolean(car.is_featured),
      available_cities: JSON.parse(car.available_cities || '[]')
    },
    groups: relatedGroups
  });
});

app.post('/api/cars', authenticate, requireRole('admin'), (req, res) => {
  const { brand, model, variant, segment, fuel_type, transmission, ex_showroom_price, mileage, seating_capacity = 5, engine_spec, image_url, is_featured = false } = req.body || {};
  if (!brand || !model || !variant || !ex_showroom_price) {
    return res.status(400).json({ detail: 'Brand, model, variant, and ex-showroom price are required.' });
  }

  const id = uid('car');
  const now = new Date().toISOString();
  const cities = JSON.stringify(['Bengaluru', 'Mumbai', 'Delhi NCR', 'Pune', 'Hyderabad', 'Chennai', 'Ahmedabad']);
  db.prepare(
    `INSERT INTO cars (id, brand, model, variant, segment, fuel_type, transmission, ex_showroom_price, mileage, seating_capacity, engine_spec, image_url, is_featured, available_cities, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    brand.trim(),
    model.trim(),
    variant.trim(),
    segment || 'Mid-Size SUV',
    fuel_type || 'Petrol',
    transmission || 'AT',
    Number(ex_showroom_price),
    mileage || '18.0 km/l',
    Number(seating_capacity),
    engine_spec || '1.5L BS6 Phase-2 Engine',
    image_url || resolveCarImage(brand, model, segment || 'Mid-Size SUV'),
    is_featured ? 1 : 0,
    cities,
    now
  );

  const created = db.prepare('SELECT * FROM cars WHERE id = ?').get(id);
  res.status(201).json({ car: created });
});

app.delete('/api/cars/:id', authenticate, requireRole('admin'), (req, res) => {
  const existing = db.prepare('SELECT id FROM cars WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ detail: 'Car not found.' });
  db.prepare('DELETE FROM cars WHERE id = ?').run(req.params.id);
  res.json({ deleted: true });
});

// ==================== SMART RULE-BASED BUYER MATCHING & REQUESTS ====================
function findMatchingGroup({ brand, model, variant, fuel_type, transmission, city, preferred_budget }) {
  const openGroups = db
    .prepare(
      `SELECT * FROM groups
       WHERE LOWER(brand) = LOWER(?)
         AND LOWER(model) = LOWER(?)
         AND LOWER(city) = LOWER(?)
         AND status IN ('Collecting Buyers', 'Ready for Negotiation')
         AND current_members < target_members`
    )
    .all(brand, model, city);

  if (openGroups.length === 0) return null;

  // Score candidate groups by rule-based compatibility
  const scored = openGroups
    .map((g) => {
      let score = 0;
      const reasons = ['Brand', 'Model', 'City'];

      if (g.fuel_type.toLowerCase() === String(fuel_type).toLowerCase()) {
        score += 3;
        reasons.push('Fuel Type');
      } else {
        return null; // Fuel mismatch is incompatible
      }

      if (g.transmission.toLowerCase() === String(transmission).toLowerCase()) {
        score += 2;
        reasons.push('Transmission');
      }

      if (g.variant.toLowerCase() === String(variant).toLowerCase()) {
        score += 3;
        reasons.push('Exact Variant');
      } else {
        reasons.push('Compatible Variant');
      }

      const budget = Number(preferred_budget || 0);
      if (budget >= g.min_budget * 0.85 && budget <= g.max_budget * 1.15) {
        score += 2;
        reasons.push('Budget Band');
      } else {
        return null; // Incompatible budget
      }

      return { group: g, score, reason: `Rule-Based Match: ${reasons.join(' · ')}` };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);

  return scored[0] || null;
}

app.get('/api/requests', authenticate, (req, res) => {
  const rows = db
    .prepare(
      `SELECT br.*, g.group_code, g.current_members, g.target_members, g.status as group_status
       FROM buyer_requests br
       LEFT JOIN groups g ON br.group_id = g.id
       WHERE br.user_id = ?
       ORDER BY br.created_at DESC`
    )
    .all(req.user.id);
  res.json({ requests: rows });
});

app.post('/api/requests', authenticate, requireRole('buyer', 'admin'), (req, res) => {
  const {
    car_id,
    brand,
    model,
    variant,
    fuel_type,
    transmission,
    city,
    preferred_budget,
    timeline = 'Within 30 Days',
    quantity = 1,
    additional_requirements = ''
  } = req.body || {};

  if (!brand || !model || !variant || !fuel_type || !transmission || !city || !preferred_budget) {
    return res.status(400).json({ detail: 'All vehicle specification, city, and budget fields are required.' });
  }

  // Prevent duplicate active requests for same buyer + model + city
  const dup = db
    .prepare(
      `SELECT id FROM buyer_requests
       WHERE user_id = ? AND LOWER(brand) = LOWER(?) AND LOWER(model) = LOWER(?) AND LOWER(city) = LOWER(?)
       AND status IN ('Pending', 'Matched', 'Offer Received')`
    )
    .get(req.user.id, brand, model, city);

  if (dup) {
    return res.status(409).json({
      detail: `You already have an active purchase request for ${brand} ${model} in ${city}.`
    });
  }

  // Find matching car_id in catalog if omitted
  let resolvedCarId = car_id;
  if (!resolvedCarId) {
    const foundCar = db
      .prepare('SELECT id FROM cars WHERE LOWER(brand) = LOWER(?) AND LOWER(model) = LOWER(?) LIMIT 1')
      .get(brand, model);
    resolvedCarId = foundCar ? foundCar.id : 'car_creta_sxo';
  }

  const now = new Date().toISOString();
  const requestId = uid('req');
  const budget = Number(preferred_budget);

  // Rule-Based Group Matching
  const match = findMatchingGroup({ brand, model, variant, fuel_type, transmission, city, preferred_budget: budget });

  let groupId;
  let matchReason;

  if (match) {
    groupId = match.group.id;
    matchReason = match.reason;
  } else {
    // Create a new group anchored by this request
    groupId = uid('grp');
    const cityCode = city.slice(0, 3).toUpperCase();
    const modelCode = model.replace(/[^A-Za-z0-9]/g, '').slice(0, 5).toUpperCase();
    const groupCode = `AC-${cityCode}-${modelCode}-${crypto.randomInt(10, 99)}`;
    db.prepare(
      `INSERT INTO groups (id, group_code, car_id, brand, model, variant, fuel_type, transmission, city, target_members, current_members, min_budget, max_budget, timeline, status, negotiation_notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 5, 0, ?, ?, ?, 'Collecting Buyers', ?, ?)`
    ).run(
      groupId,
      groupCode,
      resolvedCarId,
      brand.trim(),
      model.trim(),
      variant.trim(),
      fuel_type.trim(),
      transmission.trim(),
      city.trim(),
      Math.round(budget * 0.9),
      Math.round(budget * 1.1),
      timeline,
      `Created automatically from buyer request in ${city}. Target: 5 verified buyers.`,
      now
    );
    matchReason = 'Rule-Based Match: Initiated new regional buyer collective for this configuration.';
  }

  db.prepare(
    `INSERT INTO buyer_requests (id, user_id, car_id, brand, model, variant, fuel_type, transmission, city, preferred_budget, timeline, quantity, additional_requirements, status, group_id, match_reason, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Matched', ?, ?, ?)`
  ).run(
    requestId,
    req.user.id,
    resolvedCarId,
    brand.trim(),
    model.trim(),
    variant.trim(),
    fuel_type.trim(),
    transmission.trim(),
    city.trim(),
    budget,
    timeline,
    Number(quantity) || 1,
    additional_requirements.trim(),
    groupId,
    matchReason,
    now
  );

  // Add buyer to the matched/new group if not already a member
  const alreadyMember = db
    .prepare('SELECT id FROM group_members WHERE group_id = ? AND user_id = ?')
    .get(groupId, req.user.id);

  if (!alreadyMember) {
    db.prepare(
      `INSERT INTO group_members (id, group_id, user_id, request_id, joined_at, status) VALUES (?, ?, ?, ?, ?, 'Active')`
    ).run(uid('mem'), groupId, req.user.id, requestId, now);

    const grp = db.prepare('SELECT * FROM groups WHERE id = ?').get(groupId);
    const nextCount = grp.current_members + 1;
    const nextStatus = nextCount >= grp.target_members ? 'Ready for Negotiation' : grp.status;
    db.prepare('UPDATE groups SET current_members = ?, status = ? WHERE id = ?').run(nextCount, nextStatus, groupId);
  }

  createNotification(
    req.user.id,
    'Car Request Matched to Group',
    `Your request for ${brand} ${model} (${city}) has been matched. ${matchReason}`,
    'group'
  );

  const createdRequest = db.prepare('SELECT * FROM buyer_requests WHERE id = ?').get(requestId);
  const group = db.prepare('SELECT * FROM groups WHERE id = ?').get(groupId);
  res.status(201).json({ request: createdRequest, matched_group: group });
});

app.delete('/api/requests/:id', authenticate, (req, res) => {
  const existing = db.prepare('SELECT * FROM buyer_requests WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ detail: 'Request not found.' });
  if (existing.user_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ detail: 'Not authorized to cancel this request.' });
  }

  db.prepare("UPDATE buyer_requests SET status = 'Cancelled' WHERE id = ?").run(existing.id);
  if (existing.group_id) {
    const member = db
      .prepare('SELECT id FROM group_members WHERE group_id = ? AND user_id = ?')
      .get(existing.group_id, existing.user_id);
    if (member) {
      db.prepare('DELETE FROM group_members WHERE id = ?').run(member.id);
      const grp = db.prepare('SELECT * FROM groups WHERE id = ?').get(existing.group_id);
      if (grp) {
        const nextCount = Math.max(0, grp.current_members - 1);
        const nextStatus =
          nextCount < grp.target_members && grp.status === 'Ready for Negotiation'
            ? 'Collecting Buyers'
            : grp.status;
        db.prepare('UPDATE groups SET current_members = ?, status = ? WHERE id = ?').run(
          nextCount,
          nextStatus,
          grp.id
        );
      }
    }
  }
  res.json({ cancelled: true });
});

// ==================== GROUPS ROUTES ====================
app.get('/api/groups', optionalAuth, (req, res) => {
  const { city = '', brand = '', status = '', search = '' } = req.query;

  let groups = db
    .prepare(
      `SELECT g.*, c.image_url, c.ex_showroom_price, c.segment
       FROM groups g
       LEFT JOIN cars c ON g.car_id = c.id
       ORDER BY g.created_at DESC`
    )
    .all();

  if (city && city !== 'All') groups = groups.filter((g) => g.city === city);
  if (brand && brand !== 'All') groups = groups.filter((g) => g.brand === brand);
  if (status && status !== 'All') groups = groups.filter((g) => g.status === status);
  if (search) {
    const q = String(search).toLowerCase();
    groups = groups.filter(
      (g) =>
        g.brand.toLowerCase().includes(q) ||
        g.model.toLowerCase().includes(q) ||
        g.city.toLowerCase().includes(q) ||
        g.group_code.toLowerCase().includes(q)
    );
  }

  // Include offers count & membership flag if authenticated
  const offerCounts = Object.fromEntries(
    db.prepare(`SELECT group_id, COUNT(*) as cnt FROM dealer_offers WHERE status = 'Active' GROUP BY group_id`).all().map((r) => [r.group_id, r.cnt])
  );
  const myMemberships = req.user
    ? new Set(
        db.prepare('SELECT group_id FROM group_members WHERE user_id = ?').all(req.user.id).map((m) => m.group_id)
      )
    : new Set();

  const enriched = groups.map((g) => ({
    ...g,
    completion_pct: Math.min(100, Math.round((g.current_members / Math.max(1, g.target_members)) * 100)),
    offers_count: offerCounts[g.id] || 0,
    is_member: myMemberships.has(g.id)
  }));

  res.json({ groups: enriched });
});

app.get('/api/groups/:id', optionalAuth, (req, res) => {
  const group = db
    .prepare(
      `SELECT g.*, c.image_url, c.ex_showroom_price, c.segment, c.engine_spec, c.mileage
       FROM groups g
       LEFT JOIN cars c ON g.car_id = c.id
       WHERE g.id = ?`
    )
    .get(req.params.id);

  if (!group) return res.status(404).json({ detail: 'Buyer group not found.' });

  const members = db
    .prepare(
      `SELECT gm.id, gm.joined_at, gm.status, u.name, u.city, u.id as user_id
       FROM group_members gm
       JOIN users u ON gm.user_id = u.id
       WHERE gm.group_id = ?
       ORDER BY gm.joined_at ASC`
    )
    .all(group.id)
    .map((m, idx) => ({
      ...m,
      // Mask full name for non-admin public viewers while showing clear anonymized buyer label
      display_name: req.user && (req.user.role === 'admin' || req.user.id === m.user_id) ? m.name : `Verified Buyer #${idx + 1}`
    }));

  const offers = db
    .prepare(`SELECT * FROM dealer_offers WHERE group_id = ? AND status != 'Withdrawn' ORDER BY final_on_road_price ASC`)
    .all(group.id)
    .map((o) => ({ ...o, is_sample: Boolean(o.is_sample) }));

  const isMember = req.user
    ? Boolean(db.prepare('SELECT id FROM group_members WHERE group_id = ? AND user_id = ?').get(group.id, req.user.id))
    : false;

  res.json({
    group: {
      ...group,
      completion_pct: Math.min(100, Math.round((group.current_members / Math.max(1, group.target_members)) * 100)),
      is_member: isMember
    },
    members,
    offers
  });
});

app.post('/api/groups/:id/join', authenticate, requireRole('buyer', 'admin'), (req, res) => {
  const group = db.prepare('SELECT * FROM groups WHERE id = ?').get(req.params.id);
  if (!group) return res.status(404).json({ detail: 'Group not found.' });

  if (['Deal Completed', 'Expired'].includes(group.status)) {
    return res.status(400).json({ detail: `Cannot join a group with status "${group.status}".` });
  }
  if (group.current_members >= group.target_members) {
    return res.status(400).json({ detail: 'This buyer collective has already reached its target size.' });
  }

  const existing = db
    .prepare('SELECT id FROM group_members WHERE group_id = ? AND user_id = ?')
    .get(group.id, req.user.id);
  if (existing) {
    return res.status(409).json({ detail: 'You are already a member of this group.' });
  }

  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO group_members (id, group_id, user_id, request_id, joined_at, status) VALUES (?, ?, ?, NULL, ?, 'Active')`
  ).run(uid('mem'), group.id, req.user.id, now);

  const nextCount = group.current_members + 1;
  const nextStatus = nextCount >= group.target_members ? 'Ready for Negotiation' : group.status;
  db.prepare('UPDATE groups SET current_members = ?, status = ? WHERE id = ?').run(nextCount, nextStatus, group.id);

  createNotification(
    req.user.id,
    'Joined Buyer Collective',
    `You joined ${group.group_code} (${group.brand} ${group.model} · ${group.city}). Progress: ${nextCount}/${group.target_members}.`,
    'group'
  );

  if (nextStatus === 'Ready for Negotiation') {
    const approvedDealers = db.prepare(`SELECT user_id FROM dealers WHERE approval_status = 'Approved'`).all();
    approvedDealers.forEach((d) =>
      createNotification(
        d.user_id,
        'Buyer Group Ready for Negotiation',
        `Collective ${group.group_code} (${group.brand} ${group.model} in ${group.city}) reached ${nextCount}/${group.target_members} buyers.`,
        'group'
      )
    );
  }

  const updated = db.prepare('SELECT * FROM groups WHERE id = ?').get(group.id);
  res.json({
    group: {
      ...updated,
      completion_pct: Math.min(100, Math.round((updated.current_members / updated.target_members) * 100)),
      is_member: true
    }
  });
});

app.post('/api/groups/:id/leave', authenticate, (req, res) => {
  const group = db.prepare('SELECT * FROM groups WHERE id = ?').get(req.params.id);
  if (!group) return res.status(404).json({ detail: 'Group not found.' });

  const member = db
    .prepare('SELECT * FROM group_members WHERE group_id = ? AND user_id = ?')
    .get(group.id, req.user.id);
  if (!member) {
    return res.status(400).json({ detail: 'You are not currently a member of this group.' });
  }

  db.prepare('DELETE FROM group_members WHERE id = ?').run(member.id);
  const nextCount = Math.max(0, group.current_members - 1);
  const nextStatus =
    nextCount < group.target_members && group.status === 'Ready for Negotiation'
      ? 'Collecting Buyers'
      : group.status;
  db.prepare('UPDATE groups SET current_members = ?, status = ? WHERE id = ?').run(nextCount, nextStatus, group.id);

  res.json({ left: true, current_members: nextCount, status: nextStatus });
});

app.patch('/api/groups/:id/status', authenticate, requireRole('admin'), (req, res) => {
  const { status, negotiation_notes } = req.body || {};
  const validStatuses = [
    'Collecting Buyers',
    'Ready for Negotiation',
    'Negotiating',
    'Offer Received',
    'Deal Completed',
    'Expired'
  ];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ detail: 'Invalid group status.' });
  }

  const group = db.prepare('SELECT * FROM groups WHERE id = ?').get(req.params.id);
  if (!group) return res.status(404).json({ detail: 'Group not found.' });

  db.prepare('UPDATE groups SET status = ?, negotiation_notes = COALESCE(?, negotiation_notes) WHERE id = ?').run(
    status,
    negotiation_notes ?? null,
    group.id
  );
  res.json({ group: db.prepare('SELECT * FROM groups WHERE id = ?').get(group.id) });
});

// ==================== DEALER ROUTES ====================
app.get('/api/dealers/me', authenticate, requireRole('dealer'), (req, res) => {
  const dealer = db.prepare('SELECT * FROM dealers WHERE user_id = ?').get(req.user.id);
  if (!dealer) return res.status(404).json({ detail: 'Dealer profile not found.' });

  const managedIds = JSON.parse(dealer.managed_car_ids || '[]');
  const allCars = db.prepare('SELECT * FROM cars').all();
  const managedCars = allCars.filter((c) => managedIds.includes(c.id));

  // Matching buyer groups in dealer's city or matching authorized brands
  const groups = db
    .prepare(`SELECT * FROM groups WHERE status NOT IN ('Deal Completed', 'Expired') ORDER BY created_at DESC`)
    .all();

  const myOffers = db
    .prepare('SELECT * FROM dealer_offers WHERE dealer_id = ? ORDER BY created_at DESC')
    .all(dealer.id)
    .map((o) => ({ ...o, is_sample: Boolean(o.is_sample) }));

  const acceptedPurchases = db
    .prepare(
      `SELECT p.*, u.name as buyer_name, u.email as buyer_email, u.phone as buyer_phone
       FROM purchases p
       JOIN users u ON p.user_id = u.id
       WHERE p.dealer_id = ?
       ORDER BY p.created_at DESC`
    )
    .all(dealer.id);

  res.json({
    dealer: { ...dealer, managed_car_ids: managedIds },
    managedCars,
    interestedGroups: groups,
    myOffers,
    acceptedPurchases
  });
});

app.put('/api/dealers/me', authenticate, requireRole('dealer'), (req, res) => {
  const { dealership_name, brand_authorized, city, address, gst_number, contact_phone, managed_car_ids } = req.body || {};
  const dealer = db.prepare('SELECT * FROM dealers WHERE user_id = ?').get(req.user.id);
  if (!dealer) return res.status(404).json({ detail: 'Dealer profile not found.' });

  db.prepare(
    `UPDATE dealers
     SET dealership_name = ?, brand_authorized = ?, city = ?, address = ?, gst_number = ?, contact_phone = ?, managed_car_ids = ?
     WHERE id = ?`
  ).run(
    dealership_name || dealer.dealership_name,
    brand_authorized || dealer.brand_authorized,
    city || dealer.city,
    address || dealer.address,
    gst_number || dealer.gst_number,
    contact_phone || dealer.contact_phone,
    managed_car_ids ? JSON.stringify(managed_car_ids) : dealer.managed_car_ids,
    dealer.id
  );

  const updated = db.prepare('SELECT * FROM dealers WHERE id = ?').get(dealer.id);
  res.json({ dealer: { ...updated, managed_car_ids: JSON.parse(updated.managed_car_ids || '[]') } });
});

// ==================== DEALER OFFERS ====================
app.get('/api/offers', optionalAuth, (req, res) => {
  const { group_id = '', city = '', brand = '', sort = 'price_asc' } = req.query;
  let offers = db
    .prepare(`SELECT * FROM dealer_offers WHERE status != 'Withdrawn'`)
    .all()
    .map((o) => ({ ...o, is_sample: Boolean(o.is_sample) }));

  if (group_id) offers = offers.filter((o) => o.group_id === group_id);
  if (city && city !== 'All') offers = offers.filter((o) => o.city === city);
  if (brand && brand !== 'All') offers = offers.filter((o) => o.brand === brand);

  if (sort === 'discount_desc') {
    offers.sort(
      (a, b) =>
        b.group_discount + b.exchange_bonus + b.corporate_offer - (a.group_discount + a.exchange_bonus + a.corporate_offer)
    );
  } else if (sort === 'price_desc') {
    offers.sort((a, b) => b.final_on_road_price - a.final_on_road_price);
  } else {
    offers.sort((a, b) => a.final_on_road_price - b.final_on_road_price);
  }

  res.json({ offers });
});

app.post('/api/offers', authenticate, requireRole('dealer'), (req, res) => {
  const dealer = db.prepare('SELECT * FROM dealers WHERE user_id = ?').get(req.user.id);
  if (!dealer) return res.status(404).json({ detail: 'Dealer profile not found.' });

  if (dealer.approval_status !== 'Approved') {
    return res.status(403).json({
      detail: 'Your dealership account must be approved by an Admin before publishing quotations.'
    });
  }

  const {
    group_id,
    ex_showroom_price,
    insurance_charges,
    registration_charges,
    accessories_cost = 0,
    extended_warranty = 0,
    group_discount = 0,
    exchange_bonus = 0,
    corporate_offer = 0,
    additional_charges = 0,
    delivery_timeline = '21 Days',
    validity_date = '2026-12-31',
    notes = ''
  } = req.body || {};

  if (!group_id || !ex_showroom_price || insurance_charges === undefined || registration_charges === undefined) {
    return res.status(400).json({ detail: 'Group, ex-showroom price, insurance, and registration charges are required.' });
  }

  const group = db.prepare('SELECT * FROM groups WHERE id = ?').get(group_id);
  if (!group) return res.status(404).json({ detail: 'Target buyer group not found.' });

  const ex = Number(ex_showroom_price);
  const ins = Number(insurance_charges);
  const reg = Number(registration_charges);
  const acc = Number(accessories_cost);
  const war = Number(extended_warranty);
  const gDisc = Number(group_discount);
  const exch = Number(exchange_bonus);
  const corp = Number(corporate_offer);
  const addl = Number(additional_charges);

  const finalOnRoad = Math.max(0, ex + ins + reg + acc + war + addl - (gDisc + exch + corp));
  const id = uid('ofr');
  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO dealer_offers (id, dealer_id, dealer_name, group_id, car_id, brand, model, variant, city, ex_showroom_price, insurance_charges, registration_charges, accessories_cost, extended_warranty, group_discount, exchange_bonus, corporate_offer, additional_charges, final_on_road_price, delivery_timeline, validity_date, notes, is_sample, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'Active', ?)`
  ).run(
    id,
    dealer.id,
    dealer.dealership_name,
    group.id,
    group.car_id,
    group.brand,
    group.model,
    group.variant,
    group.city,
    ex,
    ins,
    reg,
    acc,
    war,
    gDisc,
    exch,
    corp,
    addl,
    finalOnRoad,
    delivery_timeline,
    validity_date,
    notes.trim(),
    now
  );

  // Move group status to Offer Received if currently collecting/negotiating
  if (['Collecting Buyers', 'Ready for Negotiation', 'Negotiating'].includes(group.status)) {
    db.prepare("UPDATE groups SET status = 'Offer Received' WHERE id = ?").run(group.id);
  }

  // Notify all members of this group
  const members = db.prepare('SELECT user_id FROM group_members WHERE group_id = ?').all(group.id);
  members.forEach((m) =>
    createNotification(
      m.user_id,
      'New Dealer Quotation Received',
      `${dealer.dealership_name} submitted a ₹${(finalOnRoad / 100000).toFixed(2)} Lakh on-road quote for ${group.group_code}.`,
      'offer'
    )
  );

  const created = db.prepare('SELECT * FROM dealer_offers WHERE id = ?').get(id);
  res.status(201).json({ offer: { ...created, is_sample: Boolean(created.is_sample) } });
});

app.put('/api/offers/:id', authenticate, requireRole('dealer', 'admin'), (req, res) => {
  const offer = db.prepare('SELECT * FROM dealer_offers WHERE id = ?').get(req.params.id);
  if (!offer) return res.status(404).json({ detail: 'Offer not found.' });

  if (req.user.role === 'dealer') {
    const dealer = db.prepare('SELECT id FROM dealers WHERE user_id = ?').get(req.user.id);
    if (!dealer || dealer.id !== offer.dealer_id) {
      return res.status(403).json({ detail: 'Not authorized to update this quotation.' });
    }
  }

  const p = { ...offer, ...req.body };
  const finalOnRoad = Math.max(
    0,
    Number(p.ex_showroom_price) +
      Number(p.insurance_charges) +
      Number(p.registration_charges) +
      Number(p.accessories_cost) +
      Number(p.extended_warranty) +
      Number(p.additional_charges) -
      (Number(p.group_discount) + Number(p.exchange_bonus) + Number(p.corporate_offer))
  );

  db.prepare(
    `UPDATE dealer_offers
     SET ex_showroom_price = ?, insurance_charges = ?, registration_charges = ?, accessories_cost = ?, extended_warranty = ?, group_discount = ?, exchange_bonus = ?, corporate_offer = ?, additional_charges = ?, final_on_road_price = ?, delivery_timeline = ?, notes = ?, status = ?
     WHERE id = ?`
  ).run(
    Number(p.ex_showroom_price),
    Number(p.insurance_charges),
    Number(p.registration_charges),
    Number(p.accessories_cost),
    Number(p.extended_warranty),
    Number(p.group_discount),
    Number(p.exchange_bonus),
    Number(p.corporate_offer),
    Number(p.additional_charges),
    finalOnRoad,
    p.delivery_timeline,
    p.notes,
    p.status,
    offer.id
  );

  const updated = db.prepare('SELECT * FROM dealer_offers WHERE id = ?').get(offer.id);
  res.json({ offer: { ...updated, is_sample: Boolean(updated.is_sample) } });
});

// ==================== PURCHASES ====================
app.get('/api/purchases', authenticate, (req, res) => {
  let rows;
  if (req.user.role === 'admin') {
    rows = db
      .prepare(
        `SELECT p.*, u.name as buyer_name, u.email as buyer_email, d.dealership_name
         FROM purchases p
         JOIN users u ON p.user_id = u.id
         JOIN dealers d ON p.dealer_id = d.id
         ORDER BY p.created_at DESC`
      )
      .all();
  } else if (req.user.role === 'dealer') {
    const dealer = db.prepare('SELECT id FROM dealers WHERE user_id = ?').get(req.user.id);
    rows = dealer
      ? db
          .prepare(
            `SELECT p.*, u.name as buyer_name, u.email as buyer_email
             FROM purchases p
             JOIN users u ON p.user_id = u.id
             WHERE p.dealer_id = ?
             ORDER BY p.created_at DESC`
          )
          .all(dealer.id)
      : [];
  } else {
    rows = db
      .prepare(
        `SELECT p.*, d.dealership_name, d.contact_phone as dealer_phone
         FROM purchases p
         JOIN dealers d ON p.dealer_id = d.id
         WHERE p.user_id = ?
         ORDER BY p.created_at DESC`
      )
      .all(req.user.id);
  }
  res.json({ purchases: rows });
});

app.post('/api/purchases', authenticate, requireRole('buyer', 'admin'), (req, res) => {
  const { offer_id, booking_amount = 25000 } = req.body || {};
  if (!offer_id) return res.status(400).json({ detail: 'Offer ID is required.' });

  const offer = db.prepare('SELECT * FROM dealer_offers WHERE id = ?').get(offer_id);
  if (!offer) return res.status(404).json({ detail: 'Dealer offer not found.' });

  const dup = db
    .prepare("SELECT id FROM purchases WHERE user_id = ? AND offer_id = ? AND status != 'Cancelled'")
    .get(req.user.id, offer.id);
  if (dup) {
    return res.status(409).json({ detail: 'You have already expressed purchase interest for this quotation.' });
  }

  const id = uid('pur');
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO purchases (id, user_id, group_id, offer_id, dealer_id, car_id, brand, model, variant, city, agreed_price, booking_amount, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Interest Expressed', ?)`
  ).run(
    id,
    req.user.id,
    offer.group_id,
    offer.id,
    offer.dealer_id,
    offer.car_id,
    offer.brand,
    offer.model,
    offer.variant,
    offer.city,
    offer.final_on_road_price,
    Number(booking_amount),
    now
  );

  // Notify dealer
  const dealer = db.prepare('SELECT user_id, dealership_name FROM dealers WHERE id = ?').get(offer.dealer_id);
  if (dealer) {
    createNotification(
      dealer.user_id,
      'Buyer Expressed Purchase Interest',
      `${req.user.name} selected your quotation for ${offer.brand} ${offer.model} (${offer.city}).`,
      'purchase'
    );
  }

  createNotification(
    req.user.id,
    'Purchase Interest Recorded',
    `Your purchase interest with ${offer.dealer_name} for ${offer.brand} ${offer.model} at ₹${(offer.final_on_road_price / 100000).toFixed(2)} Lakh is recorded.`,
    'purchase'
  );

  const created = db.prepare('SELECT * FROM purchases WHERE id = ?').get(id);
  res.status(201).json({ purchase: created });
});

app.patch('/api/purchases/:id/status', authenticate, requireRole('dealer', 'admin'), (req, res) => {
  const { status } = req.body || {};
  const valid = ['Interest Expressed', 'Dealer Contacted', 'Booking Confirmed', 'Completed', 'Cancelled'];
  if (!valid.includes(status)) return res.status(400).json({ detail: 'Invalid purchase status.' });

  const purchase = db.prepare('SELECT * FROM purchases WHERE id = ?').get(req.params.id);
  if (!purchase) return res.status(404).json({ detail: 'Purchase record not found.' });

  db.prepare('UPDATE purchases SET status = ? WHERE id = ?').run(status, purchase.id);
  createNotification(
    purchase.user_id,
    'Purchase Status Updated',
    `Your ${purchase.brand} ${purchase.model} purchase status updated to "${status}".`,
    'purchase'
  );

  res.json({ purchase: db.prepare('SELECT * FROM purchases WHERE id = ?').get(purchase.id) });
});

// ==================== NOTIFICATIONS ====================
app.get('/api/notifications', authenticate, (req, res) => {
  const rows = db
    .prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 40')
    .all(req.user.id)
    .map((n) => ({ ...n, is_read: Boolean(n.is_read) }));
  res.json({ notifications: rows });
});

app.patch('/api/notifications/:id/read', authenticate, (req, res) => {
  db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  res.json({ updated: true });
});

app.patch('/api/notifications/read-all', authenticate, (req, res) => {
  db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(req.user.id);
  res.json({ updated: true });
});

// ==================== ML ENDPOINTS ====================
app.get('/api/ml/status', (_req, res) => {
  res.json(getMlStatus());
});

app.post('/api/ml/retrain', authenticate, requireRole('admin'), (_req, res) => {
  const summary = retrainModels();
  res.json({ message: 'ML models retrained successfully.', summary });
});

app.post('/api/ml/price-prediction', optionalAuth, (req, res) => {
  const { brand, model, variant = '', year = 2026, fuelType = 'Petrol', transmission = 'AT', mileageKmpl = 18.0, kmDriven = 0, city = 'Bengaluru', exShowroomLakh, dealerQuotationLakh } = req.body || {};

  if (!brand || !model) {
    return res.status(400).json({ detail: 'Brand and model are required for price prediction.' });
  }

  const result = predictCarPrice({
    brand,
    model,
    variant,
    year,
    fuelType,
    transmission,
    mileageKmpl,
    kmDriven,
    city,
    exShowroomLakh,
    dealerQuotationLakh
  });

  if (result.modelReady) {
    db.prepare(
      `INSERT INTO price_predictions (id, user_id, input_json, result_json, created_at) VALUES (?, ?, ?, ?, ?)`
    ).run(uid('prd'), req.user ? req.user.id : null, JSON.stringify(req.body), JSON.stringify(result), new Date().toISOString());
  }

  res.json(result);
});

app.get('/api/ml/demand-prediction', optionalAuth, (req, res) => {
  const { city = 'All', model = 'All', horizonMonths = 4 } = req.query;
  const result = forecastCarDemand({
    city: String(city),
    model: String(model),
    horizonMonths: Math.min(12, Math.max(1, Number(horizonMonths) || 4))
  });
  res.json(result);
});

app.post('/api/ml/offer-analysis', optionalAuth, (req, res) => {
  const { group_id, offers: customOffers } = req.body || {};

  let sourceOffers = [];
  if (Array.isArray(customOffers) && customOffers.length > 0) {
    sourceOffers = customOffers;
  } else if (group_id) {
    sourceOffers = db
      .prepare(`SELECT * FROM dealer_offers WHERE group_id = ? AND status != 'Withdrawn'`)
      .all(group_id)
      .map((o) => ({ ...o, is_sample: Boolean(o.is_sample) }));
  } else {
    sourceOffers = db
      .prepare(`SELECT * FROM dealer_offers WHERE status != 'Withdrawn'`)
      .all()
      .map((o) => ({ ...o, is_sample: Boolean(o.is_sample) }));
  }

  const analysis = analyzeDealerOffers(sourceOffers);
  res.json(analysis);
});

// ==================== ADMIN ROUTES ====================
app.get('/api/admin/overview', authenticate, requireRole('admin'), (_req, res) => {
  const totalUsers = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
  const totalBuyers = db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'buyer'").get().c;
  const totalDealers = db.prepare('SELECT COUNT(*) as c FROM dealers').get().c;
  const pendingDealers = db.prepare("SELECT COUNT(*) as c FROM dealers WHERE approval_status = 'Pending'").get().c;
  const activeGroups = db.prepare("SELECT COUNT(*) as c FROM groups WHERE status NOT IN ('Deal Completed', 'Expired')").get().c;
  const completedGroups = db.prepare("SELECT COUNT(*) as c FROM groups WHERE status = 'Deal Completed'").get().c;
  const totalRequests = db.prepare('SELECT COUNT(*) as c FROM buyer_requests').get().c;
  const totalOffers = db.prepare('SELECT COUNT(*) as c FROM dealer_offers').get().c;
  const totalPurchases = db.prepare('SELECT COUNT(*) as c FROM purchases').get().c;

  const users = db.prepare('SELECT id, name, email, role, phone, city, is_active, created_at FROM users ORDER BY created_at DESC').all();
  const dealers = db.prepare('SELECT * FROM dealers ORDER BY created_at DESC').all();
  const requests = db.prepare(`SELECT br.*, u.name as buyer_name, u.email as buyer_email FROM buyer_requests br JOIN users u ON br.user_id = u.id ORDER BY br.created_at DESC`).all();
  const groups = db.prepare('SELECT * FROM groups ORDER BY created_at DESC').all();
  const offers = db.prepare('SELECT * FROM dealer_offers ORDER BY created_at DESC').all();
  const purchases = db.prepare(`SELECT p.*, u.name as buyer_name, d.dealership_name FROM purchases p JOIN users u ON p.user_id = u.id JOIN dealers d ON p.dealer_id = d.id ORDER BY p.created_at DESC`).all();

  res.json({
    metrics: {
      totalUsers,
      totalBuyers,
      totalDealers,
      pendingDealers,
      activeGroups,
      completedGroups,
      totalRequests,
      totalOffers,
      totalPurchases
    },
    users,
    dealers,
    requests,
    groups,
    offers,
    purchases
  });
});

app.patch('/api/admin/dealers/:id', authenticate, requireRole('admin'), (req, res) => {
  const { approval_status } = req.body || {};
  if (!['Pending', 'Approved', 'Rejected'].includes(approval_status)) {
    return res.status(400).json({ detail: 'Invalid approval status.' });
  }
  const dealer = db.prepare('SELECT * FROM dealers WHERE id = ?').get(req.params.id);
  if (!dealer) return res.status(404).json({ detail: 'Dealer not found.' });

  db.prepare('UPDATE dealers SET approval_status = ? WHERE id = ?').run(approval_status, dealer.id);
  createNotification(
    dealer.user_id,
    `Dealership ${approval_status}`,
    approval_status === 'Approved'
      ? `Your dealership ${dealer.dealership_name} has been approved. You can now submit quotations to buyer groups.`
      : `Your dealership verification status was updated to ${approval_status}.`,
    'admin'
  );

  res.json({ dealer: db.prepare('SELECT * FROM dealers WHERE id = ?').get(dealer.id) });
});

app.patch('/api/admin/users/:id/toggle', authenticate, requireRole('admin'), (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ detail: 'User not found.' });
  if (user.id === req.user.id) return res.status(400).json({ detail: 'You cannot deactivate your own admin account.' });

  const next = user.is_active ? 0 : 1;
  db.prepare('UPDATE users SET is_active = ? WHERE id = ?').run(next, user.id);
  res.json({ user: sanitizeUser(db.prepare('SELECT * FROM users WHERE id = ?').get(user.id)) });
});

// ==================== PUBLIC CONTACT ====================
app.post('/api/contact', (req, res) => {
  const { name, email, city = 'Bengaluru', subject, message } = req.body || {};
  if (!name || !email || !subject || !message) {
    return res.status(400).json({ detail: 'Name, email, subject, and message are required.' });
  }
  db.prepare(
    `INSERT INTO contact_inquiries (id, name, email, city, subject, message, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(uid('inq'), name.trim(), email.trim(), city.trim(), subject.trim(), message.trim(), new Date().toISOString());

  res.status(201).json({
    received: true,
    message: 'Thank you. Your inquiry has been logged and our advisory desk will respond shortly.'
  });
});

// ==================== VITE / STATIC SERVING ====================
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AutoCollective full-stack server listening on http://localhost:${PORT}`);
  });
}

startServer();
