USE hospital_management;

/*
  Migration purpose:
  - Prevent deleting doctors when appointments or prescriptions reference them.
  - Keep existing production data intact (no table drops).
*/

ALTER TABLE Appointments
  DROP FOREIGN KEY fk_appointments_doctor;

ALTER TABLE Appointments
  ADD CONSTRAINT fk_appointments_doctor
    FOREIGN KEY (doctor_id) REFERENCES Doctors(doctor_id)
    ON DELETE RESTRICT;

ALTER TABLE Prescriptions
  DROP FOREIGN KEY fk_prescriptions_doctor;

ALTER TABLE Prescriptions
  ADD CONSTRAINT fk_prescriptions_doctor
    FOREIGN KEY (doctor_id) REFERENCES Doctors(doctor_id)
    ON DELETE RESTRICT;
