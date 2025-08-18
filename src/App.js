import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { auth } from './firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import Navbar from './components/Navbar';
import Map from './components/Map';
import RazorpayPayment from './components/RazorpayPayment';
import RegisterPlace from './components/RegisterPlace';
import ReservationForm from './components/ReservationForm';
import SignUp from './components/SignUp';
import Login from './components/Login';
import Availability from './components/Availability';
import Profile from './components/Profile';
import Ticket from './components/Ticket';
import FetchPlaceName from './components/FetchPlaceName';
import LandingPage from './components/LandingPage';
import AdminPage from './components/AdminPage';
import AdminSidebar from './components/AdminSidebar';
// import Home from './components/Home';
// import NavHome from './components/NavHome';
import Home1 from './components/Home1';
// import CardSlider from './components/CardSlider';
import FAQ from './components/Faq';
import Contact from './components/Contact';
import ProgressBar from './components/ProgressBar';
import ProtectedRoute from "./components/ProtectedRoute";


const App = () => {
  const [userEmail, setUserEmail] = useState("");
  const location = useLocation();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserEmail(user.email);
      } else {
        setUserEmail("");
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <div>
      {/* Conditionally render Navbar and NavHome based on path */}
      {/* {location.pathname === '/home' ? (
        <NavHome /> // Render NavHome only on /home page
      ) : location.pathname !== '/' && location.pathname !== '/login' && location.pathname !== '/adminpage' ? (
        <Navbar /> // Render Navbar on all other pages except /, /login, /home, and /adminpage
      ) : null} */}
      {/* Conditionally render Navbar on all pages except /, /login, /home1, and /adminpage */}
      {location.pathname !== '/' &&
      location.pathname !== '/login' &&
      location.pathname !== '/home1' &&
      location.pathname !== '/adminpage' && (
        <Navbar />
      )}
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/payment" element={<ProtectedRoute><RazorpayPayment /></ProtectedRoute>} />
        <Route path="/register-place" element={<ProtectedRoute><RegisterPlace /></ProtectedRoute>} />
        <Route path="/reservation" element={<ProtectedRoute><ReservationForm /></ProtectedRoute>} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/login" element={<Login />} />
        <Route path="/demo" element={<Availability placeId="zGK4ChrgmCIEpU88d4dz" />} />
        <Route path="/profile" element={<ProtectedRoute><Profile /> </ProtectedRoute>} />
        <Route path="/ticket" element={<Ticket/>} />
        <Route path="/fetch" element={<FetchPlaceName />} />
        <Route path='/map' element={<ProtectedRoute><Map /></ProtectedRoute>} />
        <Route path='/adminpage' element={<AdminPage />} />
        <Route path='/adminside' element={<ProtectedRoute><AdminSidebar /></ProtectedRoute>} />
        <Route path='/home1' element={<Home1 />} />
        {/* <Route path='/transition' element={<TransitionSection />} /> */}
        {/* <Route path='/card' element={<CardSlider />} /> */}
        <Route path='/faq' element={<FAQ />} />      
        <Route path='/contact' element={<Contact />} />   
        <Route path='/prog' element={<ProgressBar />} />


      </Routes>
    </div>
  );
};

const RootApp = () => (
  <Router>
    <App />
  </Router>
);

export default RootApp;