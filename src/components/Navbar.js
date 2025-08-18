// src/components/Navbar.js
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { auth } from "../firebaseConfig";
import './cssfiles/Navbar.css';
import '@fortawesome/fontawesome-free/css/all.min.css';

import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const Navbar = ({ userEmail }) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleLogout = async () => {
    const confirmLogout = window.confirm("Do you want to log out?");
    if (confirmLogout) {
      try {
        await auth.signOut();
        alert("Logged out successfully!");
        window.location.href = '/';
      } catch (error) {
        alert(`Logout Error: ${error.message}`);
      }
    }
  };

  const toggleDropdown = () => {
    setDropdownOpen(!dropdownOpen);
  };

  const handleLinkClick = () => {
    setDropdownOpen(false);
  };

  return (
    <nav className="urban-navbar">
      <div className="urban-navbar-logo">
        {/* Wrap the logo in Link to make it clickable */}
        <Link to="/map">
          <img src="/urbanlogo1.png" alt="Urban Depot Logo" className="urban-logo" />
        </Link>
        <h1 className="urban-navbar-title">urbandepot</h1>
      </div>
      <div className="urban-navbar-links">
        <Link to="/map" className="no-hover" onClick={handleLinkClick}>
          <i className="fas fa-home"></i> 
        </Link>
        <Link to="/register-place" onClick={handleLinkClick}>List Your Space</Link>
        <div className="urban-navbar-dropdown">
          <div className="urban-hamburger-icon" onClick={toggleDropdown}>
            <i className="fas fa-bars"></i>
          </div>
          {dropdownOpen && (
  <div className="urban-dropdown-menu">
    <Link to="/profile" onClick={handleLinkClick}>
      <i className="fas fa-user" style={{ color: 'white', marginRight: '12px' }}></i> Profile
    </Link>
    <Link to="/contact" onClick={handleLinkClick}>
      <i className="fas fa-envelope" style={{ color: 'white', marginRight: '12px' }}></i> Contact
    </Link>
    <Link to="/faq" onClick={handleLinkClick}>
      <i className="fas fa-question-circle" style={{ color: 'white', marginRight: '12px' }}></i> FAQ
    </Link>
    <button className="urban-navbar-logout-btn" onClick={handleLogout}>
      <i className="fas fa-sign-out-alt" style={{ color: 'white', marginRight: '12px' }}></i> Logout
    </button>
  </div>
)}
</div>
</div>
      {/* renders the email */}
      {userEmail && (
        <div className="urban-navbar-user-info">
          <span className="urban-navbar-user-email">{userEmail}</span>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
