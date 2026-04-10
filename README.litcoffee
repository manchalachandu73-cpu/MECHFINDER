🔧 MechFinder — Backend API
REST API backend for MechFinder, India's Mechanic Network.
Built with Node.js + Express.

🚀 Quick Start
bash# 1. Install dependencies
npm install

# 2. Start (production)
npm start

# 3. Start (development — auto-restarts on change)
npm run dev
Server runs on http://localhost:3000 by default.
Set the PORT environment variable to change it.

🔑 Environment Variables
VariableDefaultNotesPORT3000HTTP portJWT_SECRETmechfinder-secret-key-...Change this in production!

📡 API Endpoints
Health
MethodEndpointDescriptionGET/api/healthCheck server status

Services
MethodEndpointDescriptionGET/api/servicesList all services with costsPOST/api/services/estimateEstimate total cost for selected services
POST /api/services/estimate — Body:
json{ "services": ["engine services", "oil services"] }
Response:
json{ "total": 300, "breakdown": { "engine services": 250, "oil services": 50 } }

Mechanics
MethodEndpointDescriptionGET/api/mechanicsFind mechanic by ?location=&vehicleType=GET/api/mechanics/locationsList all available locationsGET/api/mechanics/nhGet National Highway mechanics
GET /api/mechanics — Example:
GET /api/mechanics?location=guntur&vehicleType=bike
Response:
json{ "mechanic": { "name": "Ravan", "phone": "845851xxxx" } }

User Auth
MethodEndpointDescriptionPOST/api/users/registerRegister a new userPOST/api/users/loginLogin (get JWT token)
Body for both:
json{ "name": "Ravi Kumar", "password": "Password1" }

Mechanic Auth
MethodEndpointDescriptionPOST/api/mechanics/loginLogin with mechanic credentialsGET/api/mechanics/profileGet own profile (JWT required)
POST /api/mechanics/login — Body:
json{ "username": "m.chandu", "password": "12" }
Demo accounts:
UsernamePasswordm.chandu12m.venu1245m.rakesh8723m.masthan173m.fayaz284
Authorization header (for protected routes):
Authorization: Bearer <token>

Bookings
MethodEndpointDescriptionPOST/api/bookingsCreate a new bookingGET/api/bookings/:idGet booking by ID
POST /api/bookings — Body:
json{
  "services": ["brake services", "oil services"],
  "location": "guntur",
  "vehicleType": "bike",
  "userName": "Ravi"
}
Response:
json{
  "message": "Booking confirmed!",
  "booking": {
    "bookingId": "ID-48201",
    "services": ["brake services", "oil services"],
    "totalCost": 170,
    "mechanic": { "name": "Ravan", "phone": "845851xxxx" },
    "status": "confirmed"
  }
}

Direct Search
MethodEndpointDescriptionPOST/api/searchFind nearest mechanic by location
Body:
json{ "location": "vijayawada" }

Ratings
MethodEndpointDescriptionPOST/api/ratingsSubmit a 1–5 star ratingGET/api/ratings/summaryGet average rating & total count
POST /api/ratings — Body:
json{ "rating": 5, "bookingId": "ID-48201" }

Mechanic Registration
MethodEndpointDescriptionPOST/api/register/shopRegister as a shop ownerPOST/api/register/companyRegister as a company agentPOST/api/register/freelancerRegister as a freelance mechanicGET/api/register/:idLook up a registration by ID
POST /api/register/shop — Body:
json{
  "name": "Suresh Kumar",
  "location": "Guntur",
  "phone": "9876543210",
  "shopAddress": "12 Main Road, Guntur",
  "license": "AP1234567890123456"
}

License must be 16 characters with last 10 as digits.

POST /api/register/company — Body:
json{
  "name": "Kiran Reddy",
  "location": "Vijayawada",
  "phone": "9876543210",
  "companyAddress": "Tech Park, Vijayawada",
  "companyId": "EMP-1234",
  "secondaryPhone": "9123456789"
}
POST /api/register/freelancer — Body:
json{
  "name": "Ravi Shankar",
  "location": "Namburu",
  "phone": "9876543210",
  "service": "Engine Repair, Oil Change",
  "rate": "300"
}

🗄️ Data Storage
Currently uses in-memory storage (data resets on restart).
To persist data, swap the in-memory objects for a database:

Simple: SQLite via better-sqlite3
Scalable: MongoDB via mongoose or PostgreSQL via pg


🚢 Deploy to Render / Railway / Fly.io

Push this folder to a GitHub repo
Connect your repo on Render or Railway
Set JWT_SECRET as an environment variable
Set start command to npm start


📁 Project Structure
mechfinder-backend/
├── server.js       ← All routes & logic
├── package.json    ← Dependencies
└── README.md       ← This file