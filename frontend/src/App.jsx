import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import DoctorDashboard from './pages/DoctorDashboard';
import AdminDashboard from './pages/AdminDashboard';
import PatientDashboard from './pages/PatientDashboard';
// TODO: Uncomment these imports once the page components are added to src/pages/
// import Prescriptions from './pages/Prescriptions';
// import Medicines from './pages/Medicines';

function App() {
  return (
    <Router>
      <Routes>
        {/* Public routes wrapped inside Layout */}
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/login" replace />} />
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="admin/dashboard" element={<AdminDashboard />} />
          <Route path="doctor/dashboard" element={<DoctorDashboard />} />
          <Route path="patient/dashboard" element={<PatientDashboard />} />
          {/* Feature routes – uncomment after adding the page components */}
          {/* <Route path="prescriptions" element={<Prescriptions />} /> */}
          {/* <Route path="medicines" element={<Medicines />} /> */}
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
