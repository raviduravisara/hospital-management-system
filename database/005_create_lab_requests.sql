USE hospital_management;

CREATE TABLE IF NOT EXISTS Lab_Requests (
    request_id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT NOT NULL,
    doctor_id INT NOT NULL,
    appointment_id INT NULL,
    test_name VARCHAR(150) NOT NULL,
    priority ENUM('Routine', 'Urgent') NOT NULL DEFAULT 'Routine',
    status ENUM('Pending', 'InProgress', 'Completed', 'Cancelled') NOT NULL DEFAULT 'Pending',
    notes TEXT,
    requested_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_lab_requests_patient
        FOREIGN KEY (patient_id) REFERENCES Patients(patient_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_lab_requests_doctor
        FOREIGN KEY (doctor_id) REFERENCES Doctors(doctor_id)
        ON DELETE RESTRICT,
    CONSTRAINT fk_lab_requests_appointment
        FOREIGN KEY (appointment_id) REFERENCES Appointments(appointment_id)
        ON DELETE SET NULL
);

CREATE INDEX idx_lab_requests_doctor_status ON Lab_Requests (doctor_id, status);
CREATE INDEX idx_lab_requests_requested_at ON Lab_Requests (requested_at);
