import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import DoctorDashboard from './pages/DoctorDashboard';
import DoctorRegistration from './pages/DoctorRegistration';
import DoctorProfile from './pages/DoctorProfile';
import DoctorScheduleSetup from './pages/DoctorScheduleSetup';
import DoctorWeeklySchedule from './pages/DoctorWeeklySchedule';
import DoctorAppointments from './pages/DoctorAppointments';
import DoctorConsultationNotes from './pages/DoctorConsultationNotes';
import DoctorPatientRecords from './pages/DoctorPatientRecords';
import AdminDashboard from './pages/AdminDashboard';
import AdminAppointments from './pages/AdminAppointments';
import Medicines from './pages/Medicines';
import InventoryManagement from './pages/InventoryManagement';
import Invoices from './pages/Invoices';
import Users from './pages/Users';
import PatientDashboard from './pages/PatientDashboard';
import PatientRegistration from './pages/PatientRegistration';
import PatientProfile from './pages/PatientProfile';
import PatientAppointments from './pages/PatientAppointments';
import PatientLabReports from './pages/PatientLabReports';
import PatientPrescriptions from './pages/PatientPrescriptions';
import PatientBilling from './pages/PatientBilling';
import DoctorPrescriptions from './pages/DoctorPrescriptions';

function App() {
  return (
    <Router>
      <Routes>
        {/* Public routes wrapped inside Layout */}
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="admin/dashboard" element={<AdminDashboard />} />
          <Route path="admin/appointments" element={<AdminAppointments />} />
          <Route path="admin/medicines" element={<Medicines />} />
          <Route path="admin/inventory" element={<InventoryManagement />} />
          <Route path="admin/invoices" element={<Invoices />} />
          <Route path="admin/users" element={<Users />} />
          <Route path="doctor/dashboard" element={<DoctorDashboard />} />
          <Route path="doctor/register" element={<DoctorRegistration />} />
          <Route path="doctor/profile" element={<DoctorProfile />} />
          <Route path="doctor/schedule" element={<DoctorScheduleSetup />} />
          <Route path="doctor/schedule/weekly" element={<DoctorWeeklySchedule />} />
          <Route path="doctor/appointments" element={<DoctorAppointments />} />
          <Route path="doctor/consultation-notes" element={<DoctorConsultationNotes />} />
          <Route path="doctor/patient-records" element={<DoctorPatientRecords />} />
          <Route path="patient/dashboard" element={<PatientDashboard />} />
          <Route path="patient/register" element={<PatientRegistration />} />
          <Route path="patient/profile" element={<PatientProfile />} />
          <Route path="patient/appointments" element={<PatientAppointments />} />
          <Route path="patient/lab-reports" element={<PatientLabReports />} />
          <Route path="patient/prescriptions" element={<PatientPrescriptions />} />
          <Route path="patient/billing" element={<PatientBilling />} />
          <Route path="doctor/prescriptions" element={<DoctorPrescriptions />} />
          {/* Feature routes - uncomment after adding the page components */}
          {/* <Route path="prescriptions" element={<Prescriptions />} /> */}
          {/* <Route path="medicines" element={<Medicines />} /> */}
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
