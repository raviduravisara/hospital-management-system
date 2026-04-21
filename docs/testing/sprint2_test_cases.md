# Sprint 2 – Test Case Document
**Project:** HEALIX Hospital Management System
**Sprint:** Sprint 2
**Prepared by:** QA (HMS-282)
**Date:** 2026-03-23
**Tools:**
- API testing → Swagger UI: `http://localhost:5041/swagger`
- Frontend testing → Browser: `http://localhost:5173`

---

## How to Use This Document

| Column | Description |
|---|---|
| **Test ID** | Unique identifier — format `S2-<story>-TC<number>` |
| **Feature** | The story/feature under test |
| **Type** | Happy Path / Validation / Edge Case |
| **Steps** | Exact steps to reproduce |
| **Expected Result** | What should happen |
| **Pass / Fail** | Fill in during testing |
| **Notes / Bug ID** | Jira bug ID if it fails |

---

## Story 1 – Patient Registration

| Test ID | Feature | Type | Steps | Expected Result | Pass/Fail | Notes |
|---|---|---|---|---|---|---|
| S2-PR-TC01 | Patient Registration | Happy Path | 1. Open `http://localhost:5173/register`<br>2. Fill: Username=`patient1`, Email=`patient1@test.com`, Password=`Pass@123`, Role=`Patient`<br>3. Click **Register** | Redirected to login or dashboard. `POST /api/auth/register` returns **201** with a `userId`. | | |
| S2-PR-TC02 | Patient Registration | Validation | 1. Open `/register`<br>2. Leave all fields empty<br>3. Click **Register** | Form shows inline validation errors for each required field. No API call is made. | | |
| S2-PR-TC03 | Patient Registration | Validation | 1. `POST /api/auth/register` via Swagger<br>2. Body: `{ "username": "patient1", "email": "patient1@test.com", "password": "Pass@123", "role": "Patient" }` (duplicate username from TC01) | Returns **400** with a message indicating the username already exists. | | |
| S2-PR-TC04 | Patient Registration | Validation | 1. `POST /api/auth/register` via Swagger<br>2. Body: `{ "username": "", "email": "x@test.com", "password": "Pass@123", "role": "Patient" }` | Returns **400** — username is required. | | |
| S2-PR-TC05 | Patient Registration | Edge Case | 1. `POST /api/auth/register` via Swagger<br>2. Body: `{ "username": "hacker", "email": "h@test.com", "password": "Pass@123", "role": "Admin" }` | Returns **400** — public registration as Admin must be rejected. | | |
| S2-PR-TC06 | Patient Registration | Edge Case | 1. Open `/register`<br>2. Enter Password=`abc` (less than 6 characters)<br>3. Click **Register** | Inline error: "Password must be at least 6 characters". No API call made. | | |

---

## Story 2 – Patient Dashboard

| Test ID | Feature | Type | Steps | Expected Result | Pass/Fail | Notes |
|---|---|---|---|---|---|---|
| S2-PD-TC01 | Patient Dashboard | Happy Path | 1. Log in as a Patient user<br>2. Navigate to `http://localhost:5173/patient/dashboard` | Dashboard loads with all 3 widgets (appointment summary, profile summary, recent activity). No console errors. | | |
| S2-PD-TC02 | Patient Dashboard | Happy Path | 1. Log in as Patient<br>2. Call `GET /api/patients/me/summary` in Swagger with Bearer token | Returns **200** with patient summary data (matching what the widget shows). | | |
| S2-PD-TC03 | Patient Dashboard | Validation | 1. Call `GET /api/patients/me/summary` in Swagger **without** Authorization header | Returns **401 Unauthorized**. | | |
| S2-PD-TC04 | Patient Dashboard | Validation | 1. Log in as Patient<br>2. Try `GET /api/patients/me/details` with that Patient token<br>3. Note Patient ID of another patient<br>4. Try `GET /api/patients/{otherId}` with same token | Returns **403 Forbidden** — patient cannot access another patient's data. | | |
| S2-PD-TC05 | Patient Dashboard | Happy Path | 1. Log in as Patient<br>2. Check sidebar navigation links (Dashboard, Profile, etc.)<br>3. Click each link | Each link navigates to the correct page without a white screen or 404. | | |
| S2-PD-TC06 | Patient Dashboard | Edge Case | 1. Log in as Patient who has **no profile created yet** (fresh user, never called `POST /api/patients`)<br>2. Go to `/patient/dashboard` | Dashboard should handle missing profile gracefully — either prompt to create profile or show empty state. No crash or unhandled error. | | |

---

## Story 3 – Doctor Profile

| Test ID | Feature | Type | Steps | Expected Result | Pass/Fail | Notes |
|---|---|---|---|---|---|---|
| S2-DP-TC01 | Doctor Profile | Happy Path | 1. Log in as Doctor<br>2. `POST /api/doctors` with body: `{ "firstName": "Ali", "lastName": "Hassan", "specialization": "Cardiology", "licenseNumber": "LIC-001", "phone": "0771234567", "consultationFee": 1500 }` | Returns **201** with the created doctor profile. | | |
| S2-DP-TC02 | Doctor Profile | Happy Path | 1. Log in as Doctor<br>2. `GET /api/doctors/me` in Swagger with Bearer token | Returns **200** with the doctor's own profile data. | | |
| S2-DP-TC03 | Doctor Profile | Happy Path | 1. Log in as Doctor<br>2. Navigate to `http://localhost:5173/doctor/profile`<br>3. Edit a field (e.g. phone number)<br>4. Click Save | Changes are persisted. Refreshing the page shows the updated value. | | |
| S2-DP-TC04 | Doctor Profile | Validation | 1. `POST /api/doctors` in Swagger<br>2. Body: omit `licenseNumber` | Returns **400** — license number is required. | | |
| S2-DP-TC05 | Doctor Profile | Validation | 1. Log in as Doctor A<br>2. Get Doctor B's `doctorId`<br>3. `GET /api/doctors/{doctorB_id}` with Doctor A's token | Returns **403 Forbidden** — doctor cannot read another doctor's profile. | | |
| S2-DP-TC06 | Doctor Profile | Edge Case | 1. `POST /api/doctors` twice with the same `licenseNumber` | Second request returns **400** — license number must be unique. | | |

---

## Story 4 – Doctor Schedule

| Test ID | Feature | Type | Steps | Expected Result | Pass/Fail | Notes |
|---|---|---|---|---|---|---|
| S2-DS-TC01 | Doctor Schedule | Happy Path | 1. Log in as Doctor (with profile created)<br>2. `PUT /api/doctors/me/schedules` with body: `{ "schedules": [{ "dayOfWeek": "Monday", "startTime": "09:00", "endTime": "17:00", "isAvailable": true, "slotDurationMinutes": 30 }] }` | Returns **200** with the saved schedule. | | |
| S2-DS-TC02 | Doctor Schedule | Happy Path | 1. Log in as Doctor<br>2. Navigate to `http://localhost:5173/doctor/schedule`<br>3. Add Monday 09:00–17:00 and save | Schedule saved. Weekly view at `/doctor/schedule/weekly` reflects the new slot. | | |
| S2-DS-TC03 | Doctor Schedule | Validation | 1. `PUT /api/doctors/me/schedules` in Swagger<br>2. Body: `{ "schedules": [{ "dayOfWeek": "Tuesday", "startTime": "17:00", "endTime": "09:00", "isAvailable": true, "slotDurationMinutes": 30 }] }` (end before start) | Returns **400** — end_time must be after start_time. | | |
| S2-DS-TC04 | Doctor Schedule | Validation | 1. `PUT /api/doctors/me/schedules` with `slotDurationMinutes: 2` | Returns **400** — slot duration must be between 5 and 240 minutes. | | |
| S2-DS-TC05 | Doctor Schedule | Validation | 1. `GET /api/doctors/me/schedules` **without** Authorization header | Returns **401 Unauthorized**. | | |
| S2-DS-TC06 | Doctor Schedule | Edge Case | 1. `PUT /api/doctors/me/schedules` with an empty schedules array: `{ "schedules": [] }` | Returns **200** — all schedules cleared (full replace semantics). Weekly view shows no slots. | | |

---

## Story 5 – Medicine CRUD

| Test ID | Feature | Type | Steps | Expected Result | Pass/Fail | Notes |
|---|---|---|---|---|---|---|
| S2-MC-TC01 | Medicine CRUD | Happy Path | 1. Log in as Admin<br>2. `POST /api/medicines` with body: `{ "medicineName": "Paracetamol", "description": "Pain relief", "manufacturer": "GSK", "unitPrice": 25.50, "stockQuantity": 100 }` | Returns **201** with medicine ID and full data. | | |
| S2-MC-TC02 | Medicine CRUD | Happy Path | 1. Log in as Admin<br>2. Navigate to `http://localhost:5173/admin/medicines`<br>3. Fill in the Add Medicine form and submit | Medicine appears in the list on the same page without a page refresh. | | |
| S2-MC-TC03 | Medicine CRUD | Happy Path | 1. Log in as Admin<br>2. `PUT /api/medicines/{id}` with updated `unitPrice: 30.00` | Returns **200** with updated price. | | |
| S2-MC-TC04 | Medicine CRUD | Validation | 1. `POST /api/medicines` in Swagger<br>2. Body: omit `medicineName` (or set to empty string) | Returns **400** — medicine name is required. | | |
| S2-MC-TC05 | Medicine CRUD | Validation | 1. Log in as **Patient**<br>2. `POST /api/medicines` with Patient Bearer token | Returns **403 Forbidden** — only Admin can create medicines. | | |
| S2-MC-TC06 | Medicine CRUD | Happy Path | 1. Log in as Admin<br>2. `DELETE /api/medicines/{id}` for an existing medicine | Returns **204 No Content**. Subsequent `GET /api/medicines/{id}` returns **404**. | | |
| S2-MC-TC07 | Medicine CRUD | Edge Case | 1. `DELETE /api/medicines/{id}` for a non-existent ID (e.g. 99999) | Returns **404 Not Found**. | | |
| S2-MC-TC08 | Medicine CRUD | Edge Case | 1. Admin opens `/admin/medicines` in browser<br>2. Uses the **Search** box<br>3. Types part of a medicine name | List filters in real time showing only matching medicines. | | |

---

## Story 6 – Medicine Inventory

| Test ID | Feature | Type | Steps | Expected Result | Pass/Fail | Notes |
|---|---|---|---|---|---|---|
| S2-MI-TC01 | Medicine Inventory | Happy Path | 1. Log in as Admin<br>2. `GET /api/medicines/inventory/report` in Swagger | Returns **200** with list of medicines including stock status (`InStock`, `LowStock`, `OutOfStock`). | | |
| S2-MI-TC02 | Medicine Inventory | Happy Path | 1. Admin navigates to `http://localhost:5173/admin/inventory`<br>2. Page loads | All medicines shown with their stock levels. Low-stock items visually highlighted. | | |
| S2-MI-TC03 | Medicine Inventory | Happy Path | 1. `PUT /api/medicines/{id}/stock` with `{ "stockQuantity": 5 }` (below threshold of 20)<br>2. Then call `GET /api/medicines/inventory/report?status=low` | Returns **200** with the updated medicine listed as `LowStock`. | | |
| S2-MI-TC04 | Medicine Inventory | Validation | 1. `PUT /api/medicines/{id}/stock` with `{ "stockQuantity": 0 }` | Returns **200** and stock is set to 0. `GET /api/medicines/inventory/report?status=out` includes this medicine as `OutOfStock`. | | |
| S2-MI-TC05 | Medicine Inventory | Validation | 1. Log in as **Patient**<br>2. `GET /api/medicines/inventory/report` with Patient token | Returns **403 Forbidden**. | | |
| S2-MI-TC06 | Medicine Inventory | Edge Case | 1. `GET /api/medicines/inventory/report?threshold=0` | Threshold normalised to minimum 1. No crash — returns valid report. | | |

---

## Story 7 – Invoice Generation

| Test ID | Feature | Type | Steps | Expected Result | Pass/Fail | Notes |
|---|---|---|---|---|---|---|
| S2-IG-TC01 | Invoice Generation | Happy Path | 1. Log in as Admin<br>2. `POST /api/invoices` with body: `{ "patientId": 1, "invoiceDate": "2026-03-23", "totalAmount": 1500.00, "paidAmount": 0.00 }` | Returns **201** with invoice data; `status` = `"Unpaid"`. | | |
| S2-IG-TC02 | Invoice Generation | Happy Path | 1. Admin navigates to `http://localhost:5173/admin/invoices`<br>2. Fills invoice form and submits | Invoice appears in the invoice list with correct patient name and status. | | |
| S2-IG-TC03 | Invoice Generation | Happy Path | 1. `PUT /api/invoices/{id}` with `{ "paidAmount": 1500.00 }` on an existing invoice | Returns **200**; `status` updated to `"Paid"`. | | |
| S2-IG-TC04 | Invoice Generation | Validation | 1. `POST /api/invoices` without `patientId` | Returns **400** — patient ID is required. | | |
| S2-IG-TC05 | Invoice Generation | Validation | 1. `POST /api/invoices` with `{ "totalAmount": 1000, "paidAmount": 1500, "patientId": 1, "invoiceDate": "2026-03-23" }` (paid > total) | Returns **400** — paid amount cannot exceed total amount. | | |
| S2-IG-TC06 | Invoice Generation | Validation | 1. Log in as **Doctor**<br>2. `POST /api/invoices` with Doctor Bearer token | Returns **403 Forbidden** — only Admin can create invoices. | | |
| S2-IG-TC07 | Invoice Generation | Happy Path | 1. `GET /api/invoices?status=Unpaid` as Admin | Returns **200** with only unpaid invoices. | | |
| S2-IG-TC08 | Invoice Generation | Edge Case | 1. `GET /api/invoices/{id}` with a non-existent ID (e.g. 99999) | Returns **404 Not Found**. | | |
| S2-IG-TC09 | Invoice Generation | Edge Case | 1. `POST /api/invoices` with `totalAmount: 0` and `paidAmount: 0` | Returns **201**; status = `"Unpaid"`. (Zero invoice allowed — valid edge case.) | | |

---

## Story 8 – User Account Management

| Test ID | Feature | Type | Steps | Expected Result | Pass/Fail | Notes |
|---|---|---|---|---|---|---|
| S2-UA-TC01 | User Account Management | Happy Path | 1. Log in as Admin<br>2. `GET /api/users` in Swagger | Returns **200** with list of all users. | | |
| S2-UA-TC02 | User Account Management | Happy Path | 1. Admin navigates to `http://localhost:5173/admin/users`<br>2. Views user list | All users shown with role badges and active/inactive status. | | |
| S2-UA-TC03 | User Account Management | Happy Path | 1. `POST /api/users` as Admin with body: `{ "username": "newdoc", "email": "newdoc@test.com", "password": "Doc@1234", "role": "Doctor" }` | Returns **201** with new user data. | | |
| S2-UA-TC04 | User Account Management | Happy Path | 1. `PUT /api/users/{userId}/status` with `{ "isActive": false }` on a non-admin user | Returns **200**; user's `isActive` = `false`. | | |
| S2-UA-TC05 | User Account Management | Validation | 1. `PUT /api/users/{ownAdminId}/status` with `{ "isActive": false }` using own Admin token | Returns **400** with message: "You cannot deactivate your own account." | | |
| S2-UA-TC06 | User Account Management | Validation | 1. `DELETE /api/users/{ownAdminId}` using own Admin token | Returns **400** with message: "You cannot delete your own account." | | |
| S2-UA-TC07 | User Account Management | Validation | 1. Log in as **Patient**<br>2. `GET /api/users` with Patient token | Returns **403 Forbidden** — patients cannot access user management. | | |
| S2-UA-TC08 | User Account Management | Edge Case | 1. `GET /api/users?role=Doctor` as Admin | Returns **200** with only Doctor-role users. | | |
| S2-UA-TC09 | User Account Management | Edge Case | 1. `DELETE /api/users/{id}` for a non-existent user ID | Returns **404 Not Found**. | | |

---

## Auth Tests (Apply to ALL Modules)

These must be run for Patient, Medicine, and Invoice modules.

| Test ID | Feature | Type | Steps | Expected Result | Pass/Fail | Notes |
|---|---|---|---|---|---|---|
| S2-AUTH-TC01 | Auth – No Token | Validation | Call any protected endpoint (e.g. `GET /api/patients/me`) with **no Authorization header** | Returns **401 Unauthorized** | | |
| S2-AUTH-TC02 | Auth – Wrong Role | Validation | Log in as Patient → call `GET /api/users` (Admin-only route) with Patient Bearer token | Returns **403 Forbidden** | | |
| S2-AUTH-TC03 | Auth – Valid Token | Happy Path | Add valid Bearer token in Swagger Authorize dialog → call `GET /api/auth/profile` | Returns **200** with user profile | | |
| S2-AUTH-TC04 | Auth – Expired Token | Edge Case | Use an access token that has expired (wait for expiry or manually craft one) → call any protected endpoint | Returns **401 Unauthorized** | | |
| S2-AUTH-TC05 | Auth – Tampered Token | Edge Case | Manually alter the JWT payload (change role claim) → call an admin endpoint | Returns **401 Unauthorized** — signature validation fails | | |

---

## Summary

| Story | Test Case IDs | Count | Minimum Met? |
|---|---|---|---|
| Patient Registration | S2-PR-TC01 to TC06 | 6 | ✅ |
| Patient Dashboard | S2-PD-TC01 to TC06 | 6 | ✅ |
| Doctor Profile | S2-DP-TC01 to TC06 | 6 | ✅ |
| Doctor Schedule | S2-DS-TC01 to TC06 | 6 | ✅ |
| Medicine CRUD | S2-MC-TC01 to TC08 | 8 | ✅ |
| Medicine Inventory | S2-MI-TC01 to TC06 | 6 | ✅ |
| Invoice Generation | S2-IG-TC01 to TC09 | 9 | ✅ |
| User Account Management | S2-UA-TC01 to TC09 | 9 | ✅ |
| Auth (cross-cutting) | S2-AUTH-TC01 to TC05 | 5 | ✅ |
| **Total** | | **61** | ✅ (min 24 required) |

---

## Bug Reporting Guide (HMS-284)

When a test case fails, immediately log a Jira bug with:

| Field | What to write |
|---|---|
| **Summary** | Short, specific — e.g. `POST /api/patients returns 500 when email is missing` |
| **Steps to Reproduce** | Exact steps, URL, request body/data used |
| **Expected Result** | What should have happened |
| **Actual Result** | What actually happened; include error message/screenshot |
| **Environment** | `local` or `Azure`; browser name; user account used |

### Priority
| Level | When to use |
|---|---|
| **Critical** | Whole feature completely broken |
| **Major** | Specific scenario fails but feature partially works |
| **Minor** | Cosmetic or small UI issue |

### Bug Assignment
| Module | Assign to |
|---|---|
| Patient module | Ravidu (Developer) |
| Medicine module | Pinithi (DevOps) |
| Invoice / User module | Balasegaram (BA) |
| Doctor module | Yourself |

### Verification
- When a developer marks a bug **Resolved**: re-run the exact same test case.
- If it passes → move to **Done**, add comment: `Verified fixed — [date]`
- If it still fails → **reopen** with comment explaining what still fails.
- **Never close a bug ticket without personally re-testing it.**
