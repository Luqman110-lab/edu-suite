# LUQMAN EDUTECH SOLUTIONS - Report Card System

## Overview
LUQMAN EDUTECH SOLUTIONS Report Card System is a professional web application for primary schools. It manages student assessments, grades according to UNEB standards, and generates report cards for students from P1 to P7. The system supports various assessment types, handles teacher assignments, and provides performance analytics. It features a multi-school architecture, comprehensive user and student management, detailed analytics dashboards, and robust data import/export functionalities, aiming to be a versatile solution for primary education.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React 19 with TypeScript and React Router (HashRouter).
- **State Management**: TanStack Query for server state; React hooks for local UI state.
- **Styling**: Tailwind CSS (CDN) with a custom maroon/burgundy and navy blue theme, including dark mode, gradient buttons, and glassmorphism effects.
- **Offline Strategy**: Dual-persistence model using IndexedDB for client-side storage and a server API.
- **UI Components**: Custom reusable components, responsive layouts, and Recharts for data visualization.
- **PDF Generation**: jsPDF and jsPDF-AutoTable (CDN) for report card generation.

### Backend
- **Runtime**: Node.js with Express 5.
- **Authentication**: Passport.js with LocalStrategy and `connect-pg-simple` for PostgreSQL-backed session persistence, using scrypt-based password hashing.
- **API Design**: RESTful API endpoints under `/api` for CRUD operations.
- **Authorization**: Role-based access control (`super_admin`/`admin`/`teacher`) with server-side role enforcement.
- **Database Access**: Drizzle ORM for type-safe PostgreSQL queries.

### Security Architecture
- **Password Policy**: Minimum 8 characters with uppercase, lowercase, and number requirements, enforced on registration, user creation, and password reset.
- **Rate Limiting**: 10 auth requests per 15 minutes (login/register), 100 API requests per minute.
- **Account Lockout**: 5 failed login attempts triggers 15-minute IP-based lockout.
- **Session Security**: httpOnly, secure (production), SameSite=strict cookies with 24-hour expiry.
- **Super Admin Protection**: Super admin accounts cannot be deleted, demoted, or have passwords reset by regular admins. Only existing super admins can create new super admins.
- **Server-Side Role Enforcement**: All role assignments are validated server-side, ignoring client-provided role values unless the requesting user has appropriate permissions.
- **Multi-Tenant Isolation**: All data queries filter by schoolId, with user-school assignments validated per request.
- **Setup Key**: First admin account creation requires a SETUP_KEY (environment secret) to prevent unauthorized super admin creation.

### Data Architecture
- **Grading System**: UNEB-compliant Ugandan grading logic for grades (D1-F9) and divisions (I-U), supporting different subject sets for lower (P1-P3) and upper (P4-P7) primary.
- **Data Models**: Includes Students, Teachers, Marks, and Settings.
- **Schema Management**: Drizzle Kit for database migrations.
- **Multi-School Architecture**: Supports multiple schools with data isolation via `school_id`, allowing users to switch contexts.

### System Design
- **UI/UX**: Rebranded with a professional maroon/burgundy and navy blue color scheme, redesigned login, sidebar, dashboard, settings, and a dark theme. Includes an education-themed logo and responsive mobile views.
- **Feature Specifications**:
    - **User Management**: Admin-only section for user creation, editing, deletion, password reset, and activity logging.
    - **Student Management**: Statistics dashboard, enhanced filtering, **batch promotion** (P1→P2→...→P7→Graduated with stream assignment and audit history), duplicate index detection, inline editing, and search.
    - **Marks Entry**: Progress tracker, inline grade display, quick fill, validation, undo/redo, student comments, row locking, absent/sick toggles, auto-save, marks copying, and **mobile-friendly card-based view** with swipe navigation and student picker for easy data entry on phones and tablets.
    - **Analytics Dashboard**: Comprehensive performance insights with filters, summary statistics, and various charts.
    - **Data Management**: CSV import/export for students and teachers with templates, and Smart Data Merge for importing and updating data.
    - **Teacher Management**: Staff directory with statistics, search, advanced filters, CSV import/export, enhanced teacher profiles, and workload view.
    - **Assessment Sheet**: Filtering by stream, display of class teacher, improved analytics with summary cards, division distribution, subject performance bars, top performers, and gender comparison.
    - **PDF Reports**: Professional header, school branding, color-coded positions and divisions, division summary, grading scale, signature lines, and detailed performance analysis (division analysis, subject performance, grade distribution, top performers).
    - **Position Calculation**: Unified logic based on total marks for both assessment sheets and report cards.
    - **Dynamic School Branding**: All school-specific data for PDF reports (logo, name, address, phones, motto) is dynamically pulled from user-configured settings.
    - **Marketing Landing Page**: Public-facing website at the root path (`/`) with features, testimonials, how-it-works, and contact sections, using the project's color scheme.
    - **Financial Reports**: Five downloadable PDF reports - Fee Collection Report (payments by term/year with fee type subtotals), Expense Report (expenses by category with date range filtering), Income Statement (revenue vs expenses with net income), Outstanding Fees Report (students with unpaid balances sorted by amount owed), and Payment Receipts (individual printable receipts for specific payments).
    - **Boarding Management Module**: Complete boarding facility management with gender-segregated dormitories, room and bed allocation, morning/evening roll calls with bulk marking, leave request workflow (pending → approved → checked_out → returned) with PDF exeat letter generation, and visitor logging for visiting days.

## Recent Changes (December 2025)
- Mobile-First Optimization:
  - Mobile bottom navigation bar for quick access to key features (Home, Students, Attendance, Messages, Marks)
  - Touch-friendly tap targets (44px minimum) and safe area insets for notched devices
  - Mobile-responsive card layouts with MobileDataView component for tables
  - Hamburger menu sidebar for mobile devices
  - PWA enhancements with offline indicator showing network and sync status
- Enhanced Offline Support (PWA):
  - Workbox runtime caching for all API endpoints with NetworkFirst strategy
  - IndexedDB storage via offlineStorage.ts for critical data persistence
  - Background sync queue for pending changes when offline
  - Network status indicator showing online/offline state and sync progress
  - Automatic data sync when network connectivity is restored
- Added complete Boarding Management Module:
  - 8 new database tables (dormitories, dorm_rooms, beds, boarding_profiles, boarding_roll_calls, leave_requests, visitor_logs, boarding_settings)
  - Boarding Dashboard with occupancy stats, leave request overview, and roll call summaries
  - Dormitory Manager for hierarchical dorm/room/bed structure with student assignment
  - Daily Boarding Attendance with morning/evening roll call sessions and bulk marking
  - Leave Management with approval workflow and PDF exeat letter generation
  - Visitor Log for check-in/out tracking during visiting days
- Added In-App Messaging System:
  - 3 new database tables (conversations, conversation_participants, messages)
  - Messages Inbox page with conversation list and unread indicators
  - Conversation View with threaded messages and real-time reply
  - Compose New Message modal with multi-recipient user picker
  - Unread message count badge on sidebar navigation (auto-refreshes every 30s)
  - Support for direct and group conversations between school staff
- Added Security & Access Control Settings Tab:
  - Password Policy configuration (min length, uppercase/lowercase/numbers/special chars requirements, expiry days)
  - Session & Login settings (session timeout, max login attempts, lockout duration)
  - Two-Factor Authentication toggle for admin users
  - Activity logs viewer showing security-related actions
  - Per-school configurable securityConfig stored in schools table
- Enhanced Grading Configuration:
  - Fully customizable grade scales with editable grade labels, boundaries, points, and colors
  - Customizable division rules (not hardcoded UNEB)
  - Preset templates: UNEB Standard (D1-F9), Letter Grades (A-F), Extended Letter (A+-F)
  - Configurable passing mark threshold
  - Per-school gradingConfig stored in schools table

## External Dependencies
- **Database**: PostgreSQL via Neon serverless driver (`@neondatabase/serverless`).
- **Session Store**: `connect-pg-simple`.
- **Client-Side Storage**: IndexedDB (via `idb` library).
- **Chart Library**: Recharts.
- **PDF Generation**: jsPDF and jsPDF-AutoTable.
- **Styling Framework**: Tailwind CSS (CDN).
- **Font**: Inter font from Google Fonts.
- **Build Tools**: Vite, esbuild, tsx.
- **API Requirements**: Gemini API.
- **Excel Import**: xlsx library.