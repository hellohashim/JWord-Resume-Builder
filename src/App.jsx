import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navigation/Navbar';
import Navbar2 from './components/Navigation/Navbar2'; 
import Home from './pages/Home/Home';
import Login from './pages/Auth/Login';
import Signup from './pages/Auth/Signup';
import Account from './pages/Account/AccountDetails';
import JobBuilder from './pages/JobBuilder/JobBuilder'; 
import SavedJobs from './pages/SavedJobs/SavedJobs'; 
import ResultDashboard from './pages/ResultDashboard/ResultDashboard'; // <-- ADDED THIS IMPORT

// --- THE BOUNCER COMPONENT ---
const ProtectedRoute = ({ children }) => {
  const isAuthenticated = !!localStorage.getItem('token');
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

function App() {
  return (
    <BrowserRouter>
      <Navbar /> 
      <Navbar2 />
      
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        
        {/* Protected Routes */}
        <Route 
          path="/account" 
          element={<ProtectedRoute><Account /></ProtectedRoute>}
        />
        
        <Route 
          path="/build" 
          element={<ProtectedRoute><JobBuilder /></ProtectedRoute>}
        />

        {/* <-- ADDED SAVED JOBS ROUTE --> */}
        <Route 
          path="/saved-jobs" 
          element={<ProtectedRoute><SavedJobs /></ProtectedRoute>}
        />

        {/* <-- ADDED RESULT DASHBOARD ROUTE (Crucial for the AI output) --> */}
        <Route 
          path="/dashboard/:jobId" 
          element={<ProtectedRoute><ResultDashboard /></ProtectedRoute>}
        />

      </Routes>
    </BrowserRouter>
  );
}

export default App;