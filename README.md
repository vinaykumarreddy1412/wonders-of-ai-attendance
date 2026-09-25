# Euphoria 2026 - Attendance Portal

Official, secure, and modern attendance portal built for the **Euphoria 2026** event.

---

## 🔄 Updated Attendance Architecture

**Participant Unique QR Code → Volunteer Scans QR → Real-Time Attendance Recorded**

* **Participant / Student**: Displays their own unique personal QR code on their phone screen.
* **Volunteer**: Uses their phone camera to continuously scan participant QR codes and record instant attendance.
* **Admin**: Monitors real-time attendance percentages, manages volunteer accounts, and exports full reports with volunteer audit trails.
* **Database**: Real-time synchronization with **Firebase Firestore** (`euphoria-8ab12`).

---

## 🔑 Login Credentials

### 1. Student / Delegate Login
* **URL**: `/#/student/login`
* **Username**: **Registration Code** (e.g. `EUPH-26-852995-S1`)
* **Password**: **Mobile Number** (e.g. `8438408688`)

#### Sample Delegate Accounts:
* `EUPH-26-852995-S1` / `8438408688` (*Saranya K — P.S.R ENGINEERING COLLEGE*)
* `EUPH-26-FDF507-S1` / `9345848128` (*Lalithambigai — PSR Engineering College*)

---

### 2. Volunteer Desk Login (5 Slots)
* **URL**: `/#/volunteer/login`
* **Volunteer 1**: `volunteer1` / `vol123`
* **Volunteer 2**: `volunteer2` / `vol123`
* **Volunteer 3**: `volunteer3` / `vol123`
* **Volunteer 4**: `volunteer4` / `vol123`
* **Volunteer 5**: `volunteer5` / `vol123`

---

### 3. Admin Login
* **URL**: `/#/admin/login`
* **Username**: `admin`
* **Password**: `euphoria2026`

---

## 🚀 Running the Application

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run automated integration test suite (31 tests)
node scripts/testSuite.cjs

# Build for production
npm run build
```
