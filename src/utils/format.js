export function formatINR(amount) {
  const num = Number(amount || 0);
  return '₹' + Math.round(num).toLocaleString('en-IN');
}

export function formatLakhs(amount) {
  const num = Number(amount || 0);
  const lakhs = num > 1000 ? num / 100000 : num;
  return `₹${lakhs.toFixed(2)} Lakh`;
}

export function formatDate(isoString) {
  if (!isoString) return '—';
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return isoString;
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

export const INDIAN_CITIES = [
  'Bengaluru',
  'Mumbai',
  'Delhi NCR',
  'Pune',
  'Hyderabad',
  'Chennai',
  'Ahmedabad'
];

export const CAR_BRANDS = [
  'Hyundai',
  'Tata',
  'Maruti Suzuki',
  'Mahindra',
  'Kia',
  'Honda',
  'Toyota',
  'Skoda',
  'MG'
];

export const FUEL_TYPES = ['Petrol', 'Diesel', 'Hybrid', 'Electric', 'CNG'];
export const TRANSMISSIONS = ['Manual', 'AMT', 'AT', 'CVT', 'DCT'];
export const TIMELINES = [
  'Immediate (15 Days)',
  'Within 30 Days',
  'Within 45 Days',
  'Within 60 Days',
  'Within 90 Days'
];
