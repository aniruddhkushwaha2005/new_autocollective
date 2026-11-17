# AutoCollective — Buy Together. Save Together.

An AI-powered group car-buying platform tailored for the Indian automobile market.

## 1. Project Introduction
**AutoCollective** connects prospective car buyers looking for the same vehicle model in the same city into structured purchasing collectives (default target: 5 buyers), enabling transparent batch negotiation with verified dealerships alongside Machine Learning price prediction, city-wise demand forecasting, and automated quotation auditing.

## 2. Problem Statement
Individual passenger car buyers in India face fragmented dealership pricing, bundled insurance/accessory markups, and limited negotiating leverage compared to corporate fleet buyers. Meanwhile, dealerships incur high customer acquisition costs per single vehicle sale.

## 3. Proposed Solution
AutoCollective provides:
1. **Deterministic Rule-Based Buyer Group Matching**: Groups buyers by brand, model, compatible variant, fuel type, gearbox, city, and budget band.
2. **Verified Dealership Bidding**: Admin-approved dealerships (GST verified) submit itemized on-road quotations for open buyer collectives.
3. **Three Integrated AI/ML Modules**:
   - **Car Price Prediction**: Compares Random Forest, Gradient Boosted, and Ridge Regression models with confidence bounds (`P10–P90`).
   - **City Demand Forecasting**: Seasonal trend regression across 18 months of Indian city × model demand data.
   - **Intelligent Dealer Offer Analysis**: Evaluates insurance-to-ex-showroom ratios, accessory bundling, omitted statutory fees, and peer Z-score outliers to compute a transparent 0–100 value score.

## 4. Key Features
- Multi-role JWT authentication (`buyer`, `dealer`, `admin`) with bcrypt password hashing and password-reset flow.
- Complete Buyer Workspace: car catalog search, request creation with duplicate prevention, group matching, offer comparison, saved cars, notifications, and purchase tracking.
- Dealer Portal: admin approval gate, managed showroom models, buyer group discovery, itemized quotation submission, and booking fulfillment tracking.
- Admin Control Center: KPI metrics, dealer approval queue, user status management, car catalog CRUD, group lifecycle management, and ML Demand Analytics.

## 5. Technology Stack
- **Frontend**: React 19, JavaScript (ES6+), Vite, Tailwind CSS v4, React Router DOM, Axios, Recharts, Lucide React.
- **Standalone Production Backend**: Python 3.11+, FastAPI, Pydantic, PyMongo (MongoDB / Atlas), Passlib/bcrypt, python-jose, Pandas, NumPy, Scikit-learn, XGBoost, Joblib.
- **Preview Runtime Server**: Node.js 22 Express + embedded SQLite (`server.js`) + trained regression engine (`ml_engine/`) for environments where `mongod` and `pip` are unavailable.

## 6. System Architecture
```
[ React JS SPA (Vite / Tailwind / Recharts) ]
                    |  Axios (JWT Bearer)
                    v
[ REST API Layer (/api/*) ]
   ├── Auth & RBAC Middleware (JWT + bcrypt)
   ├── Rule-Based Group Matching Service
   ├── Marketplace & Admin Workflows
   └── ML Services (Price Prediction, Demand Forecast, Offer Analyzer)
                    |
                    v
[ MongoDB / Atlas (Production)  |  SQLite Document Store (Preview Runtime) ]
```

## 7. Folder Structure
```
AutoCollective/
├── src/                        # React JavaScript (ES6+) Frontend
│   ├── assets/images/          # Generated studio automotive imagery
│   ├── components/             # common, layout, cars, groups, offers, analytics
│   ├── context/                # AuthContext, ToastContext
│   ├── pages/                  # public, auth, user, admin
│   ├── services/api.js         # Axios client with JWT interceptors
│   └── utils/format.js         # Indian currency & domain constants
├── backend/                    # Python FastAPI + PyMongo + Scikit-learn Backend
│   ├── app/
│   │   ├── main.py
│   │   ├── config/settings.py
│   │   ├── database/mongodb.py
│   │   ├── middleware/auth_middleware.py
│   │   ├── schemas/schemas.py
│   │   ├── services/matching_service.py
│   │   ├── routes/
│   │   └── ml/                 # price_prediction, demand_prediction, offer_analysis
│   ├── datasets/               # indian_cars_dataset.csv, historical_demand.csv
│   ├── tests/test_api.py
│   ├── requirements.txt
│   └── Dockerfile
├── ml_engine/                  # Node.js ML training & inference engine for port-3000 runtime
├── server.js                   # Express + Vite unified preview server
├── docker-compose.yml
└── README.md
```

## 8. MongoDB Setup
- **Local**: Run MongoDB 7+ on `mongodb://localhost:27017` or start via `docker compose up mongodb`.
- **MongoDB Atlas**: Set `MONGODB_URI` in `backend/.env` to your `mongodb+srv://...` connection string.

## 9. Frontend Setup
```bash
npm install
npm run dev
```

## 10. Backend Setup (Python FastAPI)
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
Interactive Swagger API documentation is available at `http://localhost:8000/docs`.

## 11. Environment Variable Configuration
Copy `.env.example` to `.env` (and `backend/.env.example` to `backend/.env`):
- `PORT=3000`
- `JWT_SECRET` (strong random secret)
- `MONGODB_URI` & `MONGODB_DB_NAME`
- `MAIL_MODE=development`

## 12. ML Model Training Instructions
**Python (Scikit-learn & XGBoost)**:
```bash
cd backend
python -m app.ml.price_prediction.train
python -m app.ml.demand_prediction.train
```
**Node Runtime (Preview Server)**:
```bash
npm run train-ml
```

## 13. API Documentation
- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/forgot-password`
- `GET/POST/DELETE /api/cars`
- `GET/POST/DELETE /api/requests`
- `GET /api/groups`, `GET /api/groups/:id`, `POST /api/groups/:id/join`, `POST /api/groups/:id/leave`, `PATCH /api/groups/:id/status`
- `GET/PUT /api/dealers/me`
- `GET/POST/PUT /api/offers`
- `GET/POST/PATCH /api/purchases`
- `GET/PATCH /api/notifications`
- `POST /api/ml/price-prediction`, `GET /api/ml/demand-prediction`, `POST /api/ml/offer-analysis`, `POST /api/ml/retrain`
- `GET /api/admin/overview`, `PATCH /api/admin/dealers/:id`, `PATCH /api/admin/users/:id/toggle`

## 14. Sample Development Credentials
- **Buyer**: `buyer@autocollective.in` / `Buyer@123`
- **Approved Dealer**: `dealer@autocollective.in` / `Dealer@123`
- **Admin**: `admin@autocollective.in` / `Admin@123`

## 15. Docker Deployment
```bash
docker compose up --build
```
- Frontend: `http://localhost:3000`
- FastAPI Backend + Swagger UI: `http://localhost:8000/docs`
- MongoDB: `localhost:27017`

## 16. Future Enhancements
- Real-time WebSocket negotiation rooms between matched buyers and approved dealerships.
- Integration with VAHAN / state RTO tax APIs for live city-wise registration calculations.
- Production transactional email provider (SES / SendGrid) for password resets and offer alerts.
