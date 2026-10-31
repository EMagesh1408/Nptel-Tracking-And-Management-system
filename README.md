# NPTEL Tracking & Management System

A full working web application for collecting, maintaining, updating and monitoring
students' NPTEL information, built on the hierarchy:

`School → Programme (formerly Department) → Degree → Academic Year → Year → Student → NPTEL Details`

This matches your project document exactly: same three roles (Staff / HOD / Admin),
same 6-step NPTEL status flow, same list of Schools, Departments and Programmes, and
the same technology stack (React + Tailwind, Node.js + Express, MongoDB, JWT auth,
Recharts for analytics).

---

## 1. What's inside

```
nptel-tracking-system/
├── backend/                 Node.js + Express + MongoDB API
│   ├── config/db.js         MongoDB connection
│   ├── models/User.js       Staff / HOD / Admin accounts (password hashed)
│   ├── models/Student.js    Student + embedded NPTEL course records
│   ├── middleware/authMiddleware.js   JWT auth + role guard
│   ├── routes/authRoutes.js       login (username + password) / me
│   ├── routes/studentRoutes.js    student & NPTEL record CRUD (role-scoped)
│   ├── routes/analyticsRoutes.js  dashboard totals & status breakdown
│   ├── seed/seed.js         makes sure the admin login exists (npm run seed)
│   ├── seed/resetAdmin.js   sets a new admin password (npm run reset-admin)
│   ├── middleware/security.js  rate limits + query sanitising
│   └── server.js            app entry point
└── frontend/                 React (Vite) + Tailwind CSS
    ├── src/data/hierarchy.js       full School→Dept→Programme list from your PDF
    ├── src/pages/Login.jsx
    ├── src/pages/StaffDashboard.jsx   add students, enter/update NPTEL records
    ├── src/pages/HODDashboard.jsx     department-level monitoring + charts
    ├── src/pages/AdminDashboard.jsx   full hierarchy view, analytics, CSV export
    └── src/components/...             table, filters, status badge, modals, charts
```

## 2. How the roles work (as per your document)

| Role  | What they can do |
|-------|-------------------|
| **Staff** | Full record-keeping for their own department only: add students, **edit every field including register number**, add/update NPTEL course records, upload students in bulk via Excel, and **delete/remove a student record** they entered by mistake. They cannot see, filter into, or edit any other department — enforced both in the UI (no school/department selector shown) and on the backend (the API forces and re-checks the school/department on every request, ignoring anything a client tries to send). |
| **HOD**   | Read-only view of their own department only, plus analytics for that scope — same isolation as Staff. |
| **Admin** | Full visibility across every School, Department, Programme, Year and Student, plus analytics, filters, CSV report export, and can delete any student. |

### Editing students

Click any student row → **"Edit Student Details"** to update Name, Register Number,
Academic Year, Year or Section. School and Department stay locked to the logged-in
staff member's own department (only an Admin can move a student between departments).
Changing the register number to one that already exists is rejected with a clear error.

### Removing a student

Click a student row → **"Delete student record"** to remove an incorrectly entered or
duplicate student. Staff can only delete students in their own department; Admin can
delete any student, from anywhere.

### 3-year UG / 2-year PG years

Year options are now generated from the selected Programme, not a fixed list:
- **Undergraduate programmes** (B.Sc., B.A., B.Com., BCA, BBA, etc.) → **Year I, II, III**
- **Postgraduate programmes** (M.Sc., M.A., M.Com., MBA, MCA, MSW) → **Year I, II**

Pick the Programme first in the Add/Edit Student form and the Year dropdown
automatically shows only the valid years for that programme's duration.

### One login per department

There are **no pre-made Staff or HOD accounts**. The administrator creates each one from
**Admin dashboard -> Accounts** (see "Account management" at the end of this file). Every
Staff/HOD login is locked to the school and department chosen for it, so a Computer Science
staff member only ever sees Computer Science.

### Bulk student upload (Excel)

On the Staff Dashboard, click **"Upload Excel"** to add many students at once instead
of one at a time:
1. Click **"Download a blank template (.xlsx)"** to get the expected column headers:
   `Register Number, Student Name, Programme, Academic Year, Year, Section`.
2. Fill in your students' rows and save the file.
3. Upload it — the app reads it in your browser, shows a preview, and on submit
   creates every valid row. Duplicate register numbers or missing required fields
   are skipped and listed so you can fix and re-upload just those rows.
4. School and Department are always taken from your own staff account, never from
   the spreadsheet — so it's impossible to accidentally upload into another department.

The NPTEL status of every course record moves through the 6 steps from your document:
`Not Enrolled → Enrolled → Course Completed → Exam Registered → Exam Attended → Certificate Received`

---

## 3. Prerequisites

Install these once on your computer:

1. **Node.js** (v18 or later) — https://nodejs.org
2. **MongoDB** — either:
   - Install MongoDB Community Server locally: https://www.mongodb.com/try/download/community, **or**
   - Use a free cloud database at https://www.mongodb.com/cloud/atlas (recommended if you don't want to install MongoDB locally)

You can check Node is installed by running:
```bash
node -v
npm -v
```

---

## 4. Setup — Backend (API + Database)

Open a terminal in the `backend` folder:

```bash
cd backend
npm install
```

Create your environment file:
```bash
cp .env.example .env
```

Open `.env` and set your MongoDB connection string:
- **Local MongoDB:** leave the default `mongodb://127.0.0.1:27017/nptel_tracking`
- **MongoDB Atlas:** paste the connection string Atlas gives you, e.g.
  `mongodb+srv://username:password@cluster.mongodb.net/nptel_tracking`

Then fill in these values (the server **refuses to start** if they are missing or weak):
- `JWT_SECRET` — a random string of 32+ characters. Generate one with
  `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`
- `CLIENT_ORIGIN` — the exact address of the website, e.g. `http://localhost:5173` while developing,
  or `https://nptel.yourcollege.edu` when deployed. Only this site may call the API.
- `ADMIN_USERNAME` / `ADMIN_PASSWORD` — the admin login (see section 6).

**Create the admin login** (the server also does this automatically on first start):
```bash
npm run seed
```

**Start the API server:**
```bash
npm run dev
```
You should see `NPTEL backend running on port 5000` and `MongoDB connected: ...`.
Leave this terminal running.

---

## 5. Setup — Frontend (Website)

Open a **second** terminal in the `frontend` folder:

```bash
cd frontend
npm install
npm run dev
```

Vite will print a local URL, normally:
```
http://localhost:5173
```

Open that in your browser — this is your working website.

---

## 6. Administrator login

**Where it is stored.** In the MongoDB `users` collection (role `admin`). Only a one-way **bcrypt hash**
of the password is stored — nobody, including you, can read the password back from the database.
The first time the backend starts (or on `npm run seed`) it creates the admin from `backend/.env`:

| Setting in `backend/.env` | Meaning |
|---|---|
| `ADMIN_USERNAME` | Admin username (not case-sensitive). Default `Admin@gurunanakedu.com` |
| `ADMIN_PASSWORD` | Admin password, 10+ characters with letters and numbers |

There is **no built-in password**. If `ADMIN_PASSWORD` is empty, a random one is generated and printed
**once** in the server console — copy it then. After the admin exists, changing `.env` does nothing;
use the command below.

**Still on the old public `Admin123`?** The server prints a warning at start-up. Set a strong
`ADMIN_PASSWORD` in `backend/.env` and restart — it replaces the old password automatically.
**Forgot the password?** Run `npm run reset-admin` (it asks for a new password, hashes it, and signs
out every old admin session).

Sign in, open the **Accounts** tab and create the Staff and HOD logins. Never upload `backend/.env`
to GitHub (it is already in `.gitignore`).

---

## 7. Typical demo flow for your project presentation

1. **Log in as Admin** → Accounts tab → create a Staff and an HOD login for a department. Then **log in as Staff** → click "+ Add Student" → fill School/Department/Programme/Year →
   save → click the new student row → "+ Add NPTEL Course" → fill course details and
   set the status → save.
2. **Log in as HOD** → see the department's students and a live status-distribution
   chart update instantly.
3. **Log in as Admin** → see every School/Department, use the filters, view the
   bar chart comparing departments, and click "Export report" (Excel or PDF; all, session-wise, qualified or not qualified) to download a
   spreadsheet of all records — this maps directly to the "Reports" feature in your
   project document.

---

## 8. Changing the college hierarchy

All Schools, Departments and Programmes live in one file:
`frontend/src/data/hierarchy.js`. Edit that array to add/rename anything — the
dropdowns everywhere in the app update automatically.

## 9. Deployment (optional, matches your document's stack)

- **Frontend:** deploy the `frontend` folder to **Vercel** (`vercel.com`) — it auto-detects Vite.
- **Backend:** deploy the `backend` folder to **Render** (`render.com`) as a Web Service.
  Set the same environment variables from your `.env` file in Render's dashboard.
- **Database:** use **MongoDB Atlas** (already cloud-hosted) and point `MONGO_URI` at it.
- After deploying, set `VITE_API_URL` (frontend) to your Render backend URL, and
  `CLIENT_ORIGIN` (backend `.env`) to your Vercel frontend URL, so CORS works.

---

## 10. Troubleshooting

- **"MongoDB connection error"** → MongoDB isn't running locally, or your Atlas
  connection string/password is wrong. Double-check `.env`.
- **Login fails with "Incorrect username or password"** → make sure you ran `npm run seed`
  in the backend folder.
- **Frontend shows a blank page / network errors** → make sure the backend terminal
  is still running on port 5000, and the frontend's `VITE_API_URL` (if you set one)
  points to the right address.
- **Port already in use** → change `PORT` in the backend `.env`, or stop whatever
  else is using port 5000/5173.

## 11. Bug-fix notes (latest pass)

A full audit was done across both the backend and frontend. Real, verified issues found and fixed:

| # | Bug | Fix |
|---|-----|-----|
| 1 | The Staff dashboard showed a **Programme filter that silently did nothing** -- the backend only read that query param for `hod`/`admin`, never `staff`. | Backend now honors the Programme filter for staff too, still scoped to their own department. |
| 2 | **Editing an NPTEL record with no score set** passed `null` into a controlled input, causing React warnings and unreliable typing in the Score field. | Score is now normalized to `""` when a record is loaded into the edit form. |
| 3 | The **3-year UG / 2-year PG rule only existed in the frontend dropdown** -- a direct API call or a bulk Excel upload could still save an invalid year (e.g. "III" for an MCA student) with nothing to stop it. | Added server-side validation (`backend/utils/academic.js`) enforced on create, update, *and* bulk upload -- the true source of truth is now the backend, not just the UI. |
| 4 | Validation errors (e.g. a bad enum value) were swallowed into a generic, unhelpful **"500 Server error"** everywhere. | Added a shared error handler (`backend/utils/errors.js`) that returns proper 400/409 codes with the real message across every route. |
| 5 | **Saving an NPTEL course record that failed showed nothing** -- the modal's `try { } finally { }` had no `catch`, so the error just vanished. | Added proper error handling + an inline error message, matching the other forms. |
| 6 | **Every dashboard could get stuck on "Loading records..." forever** if a request failed for any reason (network blip, expired session, etc.) -- `setLoading(false)` was never reached because there was no `try/catch` around the fetch. | All three dashboards now wrap loading in `try/catch/finally` and show a clear error message instead of hanging. |
| 7 | Deleting a student silently did nothing on failure (no error shown). | Delete actions now show an alert with the real error if they fail. |
| 8 | **Uploading an Excel file with non-English/accented characters could corrupt the text** -- the reader used the deprecated `readAsBinaryString`, which mis-decodes anything outside plain ASCII. | Switched to `readAsArrayBuffer`, the correct lossless approach for binary spreadsheet data. |
| 9 | (Removed) The old demo quick-fill buttons no longer exist. | The login page has no demo logins; accounts are created by the admin. |
| 10 | A corrupted value in browser storage would throw during app startup and **crash the whole app to a blank screen**. | `AuthContext` now catches that and falls back to logged-out instead of crashing. |

## 12. Latest feature update

| Area | What changed |
|------|--------------|
| **Excel upload (Staff)** | The upload sheet now captures *all* student details plus optional NPTEL course columns (Course Name, Course ID, Duration, Instructor, Enrollment/Exam status, Certificate Status, Score, Grade, Overall Status). If a row has a Course Name, that student's first NPTEL record is created in the same upload -- no need to add it separately afterwards. Course columns are optional; a sheet with just student details still works exactly as before. |
| **HOD can now edit student details** | HOD accounts get an "Edit Student Details" button (name, register number, programme, year, section, academic year) -- locked to their own department, same as Staff. HOD still cannot add/edit NPTEL course records or delete students; that stays with Staff and Admin. |
| **Admin can also edit student details** | Previously Admin could only view/delete. Now Admin can fix a typo in any student's details from any department too. |
| **Cleaner charts** | The status chart is now a doughnut (no more cluttered inline slice labels) with a proper legend and percentage in the tooltip. The department bar chart has softer gridlines, rounded bar tops, and a cleaner tooltip style. |
| **Admin dashboard no longer dumps every student by default** | On open, Admin sees analytics (totals, charts) immediately, but the full student list only loads once a filter or search is applied -- or by clicking "Or show every student" to browse everyone deliberately. Much faster and less overwhelming with a large college. |
| **HOD: "Pending Records" card removed** | Replaced with a more useful **"Students by Year & Section"** bar chart (computed from their own department's data) and a **CSV export** button scoped to their department. |
| **Staff dashboard: Section filter (A/B/C), year-wise** | A new Section filter sits next to Year -- pick a Year first, then narrow to Section A, B, or C within it. Also added to HOD and Admin dashboards. |
| **Staff dashboard: new stat cards** | Staff now sees their own department's Total Students, Enrollments, Exam Registrations, and Certificates Received at a glance -- previously only Admin/HOD had this visibility. |
| **"Showing N students" counter** | All three dashboards now show a live count of how many students match the current filters. |

## 13. Analytics now actually respects the filters (real bug fix)

Previously, picking a School/Department on the Admin dashboard changed the student
*list* below but had **zero effect on the stat cards and charts above it** -- they
always showed system-wide totals no matter what was selected, because the analytics
endpoint (`/api/analytics/summary`) never read the query filters at all. Same gap
existed on the Staff and HOD dashboards for their Year/Section/Status/Programme filters.

Fixed by extracting the scoping logic into one shared function
(`backend/utils/scopedFilter.js`) used by both `/api/students` and
`/api/analytics/summary`, so a selection narrows both consistently:

- **Admin**: pick a School/Department (or any filter) and the stat cards, doughnut
  chart, and department bar chart all scope down to exactly that selection. Clear
  every filter and it goes back to whole-college totals. The dashboard subtitle now
  also reflects the current scope (e.g. "Department of Computer Science · School of
  Information Technology" instead of always saying "full hierarchy view").
- **Staff / HOD**: their filters (Year, Section, Programme, Status) now narrow their
  own stat cards too, not just the table.

## 14. New: Completion Rate

All three dashboards now show a **Completion Rate** stat (% of enrolled NPTEL courses
that reached "Certificate Received"), computed server-side and scoped the same way as
everything else above.

## 15. Major update: side panel, certificate upload, stricter filtering

This was a large edit-in-place update. Nothing was rebuilt from scratch -- the
existing database, auth, roles, routes, and design language are all untouched
except where the changes below required a small, targeted addition.

### Removed
- The **Completion Rate** card is gone from all three dashboards (Admin, HOD, Staff).
  Remaining stat cards reflow to fill the space evenly.

### Student list no longer shows by default
On every dashboard, the raw student list is now hidden until **Department, Year, and
Section** are all selected -- you'll see "Please select Department, Year and Section
to view students." until then. For Staff and HOD, Department is always their own
(locked), so in practice this means picking a Year and a Section. Aggregate analytics
(the stat cards and charts) still load immediately, scoped to whatever's selected so
far -- only the raw per-student list is gated this strictly.

New in the filter bar on every dashboard:
- **Clear Filters** -- resets back to the locked defaults (Staff/HOD keep their own
  department; Admin clears everything)
- **Refresh** -- re-fetches both the student list and the analytics without changing
  any filter
- A live **"Showing N students"** count once the list is visible

### Student details: side panel instead of expanding rows
Clicking a student row (or its **View** button) now opens a **right-side drawer**
with everything: student info, every NPTEL course the student has with full detail
(course name, code, duration, start/end date, institution, enrollment/exam/assignment
status, score, grade, certificate status and received date), and the course count.
Nothing expands downward in the table anymore.

Inside the panel:
- **Edit Student Details** and **Delete Student** (Staff/Admin only -- HOD gets Edit
  only, matching existing permissions; deleting was never granted to HOD on the
  backend, so nothing changed there)
- Deleting now goes through a proper **confirmation dialog** (replacing the old
  browser `confirm()` popup) before anything is removed
- **+ Add Course** / **Update Course Details** per NPTEL record (Staff/Admin)

### Certificate upload (new)
Inside each course's card in the side panel, Staff and Admin can now:
- **Upload Certificate** (PDF, JPG, JPEG, PNG -- up to 10MB), or **Replace / Update
  Certificate** if one's already on file
- **View Certificate** (opens in a new tab -- PDFs and images both render correctly)
  and **Download Certificate**

On a successful upload: Certificate Status is automatically set to "Received", the
Certificate Received Date is recorded, the overall NPTEL status moves to "Certificate
Received", and the old file (if replacing one) is cleaned up so uploads don't pile up
on disk. HOD can view and download certificates but cannot upload, replace, or delete
them -- consistent with HOD's existing read-only relationship to NPTEL records.

Files are stored on the backend's local disk under `backend/uploads/certificates` with random,
unguessable names. They are **not public**: the only way to read one is the signed-in route
`GET /api/students/:id/records/:recordId/certificate`, which checks the login and the department
first (the website fetches it with the login token). The real file type is also checked, not just
the name. **Note on persistence:** this survives a
normal server restart on any host with a persistent disk (a VM, your own server, a
Render "Disk" add-on, etc). It does **not** survive a redeploy on a host with an
ephemeral filesystem (most serverless platforms, or a free-tier host that wipes local
storage on redeploy). If you deploy somewhere ephemeral, swap `backend/middleware/
upload.js`'s storage engine for an object storage service (S3, Cloudinary, etc) later
-- the database field, the route, and the UI all stay exactly the same; only that one
file's storage backend would change.

### Toast notifications
Success/error messages (adding a student, saving a record, uploading a certificate,
deleting) now show as a small toast in the corner instead of a blocking browser
`alert()`.

### New backend pieces
- `POST /api/students/:id/records/:recordId/certificate` -- upload/replace a
  certificate file (Staff own-department + Admin only; multipart/form-data)
- `backend/middleware/upload.js` -- Multer config (file type + 10MB size validation)
- `backend/utils/scopedFilter.js` -- the department-scoping logic, now shared
  identically between the student list and analytics endpoints
- New Student model fields: `courseStartDate`, `courseEndDate`,
  `certificateFileName`, `certificateReceivedDate`
- `GET /api/students/:id/records/:recordId/certificate` -- login-protected certificate download
  (there is no public `/uploads` route any more)

No existing routes, fields, or permissions were removed or changed in a way that
breaks prior behavior -- Admin/Staff/HOD roles, JWT auth, and every previously-working
endpoint continue to work exactly as before.

## 16. Major update: HOD dashboard restructure, course-level Staff table, certificate verification workflow

This update restructures the HOD dashboard to match a reference design, rebuilds the
Staff table to a course-level view, and adds a genuine certificate verification
workflow -- all while keeping the existing navy/brass/cream color palette completely
untouched (verified: no new Tailwind color utilities or hex values were introduced
anywhere in this change).

### HOD Dashboard -- full restructure
- New **breadcrumb** trail: Schools of Excellence › School › Department.
- New **Dashboard / Records** tabs: Dashboard shows stat cards + charts; Records
  shows the filter bar, stat cards, and the student list together.
- School and Department are now shown as **visible, disabled fields with a lock
  icon** (rather than hidden entirely), making it clear at a glance which
  department you're in -- matching the reference design.
- New **"+ Add student record"**, **"Download template"**, **"Upload Excel"**, and
  **"Export clean report"** actions -- HOD can now add students and bulk-upload via
  Excel (previously Staff-only), and edit student details (already added previously).
  HOD still cannot add/edit individual NPTEL course records, upload certificate
  files, or delete students -- that boundary is unchanged and enforced on the
  backend, not just hidden in the UI.
- New **sub-tab record grouping**: All Records, Section A/B/C, Pending
  Verification, Defaulters -- each with a live count, computed from the
  currently-loaded department roster.
  - **Pending Verification** = a student has a received certificate that hasn't
    been reviewed yet.
  - **Defaulters** = a student with no actively-enrolled NPTEL course.
- New **"Active enrollments"** stat card with a circular progress ring showing
  % of cohort enrolled.
- New **"Certificates verified"** stat card (teal-highlighted, matching the
  reference's accent card).
- The student list here no longer requires picking Year + Section first (unlike
  Staff/Admin) -- HOD's department is already a bounded scope, so records show
  immediately, with filters available to narrow further. Staff and Admin's
  stricter "select Department, Year, Section" gating is unchanged.
- "Export clean report" exports the whole department; "Export filtered report"
  (next to the Student records header) exports just the current sub-tab's students.

### Staff Dashboard -- course-level table
The student table is replaced with a **course-level table**: one row per NPTEL
course a student is taking (a student with 3 courses gets 3 rows; a student with
none gets a single placeholder row with a quick "+ Add Course" action). Columns:
Reg. number, Student, Course, Certificate, Verification, Actions -- matching the
reference design with "Lifecycle stage" and "Exam & score" columns removed as
requested. Clicking "Verification" toggles it directly from the table; clicking a
row (or "View") still opens the full side panel with every detail.

### New: certificate verification
A certificate being **uploaded** and a certificate being **verified** are now two
separate steps -- e.g. Staff uploads it, then Staff/HOD/Admin can mark it verified
after review. New Student model fields: `verified`, `verifiedAt`. New backend route:
`PUT /api/students/:id/records/:recordId/verify`. Re-uploading/replacing a
certificate resets it to unverified, since whoever reviews it should be looking at
the actual new file.

### New: Batch filter
A "Batch" filter (mapped to the existing Academic Year field, e.g. "2024-2025") is
now available in the filter bar on all three dashboards -- this was already
supported by the backend but never exposed in the UI until now.

### Visual polish (colors unchanged)
Subtle shadows on cards/buttons/fields, sharper focus states, refined hover/active
states, and a new pill-tab style (used for the sub-tab groups and the
Dashboard/Records tabs) -- all built from the exact same navy / brass / teal / brick
/ paper / line tokens already defined in `tailwind.config.js`. No new colors, no
layout/branding changes beyond what's described above.

### Files touched
Backend: `models/Student.js`, `routes/studentRoutes.js`, `routes/analyticsRoutes.js`.
Frontend: `pages/HODDashboard.jsx` (rewritten), `pages/StaffDashboard.jsx`,
`pages/AdminDashboard.jsx`, `components/Filters.jsx`, `components/StatCard.jsx`,
`components/StudentDetailPanel.jsx`, `components/Layout.jsx`, `index.css`, plus new
files `components/Breadcrumb.jsx`, `components/StatRing.jsx`,
`components/CourseTable.jsx`, `utils/excelTemplate.js`.


## Account management (Admin)

Admin → **Accounts** tab. The admin creates and manages every Staff and HOD login:

- **Create account** – choose Staff or HOD, school, department, display name, a username and a password (or press *Generate*). The details are shown once with copy buttons so they can be shared.
- **Rename** – edit the account and change the username (and/or display name) at any time; usernames are unique.
- **Reset password** – set a new password in the same dialog. Old sessions of that user are signed out.
- **Disable / enable** – blocks sign-in without deleting the account. **Delete** removes it (student records they entered are kept).

Storage: usernames, names, roles and departments live in the `users` collection of MongoDB. Passwords are stored as **bcrypt hashes**, never as readable text — which is why the admin can set a new password but never view an existing one. Login is rate-limited (8 wrong attempts per username per 10 minutes).

Existing databases upgrade automatically on server start: old accounts keep working, with their old e-mail as the first username, which the admin can then rename.

API (admin only): `GET/POST /api/users`, `PUT/DELETE /api/users/:id`. Login: `POST /api/auth/login` with `{ username, password }`.

## Export report

Every dashboard has an **Export report** button. It asks what to export:

- **All students** - everyone with all their courses
- **Session wise** - choose a session, get every course taken in it
- **Qualified students** - only Qualified courses, with score and grade
- **Not qualified students** - Not Qualified courses plus students with no course yet

...and the format, **Excel (.xlsx)** or **PDF**. The dialog shows how many students and course
records the file will contain before you download. Staff/HOD exports are limited to their own
department; the Admin exports follow the School/Department selected on the dashboard.

### Passwords (Admin)

Passwords are stored only as bcrypt hashes and can **never** be shown again. When the admin creates a
Staff/HOD account, or sets a new password, the login details are shown **once** in a dialog with
Copy buttons. If a password is lost, open the account (pencil icon) and set a new one — the person is
signed out of their old sessions. (Older versions kept a recoverable encrypted copy; it is erased
automatically the first time this version starts.)

## Security measures

- Passwords: bcrypt (cost 12), login lockout after repeated failures, rate limit per address, uniform
  "invalid username or password" message, tokens signed with HS256 and invalidated on password change.
- The server refuses to start without a strong `JWT_SECRET` and an exact `CLIENT_ORIGIN` (no `*`).
- Security headers (helmet), request-size limit, global API rate limit, no stack traces or internal
  messages sent to visitors.
- Every query value is forced to plain text and `$`-operators are stripped (NoSQL injection), search
  text is escaped (regex attacks), and only whitelisted fields can be written (no mass assignment).
- Staff/HOD can only reach their own school/department on every route, including certificate files.
- Idle sign-out after 30 minutes in the browser; logging out asks for confirmation, and the login page
  never pre-fills or remembers a username.

**Do these when you deploy:** serve the site and API over **HTTPS only**; set `TRUST_PROXY=1` behind a
proxy; use a MongoDB user with a strong password and allow only your server's IP in Atlas; keep
`backend/.env` out of GitHub; run `npm audit` in both folders now and then; take regular database
backups. No website can be promised "unhackable" — these steps remove the common ways in.

## Sessions (Admin)

Admin dashboard → **Sessions**. Pick an academic year and a term (Jan-April, July-December, or a custom
term) and press **Add session**. It is saved in the database (`sessions` collection) and immediately shows
up in every session filter, course form, chart and export for Staff, HOD and Admin. Dashboards that are
already open pick it up when the browser tab is focused again, or within a minute.

A session that student records already use cannot be deleted. On first start the usual sessions
(2023-24 … 2026-27) are added automatically. API: `GET /api/sessions` (everyone), `GET /api/sessions/manage`,
`POST /api/sessions`, `DELETE /api/sessions/:id` (admin).

The college logo used on the login page and as the browser icon is `frontend/public/logo.png` (replace the
file to change it).

---

## UI upgrade (v1.1)

What changed in the frontend (no backend changes, no new npm packages):

- **New navbar**: logo, college name, a profile menu (name, role, school/department, light/dark switch, security note) and a redesigned Log out button. The header gains a shadow as you scroll and shows a banner when the device is offline.
- **New icon set**: one consistent rounded duotone family (`src/components/Icons.jsx`). All old icon names still work; new ones were added (sun, moon, shield, clock, target, arrow-up and more).
- **Floating bottom dock (phones)** with a gliding highlight and a popping icon; **segmented tabs with a sliding highlight** on tablets and desktops.
- **New logout flow**: "Ready to leave?" sheet, then a full-screen farewell animation (colour circle grows, ring closes around a tick, "See you soon, <first name>") before the real sign-out. Respects "reduce motion".
- **Idle warning**: one minute before the 30-minute automatic sign-out, a "Still there?" countdown lets the person stay signed in.
- **Dark mode**: switch in the profile menu, remembered per device. The login page is not affected.
- **Welcome banner** on every dashboard: greeting, date and time, a qualification progress ring, and (Admin/HOD) a "N awaiting verification" shortcut. On the HOD dashboard the shortcut opens the Pending Verification list.
- **Animated stat cards** (numbers count up), **new toasts** with a countdown bar, and a **back-to-top** button.


## Names, navigation and login welcome (latest changes)
- **Person names:** Staff and HOD accounts have a real "HOD name / Staff name" (Admin -> Accounts -> Create / Edit). It is used in the greeting, top bar, profile card, logout dialog and sign-out screen. Older accounts show only the time-of-day greeting until a name is added.
- **Banner:** "X of Y students qualified" counts students (backend `GET /api/analytics` now returns `qualifiedStudents`).
- **Navigation bar:** floating bar; on large screens the page sections sit inside it as a sliding pill.
- **Login:** after a successful sign-in a welcome screen plays (`components/WelcomeScreen.jsx`) and the dashboard opens when it finishes. `AuthContext.login(user, pass, { commit: false })` + `commitLogin(user)` make this possible.
- **Dark mode:** dialogs and drawers now follow the theme (see "DARK MODE FIXES" in `index.css`).
