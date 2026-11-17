import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { db } from './db.js';

const uid = (prefix) => `${prefix}_${crypto.randomBytes(6).toString('hex')}`;

export const MODEL_IMAGE_MAP = {
  'hyundai|creta': '/src/assets/images/hyundai_creta_suv_1794893984277.jpg',
  'tata|nexon': '/src/assets/images/tata_nexon_suv_1794893983597.jpg',
  'maruti suzuki|grand vitara': '/src/assets/images/maruti_grand_vitara_1794893986014.jpg',
  'mahindra|xuv700': '/src/assets/images/mahindra_xuv700_suv_1794893986732.jpg',
  'kia|seltos': '/src/assets/images/kia_seltos_suv_1794893986131.jpg',
  'honda|city': '/src/assets/images/honda_city_sedan_1794893987473.jpg',
  'tata|nexon ev': '/src/assets/images/tata_nexon_ev_1794893988650.jpg',
  'toyota|innova hycross': '/src/assets/images/toyota_innova_hycross_1794893988902.jpg',
  'maruti suzuki|brezza': '/src/assets/images/maruti_brezza_suv_1794893989474.jpg',
  'skoda|slavia': '/src/assets/images/skoda_slavia_sedan_1794893990259.jpg',
  'mg|zs ev': '/src/assets/images/mg_zs_ev_1794893991913.jpg',
  'mahindra|scorpio-n': '/src/assets/images/mahindra_scorpio_n_1794893991951.jpg'
};

export function resolveCarImage(brand = '', model = '', segment = 'Mid-Size SUV') {
  const key = `${String(brand).trim().toLowerCase()}|${String(model).trim().toLowerCase()}`;
  if (MODEL_IMAGE_MAP[key]) return MODEL_IMAGE_MAP[key];

  const modelLower = String(model).trim().toLowerCase();
  for (const [k, img] of Object.entries(MODEL_IMAGE_MAP)) {
    const [, m] = k.split('|');
    if (modelLower === m || modelLower.includes(m)) return img;
  }

  const segmentFallback = {
    'Mid-Size SUV': MODEL_IMAGE_MAP['hyundai|creta'],
    'Compact SUV': MODEL_IMAGE_MAP['tata|nexon'],
    'Executive Sedan': MODEL_IMAGE_MAP['honda|city'],
    'Electric SUV': MODEL_IMAGE_MAP['tata|nexon ev'],
    'Premium MPV': MODEL_IMAGE_MAP['toyota|innova hycross']
  };
  return segmentFallback[segment] || MODEL_IMAGE_MAP['hyundai|creta'];
}

export function seedDatabase() {
  const userCount = db.prepare('SELECT COUNT(*) as cnt FROM users').get().cnt;
  if (userCount > 0) {
    // Ensure seeded car rows always reference exact model-matched images
    const existingCars = db.prepare('SELECT id, brand, model, segment FROM cars').all();
    const updateImg = db.prepare('UPDATE cars SET image_url = ? WHERE id = ?');
    for (const c of existingCars) {
      const key = `${String(c.brand).trim().toLowerCase()}|${String(c.model).trim().toLowerCase()}`;
      if (MODEL_IMAGE_MAP[key]) {
        updateImg.run(MODEL_IMAGE_MAP[key], c.id);
      }
    }
    return { seeded: false, message: 'Database already populated' };
  }

  const now = new Date().toISOString();
  const hash = (pw) => bcrypt.hashSync(pw, 10);

  // 1. Seed Users (Buyers, Dealers, Admin)
  const users = [
    {
      id: 'usr_admin_01',
      name: 'Rohan Deshmukh',
      email: 'admin@autocollective.in',
      password_hash: hash('Admin@123'),
      role: 'admin',
      phone: '+91 98201 11000',
      city: 'Mumbai',
      saved_cars: '[]'
    },
    {
      id: 'usr_buyer_01',
      name: 'Ananya Sharma',
      email: 'buyer@autocollective.in',
      password_hash: hash('Buyer@123'),
      role: 'buyer',
      phone: '+91 98450 22334',
      city: 'Bengaluru',
      saved_cars: JSON.stringify(['car_creta_sxo', 'car_nexon_ev'])
    },
    {
      id: 'usr_buyer_02',
      name: 'Vikramaditya Nair',
      email: 'vikram.nair@example.in',
      password_hash: hash('Buyer@123'),
      role: 'buyer',
      phone: '+91 98111 44556',
      city: 'Delhi NCR',
      saved_cars: JSON.stringify(['car_xuv700_ax7'])
    },
    {
      id: 'usr_buyer_03',
      name: 'Siddharth Kulkarni',
      email: 'siddharth.k@example.in',
      password_hash: hash('Buyer@123'),
      role: 'buyer',
      phone: '+91 97654 33221',
      city: 'Pune',
      saved_cars: '[]'
    },
    {
      id: 'usr_buyer_04',
      name: 'Meera Iyer',
      email: 'meera.iyer@example.in',
      password_hash: hash('Buyer@123'),
      role: 'buyer',
      phone: '+91 98401 77889',
      city: 'Bengaluru',
      saved_cars: '[]'
    },
    {
      id: 'usr_buyer_05',
      name: 'Karthik Reddy',
      email: 'karthik.r@example.in',
      password_hash: hash('Buyer@123'),
      role: 'buyer',
      phone: '+91 99890 12345',
      city: 'Hyderabad',
      saved_cars: '[]'
    },
    {
      id: 'usr_dealer_01',
      name: 'Rajeshwari Motors Team',
      email: 'dealer@autocollective.in',
      password_hash: hash('Dealer@123'),
      role: 'dealer',
      phone: '+91 80412 90001',
      city: 'Bengaluru',
      saved_cars: '[]'
    },
    {
      id: 'usr_dealer_02',
      name: 'Apex Trident Mobility',
      email: 'apex.dealer@autocollective.in',
      password_hash: hash('Dealer@123'),
      role: 'dealer',
      phone: '+91 80412 90002',
      city: 'Bengaluru',
      saved_cars: '[]'
    },
    {
      id: 'usr_dealer_03',
      name: 'Horizon Auto Delhi',
      email: 'horizon.delhi@autocollective.in',
      password_hash: hash('Dealer@123'),
      role: 'dealer',
      phone: '+91 11405 88221',
      city: 'Delhi NCR',
      saved_cars: '[]'
    },
    {
      id: 'usr_dealer_04',
      name: 'Sahyadri Prime Cars (Pending)',
      email: 'pending.dealer@autocollective.in',
      password_hash: hash('Dealer@123'),
      role: 'dealer',
      phone: '+91 20671 55443',
      city: 'Pune',
      saved_cars: '[]'
    }
  ];

  const insertUser = db.prepare(`
    INSERT INTO users (id, name, email, password_hash, role, phone, city, is_active, saved_cars, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
  `);
  for (const u of users) {
    insertUser.run(u.id, u.name, u.email, u.password_hash, u.role, u.phone, u.city, u.saved_cars, now);
  }

  // 2. Seed Indian Cars Catalog with exact model-matched studio photography
  const allCities = JSON.stringify(['Bengaluru', 'Mumbai', 'Delhi NCR', 'Pune', 'Hyderabad', 'Chennai', 'Ahmedabad']);

  const cars = [
    {
      id: 'car_creta_sxo',
      brand: 'Hyundai',
      model: 'Creta',
      variant: 'SX(O) Tech',
      segment: 'Mid-Size SUV',
      fuel_type: 'Petrol',
      transmission: 'DCT',
      ex_showroom_price: 1845000,
      mileage: '18.4 km/l',
      seating_capacity: 5,
      engine_spec: '1.5L Turbo GDi Petrol · 158 bhp',
      image_url: MODEL_IMAGE_MAP['hyundai|creta'],
      is_featured: 1
    },
    {
      id: 'car_nexon_fearless',
      brand: 'Tata',
      model: 'Nexon',
      variant: 'Fearless+ S',
      segment: 'Compact SUV',
      fuel_type: 'Petrol',
      transmission: 'DCT',
      ex_showroom_price: 1479000,
      mileage: '17.4 km/l',
      seating_capacity: 5,
      engine_spec: '1.2L Revotron Turbo · 118 bhp',
      image_url: MODEL_IMAGE_MAP['tata|nexon'],
      is_featured: 1
    },
    {
      id: 'car_grand_vitara',
      brand: 'Maruti Suzuki',
      model: 'Grand Vitara',
      variant: 'Alpha+ Strong Hybrid',
      segment: 'Mid-Size SUV',
      fuel_type: 'Hybrid',
      transmission: 'CVT',
      ex_showroom_price: 1993000,
      mileage: '27.9 km/l',
      seating_capacity: 5,
      engine_spec: '1.5L Intelligent Electric Hybrid · 114 bhp',
      image_url: MODEL_IMAGE_MAP['maruti suzuki|grand vitara'],
      is_featured: 1
    },
    {
      id: 'car_xuv700_ax7',
      brand: 'Mahindra',
      model: 'XUV700',
      variant: 'AX7 Luxury Pack',
      segment: 'Premium MPV',
      fuel_type: 'Diesel',
      transmission: 'AT',
      ex_showroom_price: 2399000,
      mileage: '16.5 km/l',
      seating_capacity: 7,
      engine_spec: '2.2L mHawk Diesel · 182 bhp · ADAS L2',
      image_url: MODEL_IMAGE_MAP['mahindra|xuv700'],
      is_featured: 1
    },
    {
      id: 'car_seltos_gtx',
      brand: 'Kia',
      model: 'Seltos',
      variant: 'GTX+ 1.5 Turbo',
      segment: 'Mid-Size SUV',
      fuel_type: 'Petrol',
      transmission: 'DCT',
      ex_showroom_price: 1982000,
      mileage: '17.9 km/l',
      seating_capacity: 5,
      engine_spec: '1.5L Smartstream T-GDi · 158 bhp',
      image_url: MODEL_IMAGE_MAP['kia|seltos'],
      is_featured: 0
    },
    {
      id: 'car_honda_city',
      brand: 'Honda',
      model: 'City',
      variant: 'ZX i-VTEC',
      segment: 'Executive Sedan',
      fuel_type: 'Petrol',
      transmission: 'CVT',
      ex_showroom_price: 1635000,
      mileage: '18.4 km/l',
      seating_capacity: 5,
      engine_spec: '1.5L DOHC i-VTEC · 119 bhp · Honda Sensing',
      image_url: MODEL_IMAGE_MAP['honda|city'],
      is_featured: 1
    },
    {
      id: 'car_nexon_ev',
      brand: 'Tata',
      model: 'Nexon EV',
      variant: 'Empowered+ LR',
      segment: 'Electric SUV',
      fuel_type: 'Electric',
      transmission: 'AT',
      ex_showroom_price: 1699000,
      mileage: '465 km range',
      seating_capacity: 5,
      engine_spec: '45 kWh LFP Battery · 143 bhp · DC Fast Charge',
      image_url: MODEL_IMAGE_MAP['tata|nexon ev'],
      is_featured: 1
    },
    {
      id: 'car_innova_hycross',
      brand: 'Toyota',
      model: 'Innova Hycross',
      variant: 'ZX(O) Hybrid',
      segment: 'Premium MPV',
      fuel_type: 'Hybrid',
      transmission: 'CVT',
      ex_showroom_price: 3098000,
      mileage: '23.2 km/l',
      seating_capacity: 7,
      engine_spec: '2.0L TNGA 5th-Gen Hybrid · 184 bhp',
      image_url: MODEL_IMAGE_MAP['toyota|innova hycross'],
      is_featured: 0
    },
    {
      id: 'car_brezza_zxi',
      brand: 'Maruti Suzuki',
      model: 'Brezza',
      variant: 'ZXi+ Smart Hybrid',
      segment: 'Compact SUV',
      fuel_type: 'Petrol',
      transmission: 'AT',
      ex_showroom_price: 1414000,
      mileage: '19.8 km/l',
      seating_capacity: 5,
      engine_spec: '1.5L K15C DualJet · 102 bhp',
      image_url: MODEL_IMAGE_MAP['maruti suzuki|brezza'],
      is_featured: 0
    },
    {
      id: 'car_skoda_slavia',
      brand: 'Skoda',
      model: 'Slavia',
      variant: 'Prestige 1.5 TSI',
      segment: 'Executive Sedan',
      fuel_type: 'Petrol',
      transmission: 'DCT',
      ex_showroom_price: 1869000,
      mileage: '19.3 km/l',
      seating_capacity: 5,
      engine_spec: '1.5L TSI Evo ACT · 148 bhp',
      image_url: MODEL_IMAGE_MAP['skoda|slavia'],
      is_featured: 0
    },
    {
      id: 'car_mg_zsev',
      brand: 'MG',
      model: 'ZS EV',
      variant: 'Essence Pro',
      segment: 'Electric SUV',
      fuel_type: 'Electric',
      transmission: 'AT',
      ex_showroom_price: 2544000,
      mileage: '461 km range',
      seating_capacity: 5,
      engine_spec: '50.3 kWh Prismatic Battery · 174 bhp',
      image_url: MODEL_IMAGE_MAP['mg|zs ev'],
      is_featured: 0
    },
    {
      id: 'car_scorpio_n',
      brand: 'Mahindra',
      model: 'Scorpio-N',
      variant: 'Z8L 4XPLOR',
      segment: 'Mid-Size SUV',
      fuel_type: 'Diesel',
      transmission: 'AT',
      ex_showroom_price: 2454000,
      mileage: '15.2 km/l',
      seating_capacity: 7,
      engine_spec: '2.2L mHawk Diesel · 172 bhp · 4WD',
      image_url: MODEL_IMAGE_MAP['mahindra|scorpio-n'],
      is_featured: 0
    }
  ];

  const insertCar = db.prepare(`
    INSERT INTO cars (id, brand, model, variant, segment, fuel_type, transmission, ex_showroom_price, mileage, seating_capacity, engine_spec, image_url, is_featured, available_cities, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const c of cars) {
    insertCar.run(
      c.id,
      c.brand,
      c.model,
      c.variant,
      c.segment,
      c.fuel_type,
      c.transmission,
      c.ex_showroom_price,
      c.mileage,
      c.seating_capacity,
      c.engine_spec,
      c.image_url,
      c.is_featured,
      allCities,
      now
    );
  }

  // 3. Seed Dealers (3 Approved, 1 Pending)
  const dealers = [
    {
      id: 'dlr_01',
      user_id: 'usr_dealer_01',
      dealership_name: 'Rajeshwari Mobility Bengaluru',
      brand_authorized: 'Hyundai, Kia, Tata',
      city: 'Bengaluru',
      address: '100 Feet Road, Indiranagar, Bengaluru 560038',
      gst_number: '29AABCR4412K1Z5',
      contact_phone: '+91 80 4129 0001',
      approval_status: 'Approved',
      managed_car_ids: JSON.stringify(['car_creta_sxo', 'car_nexon_fearless', 'car_nexon_ev', 'car_seltos_gtx'])
    },
    {
      id: 'dlr_02',
      user_id: 'usr_dealer_02',
      dealership_name: 'Apex Trident Auto Group',
      brand_authorized: 'Hyundai, Honda, Maruti Suzuki',
      city: 'Bengaluru',
      address: 'Outer Ring Road, Marathahalli, Bengaluru 560037',
      gst_number: '29AAACA8821L1Z9',
      contact_phone: '+91 80 4129 0002',
      approval_status: 'Approved',
      managed_car_ids: JSON.stringify(['car_creta_sxo', 'car_honda_city', 'car_grand_vitara', 'car_brezza_zxi'])
    },
    {
      id: 'dlr_03',
      user_id: 'usr_dealer_03',
      dealership_name: 'Horizon Automotive NCR',
      brand_authorized: 'Mahindra, Tata, Toyota',
      city: 'Delhi NCR',
      address: 'Mathura Road, Mohan Cooperative, New Delhi 110044',
      gst_number: '07AAACH1290M1Z2',
      contact_phone: '+91 11 4058 8221',
      approval_status: 'Approved',
      managed_car_ids: JSON.stringify(['car_xuv700_ax7', 'car_scorpio_n', 'car_innova_hycross', 'car_nexon_ev'])
    },
    {
      id: 'dlr_04',
      user_id: 'usr_dealer_04',
      dealership_name: 'Sahyadri Prime Cars Pune',
      brand_authorized: 'Skoda, Tata',
      city: 'Pune',
      address: 'Baner Road, Balewadi High Street, Pune 411045',
      gst_number: '27AABCS9910R1Z1',
      contact_phone: '+91 20 6715 5443',
      approval_status: 'Pending',
      managed_car_ids: JSON.stringify(['car_skoda_slavia', 'car_nexon_fearless'])
    }
  ];

  const insertDealer = db.prepare(`
    INSERT INTO dealers (id, user_id, dealership_name, brand_authorized, city, address, gst_number, contact_phone, approval_status, managed_car_ids, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const d of dealers) {
    insertDealer.run(
      d.id,
      d.user_id,
      d.dealership_name,
      d.brand_authorized,
      d.city,
      d.address,
      d.gst_number,
      d.contact_phone,
      d.approval_status,
      d.managed_car_ids,
      now
    );
  }

  // 4. Seed Buyer Groups
  const groups = [
    {
      id: 'grp_creta_blr_01',
      group_code: 'AC-BLR-CRETA-01',
      car_id: 'car_creta_sxo',
      brand: 'Hyundai',
      model: 'Creta',
      variant: 'SX(O) Tech',
      fuel_type: 'Petrol',
      transmission: 'DCT',
      city: 'Bengaluru',
      target_members: 5,
      current_members: 4,
      min_budget: 2050000,
      max_budget: 2300000,
      timeline: 'Within 30 Days',
      status: 'Offer Received',
      negotiation_notes: 'Two Bengaluru authorized Hyundai dealers have submitted batch quotations for 4–5 units.'
    },
    {
      id: 'grp_nexonev_blr_02',
      group_code: 'AC-BLR-NXEV-02',
      car_id: 'car_nexon_ev',
      brand: 'Tata',
      model: 'Nexon EV',
      variant: 'Empowered+ LR',
      fuel_type: 'Electric',
      transmission: 'AT',
      city: 'Bengaluru',
      target_members: 5,
      current_members: 3,
      min_budget: 1700000,
      max_budget: 1900000,
      timeline: 'Within 45 Days',
      status: 'Collecting Buyers',
      negotiation_notes: 'Need 2 more confirmed EV buyers in Bengaluru to unlock fleet charger & insurance bundle.'
    },
    {
      id: 'grp_xuv700_del_03',
      group_code: 'AC-DEL-XUV-03',
      car_id: 'car_xuv700_ax7',
      brand: 'Mahindra',
      model: 'XUV700',
      variant: 'AX7 Luxury Pack',
      fuel_type: 'Diesel',
      transmission: 'AT',
      city: 'Delhi NCR',
      target_members: 5,
      current_members: 5,
      min_budget: 2650000,
      max_budget: 2950000,
      timeline: 'Immediate (15 Days)',
      status: 'Ready for Negotiation',
      negotiation_notes: '5/5 Delhi NCR buyers confirmed. Dealer bidding opened for immediate allocation.'
    },
    {
      id: 'grp_city_pun_04',
      group_code: 'AC-PUN-CITY-04',
      car_id: 'car_honda_city',
      brand: 'Honda',
      model: 'City',
      variant: 'ZX i-VTEC',
      fuel_type: 'Petrol',
      transmission: 'CVT',
      city: 'Pune',
      target_members: 5,
      current_members: 2,
      min_budget: 1750000,
      max_budget: 1950000,
      timeline: 'Within 60 Days',
      status: 'Collecting Buyers',
      negotiation_notes: 'Open collective for Pune sedan buyers.'
    },
    {
      id: 'grp_vitara_hyd_05',
      group_code: 'AC-HYD-VIT-05',
      car_id: 'car_grand_vitara',
      brand: 'Maruti Suzuki',
      model: 'Grand Vitara',
      variant: 'Alpha+ Strong Hybrid',
      fuel_type: 'Hybrid',
      transmission: 'CVT',
      city: 'Hyderabad',
      target_members: 5,
      current_members: 4,
      min_budget: 2150000,
      max_budget: 2400000,
      timeline: 'Within 30 Days',
      status: 'Negotiating',
      negotiation_notes: 'Active negotiation underway with Nexa Jubilee Hills & Madhapur showrooms.'
    }
  ];

  const insertGroup = db.prepare(`
    INSERT INTO groups (id, group_code, car_id, brand, model, variant, fuel_type, transmission, city, target_members, current_members, min_budget, max_budget, timeline, status, negotiation_notes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const g of groups) {
    insertGroup.run(
      g.id,
      g.group_code,
      g.car_id,
      g.brand,
      g.model,
      g.variant,
      g.fuel_type,
      g.transmission,
      g.city,
      g.target_members,
      g.current_members,
      g.min_budget,
      g.max_budget,
      g.timeline,
      g.status,
      g.negotiation_notes,
      now
    );
  }

  // 5. Seed Buyer Requests & Group Memberships
  const requests = [
    {
      id: 'req_01',
      user_id: 'usr_buyer_01',
      car_id: 'car_creta_sxo',
      brand: 'Hyundai',
      model: 'Creta',
      variant: 'SX(O) Tech',
      fuel_type: 'Petrol',
      transmission: 'DCT',
      city: 'Bengaluru',
      preferred_budget: 2180000,
      timeline: 'Within 30 Days',
      quantity: 1,
      additional_requirements: 'Prefer Abyss Black or Titan Grey delivery before month end.',
      status: 'Offer Received',
      group_id: 'grp_creta_blr_01',
      match_reason: 'Rule-Based Match: Exact Brand, Model, Variant, Petrol DCT & Bengaluru budget band.'
    },
    {
      id: 'req_02',
      user_id: 'usr_buyer_04',
      car_id: 'car_creta_sxo',
      brand: 'Hyundai',
      model: 'Creta',
      variant: 'SX(O) Tech',
      fuel_type: 'Petrol',
      transmission: 'DCT',
      city: 'Bengaluru',
      preferred_budget: 2220000,
      timeline: 'Within 30 Days',
      quantity: 1,
      additional_requirements: 'Need corporate GST invoice.',
      status: 'Offer Received',
      group_id: 'grp_creta_blr_01',
      match_reason: 'Rule-Based Match: Exact Brand, Model, City & Timeline.'
    },
    {
      id: 'req_03',
      user_id: 'usr_buyer_02',
      car_id: 'car_xuv700_ax7',
      brand: 'Mahindra',
      model: 'XUV700',
      variant: 'AX7 Luxury Pack',
      fuel_type: 'Diesel',
      transmission: 'AT',
      city: 'Delhi NCR',
      preferred_budget: 2800000,
      timeline: 'Immediate (15 Days)',
      quantity: 1,
      additional_requirements: 'Midnight Black 7-seater automatic.',
      status: 'Matched',
      group_id: 'grp_xuv700_del_03',
      match_reason: 'Rule-Based Match: Exact Mahindra XUV700 Diesel AT in Delhi NCR.'
    },
    {
      id: 'req_04',
      user_id: 'usr_buyer_03',
      car_id: 'car_honda_city',
      brand: 'Honda',
      model: 'City',
      variant: 'ZX i-VTEC',
      fuel_type: 'Petrol',
      transmission: 'CVT',
      city: 'Pune',
      preferred_budget: 1850000,
      timeline: 'Within 60 Days',
      quantity: 1,
      additional_requirements: 'Pearl White preferred.',
      status: 'Matched',
      group_id: 'grp_city_pun_04',
      match_reason: 'Rule-Based Match: Exact Honda City ZX CVT in Pune.'
    },
    {
      id: 'req_05',
      user_id: 'usr_buyer_05',
      car_id: 'car_grand_vitara',
      brand: 'Maruti Suzuki',
      model: 'Grand Vitara',
      variant: 'Alpha+ Strong Hybrid',
      fuel_type: 'Hybrid',
      transmission: 'CVT',
      city: 'Hyderabad',
      preferred_budget: 2280000,
      timeline: 'Within 30 Days',
      quantity: 1,
      additional_requirements: 'Zero-dep insurance included.',
      status: 'Matched',
      group_id: 'grp_vitara_hyd_05',
      match_reason: 'Rule-Based Match: Strong Hybrid Grand Vitara in Hyderabad.'
    }
  ];

  const insertReq = db.prepare(`
    INSERT INTO buyer_requests (id, user_id, car_id, brand, model, variant, fuel_type, transmission, city, preferred_budget, timeline, quantity, additional_requirements, status, group_id, match_reason, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertMember = db.prepare(`
    INSERT INTO group_members (id, group_id, user_id, request_id, joined_at, status)
    VALUES (?, ?, ?, ?, ?, 'Active')
  `);

  for (const r of requests) {
    insertReq.run(
      r.id,
      r.user_id,
      r.car_id,
      r.brand,
      r.model,
      r.variant,
      r.fuel_type,
      r.transmission,
      r.city,
      r.preferred_budget,
      r.timeline,
      r.quantity,
      r.additional_requirements,
      r.status,
      r.group_id,
      r.match_reason,
      now
    );
    insertMember.run(uid('mem'), r.group_id, r.user_id, r.id, now);
  }

  // 6. Seed Sample Dealer Offers (Clearly labelled as sample quotations)
  const offers = [
    {
      id: 'ofr_creta_01',
      dealer_id: 'dlr_01',
      dealer_name: 'Rajeshwari Mobility Bengaluru',
      group_id: 'grp_creta_blr_01',
      car_id: 'car_creta_sxo',
      brand: 'Hyundai',
      model: 'Creta',
      variant: 'SX(O) Tech',
      city: 'Bengaluru',
      ex_showroom_price: 1845000,
      insurance_charges: 68500,
      registration_charges: 332000,
      accessories_cost: 18000,
      extended_warranty: 22000,
      group_discount: 72000,
      exchange_bonus: 25000,
      corporate_offer: 15000,
      additional_charges: 0,
      final_on_road_price: 2173500,
      delivery_timeline: '18 Days Guaranteed',
      validity_date: '2026-12-15',
      notes: 'Sample Quotation · Includes 5-unit collective fleet discount, zero handling fee, and transparent itemized RTO receipt.',
      is_sample: 1,
      status: 'Active'
    },
    {
      id: 'ofr_creta_02',
      dealer_id: 'dlr_02',
      dealer_name: 'Apex Trident Auto Group',
      group_id: 'grp_creta_blr_01',
      car_id: 'car_creta_sxo',
      brand: 'Hyundai',
      model: 'Creta',
      variant: 'SX(O) Tech',
      city: 'Bengaluru',
      ex_showroom_price: 1845000,
      insurance_charges: 108000,
      registration_charges: 332000,
      accessories_cost: 64000,
      extended_warranty: 24000,
      group_discount: 55000,
      exchange_bonus: 20000,
      corporate_offer: 10000,
      additional_charges: 18500,
      final_on_road_price: 2306500,
      delivery_timeline: '25 Days',
      validity_date: '2026-12-10',
      notes: 'Sample Quotation · Bundled dealer accessory pack & comprehensive ceramic package.',
      is_sample: 1,
      status: 'Active'
    },
    {
      id: 'ofr_xuv_01',
      dealer_id: 'dlr_03',
      dealer_name: 'Horizon Automotive NCR',
      group_id: 'grp_xuv700_del_03',
      car_id: 'car_xuv700_ax7',
      brand: 'Mahindra',
      model: 'XUV700',
      variant: 'AX7 Luxury Pack',
      city: 'Delhi NCR',
      ex_showroom_price: 2399000,
      insurance_charges: 89000,
      registration_charges: 264000,
      accessories_cost: 22000,
      extended_warranty: 29000,
      group_discount: 95000,
      exchange_bonus: 35000,
      corporate_offer: 20000,
      additional_charges: 0,
      final_on_road_price: 2653000,
      delivery_timeline: '12 Days Priority Allocation',
      validity_date: '2026-12-20',
      notes: 'Sample Quotation · Priority Delhi NCR batch allocation for 5 confirmed buyers.',
      is_sample: 1,
      status: 'Active'
    }
  ];

  const insertOffer = db.prepare(`
    INSERT INTO dealer_offers (id, dealer_id, dealer_name, group_id, car_id, brand, model, variant, city, ex_showroom_price, insurance_charges, registration_charges, accessories_cost, extended_warranty, group_discount, exchange_bonus, corporate_offer, additional_charges, final_on_road_price, delivery_timeline, validity_date, notes, is_sample, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const o of offers) {
    insertOffer.run(
      o.id,
      o.dealer_id,
      o.dealer_name,
      o.group_id,
      o.car_id,
      o.brand,
      o.model,
      o.variant,
      o.city,
      o.ex_showroom_price,
      o.insurance_charges,
      o.registration_charges,
      o.accessories_cost,
      o.extended_warranty,
      o.group_discount,
      o.exchange_bonus,
      o.corporate_offer,
      o.additional_charges,
      o.final_on_road_price,
      o.delivery_timeline,
      o.validity_date,
      o.notes,
      o.is_sample,
      o.status,
      now
    );
  }

  // 7. Seed Notifications
  const insertNotif = db.prepare(`
    INSERT INTO notifications (id, user_id, title, message, type, is_read, created_at)
    VALUES (?, ?, ?, ?, ?, 0, ?)
  `);
  insertNotif.run(
    uid('ntf'),
    'usr_buyer_01',
    'New Dealer Quotations Received',
    '2 approved Bengaluru dealers submitted quotations for your Hyundai Creta SX(O) Tech collective (AC-BLR-CRETA-01).',
    'offer',
    now
  );
  insertNotif.run(
    uid('ntf'),
    'usr_admin_01',
    'Dealer Verification Pending',
    'Sahyadri Prime Cars Pune submitted GST credentials and is awaiting admin approval.',
    'admin',
    now
  );
  insertNotif.run(
    uid('ntf'),
    'usr_dealer_01',
    'Group Ready in Bengaluru',
    'AC-BLR-CRETA-01 has 4/5 buyers active. Submit or update your collective quotation.',
    'group',
    now
  );

  return { seeded: true };
}
