import React, { useState, useEffect } from "react";
import { Link } from 'react-router-dom';
import "./homecss/header.css";

const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header className={`header ${isScrolled ? "scrolled" : ""}`}>
      <div className="container">
        <div className="logo">
          <img src="/urbanlogo1.png" alt="UrbanDepot Logo" className="logo-img" />
          <h2>UrbanDepot</h2>
        </div>
        <nav className={`nav ${isMobileMenuOpen ? "nav-open" : ""}`}>
          <Link to="/login" className="linksa">Sign In</Link>
          <Link to="/register-place" className="linksa">List your Spot</Link>
          <Link to="/reservation" className="linksa">Book Parking</Link>  
        </nav>

        <button
          className="mobile-menu-toggle"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>
    </header>
  );
};

export default Header;
