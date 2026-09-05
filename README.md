# Enterprise AI Service Desk, Public-Grievance & Emergency Response Platform

An intelligent, multi-role civic governance and high-velocity Computer-Aided Dispatch (CAD) platform designed to bridge citizens, municipal departments, field officers, emergency response teams, and central administration.

```
                    CLIENT
                      │
              ┌───────┴───────┐
              ↓               ↓
         Citizen UI       Admin UI
              │               │
              └───────┬───────┘
                      ↓
                  API SERVER
                      │
        ┌─────────────┼─────────────┐
        ↓             ↓             ↓
    PostgreSQL       AI          Storage
        │             │
        │        ┌────┼────┐
        │        ↓    ↓    ↓
        │      NLP  Vision Prediction
        │
        └──────────────┐
                       ↓
                  Notifications
                       ↓
                     Maps
```

---

## Architecture & System Features

### 1. Primary Roles & Dedicated Workspaces
1. **Citizen Portal (Citizen UI)**:
   - Omnichannel grievance filing with real-time AI triage suggestions.
   - Interactive GIS location picker with reverse-geocoding.
   - 1-Click Emergency SOS Panic Button with live telemetry broadcast.
   - Real-time ticket tracking, timeline audit, proof-of-work photo review.
   - 1–5 Star citizen satisfaction ratings & formal re-opening appeal mechanism.
   - Conversational AI Civic Assistant (RAG) for municipal bylaws and status inquiries.

2. **Officer Field Workspace (Admin UI)**:
   - Prioritized task queue sorted by urgency ($P1$ to $P4$) and SLA countdown timers.
   - One-click status progression to `IN_PROGRESS`.
   - Mandatory proof-of-resolution photo upload with on-site GPS tolerance validation.

3. **Department Management Console (Admin UI)**:
   - Workload distribution and officer assignment engine.
   - Department-level SLA compliance and turnaround metrics.
   - Hierarchical escalation monitoring for nearing or breached deadlines.

4. **Emergency CAD Console (Admin UI)**:
   - High-velocity 911 / 112 emergency response board.
   - Audible siren alert synthesizer (Web Audio API) and flashing visual indicators for P1 SOS beacons.
   - Geospatial fleet telematics with live responder tracking.
   - Automated closest-unit sorting (PostGIS / Haversine) with driving ETA calculation.
   - 1-Click dispatch orders and scene-clearing protocol (`10-98`).

5. **Administration & Analytics (Admin UI)**:
   - Executive BI KPI overview (Resolution %, SLA compliance %, CSAT score).
   - Interactive GIS density heatmap for civic problem clustering.
   - Department SLA performance leaderboard.
   - Immutable audit ledger recording all privileged actions and state changes.

---

## Technology Stack

- **Backend**: Python 3.14 + FastAPI + WebSockets + Uvicorn
- **Persistence**: Relational & Spatial Storage (PostgreSQL + PostGIS DDL with SQLite runtime abstraction)
- **AI Subsystems**:
  - **NLP**: Intent triage, department routing, urgency rating ($P1$–$P4$), sentiment analysis.
  - **Vision**: Damage severity classifier, EXIF GPS coordinate validation.
  - **Prediction**: Multi-factor SLA breach probability forecaster, spatial recurrence & hotspot model.
- **Frontend**: Vite + React 18 + Tailwind CSS + Lucide Icons + Leaflet GIS
- **Real-Time**: WebSockets for CAD alerts, unit telemetry, and ticket updates

---

## Quick Start Guide

### 1. Launch the Full-Stack Application
The backend serves both the REST/WebSocket API and the compiled React frontend from a single port:

```bash
# From project root:
python backend/run.py
```

Open your browser to:
- **Web Application**: `http://127.0.0.1:8000/`
- **Interactive OpenAPI Documentation**: `http://127.0.0.1:8000/docs`

---

### 2. Demo Credentials & 1-Click Role Switcher
The platform features an instant **1-Click Role Switcher** in the top navigation bar to seamlessly evaluate all 5 perspectives during demonstrations:

| Role | Demo Account | Department | Sample Password |
|---|---|---|---|
| **Citizen** | `citizen@civic.gov` | Public | `citizen123` |
| **Field Officer (Roads)** | `officer@civic.gov` | Roads & Infrastructure | `officer123` |
| **Field Officer (Water)** | `officer_water@civic.gov` | Water Supply & Sanitation | `officerwater123` |
| **Department Admin (Roads)** | `dept_head@civic.gov` | Roads & Infrastructure | `dept123` |
| **Department Admin (Water)** | `dept_head_water@civic.gov` | Water Supply & Sanitation | `deptwater123` |
| **CAD Dispatcher** | `cad_dispatcher@civic.gov` | Emergency Response Services | `ert123` |
| **System Admin** | `admin@civic.gov` | Central Administration | `admin123` |

### Citizen Self-Registration
Citizens can self-register at `/register` or via `POST /api/v1/auth/register` with:
- Full Name
- Mobile Number (`phone`)
- Residential Address (`address`) & City (`city`)
- Email & Password (with confirmation check)
- Terms Acceptance

---

### 3. Running Automated Integration Tests

```bash
# Run complete test suite (Health, Auth, RBAC 403, NLP, Vision, CAD, Analytics):
python tests/test_api.py
```

---

## Directory Structure

```
hackathon/
├── README.md                      # Platform documentation & setup
├── database/
│   ├── schema.sql                 # PostgreSQL & SQLite DDL
│   ├── seed_data.py               # Pre-populated realistic demo data
│   └── civic_platform.db          # Active database store
├── docs/
│   └── SYSTEM_ARCHITECTURE.md     # Master 18-point technical design spec
├── backend/
│   ├── run.py                     # Server launcher
│   ├── requirements.txt           # Python backend dependencies
│   ├── uploads/                   # Uploaded citizen & officer media
│   └── app/
│       ├── main.py                # FastAPI app assembly & SPA mount
│       ├── core/                  # Database, Config, JWT Security
│       ├── models/                # Pydantic domain models
│       ├── services/              # AI Core (NLP, Vision, Prediction), GIS, Notifications
│       └── api/                   # Auth, Complaints, CAD Emergency, Analytics, Admin
├── frontend/
│   ├── package.json               # Node packages
│   ├── vite.config.js             # Vite configuration & proxy
│   ├── index.html                 # CDN headers (Tailwind, Leaflet, Inter font)
│   ├── dist/                      # Compiled production assets
│   └── src/
│       ├── main.jsx               # React entry point
│       ├── App.jsx                # Universal coordinator & CAD siren
│       ├── components/            # Header, Role Switcher, GisMap
│       └── views/                 # 5 Role-Specific Workspaces
└── tests/
    └── test_api.py                # Automated integration test suite
```