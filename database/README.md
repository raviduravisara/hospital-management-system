# Database Setup (Sprint 1 - HMS-2)

## Prerequisites
- MySQL 8.0+
- MySQL Workbench or MySQL CLI

## Files
- `001_create_database.sql`
- `002_create_tables.sql`
- `003_seed_test_data.sql`
- `004_migrate_doctor_delete_behavior.sql`

## Run Order
1. Run `001_create_database.sql`
2. Run `002_create_tables.sql`
3. Run `003_seed_test_data.sql`

## MySQL CLI Example
```sql
SOURCE database/001_create_database.sql;
SOURCE database/002_create_tables.sql;
SOURCE database/003_seed_test_data.sql;
```

## Existing/Deployed DB Migration (No Data Loss)
If your database is already running with real data, do not rerun `002_create_tables.sql`
because it drops tables. Instead run only:

```sql
SOURCE database/004_migrate_doctor_delete_behavior.sql;
```

This migration changes doctor-related foreign keys so doctor deletion is blocked when
appointments or prescriptions already exist.

## What Gets Created
- Database: `hospital_management`
- Core tables: `Users`, `Patients`, `Doctors`, `Appointments`, `Prescriptions`, `Medicines`, `Prescription_Items`, `Lab_Reports`, `Invoices`, `Payments`
- Sample records: 1 admin user, 1 doctor user, 1 patient user, medicines, one appointment, one invoice

## Important Notes
- Seed user passwords are placeholder BCrypt hashes for initial testing only.
- Replace seed credentials and rotate secrets before production/demo hardening.
