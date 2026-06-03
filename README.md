# Cospa CRM

<p align="center">
  <img src="ui/public/iot-icon.png" alt="Cospa CRM" width="100" height="100">
</p>

<p align="center">
  <strong>Multi-Tenant CRM Platform with IoT Integration</strong>
</p>

<p align="center">
  <a href="https://unikorn.vn/p/cospa-crm?ref=embed-cospa-crm" target="_blank">
    <img src="https://unikorn.vn/api/widgets/badge/cospa-crm?theme=light" alt="Cospa CRM trên Unikorn.vn" width="256" height="64" />
  </a>
  <a href="https://unikorn.vn/p/cospa-crm?ref=embed-cospa-crm" target="_blank">
    <img src="https://unikorn.vn/api/widgets/badge/cospa-crm/rank?theme=light&type=daily" alt="Cospa CRM - Hàng ngày" width="250" height="64" />
  </a>
</p>

## Business Value

A unified platform for monitoring industrial automation systems and managing connected assets, designed to bridge the gap between IoT operations and enterprise business processes.

### What It Does

- **Monitor Automation Systems** - Real-time visibility into device status, connectivity, and performance across your facility
- **Manage Device & Asset Information** - Centralized registry of all IoT devices and physical assets with profile-based organization
- **Enable ERP Integration** - Architecture ready to sync with ERP systems for inventory, maintenance scheduling, and compliance tracking

### Who It's For

- Manufacturing operations teams
- Facility managers
- Industrial automation engineers
- Operations & maintenance departments

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Frontend (Next.js)                            │
│  ┌─────────────────────────────┐    ┌─────────────────────────────┐    │
│  │      IoT Dashboard          │    │       CRM Portal            │    │
│  │  - Device monitoring        │    │  - Tenant management        │    │
│  │  - Asset management         │    │  - Company/Contact CRM      │    │
│  │  - Real-time telemetry      │    │  - Deals & Contracts        │    │
│  │  - ThingsBoard auth         │    │  - Products catalog         │    │
│  └─────────────┬───────────────┘    └─────────────┬───────────────┘    │
│                │                                  │                     │
└────────────────┼──────────────────────────────────┼─────────────────────┘
                 │                                  │
                 ▼                                  ▼
┌────────────────────────────────┐    ┌────────────────────────────────┐
│      ThingsBoard Backend       │    │        CRM Backend             │
│  - Device management           │    │  - Multi-tenant architecture   │
│  - MQTT/HTTP connectivity      │    │  - RBAC (4 user levels)        │
│  - Telemetry storage           │    │  - Subscription/billing        │
│  - Rule engine                 │    │  - PostgreSQL + Prisma         │
└────────────────────────────────┘    └────────────────────────────────┘
```

## CRM Module

The CRM module provides enterprise-grade customer relationship management with multi-tenancy support.

### Features

- **Multi-Tenant Architecture** - Isolated data per organization with tenant-scoped access
- **Role-Based Access Control (RBAC)** - 4 user levels: SysAdmin, Tenant Admin, Tenant User, Customer User
- **Self-Service Registration** - Organizations can register and await admin approval
- **Subscription Plans** - Free, Starter, Professional, Enterprise tiers with usage limits

### CRM Entities

| Entity | Description |
|--------|-------------|
| **Tenants** | Organizations/companies using the platform |
| **Companies** | Customer companies within a tenant |
| **Contacts** | People associated with companies |
| **Products** | Product/device catalog for sales |
| **Deals** | Sales pipeline with stages (lead → closed) |
| **Vendors** | Supplier management |
| **Contracts** | Service agreements with companies/vendors |
| **Tickets** | Service/support ticket management |

### User Roles

| Role | Access Level |
|------|-------------|
| `sys_admin` | Full platform access, tenant management, plan management |
| `tenant_admin` | Full access within their tenant, user management |
| `tenant_user` | CRUD on tenant data, no admin functions |
| `customer_user` | Read-only access to assigned data |

## Project Structure

```
IoT-Dashboard/
├── ui/                     # Next.js frontend (IoT + CRM)
│   ├── app/
│   │   ├── (auth)/         # IoT authentication pages
│   │   ├── (dashboard)/    # IoT dashboard pages
│   │   ├── (crm-auth)/     # CRM authentication pages
│   │   └── (crm-dashboard)/ # CRM dashboard pages
│   ├── components/         # React components
│   ├── contexts/           # Auth contexts (IoT + CRM)
│   ├── lib/                # API services
│   └── messages/           # i18n translations (en, zh, fr, es)
│
├── crm/                    # CRM Backend (Fastify + Prisma)
│   ├── src/
│   │   ├── routes/         # API endpoints
│   │   ├── middleware/     # Auth, RBAC middleware
│   │   └── services/       # Business logic
│   ├── prisma/             # Database schema
│   └── scripts/            # Migration scripts
│
├── firmware/               # ESP-IDF firmware for IoT devices
├── android/                # Android companion app
└── README.md
```

## Quick Start

### Dashboard UI (IoT Platform)
```bash
cd ui
npm install
cp .env.example .env  # Configure NEXT_PUBLIC_API_URL
npm run dev
```

Access at `http://localhost:3000` - Login with ThingsBoard credentials.

See [ui/README.md](ui/README.md) for detailed technical documentation.

### CRM Backend
```bash
cd crm
pnpm install
cp .env.example .env  # Configure DATABASE_URL and JWT_SECRET
pnpm prisma generate
pnpm prisma db push
npx tsx scripts/migrate-to-multitenancy.ts  # Create SysAdmin and seed data
pnpm dev
```

API available at `http://localhost:5001/api` - Swagger docs at `/docs`.

### CRM Portal (Frontend)

The CRM portal is integrated into the UI and accessible at:
- `/crm-signin` - CRM login page
- `/crm-register` - Organization registration
- `/crm/*` - CRM dashboard (requires CRM authentication)

Add to `ui/.env`:
```env
NEXT_PUBLIC_CRM_API_URL=http://localhost:5001/api
```

**Default Credentials (after migration):**
- SysAdmin: `admin@iot-crm.local` / `ChangeMe123!`
- Tenant Admin: `tenant-admin@default.local` / `TenantAdmin123!`

### Firmware
```bash
cd firmware
idf.py menuconfig  # Configure WiFi and API URL
idf.py build flash monitor
```

### Android App
```bash
# Open the android/ folder in Android Studio (Giraffe / Hedgehog or newer, JDK 17+)
# Edit android/.env to point at your ThingsBoard instance:
#   BE_URL=https://demo.thingsboard.io/api
# Then Build → Run on a device or emulator.
```

## Android Companion App

The `/android` directory contains a native Kotlin app that talks to the same ThingsBoard backend as the dashboard UI and lets a phone act as a virtual IoT device for end-to-end testing.

### Goal

Provide a lightweight on-device client to validate the full data pipeline (login → device discovery → MQTT publish) without needing physical hardware.

### What It Does

- **Login** — Authenticates against `${BE_URL}/auth/login`, mirroring [ui/lib/auth.ts](ui/lib/auth.ts); persists the JWT in `SharedPreferences`.
- **Device List** — Fetches `GET /api/tenant/deviceInfos` and lets you pick a target device.
- **MQTT Publish** — Pulls the device's `MQTT_BASIC` credentials (clientId / userName / password), connects to `tcp://<host>:1883`, and publishes random telemetry to topic `v2/t`, equivalent to:

  ```bash
  mosquitto_pub -d -q 1 -h $BE_HOST -p 1883 -t v2/t \
    -i $CLIENT_ID -u $USERNAME -P $PASSWORD \
    -m '{"temperature": 25, "humidity": 100}'
  ```

### Tech Stack

- Kotlin + AppCompat + RecyclerView (no Compose)
- Coroutines + `HttpURLConnection` for REST
- [Eclipse Paho](https://www.eclipse.org/paho/) for MQTT v3

### Configuration

Edit [android/.env](android/.env) — the Gradle build reads it and injects `BuildConfig.API_BASE_URL`:

```dotenv
BE_URL=https://demo.thingsboard.io/api
```

### Project Layout

```
android/
├── .env                          # BE_URL — loaded by Gradle
├── app/
│   ├── build.gradle.kts          # Reads .env, sets buildConfigField
│   └── src/main/
│       ├── AndroidManifest.xml
│       ├── java/com/iot/android/
│       │   ├── MainActivity.kt           # Login screen
│       │   ├── DeviceListActivity.kt     # Device picker
│       │   ├── PublishActivity.kt        # MQTT publish + random data
│       │   └── data/
│       │       ├── ThingsBoardApi.kt     # REST client
│       │       ├── MqttPublisher.kt      # Paho wrapper
│       │       ├── TokenStore.kt         # SharedPreferences token store
│       │       └── Models.kt
│       └── res/layout/
├── gradle/libs.versions.toml
└── settings.gradle.kts
```

### Requirements

- Android Studio Hedgehog (2023.1) or newer
- JDK 17 (AGP 8.8.0 requirement)
- Android SDK 35; minSdk 24

## Firmware Framework

The `/firmware` directory contains an ESP-IDF based framework for connecting ESP32 devices to the IoT Dashboard.

### Goal

Build a reusable, production-ready firmware foundation for ESP-based IoT devices that enables:

- **Plug & Play Connectivity** - Any ESP32/ESP8266 device can connect to the dashboard with minimal configuration
- **Standardized Communication** - HTTP/HTTPS API integration with the ThingsBoard backend
- **Easy Configuration** - WiFi credentials and API endpoints configurable via `menuconfig`
- **Extensible Architecture** - Base framework for adding sensors, actuators, and custom telemetry

### Supported Devices

- ESP32 (all variants)
- ESP32-S2, ESP32-S3, ESP32-C3
- ESP8266 (with modifications)

### Configuration

Edit via `idf.py menuconfig` → IoT Dashboard Configuration:
- WiFi SSID & Password
- API URL endpoint

### Use Cases

- Environmental monitoring (temperature, humidity, air quality)
- Industrial sensor data collection
- Asset tracking and location
- Machine status reporting
- Energy monitoring

## Upcoming Features

### Data Visualization & Analytics
- **Time-Series Charts** - Interactive charts for visualizing telemetry data over time with zoom, pan, and date range selection
- **Real-Time Data Streaming** - WebSocket-based live data updates for dashboards and charts
- **Custom Dashboards** - Drag-and-drop dashboard builder with configurable widgets
- **Data Export** - Export telemetry data to CSV, Excel, and PDF formats

### AI-Powered Intelligence
- **AI Data Assistant** - Natural language queries to get insights from your IoT data
  - "What was the average temperature in Building A last week?"
  - "Show me devices with unusual power consumption"
  - "Predict when maintenance is needed for Motor-01"
- **Anomaly Detection** - ML-based detection of abnormal device behavior and sensor readings
- **Predictive Maintenance** - AI models to forecast equipment failures before they occur
- **Smart Alerts** - Context-aware notifications based on learned patterns

### Backend AI Services Integration
- **LLM Integration** - Backend services for connecting to OpenAI, Claude, or local LLM models
- **RAG Pipeline** - Retrieval-Augmented Generation for querying device documentation and historical data
- **Vector Database** - Embeddings storage for semantic search across telemetry and device metadata
- **AI Agent Framework** - Autonomous agents for monitoring, alerting, and automated responses

### Notification System
- **Multi-Channel Alerts** - Push notifications, email, SMS, and webhook integrations
- **Alert Rules Engine** - Configurable thresholds and conditions for triggering notifications
- **Escalation Policies** - Automatic escalation when alerts are not acknowledged
- **Notification History** - Complete audit trail of all sent notifications

### User Feedback & Collaboration
- **In-App Feedback** - Built-in feedback system for users to report issues and suggest features
- **Annotation System** - Add notes and comments to specific time ranges on charts
- **Shared Views** - Generate shareable links for dashboards and reports
- **Incident Management** - Track and resolve device-related incidents with team collaboration

### Device Management Enhancements
- **Bulk Operations** - Mass firmware updates, configuration changes, and device provisioning
- **Device Groups** - Organize devices into logical groups with inherited permissions
- **Remote Debugging** - Real-time logs and diagnostics from connected devices
- **OTA Updates** - Over-the-air firmware updates with rollback capability

### Security & Compliance
- **Role-Based Access Control** - Granular permissions for users and teams
- **Audit Logging** - Complete audit trail of all system actions
- **Data Retention Policies** - Configurable data lifecycle management
- **Compliance Reports** - Pre-built reports for regulatory compliance (ISO, IEC standards)

## Roadmap

| Phase | Features | Target |
|-------|----------|--------|
| Phase 1 | Time-series charts, Real-time streaming, Notification system | Q3 2026 |
| Phase 2 | AI Data Assistant, Anomaly detection, Feedback system | Q4 2026 |
| Phase 3 | Predictive maintenance, Custom dashboards, Bulk operations | Q1 2026 |
| Phase 4 | RAG pipeline, AI agents, Advanced analytics | Q2 2026 |

## Contributing

We welcome contributions! Please see our contributing guidelines for more information.

## License

MIT
