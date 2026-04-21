# Manual Testing Guide — Sprint 2
**Modules:** Patient · Medicine · Invoice
**Tools:** Swagger UI → `http://localhost:5041/swagger` | Browser → `http://localhost:5173`
**Date:** 2026-03-23

---

## Setup Before Testing

- [ ] Backend running: `dotnet run --project backend/HospitalAPI/HospitalAPI.csproj`
- [ ] Frontend running: `cd frontend && npm run dev`
- [ ] DB seeded (run `database/003_seed_test_data.sql`)
- [ ] Admin token obtained via `POST /api/auth/login` with admin credentials
- [ ] Patient token obtained via `POST /api/auth/login` with a patient account

---

## Module 1 — Patient

### 1.1 API Tests (Swagger)

> Add Bearer token in Swagger: **Authorize** → paste `<access_token>`

- [ ] **TC-P01 | Happy Path** — `POST /api/patients` with valid body
  ```json
  { "firstName":"Amal","lastName":"Perera","dateOfBirth":"1990-05-10",
    "gender":"Male","phone":"0771234567","address":"Colombo",
    "bloodGroup":"O+","emergencyContact":"0779876543","userId":null }
  ```
  ✅ Expected: **201 Created** with `patientId`

- [ ] **TC-P02 | Validation** — `POST /api/patients` with missing required fields (empty body `{}`)
  ✅ Expected: **400 Bad Request**

- [ ] **TC-P03 | Happy Path** — `GET /api/patients/{id}` with valid `patientId`
  ✅ Expected: **200 OK** with patient data

- [ ] **TC-P04 | Not Found** — `GET /api/patients/99999`
  ✅ Expected: **404 Not Found**

- [ ] **TC-P05 | Happy Path** — `PUT /api/patients/{id}` to update phone number
  ✅ Expected: **200 OK** with updated data

- [ ] **TC-P06 | Happy Path** — `DELETE /api/patients/{id}`
  ✅ Expected: **204 No Content**; subsequent `GET` returns 404

- [ ] **TC-P07 | Auth** — `GET /api/patients/me` with **no Authorization header**
  ✅ Expected: **401 Unauthorized**

- [ ] **TC-P08 | RBAC** — `GET /api/patients/{otherPatientId}` using a **Patient** token
  ✅ Expected: **403 Forbidden**

- [ ] **TC-P09 | Happy Path** — `GET /api/patients/me/summary` with Patient token
  ✅ Expected: **200 OK** with dashboard summary

- [ ] **TC-P10 | Happy Path** — `GET /api/patients/me/details` with Patient token
  ✅ Expected: **200 OK** with full details

### 1.2 UI Tests (Browser)

- [ ] **TC-UI-P01** — Navigate to `/patient/register`; fill all fields; submit
  ✅ Expected: Patient profile created; no error toasts

- [ ] **TC-UI-P02** — Submit registration form with **empty fields**
  ✅ Expected: Inline validation errors appear; no API call made

- [ ] **TC-UI-P03** — Go to `/patient/profile`; change a field; click Save
  ✅ Expected: Success message; page refresh shows updated value

- [ ] **TC-UI-P04** — Log in as Patient; open `/patient/dashboard`
  ✅ Expected: All 3 widgets load; no console errors (F12)

- [ ] **TC-UI-P05** — Click every link in the patient sidebar
  ✅ Expected: Each link navigates to the correct page; no blank/white screens

---

## Module 2 — Medicine

### 2.1 API Tests (Swagger — Admin token required)

- [ ] **TC-M01 | Happy Path** — `POST /api/medicines`
  ```json
  { "medicineName":"Paracetamol","description":"Pain relief",
    "manufacturer":"GSK","unitPrice":25.50,"stockQuantity":100 }
  ```
  ✅ Expected: **201 Created** with `medicineId`

- [ ] **TC-M02 | Validation** — `POST /api/medicines` without `medicineName`
  ✅ Expected: **400 Bad Request**

- [ ] **TC-M03 | Happy Path** — `GET /api/medicines`
  ✅ Expected: **200 OK** — JSON array of medicines

- [ ] **TC-M04 | Search** — `GET /api/medicines?search=Para`
  ✅ Expected: **200 OK** — only medicines whose name contains "Para"

- [ ] **TC-M05 | Happy Path** — `PUT /api/medicines/{id}` with updated `unitPrice`
  ✅ Expected: **200 OK** with updated price

- [ ] **TC-M06 | Not Found** — `PUT /api/medicines/99999`
  ✅ Expected: **404 Not Found** or **400**

- [ ] **TC-M07 | Stock Update** — `PUT /api/medicines/{id}/stock` with `{ "stockQuantity": 5 }`
  ✅ Expected: **200 OK**; stock set to 5

- [ ] **TC-M08 | Zero Stock** — `PUT /api/medicines/{id}/stock` with `{ "stockQuantity": 0 }`
  ✅ Expected: **200 OK**; inventory report marks item as `OutOfStock`

- [ ] **TC-M09 | Happy Path** — `DELETE /api/medicines/{id}`
  ✅ Expected: **204 No Content**; `GET /api/medicines/{id}` → 404

- [ ] **TC-M10 | RBAC** — `POST /api/medicines` using **Patient** token
  ✅ Expected: **403 Forbidden**

### 2.2 UI Tests (Browser — Admin account)

- [ ] **TC-UI-M01** — Navigate to `/admin/medicines`; verify list loads
  ✅ Expected: Table shows all medicines; no console errors

- [ ] **TC-UI-M02** — Fill Add Medicine form; submit
  ✅ Expected: New medicine appears in the table

- [ ] **TC-UI-M03** — Type in the **Search** box
  ✅ Expected: Table filters in real time; partial name matches work

- [ ] **TC-UI-M04** — Navigate to `/admin/inventory`
  ✅ Expected: All medicines shown with stock levels; low-stock rows highlighted

---

## Module 3 — Invoice

### 3.1 API Tests (Swagger — Admin token required)

- [ ] **TC-I01 | Happy Path** — `POST /api/invoices`
  ```json
  { "patientId":1,"appointmentId":null,"invoiceDate":"2026-03-23",
    "totalAmount":1500.00,"paidAmount":0.00 }
  ```
  ✅ Expected: **201 Created**; `status` = `"Unpaid"`

- [ ] **TC-I02 | Validation** — `POST /api/invoices` without `patientId`
  ✅ Expected: **400 Bad Request**

- [ ] **TC-I03 | Validation** — `POST /api/invoices` with `paidAmount > totalAmount`
  ✅ Expected: **400 Bad Request** — "Paid amount cannot exceed total amount"

- [ ] **TC-I04 | Happy Path** — `GET /api/invoices/{id}` with valid ID
  ✅ Expected: **200 OK** with invoice data + patient name

- [ ] **TC-I05 | Not Found** — `GET /api/invoices/99999`
  ✅ Expected: **404 Not Found**

- [ ] **TC-I06 | Status Filter** — `GET /api/invoices?status=Unpaid`
  ✅ Expected: **200 OK** — only unpaid invoices returned

- [ ] **TC-I07 | Update to Paid** — `PUT /api/invoices/{id}` setting `paidAmount = totalAmount`
  ✅ Expected: **200 OK**; `status` becomes `"Paid"`

- [ ] **TC-I08 | Partial Payment** — `PUT /api/invoices/{id}` with `paidAmount` < `totalAmount`
  ✅ Expected: **200 OK**; `status` = `"Partial"`

- [ ] **TC-I09 | Happy Path** — `DELETE /api/invoices/{id}`
  ✅ Expected: **204 No Content**

- [ ] **TC-I10 | RBAC** — `POST /api/invoices` using **Doctor** token
  ✅ Expected: **403 Forbidden**

### 3.2 UI Tests (Browser — Admin account)

- [ ] **TC-UI-I01** — Navigate to `/admin/invoices`; verify invoice list loads
  ✅ Expected: Table with patient names, amounts, status

- [ ] **TC-UI-I02** — Fill invoice form and submit
  ✅ Expected: New invoice appears in the list with status "Unpaid"

- [ ] **TC-UI-I03** — Filter list by status
  ✅ Expected: Only matching invoices shown

---

## Cross-Module Auth Tests

| # | Action | Expected |
|---|---|---|
| AUTH-01 | Call any protected API with **no token** | **401 Unauthorized** |
| AUTH-02 | Patient token calls `GET /api/users` (Admin-only) | **403 Forbidden** |
| AUTH-03 | Valid Admin Bearer token in Swagger → any endpoint | **200 OK** |
| AUTH-04 | Use an **expired** access token | **401 Unauthorized** |
| AUTH-05 | Tamper JWT payload (change `role` claim) | **401 Unauthorized** |

---

## Bug Report Template (HMS-284)

Copy this template into Jira when a test case fails:

```
**Summary:** <short specific title, e.g. "POST /api/patients returns 500 when email is missing">

**Steps to Reproduce:**
1. <Step 1 — exact URL, tool used (Swagger / Browser)>
2. <Step 2 — exact request body / UI action>
3. <Step 3>

**Expected Result:**
<What should have happened — HTTP status, message, UI behaviour>

**Actual Result:**
<What actually happened — include full error message, screenshot, or response body>

**Environment:**
- Server: local / Azure
- Browser: Chrome 122 / Firefox 124
- User Account: admin@hospital.local / patient role
- Build / branch: main

**Priority:** Critical / Major / Minor

**Assign To:**
- Patient bugs   → Ravidu
- Medicine bugs  → Pinithi
- Invoice / User → Balasegaram
- Doctor bugs    → [You]
```

---

## Fix Verified Comment Template

When a developer marks a bug **Resolved**, re-run the exact test case.

**If it passes — add this comment and move to Done:**
```
✅ Fix Verified — [2026-03-23]
Re-ran test case <TC-ID> on local / Azure.
Result: PASS — <confirmation, e.g. "POST /api/patients now returns 201 correctly">
Closing ticket.
```

**If it still fails — reopen and add:**
```
❌ Fix Verification Failed — [2026-03-23]
Re-ran test case <TC-ID> on local / Azure.
Result: FAIL — <describe what still fails + error message>
Reopening ticket. Please review.
```

> **Rule:** Never close a bug ticket without personally re-running the failing test case.
