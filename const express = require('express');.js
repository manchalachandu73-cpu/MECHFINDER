const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
 
const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'mechfinder-secret-key-change-in-prod';
 
app.use(cors());
app.use(express.json());
 
// ═══════════════════════════════════════
// STATIC DATA
// ═══════════════════════════════════════
 
const SERVICES_COST = {
  "engine services": 250,
  "oil services": 50,
  "fluid services": 70,
  "brake services": 120,
  "transmission": 300,
  "electrical system services": 180,
  "suspension": 220,
  "steering": 160,
  "tire services": 100,
  "cooling system services": 140,
  "exhaust system service": 130,
  "general services": 90,
  "body services": 200,
  "miscellaneous repairs": 80
};
 
const MECHANICS_BIKE = {
  guntur:      { name: "Ravan",  phone: "845851xxxx" },
  vijayawada:  { name: "Kiran",  phone: "756559xxxx" },
  pedhakakani: { name: "Vijay",  phone: "929565xxxx" },
  kakani:      { name: "Ravi",   phone: "826545xxxx" },
  namburu:     { name: "Ajay",   phone: "687454xxxx" },
  mangalagiri: { name: "Vishnu", phone: "934851xxxx" }
};
 
const MECHANICS_OTHER = {
  guntur:      { name: "Masthan", phone: "849851xxxx" },
  vijayawada:  { name: "Gambir",  phone: "786559xxxx" },
  pedhakakani: { name: "Arjun",   phone: "929650xxxx" },
  kakani:      { name: "Praveen", phone: "826545xxxx" },
  namburu:     { name: "Pavan",   phone: "687454xxxx" },
  mangalagiri: { name: "Shekhar", phone: "987751xxxx" }
};
 
const MECHANICS_NH = [
  { name: "Suresh NH Works",   phone: "934500xxxx", specialty: "Highway Breakdowns & Towing",        rating: 4.8, tag: "NH 16 — Near Toll Plaza" },
  { name: "Raju Road Rescue",  phone: "876543xxxx", specialty: "Tyre Puncture & Emergency Repair",   rating: 4.7, tag: "NH 16 — Mangalagiri Bypass" },
  { name: "Krishna Auto Care", phone: "912345xxxx", specialty: "Engine & Electrical Highway Service", rating: 4.9, tag: "NH 65 — Vijayawada Exit" }
];
 
const MECHANIC_ACCOUNTS = {
  "m.chandu":  { pass: "12",   name: "M. Chandu",  role: "Engine Specialist",   location: "Guntur, AP",      exp: "8 yrs",  jobs: 142, rating: 4.8, phone: "845123xxxx", skills: ["Engine Repair","Oil Service","Transmission","Suspension"],   recent: [{ svc:"Engine Overhaul", date:"22 Mar 2026", amt:1200 },{ svc:"Oil Change",            date:"19 Mar 2026", amt:150  },{ svc:"Brake Service",   date:"15 Mar 2026", amt:300  }] },
  "m.venu":    { pass: "1245", name: "M. Venu",    role: "Brake & Tyre Expert", location: "Vijayawada, AP",  exp: "5 yrs",  jobs: 98,  rating: 4.6, phone: "786123xxxx", skills: ["Brake Services","Tire Services","Steering","Suspension"],      recent: [{ svc:"Tyre Rotation",   date:"21 Mar 2026", amt:200  },{ svc:"Brake Pad Replacement",date:"18 Mar 2026", amt:450  }] },
  "m.rakesh":  { pass: "8723", name: "M. Rakesh",  role: "Electricals & AC",    location: "Namburu, AP",     exp: "10 yrs", jobs: 207, rating: 4.9, phone: "929123xxxx", skills: ["Electrical System","AC Repair","Wiring","Battery"],             recent: [{ svc:"AC Gas Refill",   date:"23 Mar 2026", amt:800  },{ svc:"Electrical Fix",       date:"20 Mar 2026", amt:350  },{ svc:"Battery Replace", date:"14 Mar 2026", amt:250  }] },
  "m.masthan": { pass: "173",  name: "M. Masthan", role: "General Mechanic",    location: "Kakani, AP",      exp: "6 yrs",  jobs: 76,  rating: 4.5, phone: "826123xxxx", skills: ["General Services","Fluid Services","Body Work","Misc Repairs"], recent: [{ svc:"Full Service",    date:"22 Mar 2026", amt:500  }] },
  "m.fayaz":   { pass: "284",  name: "M. Fayaz",   role: "Transmission Expert", location: "Pedhakakani, AP", exp: "12 yrs", jobs: 315, rating: 4.9, phone: "687123xxxx", skills: ["Transmission","Gearbox","Clutch","Engine Services"],             recent: [{ svc:"Gearbox Repair",  date:"23 Mar 2026", amt:1800 },{ svc:"Clutch Plate",         date:"17 Mar 2026", amt:700  },{ svc:"Engine Check",    date:"11 Mar 2026", amt:200  }] }
};
 
// ═══════════════════════════════════════
// IN-MEMORY STORES
// ═══════════════════════════════════════
 
const users          = {};  // { username: { name, passwordHash, createdAt } }
const customers      = {};  // { customerId: customerObject }
const bookings       = {};  // { bookingId:  bookingObject  }
const directSearches = {};  // { searchId:   searchObject   }
const ratings        = [];  // [ { id, rating, bookingId, timestamp } ]
const registrations  = {};  // { regId: registrationObject }
 
// ═══════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════
 
const genBookingId  = () => 'BK-' + Array.from({ length: 6 }, () => Math.floor(Math.random() * 10)).join('');
const genCustomerId = () => 'CU-' + uuidv4().slice(0, 8).toUpperCase();
const genSearchId   = () => 'SR-' + Array.from({ length: 6 }, () => Math.floor(Math.random() * 10)).join('');
const genRegId      = () => 'MF-' + Math.floor(10000 + Math.random() * 90000);
 
const validatePassword = pw =>
  pw.length >= 8 && /[a-z]/.test(pw) && /[A-Z]/.test(pw) && /[0-9]/.test(pw);
 
const validatePhone = ph =>
  typeof ph === 'string' && /^\d{10}$/.test(ph.trim());
 
const validateEmail = em =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em);
 
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided.' });
  try { req.user = jwt.verify(token, JWT_SECRET); next(); }
  catch { res.status(401).json({ error: 'Invalid or expired token.' }); }
}
 
// Build a clean vehicle object from raw request fields
function buildVehicle({ vehicleType, vehicleMake, vehicleModel, vehicleYear, vehicleNumber }) {
  return {
    type:   vehicleType   ? vehicleType.trim().toLowerCase()       : null,
    make:   vehicleMake   ? vehicleMake.trim()                     : null,
    model:  vehicleModel  ? vehicleModel.trim()                    : null,
    year:   vehicleYear   ? Number(vehicleYear)                    : null,
    number: vehicleNumber ? vehicleNumber.trim().toUpperCase()     : null
  };
}
 
// ═══════════════════════════════════════
// ROUTES
// ═══════════════════════════════════════
 
// ── Health ────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'MechFinder API', version: '2.0.0' });
});
 
// ── Services ──────────────────────────
app.get('/api/services', (_req, res) => res.json({ services: SERVICES_COST }));
 
app.post('/api/services/estimate', (req, res) => {
  const { services } = req.body;
  if (!Array.isArray(services) || !services.length)
    return res.status(400).json({ error: 'Provide a non-empty array of service names.' });
 
  let total = 0;
  const breakdown = {}, unknown = [];
  services.forEach(s => {
    const key = s.toLowerCase();
    SERVICES_COST[key] !== undefined
      ? (breakdown[key] = SERVICES_COST[key], total += SERVICES_COST[key])
      : unknown.push(s);
  });
 
  if (unknown.length) return res.status(400).json({ error: 'Unknown services.', unknown });
  res.json({ total, breakdown });
});
 
// ── Mechanics ─────────────────────────
app.get('/api/mechanics/locations', (_req, res) =>
  res.json({ locations: Object.keys(MECHANICS_BIKE) })
);
 
app.get('/api/mechanics/nh', (_req, res) => res.json({ mechanics: MECHANICS_NH }));
 
app.get('/api/mechanics', (req, res) => {
  const { location, vehicleType } = req.query;
  if (!location) return res.status(400).json({ error: 'location query param required.' });
  const db = (vehicleType === 'bike' || vehicleType === 'scooty') ? MECHANICS_BIKE : MECHANICS_OTHER;
  const mechanic = db[location.toLowerCase()];
  if (!mechanic) return res.status(404).json({ error: 'No mechanic found for that location.' });
  res.json({ mechanic });
});
 
// ── User Auth ─────────────────────────
app.post('/api/users/register', async (req, res) => {
  const { name, password } = req.body;
  if (!name || !password)
    return res.status(400).json({ error: 'name and password are required.' });
  if (!validatePassword(password))
    return res.status(400).json({ error: 'Password must be >=8 chars and include A-Z, a-z, 0-9.' });
 
  const username = name.toLowerCase().replace(/\s+/g, '.');
  if (users[username]) return res.status(409).json({ error: 'Username already exists.' });
 
  const passwordHash = await bcrypt.hash(password, 10);
  users[username] = { name, username, passwordHash, createdAt: new Date().toISOString() };
 
  const token = jwt.sign({ username, name, role: 'user' }, JWT_SECRET, { expiresIn: '7d' });
  res.status(201).json({ message: 'User registered successfully.', token, username, name });
});
 
app.post('/api/users/login', (req, res) => {
  const { name, password } = req.body;
  if (!name || !password) return res.status(400).json({ error: 'name and password are required.' });
  if (!validatePassword(password)) return res.status(400).json({ error: 'Password does not meet requirements.' });
  const token = jwt.sign({ name, role: 'user' }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ message: 'Login successful.', token, name });
});
 
// ── Mechanic Auth ─────────────────────
app.post('/api/mechanics/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'username and password are required.' });
  const account = MECHANIC_ACCOUNTS[username.toLowerCase()];
  if (!account || String(account.pass) !== String(password))
    return res.status(401).json({ error: 'Invalid username or password.' });
  const { pass, ...profile } = account;
  const token = jwt.sign({ username, role: 'mechanic' }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ message: 'Login successful.', token, profile });
});
 
app.get('/api/mechanics/profile', authMiddleware, (req, res) => {
  if (req.user.role !== 'mechanic') return res.status(403).json({ error: 'Not a mechanic account.' });
  const account = MECHANIC_ACCOUNTS[req.user.username];
  if (!account) return res.status(404).json({ error: 'Profile not found.' });
  const { pass, ...profile } = account;
  res.json({ profile });
});
 
// ══════════════════════════════════════════════
// CUSTOMER ENTRY DETAILS  ← NEW
// ══════════════════════════════════════════════
 
/*
  POST /api/customers
  Save a customer's personal + vehicle details.
 
  Body (required): name, phone
  Body (optional): email, address, vehicleType, vehicleMake, vehicleModel,
                   vehicleYear, vehicleNumber, notes
*/
app.post('/api/customers', (req, res) => {
  const {
    name, phone, email, address,
    vehicleType, vehicleMake, vehicleModel, vehicleYear, vehicleNumber, notes
  } = req.body;
 
  if (!name || !name.trim())
    return res.status(400).json({ error: 'Customer name is required.' });
  if (!phone || !validatePhone(phone))
    return res.status(400).json({ error: 'A valid 10-digit phone number is required.' });
  if (!vehicleType || !vehicleType.trim())
    return res.status(400).json({ error: 'vehicleType is required (bike / car / auto / other).' });
  if (email && !validateEmail(email))
    return res.status(400).json({ error: 'Invalid email format.' });
 
  const customerId = genCustomerId();
  const customer = {
    customerId,
    name:      name.trim(),
    phone:     phone.trim(),
    email:     email   ? email.trim().toLowerCase() : null,
    address:   address ? address.trim()             : null,
    vehicle:   buildVehicle({ vehicleType, vehicleMake, vehicleModel, vehicleYear, vehicleNumber }),
    notes:     notes ? notes.trim() : null,
    bookings:  [],
    createdAt: new Date().toISOString()
  };
 
  customers[customerId] = customer;
  res.status(201).json({ message: 'Customer details saved.', customer });
});
 
/*
  GET /api/customers
  List all saved customers (admin view).
*/
app.get('/api/customers', (_req, res) => {
  res.json({ total: Object.keys(customers).length, customers });
});
 
/*
  GET /api/customers/:id
  Fetch a single customer record including their booking history.
*/
app.get('/api/customers/:id', (req, res) => {
  const customer = customers[req.params.id];
  if (!customer) return res.status(404).json({ error: 'Customer not found.' });
  res.json({ customer });
});
 
/*
  PATCH /api/customers/:id
  Update any fields on an existing customer record.
*/
app.patch('/api/customers/:id', (req, res) => {
  const customer = customers[req.params.id];
  if (!customer) return res.status(404).json({ error: 'Customer not found.' });
 
  const {
    name, phone, email, address,
    vehicleType, vehicleMake, vehicleModel, vehicleYear, vehicleNumber, notes
  } = req.body;
 
  if (phone !== undefined && !validatePhone(phone))
    return res.status(400).json({ error: 'A valid 10-digit phone number is required.' });
  if (email !== undefined && email && !validateEmail(email))
    return res.status(400).json({ error: 'Invalid email format.' });
 
  if (name    !== undefined) customer.name    = name.trim();
  if (phone   !== undefined) customer.phone   = phone.trim();
  if (email   !== undefined) customer.email   = email ? email.trim().toLowerCase() : null;
  if (address !== undefined) customer.address = address ? address.trim() : null;
  if (notes   !== undefined) customer.notes   = notes ? notes.trim() : null;
 
  if (vehicleType || vehicleMake || vehicleModel || vehicleYear || vehicleNumber) {
    customer.vehicle = buildVehicle({
      vehicleType:   vehicleType   ?? customer.vehicle.type,
      vehicleMake:   vehicleMake   ?? customer.vehicle.make,
      vehicleModel:  vehicleModel  ?? customer.vehicle.model,
      vehicleYear:   vehicleYear   ?? customer.vehicle.year,
      vehicleNumber: vehicleNumber ?? customer.vehicle.number
    });
  }
 
  customer.updatedAt = new Date().toISOString();
  res.json({ message: 'Customer updated.', customer });
});
 
// ── Bookings ──────────────────────────
 
/*
  POST /api/bookings
  Create a booking. Customer details are saved automatically.
 
  Body — required:
    services[]   : array of service names
    location     : area string
    vehicleType  : "bike" | "car" | "auto"
 
  Body — customer (provide ONE option):
    Option A — link existing:   customerId
    Option B — inline details:  customerName + customerPhone (+ optional fields below)
    Option C — legacy fallback: userName (no customer record saved)
 
  Optional customer fields (used with Option B):
    customerEmail, customerAddress,
    vehicleMake, vehicleModel, vehicleYear, vehicleNumber, notes
*/
app.post('/api/bookings', (req, res) => {
  const {
    services, location, vehicleType,
    customerId,
    customerName, customerPhone, customerEmail, customerAddress,
    vehicleMake, vehicleModel, vehicleYear, vehicleNumber, notes,
    userName   // legacy
  } = req.body;
 
  // Validate service inputs
  if (!services || !location || !vehicleType)
    return res.status(400).json({ error: 'services, location, and vehicleType are required.' });
  if (!Array.isArray(services) || !services.length)
    return res.status(400).json({ error: 'services must be a non-empty array.' });
 
  // Mechanic lookup
  const loc = location.toLowerCase();
  const db  = (vehicleType === 'bike' || vehicleType === 'scooty') ? MECHANICS_BIKE : MECHANICS_OTHER;
  const mechanic = db[loc];
  if (!mechanic) return res.status(404).json({ error: 'No mechanic available in that area.' });
 
  // Cost calculation
  let totalCost = 0;
  const validServices = [], unknownServices = [];
  services.forEach(s => {
    const key = s.toLowerCase();
    SERVICES_COST[key] !== undefined
      ? (validServices.push(key), totalCost += SERVICES_COST[key])
      : unknownServices.push(s);
  });
  if (unknownServices.length) return res.status(400).json({ error: 'Unknown services.', unknownServices });
 
  // Resolve customer
  let resolvedCustomer = null;
  let resolvedCustomerId = null;
 
  if (customerId) {
    // Option A: link existing
    resolvedCustomer = customers[customerId];
    if (!resolvedCustomer) return res.status(404).json({ error: `Customer ID ${customerId} not found.` });
    resolvedCustomerId = customerId;
 
  } else if (customerName && customerPhone) {
    // Option B: create inline
    if (!validatePhone(customerPhone))
      return res.status(400).json({ error: 'customerPhone must be a valid 10-digit number.' });
    if (customerEmail && !validateEmail(customerEmail))
      return res.status(400).json({ error: 'Invalid email format.' });
 
    resolvedCustomerId = genCustomerId();
    resolvedCustomer = {
      customerId: resolvedCustomerId,
      name:      customerName.trim(),
      phone:     customerPhone.trim(),
      email:     customerEmail   ? customerEmail.trim().toLowerCase() : null,
      address:   customerAddress ? customerAddress.trim()             : null,
      vehicle:   buildVehicle({ vehicleType, vehicleMake, vehicleModel, vehicleYear, vehicleNumber }),
      notes:     notes ? notes.trim() : null,
      bookings:  [],
      createdAt: new Date().toISOString()
    };
    customers[resolvedCustomerId] = resolvedCustomer;
 
  } else {
    // Option C: legacy — just a name string
    resolvedCustomer = { name: userName || customerName || 'Guest', phone: null };
  }
 
  // Build booking
  const bookingId = genBookingId();
  const booking = {
    bookingId,
    customer: {
      customerId: resolvedCustomerId,
      name:       resolvedCustomer.name,
      phone:      resolvedCustomer.phone   || null,
      email:      resolvedCustomer.email   || null,
      address:    resolvedCustomer.address || null,
      vehicle:    resolvedCustomer.vehicle || buildVehicle({ vehicleType })
    },
    services:  validServices,
    totalCost,
    location:  loc,
    mechanic,
    status:    'confirmed',
    createdAt: new Date().toISOString()
  };
 
  bookings[bookingId] = booking;
 
  // Cross-link booking ID onto customer
  if (resolvedCustomerId && customers[resolvedCustomerId]) {
    customers[resolvedCustomerId].bookings.push(bookingId);
  }
 
  res.status(201).json({ message: 'Booking confirmed!', booking });
});
 
// GET /api/bookings — list all (admin)
app.get('/api/bookings', (_req, res) => {
  res.json({ total: Object.keys(bookings).length, bookings });
});
 
// GET /api/bookings/:id
app.get('/api/bookings/:id', (req, res) => {
  const booking = bookings[req.params.id];
  if (!booking) return res.status(404).json({ error: 'Booking not found.' });
  res.json({ booking });
});
 
// ── Direct Search ─────────────────────
 
/*
  POST /api/search
  Find nearest mechanic AND save customer details.
 
  Body — required:  location
  Body — optional:  customerName, customerPhone, customerEmail,
                    customerAddress, vehicleType, vehicleMake,
                    vehicleModel, vehicleYear, vehicleNumber, notes
*/
app.post('/api/search', (req, res) => {
  const {
    location,
    customerName, customerPhone, customerEmail, customerAddress,
    vehicleType, vehicleMake, vehicleModel, vehicleYear, vehicleNumber, notes
  } = req.body;
 
  if (!location) return res.status(400).json({ error: 'location is required.' });
 
  const loc = location.toLowerCase();
  const mechanic = MECHANICS_OTHER[loc];
  if (!mechanic) return res.status(404).json({ error: 'No mechanic in that area.' });
 
  // Save customer if details provided
  let savedCustomer = null;
  let savedCustomerId = null;
 
  if (customerName && customerPhone) {
    if (!validatePhone(customerPhone))
      return res.status(400).json({ error: 'customerPhone must be a valid 10-digit number.' });
    if (customerEmail && !validateEmail(customerEmail))
      return res.status(400).json({ error: 'Invalid email format.' });
 
    savedCustomerId = genCustomerId();
    savedCustomer = {
      customerId: savedCustomerId,
      name:      customerName.trim(),
      phone:     customerPhone.trim(),
      email:     customerEmail   ? customerEmail.trim().toLowerCase() : null,
      address:   customerAddress ? customerAddress.trim()             : null,
      vehicle:   buildVehicle({ vehicleType, vehicleMake, vehicleModel, vehicleYear, vehicleNumber }),
      notes:     notes ? notes.trim() : null,
      bookings:  [],
      createdAt: new Date().toISOString()
    };
    customers[savedCustomerId] = savedCustomer;
  }
 
  const searchId = genSearchId();
  directSearches[searchId] = {
    searchId,
    customerId: savedCustomerId,
    customer:   savedCustomer ? { name: savedCustomer.name, phone: savedCustomer.phone } : null,
    location:   loc,
    mechanic,
    createdAt:  new Date().toISOString()
  };
 
  res.json({
    message:       'Mechanic found!',
    searchId,
    mechanic,
    customerId:    savedCustomerId,
    customerSaved: !!savedCustomerId
  });
});
 
// ── Ratings ───────────────────────────
app.post('/api/ratings', (req, res) => {
  const { rating, bookingId } = req.body;
  if (!rating || rating < 1 || rating > 5)
    return res.status(400).json({ error: 'rating must be between 1 and 5.' });
 
  const entry = { id: uuidv4(), rating: Number(rating), bookingId: bookingId || null, timestamp: new Date().toISOString() };
  ratings.push(entry);
 
  const avg = (ratings.reduce((s, r) => s + r.rating, 0) / ratings.length).toFixed(1);
  res.status(201).json({ message: 'Rating submitted. Thank you!', entry, averageRating: Number(avg), totalRatings: ratings.length });
});
 
app.get('/api/ratings/summary', (_req, res) => {
  if (!ratings.length) return res.json({ averageRating: 0, totalRatings: 0 });
  const avg = (ratings.reduce((s, r) => s + r.rating, 0) / ratings.length).toFixed(1);
  res.json({ averageRating: Number(avg), totalRatings: ratings.length });
});
 
// ── Mechanic Registration ─────────────
app.post('/api/register/shop', (req, res) => {
  const { name, location, phone, shopAddress, license } = req.body;
  if (!name || !location || !phone || !shopAddress || !license)
    return res.status(400).json({ error: 'All fields are required.' });
  if (!validatePhone(phone)) return res.status(400).json({ error: 'Phone must be 10 digits.' });
  if (license.length !== 16) return res.status(400).json({ error: 'License must be exactly 16 characters.' });
  if (!/^\d+$/.test(license.slice(6))) return res.status(400).json({ error: 'Last 10 characters of license must be digits.' });
 
  const regId = genRegId();
  registrations[regId] = { regId, type: 'Shop Owner', name, location, phone, shopAddress, license, status: 'active', createdAt: new Date().toISOString() };
  res.status(201).json({ message: 'Shop registered successfully!', registration: registrations[regId] });
});
 
app.post('/api/register/company', (req, res) => {
  const { name, location, phone, companyAddress, companyId, secondaryPhone } = req.body;
  if (!name || !location || !phone || !companyAddress || !companyId)
    return res.status(400).json({ error: 'All fields are required.' });
  if (!validatePhone(phone)) return res.status(400).json({ error: 'Phone must be 10 digits.' });
  if (secondaryPhone && !validatePhone(secondaryPhone)) return res.status(400).json({ error: 'Secondary phone must be 10 digits.' });
 
  const regId = genRegId();
  registrations[regId] = { regId, type: 'Company Agent', name, location, phone, companyAddress, companyId, secondaryPhone: secondaryPhone || null, status: 'active', createdAt: new Date().toISOString() };
  res.status(201).json({ message: 'Company agent registered successfully!', registration: registrations[regId] });
});
 
app.post('/api/register/freelancer', (req, res) => {
  const { name, location, phone, service, rate } = req.body;
  if (!name || !location || !phone || !service || !rate)
    return res.status(400).json({ error: 'All fields are required.' });
  if (!validatePhone(phone)) return res.status(400).json({ error: 'Phone must be 10 digits.' });
 
  const regId = genRegId();
  registrations[regId] = { regId, type: 'Freelance Mechanic', name, location, phone, service, rate: `Rs.${rate}`, status: 'active', createdAt: new Date().toISOString() };
  res.status(201).json({ message: 'Freelancer registered successfully!', registration: registrations[regId] });
});
 
app.get('/api/register/:id', (req, res) => {
  const reg = registrations[req.params.id];
  if (!reg) return res.status(404).json({ error: 'Registration not found.' });
  res.json({ registration: reg });
});
 
// ── 404 Fallback ──────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found.` });
});
 
// ── Start ─────────────────────────────
app.listen(PORT, () => {
  console.log(`MechFinder API v2 running on http://localhost:${PORT}`);
});
 
module.exports = app;
