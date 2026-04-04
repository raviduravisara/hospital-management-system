USE hospital_management;

CREATE TABLE IF NOT EXISTS Consultation_Notes (
    note_id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT NOT NULL,
    doctor_id INT NOT NULL,
    appointment_id INT NULL,
    consultation_date DATE NOT NULL,
    chief_complaint VARCHAR(500) NULL,
    diagnosis TEXT NULL,
    treatment_plan TEXT NULL,
    notes TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_consultation_notes_patient
        FOREIGN KEY (patient_id) REFERENCES Patients(patient_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_consultation_notes_doctor
        FOREIGN KEY (doctor_id) REFERENCES Doctors(doctor_id)
        ON DELETE RESTRICT,
    CONSTRAINT fk_consultation_notes_appointment
        FOREIGN KEY (appointment_id) REFERENCES Appointments(appointment_id)
        ON DELETE SET NULL
);

CREATE INDEX idx_consultation_notes_doctor_patient_date
    ON Consultation_Notes (doctor_id, patient_id, consultation_date);
