USE hospital_management;

-- NOTE: For sprint setup only. Replace passwords using your auth flow later.
-- These are sample BCrypt hashes (all map to a known demo password).
INSERT INTO Users (username, email, password_hash, role, is_active) VALUES
('admin1', 'admin@hospital.local', '$2a$12$wHf4S4V7M8b8sQmS7wY5Du2xS6bQk6rGfG7J2WQhN8P0xG8Qx8h4a', 'Admin', TRUE),
('doctor1', 'doctor@hospital.local', '$2a$12$wHf4S4V7M8b8sQmS7wY5Du2xS6bQk6rGfG7J2WQhN8P0xG8Qx8h4a', 'Doctor', TRUE),
('patient1', 'patient@hospital.local', '$2a$12$wHf4S4V7M8b8sQmS7wY5Du2xS6bQk6rGfG7J2WQhN8P0xG8Qx8h4a', 'Patient', TRUE);

INSERT INTO Doctors (user_id, first_name, last_name, specialization, license_number, phone, consultation_fee)
VALUES
((SELECT user_id FROM Users WHERE username = 'doctor1'), 'John', 'Fernando', 'Cardiology', 'DOC-1001', '0771234567', 4500.00);

INSERT INTO Patients (user_id, first_name, last_name, date_of_birth, gender, phone, address, blood_group, emergency_contact)
VALUES
((SELECT user_id FROM Users WHERE username = 'patient1'), 'Nimal', 'Perera', '1995-06-14', 'Male', '0712345678', 'Colombo', 'O+', '0711111111');

INSERT INTO Medicines (medicine_name, description, manufacturer, unit_price, stock_quantity) VALUES
('Paracetamol 500mg', 'Pain and fever relief', 'ABC Pharma', 12.50, 500),
('Amoxicillin 250mg', 'Antibiotic capsule', 'HealthCare Labs', 25.00, 300),
('Atorvastatin 10mg', 'Cholesterol control', 'MediCore', 40.00, 200);

INSERT INTO Appointments (patient_id, doctor_id, appointment_date, appointment_time, status, reason)
VALUES
(
  (SELECT patient_id FROM Patients WHERE first_name = 'Nimal' AND last_name = 'Perera'),
  (SELECT doctor_id FROM Doctors WHERE license_number = 'DOC-1001'),
  CURDATE(),
  '10:00:00',
  'Confirmed',
  'Initial cardiology consultation'
);

INSERT INTO Invoices (patient_id, appointment_id, invoice_date, total_amount, paid_amount, status, created_by_user_id)
VALUES
(
  (SELECT patient_id FROM Patients WHERE first_name = 'Nimal' AND last_name = 'Perera'),
  (SELECT appointment_id FROM Appointments ORDER BY appointment_id DESC LIMIT 1),
  CURDATE(),
  4500.00,
  0.00,
  'Unpaid',
  (SELECT user_id FROM Users WHERE username = 'admin1')
);
