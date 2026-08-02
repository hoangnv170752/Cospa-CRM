# COSPA CRM — Changelog

All notable changes to this project will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [1.0.3] — 2026-08-02

### Added

- **Google Calendar Integration** — Sync your Google Calendar events with the CRM for unified scheduling.
  - OAuth 2.0 authentication with Google
  - Two-way event synchronization
  - Create events with Google Meet video conferencing
  - View, edit, and delete calendar events from CRM
  - Available for tenant users (non-admin) in Settings and dedicated Calendar page
- **Auto Logout on 401** — Frontend automatically redirects to login when API returns 401 Unauthorized, improving session expiration handling.
- **Calendar Navigation** — Added Calendar link to CRM sidebar for quick access (visible to tenant users only).

---

## [1.0.2] — 2026-06-02

### Added

- **Excel Bulk Import** — Import multiple records at once via Excel spreadsheets across modules (vendors, contracts, items, etc.).
- **Admin Messaging** — Real-time chat between tenants and the system administrator for direct support and communication.
- **Tenant Profile Management** — Tenants can now upload and manage profile documents, avatars, and other media assets.
