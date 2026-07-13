import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navigation/Navbar';
import Navbar2 from './components/Navigation/Navbar2'; // <-- FIXED: Renamed to Navbar2
import Home from './pages/Home/Home';
import Login from './pages/Auth/Login';
import Signup from './pages/Auth/Signup';
import Account from './pages/Account/AccountDetails';

// --- THE BOUNCER COMPONENT ---
// This checks if a token exists. If yes, it renders the page. If no, it redirects to /login.
const ProtectedRoute = ({ children }) => {
  const isAuthenticated = !!localStorage.getItem('token');
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

function App() {
  return (
    <BrowserRouter>
      {/* You can stack your navbars here so they both appear at the top */}
      <Navbar /> 
      <Navbar2 />
      
      <Routes>
        {/* Public Routes - Anyone can visit these */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        
        {/* Protected Routes - Only logged-in users can visit these */}
        <Route 
          path="/account" 
          element={
            <ProtectedRoute>
              <Account />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;