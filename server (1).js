const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const webpush = require('web-push');
 
const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'mechfinder-secret-key-change-in-prod';
 
// ═══════════════════════════════════════
// WEB PUSH (VAPID) SETUP
// Generate your own keys with:  npx web-push generate-vapid-keys
// ═══════════════════════════════════════
const VAPID_PUBLIC_KEY  = process.env.VAPID_PUBLIC_KEY  || 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'UUxI4O8-FbRouAevSmBQ6co62groqu2pCPSFMZdSxGI';
const VAPID_EMAIL       = process.env.VAPID_EMAIL       || 'mailto:admin@mechfinder.in';
 
webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
 
// In-memory push subscriptions store: { endpoint -> subscription }
const pushSubscriptions = {};
 
app.use(cors());
app.use(express.json());
 
// ═══════════════════════════════════════
// IN-MEMORY DATA (replace with DB later)
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
  { name: "Suresh NH Works",  phone: "934500xxxx", specialty: "Highway Breakdowns & Towing",            rating: 4.8, tag: "🛣️ NH 16 — Near Toll Plaza" },
  { name: "Raju Road Rescue", phone: "876543xxxx", specialty: "Tyre Puncture & Emergency Repair",        rating: 4.7, tag: "🛣️ NH 16 — Mangalagiri Bypass" },
  { name: "Krishna Auto Care",phone: "912345xxxx", specialty: "Engine & Electrical Highway Service",     rating: 4.9, tag: "🛣️ NH 65 — Vijayawada Exit" }
];
 
// Mechanic accounts (passwords stored as hashed in real app)
const MECHANIC_ACCOUNTS = {
  "m.chandu":  { pass: "12",   name: "M. Chandu",  role: "Engine Specialist",    location: "Guntur, AP",      exp: "8 yrs",  jobs: 142, rating: 4.8, phone: "845123xxxx", skills: ["Engine Repair","Oil Service","Transmission","Suspension"],     recent: [{ svc:"Engine Overhaul", date:"22 Mar 2026", amt:1200, icon:"⚙️" },{ svc:"Oil Change",         date:"19 Mar 2026", amt:150,  icon:"🛢️" },{ svc:"Brake Service", date:"15 Mar 2026", amt:300, icon:"🔴" }] },
  "m.venu":    { pass: "1245", name: "M. Venu",    role: "Brake & Tyre Expert",  location: "Vijayawada, AP",  exp: "5 yrs",  jobs: 98,  rating: 4.6, phone: "786123xxxx", skills: ["Brake Services","Tire Services","Steering","Suspension"],        recent: [{ svc:"Tyre Rotation",    date:"21 Mar 2026", amt:200,  icon:"🔵" },{ svc:"Brake Pad Replacement",date:"18 Mar 2026", amt:450,  icon:"🔴" }] },
  "m.rakesh":  { pass: "8723", name: "M. Rakesh",  role: "Electricals & AC",     location: "Namburu, AP",     exp: "10 yrs", jobs: 207, rating: 4.9, phone: "929123xxxx", skills: ["Electrical System","AC Repair","Wiring","Battery"],               recent: [{ svc:"AC Gas Refill",    date:"23 Mar 2026", amt:800,  icon:"❄️" },{ svc:"Electrical Fix",       date:"20 Mar 2026", amt:350,  icon:"⚡" },{ svc:"Battery Replace", date:"14 Mar 2026", amt:250, icon:"🔋" }] },
  "m.masthan": { pass: "173",  name: "M. Masthan", role: "General Mechanic",     location: "Kakani, AP",      exp: "6 yrs",  jobs: 76,  rating: 4.5, phone: "826123xxxx", skills: ["General Services","Fluid Services","Body Work","Misc Repairs"],   recent: [{ svc:"Full Service",     date:"22 Mar 2026", amt:500,  icon:"🔧" }] },
  "m.fayaz":   { pass: "284",  name: "M. Fayaz",   role: "Transmission Expert",  location: "Pedhakakani, AP", exp: "12 yrs", jobs: 315, rating: 4.9, phone: "687123xxxx", skills: ["Transmission","Gearbox","Clutch","Engine Services"],               recent: [{ svc:"Gearbox Repair",   date:"23 Mar 2026", amt:1800, icon:"⚙️" },{ svc:"Clutch Plate",         date:"17 Mar 2026", amt:700,  icon:"🔩" },{ svc:"Engine Check",    date:"11 Mar 2026", amt:200,  icon:"🔎" }] }
};
 
// In-memory stores (swap for a DB in production)
const users     = {};   // { username: { name, passwordHash } }
const bookings  = {};   // { bookingId: bookingObject }
const ratings   = [];   // [ { rating, timestamp } ]
const registrations = {}; // { regId: registrationObject }
 
// ═══════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════
 
function genBookingId() {
  return 'ID-' + Array.from({ length: 5 }, () => Math.floor(Math.random() * 10)).join('');
}
 
function cap(s) { return s.replace(/\b\w/g, l => l.toUpperCase()); }
 
function genRegId() {
  return 'MF-' + Math.floor(10000 + Math.random() * 90000);
}
 
function validatePassword(pw) {
  return (
    pw.length >= 8 &&
    /[a-z]/.test(pw) &&
    /[A-Z]/.test(pw) &&
    /[0-9]/.test(pw)
  );
}
 
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}
 
// ═══════════════════════════════════════
// ROUTES
// ═══════════════════════════════════════
 
// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'MechFinder API', version: '1.0.0' });
});
 
// ── Services ──────────────────────────
// GET /api/services  → list all services with costs
app.get('/api/services', (req, res) => {
  res.json({ services: SERVICES_COST });
});
 
// POST /api/services/estimate  body: { services: ["engine services", "oil services"] }
app.post('/api/services/estimate', (req, res) => {
  const { services } = req.body;
  if (!Array.isArray(services) || services.length === 0)
    return res.status(400).json({ error: 'Provide a non-empty array of service names.' });
 
  let total = 0;
  const breakdown = {};
  const unknown = [];
 
  services.forEach(s => {
    const key = s.toLowerCase();
    if (SERVICES_COST[key] !== undefined) {
      breakdown[key] = SERVICES_COST[key];
      total += SERVICES_COST[key];
    } else {
      unknown.push(s);
    }
  });
 
  if (unknown.length) return res.status(400).json({ error: 'Unknown services', unknown });
  res.json({ total, breakdown });
});
 
// ── Mechanics ─────────────────────────
// GET /api/mechanics?location=guntur&vehicleType=bike
app.get('/api/mechanics', (req, res) => {
  const { location, vehicleType } = req.query;
  if (!location) return res.status(400).json({ error: 'location query param required' });
 
  const loc = location.toLowerCase();
  const db = vehicleType === 'bike' || vehicleType === 'scooty'
    ? MECHANICS_BIKE
    : MECHANICS_OTHER;
 
  const mechanic = db[loc];
  if (!mechanic) return res.status(404).json({ error: 'No mechanic found for that location.' });
  res.json({ mechanic });
});
 
// GET /api/mechanics/locations  → list available locations
app.get('/api/mechanics/locations', (req, res) => {
  res.json({ locations: Object.keys(MECHANICS_BIKE) });
});
 
// GET /api/mechanics/nh  → national highway mechanics
app.get('/api/mechanics/nh', (req, res) => {
  res.json({ mechanics: MECHANICS_NH });
});
 
// ── User Auth ─────────────────────────
// POST /api/users/register  body: { name, password }
app.post('/api/users/register', async (req, res) => {
  const { name, password } = req.body;
  if (!name || !password)
    return res.status(400).json({ error: 'name and password are required.' });
 
  if (!validatePassword(password))
    return res.status(400).json({ error: 'Password must be ≥8 chars and include A–Z, a–z, 0–9.' });
 
  const username = name.toLowerCase().replace(/\s+/g, '.');
  if (users[username])
    return res.status(409).json({ error: 'Username already exists.' });
 
  const passwordHash = await bcrypt.hash(password, 10);
  users[username] = { name, username, passwordHash, createdAt: new Date().toISOString() };
 
  const token = jwt.sign({ username, name, role: 'user' }, JWT_SECRET, { expiresIn: '7d' });
  res.status(201).json({ message: 'User registered successfully.', token, username, name });
});
 
// POST /api/users/login  body: { name, password }
app.post('/api/users/login', async (req, res) => {
  const { name, password } = req.body;
  if (!name || !password)
    return res.status(400).json({ error: 'name and password are required.' });
 
  if (!validatePassword(password))
    return res.status(400).json({ error: 'Password does not meet requirements.' });
 
  // For the user-facing flow, any valid-format credentials are accepted
  const token = jwt.sign({ name, role: 'user' }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ message: 'Login successful.', token, name });
});
 
// ── Mechanic Auth ─────────────────────
// POST /api/mechanics/login  body: { username, password }
app.post('/api/mechanics/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: 'username and password are required.' });
 
  const account = MECHANIC_ACCOUNTS[username.toLowerCase()];
  if (!account || String(account.pass) !== String(password))
    return res.status(401).json({ error: 'Invalid username or password.' });
 
  const { pass, ...profile } = account;   // strip password before sending
  const token = jwt.sign({ username, role: 'mechanic' }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ message: 'Login successful.', token, profile });
});
 
// GET /api/mechanics/profile  → protected, returns own profile
app.get('/api/mechanics/profile', authMiddleware, (req, res) => {
  if (req.user.role !== 'mechanic')
    return res.status(403).json({ error: 'Not a mechanic account.' });
 
  const account = MECHANIC_ACCOUNTS[req.user.username];
  if (!account) return res.status(404).json({ error: 'Profile not found.' });
 
  const { pass, ...profile } = account;
  res.json({ profile });
});
 
// ── Bookings ──────────────────────────
// POST /api/bookings  body: { services[], location, vehicleType, userName }
app.post('/api/bookings', (req, res) => {
  const { services, location, vehicleType, userName } = req.body;
 
  if (!services || !location || !vehicleType)
    return res.status(400).json({ error: 'services, location, and vehicleType are required.' });
 
  if (!Array.isArray(services) || services.length === 0)
    return res.status(400).json({ error: 'services must be a non-empty array.' });
 
  const loc = location.toLowerCase();
  const db = vehicleType === 'bike' || vehicleType === 'scooty'
    ? MECHANICS_BIKE
    : MECHANICS_OTHER;
 
  const mechanic = db[loc];
  if (!mechanic) return res.status(404).json({ error: 'No mechanic available in that area.' });
 
  let totalCost = 0;
  const validServices = [];
  const unknownServices = [];
 
  services.forEach(s => {
    const key = s.toLowerCase();
    if (SERVICES_COST[key] !== undefined) {
      totalCost += SERVICES_COST[key];
      validServices.push(key);
    } else {
      unknownServices.push(s);
    }
  });
 
  if (unknownServices.length)
    return res.status(400).json({ error: 'Unknown services', unknownServices });
 
  const bookingId = genBookingId();
  const booking = {
    bookingId,
    userName: userName || 'Guest',
    services: validServices,
    totalCost,
    location: loc,
    vehicleType,
    mechanic,
    status: 'confirmed',
    createdAt: new Date().toISOString()
  };
 
  bookings[bookingId] = booking;
  // 🔔 Push notification — booking confirmed
  notifyAll(
    '✅ Booking Confirmed!',
    `${mechanic.name} is assigned for ${validServices.join(', ')} in ${cap(loc)}. Total: ₹${totalCost}`,
    'booking',
    '/'
  );
  res.status(201).json({ message: 'Booking confirmed!', booking });
});
 
// GET /api/bookings/:id  → fetch a booking
app.get('/api/bookings/:id', (req, res) => {
  const booking = bookings[req.params.id];
  if (!booking) return res.status(404).json({ error: 'Booking not found.' });
  res.json({ booking });
});
 
// ── Direct Search ─────────────────────
// POST /api/search  body: { location }
app.post('/api/search', (req, res) => {
  const { location } = req.body;
  if (!location) return res.status(400).json({ error: 'location is required.' });
 
  const loc = location.toLowerCase();
  const mechanic = MECHANICS_OTHER[loc];
  if (!mechanic) return res.status(404).json({ error: 'No mechanic in that area.' });
 
  const bookingId = genBookingId();
  res.json({ message: 'Mechanic found!', bookingId, mechanic });
});
 
// ── Ratings ───────────────────────────
// POST /api/ratings  body: { rating (1-5), bookingId? }
app.post('/api/ratings', (req, res) => {
  const { rating, bookingId } = req.body;
  if (!rating || rating < 1 || rating > 5)
    return res.status(400).json({ error: 'rating must be between 1 and 5.' });
 
  const entry = { id: uuidv4(), rating: Number(rating), bookingId: bookingId || null, timestamp: new Date().toISOString() };
  ratings.push(entry);
 
  const avg = (ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length).toFixed(1);
  res.status(201).json({ message: 'Rating submitted. Thank you!', entry, averageRating: Number(avg), totalRatings: ratings.length });
});
 
// GET /api/ratings/summary
app.get('/api/ratings/summary', (req, res) => {
  if (!ratings.length) return res.json({ averageRating: 0, totalRatings: 0 });
  const avg = (ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length).toFixed(1);
  res.json({ averageRating: Number(avg), totalRatings: ratings.length });
});
 
// ── Mechanic Registration ─────────────
// POST /api/register/shop
app.post('/api/register/shop', (req, res) => {
  const { name, location, phone, shopAddress, license } = req.body;
  if (!name || !location || !phone || !shopAddress || !license)
    return res.status(400).json({ error: 'All fields are required.' });
  if (phone.length !== 10 || isNaN(phone))
    return res.status(400).json({ error: 'Phone must be 10 digits.' });
  if (license.length !== 16)
    return res.status(400).json({ error: 'License must be exactly 16 characters.' });
  if (!/^\d+$/.test(license.slice(6)))
    return res.status(400).json({ error: 'Last 10 characters of license must be digits.' });
 
  const regId = genRegId();
  registrations[regId] = { regId, type: 'Shop Owner', name, location, phone, shopAddress, license, status: 'active', createdAt: new Date().toISOString() };
  res.status(201).json({ message: 'Shop registered successfully!', registration: registrations[regId] });
});
 
// POST /api/register/company
app.post('/api/register/company', (req, res) => {
  const { name, location, phone, companyAddress, companyId, secondaryPhone } = req.body;
  if (!name || !location || !phone || !companyAddress || !companyId)
    return res.status(400).json({ error: 'All fields are required.' });
  if (phone.length !== 10 || isNaN(phone))
    return res.status(400).json({ error: 'Phone must be 10 digits.' });
  if (secondaryPhone && (secondaryPhone.length !== 10 || isNaN(secondaryPhone)))
    return res.status(400).json({ error: 'Secondary phone must be 10 digits.' });
 
  const regId = genRegId();
  registrations[regId] = { regId, type: 'Company Agent', name, location, phone, companyAddress, companyId, secondaryPhone, status: 'active', createdAt: new Date().toISOString() };
  res.status(201).json({ message: 'Company agent registered successfully!', registration: registrations[regId] });
});
 
// POST /api/register/freelancer
app.post('/api/register/freelancer', (req, res) => {
  const { name, location, phone, service, rate } = req.body;
  if (!name || !location || !phone || !service || !rate)
    return res.status(400).json({ error: 'All fields are required.' });
  if (phone.length !== 10 || isNaN(phone))
    return res.status(400).json({ error: 'Phone must be 10 digits.' });
 
  const regId = genRegId();
  registrations[regId] = { regId, type: 'Freelance Mechanic', name, location, phone, service, rate: `₹${rate}`, status: 'active', createdAt: new Date().toISOString() };
  res.status(201).json({ message: 'Freelancer registered successfully!', registration: registrations[regId] });
});
 
// GET /api/register/:id  → look up a registration
app.get('/api/register/:id', (req, res) => {
  const reg = registrations[req.params.id];
  if (!reg) return res.status(404).json({ error: 'Registration not found.' });
  res.json({ registration: reg });
});
 
// ═══════════════════════════════════════
// PUSH NOTIFICATIONS
// ═══════════════════════════════════════
 
// GET /api/push/vapid-public-key  → return VAPID public key to the client
app.get('/api/push/vapid-public-key', (req, res) => {
  res.json({ publicKey: VAPID_PUBLIC_KEY });
});
 
// POST /api/push/subscribe  body: { subscription }
// Saves the browser's PushSubscription object
app.post('/api/push/subscribe', (req, res) => {
  const { subscription } = req.body;
  if (!subscription || !subscription.endpoint)
    return res.status(400).json({ error: 'Valid subscription object required.' });
 
  pushSubscriptions[subscription.endpoint] = subscription;
  console.log(`📲 New push subscriber. Total: ${Object.keys(pushSubscriptions).length}`);
 
  // Send a welcome notification immediately
  const payload = JSON.stringify({
    title: '🔧 MechFinder Alerts ON',
    body:  'You\'ll be notified on bookings, mechanic arrival & service updates.',
    icon:  '/icon-192.png',
    badge: '/badge-72.png',
    tag:   'welcome',
    data:  { url: '/' }
  });
 
  webpush.sendNotification(subscription, payload).catch(err => {
    console.error('Welcome push failed:', err.statusCode);
  });
 
  res.status(201).json({ message: 'Subscribed successfully.' });
});
 
// DELETE /api/push/unsubscribe  body: { endpoint }
app.delete('/api/push/unsubscribe', (req, res) => {
  const { endpoint } = req.body;
  if (endpoint && pushSubscriptions[endpoint]) {
    delete pushSubscriptions[endpoint];
    console.log(`📵 Unsubscribed. Total: ${Object.keys(pushSubscriptions).length}`);
  }
  res.json({ message: 'Unsubscribed.' });
});
 
// POST /api/push/send  body: { title, body, tag?, url? }
// Admin / server-side: broadcast a custom push to all subscribers
app.post('/api/push/send', (req, res) => {
  const { title, body, tag = 'general', url = '/' } = req.body;
  if (!title || !body)
    return res.status(400).json({ error: 'title and body are required.' });
 
  const payload = JSON.stringify({
    title,
    body,
    icon:  '/icon-192.png',
    badge: '/badge-72.png',
    tag,
    data:  { url }
  });
 
  const subs = Object.values(pushSubscriptions);
  if (!subs.length) return res.json({ sent: 0, message: 'No subscribers.' });
 
  Promise.allSettled(
    subs.map(sub =>
      webpush.sendNotification(sub, payload).catch(err => {
        // Remove stale subscriptions (410 Gone = browser unsubscribed)
        if (err.statusCode === 410) delete pushSubscriptions[sub.endpoint];
        throw err;
      })
    )
  ).then(results => {
    const sent   = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.length - sent;
    res.json({ sent, failed, total: results.length });
  });
});
 
// Helper: send notification to all subscribers (used internally after bookings)
function notifyAll(title, body, tag = 'update', url = '/') {
  const payload = JSON.stringify({ title, body, icon: '/icon-192.png', badge: '/badge-72.png', tag, data: { url } });
  Object.values(pushSubscriptions).forEach(sub => {
    webpush.sendNotification(sub, payload).catch(err => {
      if (err.statusCode === 410) delete pushSubscriptions[sub.endpoint];
    });
  });
}
 
// ═══════════════════════════════════════
// 404 FALLBACK
// ═══════════════════════════════════════
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found.` });
});
 
// ═══════════════════════════════════════
// START
// ═══════════════════════════════════════
app.listen(PORT, () => {
  console.log(`🔧 MechFinder API running on http://localhost:${PORT}`);
});
 
module.exports = app;