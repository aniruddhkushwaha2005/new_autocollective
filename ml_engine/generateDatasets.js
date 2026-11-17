import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const datasetsDir = path.resolve(__dirname, '../backend/datasets');

// Deterministic PRNG (Mulberry32) so datasets are reproducible
function createRng(seed = 42) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CAR_SPECS = [
  { brand: 'Hyundai', model: 'Creta', segment: 'Mid-Size SUV', variants: ['EX', 'S(O)', 'SX', 'SX(O)'], fuels: ['Petrol', 'Diesel'], transmissions: ['Manual', 'AT', 'DCT'], baseEx: 11.1, topEx: 20.15, mileage: 17.8 },
  { brand: 'Tata', model: 'Nexon', segment: 'Compact SUV', variants: ['Smart', 'Pure', 'Creative', 'Fearless'], fuels: ['Petrol', 'Diesel', 'CNG'], transmissions: ['Manual', 'AMT', 'DCT'], baseEx: 8.15, topEx: 15.6, mileage: 18.5 },
  { brand: 'Maruti Suzuki', model: 'Grand Vitara', segment: 'Mid-Size SUV', variants: ['Sigma', 'Delta', 'Zeta', 'Alpha+'], fuels: ['Petrol', 'Hybrid', 'CNG'], transmissions: ['Manual', 'AT', 'CVT'], baseEx: 10.99, topEx: 19.93, mileage: 23.4 },
  { brand: 'Mahindra', model: 'XUV700', segment: 'Premium MPV', variants: ['MX', 'AX3', 'AX5', 'AX7L'], fuels: ['Petrol', 'Diesel'], transmissions: ['Manual', 'AT'], baseEx: 13.99, topEx: 25.49, mileage: 14.5 },
  { brand: 'Kia', model: 'Seltos', segment: 'Mid-Size SUV', variants: ['HTE', 'HTK+', 'HTX', 'GTX+'], fuels: ['Petrol', 'Diesel'], transmissions: ['Manual', 'AT', 'DCT'], baseEx: 10.9, topEx: 20.35, mileage: 17.6 },
  { brand: 'Honda', model: 'City', segment: 'Executive Sedan', variants: ['SV', 'V', 'VX', 'ZX'], fuels: ['Petrol', 'Hybrid'], transmissions: ['Manual', 'CVT'], baseEx: 11.82, topEx: 20.55, mileage: 19.2 },
  { brand: 'Tata', model: 'Nexon EV', segment: 'Electric SUV', variants: ['Creative+', 'Fearless+', 'Empowered+'], fuels: ['Electric'], transmissions: ['AT'], baseEx: 12.49, topEx: 16.99, mileage: 38.0 },
  { brand: 'Toyota', model: 'Innova Hycross', segment: 'Premium MPV', variants: ['GX', 'VX', 'ZX', 'ZX(O)'], fuels: ['Petrol', 'Hybrid'], transmissions: ['CVT', 'AT'], baseEx: 19.77, topEx: 30.98, mileage: 21.1 },
  { brand: 'Maruti Suzuki', model: 'Brezza', segment: 'Compact SUV', variants: ['LXi', 'VXi', 'ZXi', 'ZXi+'], fuels: ['Petrol', 'CNG'], transmissions: ['Manual', 'AT'], baseEx: 8.34, topEx: 14.14, mileage: 19.8 },
  { brand: 'Mahindra', model: 'Scorpio-N', segment: 'Mid-Size SUV', variants: ['Z2', 'Z4', 'Z6', 'Z8L'], fuels: ['Petrol', 'Diesel'], transmissions: ['Manual', 'AT'], baseEx: 13.85, topEx: 24.54, mileage: 14.8 },
  { brand: 'Skoda', model: 'Slavia', segment: 'Executive Sedan', variants: ['Classic', 'Signature', 'Monte Carlo', 'Prestige'], fuels: ['Petrol'], transmissions: ['Manual', 'AT', 'DCT'], baseEx: 10.69, topEx: 18.69, mileage: 18.7 },
  { brand: 'MG', model: 'ZS EV', segment: 'Electric SUV', variants: ['Executive', 'Excite Pro', 'Exclusive+', 'Essence'], fuels: ['Electric'], transmissions: ['AT'], baseEx: 18.98, topEx: 25.44, mileage: 41.0 }
];

const CITIES = [
  { name: 'Bengaluru', rtoFactor: 1.18, demandMultiplier: 1.25 },
  { name: 'Mumbai', rtoFactor: 1.14, demandMultiplier: 1.3 },
  { name: 'Delhi NCR', rtoFactor: 1.1, demandMultiplier: 1.45 },
  { name: 'Pune', rtoFactor: 1.13, demandMultiplier: 1.05 },
  { name: 'Hyderabad', rtoFactor: 1.15, demandMultiplier: 1.1 },
  { name: 'Chennai', rtoFactor: 1.14, demandMultiplier: 0.95 },
  { name: 'Ahmedabad', rtoFactor: 1.08, demandMultiplier: 0.85 }
];

export function ensureDatasets() {
  fs.mkdirSync(datasetsDir, { recursive: true });
  const rng = createRng(202611);

  // 1. indian_cars_dataset.csv
  const carRows = [
    'brand,model,variant,segment,year,fuel_type,transmission,mileage_kmpl,km_driven,city,ex_showroom_lakh,market_price_lakh'
  ];

  for (let i = 0; i < 360; i++) {
    const spec = CAR_SPECS[i % CAR_SPECS.length];
    const variantIdx = Math.floor(rng() * spec.variants.length);
    const variant = spec.variants[variantIdx];
    const fuel = spec.fuels[Math.floor(rng() * spec.fuels.length)];
    const trans = spec.transmissions[Math.floor(rng() * spec.transmissions.length)];
    const cityObj = CITIES[Math.floor(rng() * CITIES.length)];
    const year = 2020 + Math.floor(rng() * 7); // 2020..2026
    const age = Math.max(0, 2026 - year);
    const kmDriven = age === 0 ? Math.floor(rng() * 1200) : Math.floor(age * (7500 + rng() * 6500));

    const variantFrac = spec.variants.length > 1 ? variantIdx / (spec.variants.length - 1) : 0.5;
    let exShowroom = spec.baseEx + (spec.topEx - spec.baseEx) * variantFrac;
    if (fuel === 'Diesel') exShowroom += 1.35;
    if (fuel === 'Hybrid') exShowroom += 2.1;
    if (fuel === 'CNG') exShowroom += 0.9;
    if (trans === 'AT' || trans === 'CVT') exShowroom += 1.15;
    if (trans === 'DCT') exShowroom += 1.55;

    const mileage = Number(
      (
        spec.mileage +
        (fuel === 'Diesel' ? 2.4 : fuel === 'Hybrid' ? 4.5 : fuel === 'CNG' ? 5.2 : 0) -
        (trans === 'AT' ? 1.1 : 0) +
        (rng() - 0.5) * 1.4
      ).toFixed(1)
    );

    // Realistic on-road vs depreciated market value
    const onRoadNew = exShowroom * cityObj.rtoFactor;
    const depreciation = age === 0 ? 1.0 : Math.max(0.45, Math.pow(0.89, age) - (kmDriven / 100000) * 0.08);
    const noise = 1 + (rng() - 0.5) * 0.045;
    const marketPrice = Number((onRoadNew * depreciation * noise).toFixed(2));

    carRows.push(
      [
        spec.brand,
        spec.model,
        variant,
        spec.segment,
        year,
        fuel,
        trans,
        mileage,
        kmDriven,
        cityObj.name,
        exShowroom.toFixed(2),
        marketPrice.toFixed(2)
      ].join(',')
    );
  }

  fs.writeFileSync(path.join(datasetsDir, 'indian_cars_dataset.csv'), carRows.join('\n'), 'utf8');

  // 2. historical_demand.csv (18 months: 2025-05 to 2026-10)
  const demandRows = [
    'month,month_index,city,brand,model,buyer_requests,groups_formed,avg_discount_pct,units_sold'
  ];

  const months = [];
  for (let m = 0; m < 18; m++) {
    const year = 2025 + Math.floor((4 + m) / 12);
    const monthNum = ((4 + m) % 12) + 1;
    months.push({ label: `${year}-${String(monthNum).padStart(2, '0')}`, idx: m + 1, monthNum });
  }

  const demandModels = CAR_SPECS.slice(0, 10);
  const demandCities = CITIES.slice(0, 6);

  for (const m of months) {
    // Indian automotive festive peak in Oct/Nov (months 10, 11) and March fiscal close (month 3)
    const seasonalBump =
      m.monthNum === 10 || m.monthNum === 11
        ? 1.32
        : m.monthNum === 3
          ? 1.16
          : m.monthNum === 6 || m.monthNum === 7
            ? 0.9
            : 1.0;

    for (const c of demandCities) {
      for (let k = 0; k < demandModels.length; k++) {
        const car = demandModels[k];
        const modelPopularity = 1.35 - k * 0.06 + (car.fuel === 'Electric' ? 0.15 : 0);
        const trendGrowth = 1 + m.idx * 0.018;
        const baseReqs = 18 * c.demandMultiplier * modelPopularity * seasonalBump * trendGrowth;
        const buyerRequests = Math.max(4, Math.round(baseReqs + (rng() - 0.5) * 6));
        const groupsFormed = Math.max(1, Math.round(buyerRequests / 4.6 + (rng() - 0.3) * 1.2));
        const avgDiscountPct = Number((3.4 + groupsFormed * 0.28 + (rng() - 0.5) * 0.6).toFixed(2));
        const unitsSold = Math.max(2, Math.round(buyerRequests * (0.58 + rng() * 0.14)));

        demandRows.push(
          [
            m.label,
            m.idx,
            c.name,
            car.brand,
            car.model,
            buyerRequests,
            groupsFormed,
            avgDiscountPct,
            unitsSold
          ].join(',')
        );
      }
    }
  }

  fs.writeFileSync(path.join(datasetsDir, 'historical_demand.csv'), demandRows.join('\n'), 'utf8');
  return {
    carsCount: carRows.length - 1,
    demandCount: demandRows.length - 1
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const res = ensureDatasets();
  console.log('Generated datasets:', res);
}
