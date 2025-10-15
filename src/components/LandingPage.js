import React, { useEffect, useCallback, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './cssfiles/LandingPage.css';
import Typed from 'typed.js';

const LandingPage = () => {
  const navigate = useNavigate();
  const [fadeOut, setFadeOut] = useState(false);
  const el = useRef(null);
  const mainContainerRef = useRef(null); // Create a ref for the main container

  useEffect(() => {
    const options = {
      strings: ["Roaming endlessly to find parking?!"],
      typeSpeed: 50,
      backSpeed: 25,
      loop: true,
    };

    const typed = new Typed(el.current, options);

    return () => {
      typed.destroy();
    };
  }, []);

  const handleNavigation = useCallback(() => {
    setFadeOut(true);
    setTimeout(() => navigate('/home1'), 1200); // Match this timeout to the animation duration
  }, [navigate]);

  const handleKeyDown = useCallback((event) => {
    if (event.key === 'Enter') {
      handleNavigation();
    }
  }, [handleNavigation]);

  const handleTouchStart = useCallback((event) => {
    // Prevent default to avoid unwanted behaviors
    event.preventDefault();
    handleNavigation();
  }, [handleNavigation]);

  const handleClick = useCallback((event) => {
    // Only trigger if clicking on the main container, not the iframe
    if (event.target === mainContainerRef.current || event.target.closest('.overlay-text')) {
      handleNavigation();
    }
  }, [handleNavigation]);

  useEffect(() => {
    // Attach keydown event listener for desktop
    window.addEventListener('keydown', handleKeyDown);
    
    // Attach touch events for mobile
    const container = mainContainerRef.current;
    if (container) {
      container.addEventListener('touchstart', handleTouchStart, { passive: false });
      container.addEventListener('click', handleClick);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (container) {
        container.removeEventListener('touchstart', handleTouchStart);
        container.removeEventListener('click', handleClick);
      }
    };
  }, [handleKeyDown, handleTouchStart, handleClick]);

  const handleContainerFocus = () => {
    if (mainContainerRef.current) {
      mainContainerRef.current.focus(); // Refocus the main container
      console.log("Container focused for keyboard navigation."); // Log focus action
    }
  };

  const handleIframeClick = (event) => {
    event.preventDefault(); // Prevent the iframe from capturing focus
    event.stopPropagation(); // Stop event bubbling
    if (mainContainerRef.current) {
      mainContainerRef.current.focus(); // Refocus the main container
      console.log("Iframe clicked; refocusing container."); // Log action
    }
  };

  return (
    <div
      className={`main ${fadeOut ? 'fade-out' : ''}`}
      onFocus={handleContainerFocus} // Handle focus for keyboard navigation
      ref={mainContainerRef} // Attach the ref to the main container
      tabIndex="0" // Allow the div to be focusable
      style={{ width: '100vw', height: '100vh', position: 'relative', cursor: 'pointer' }} // Make it cover the viewport and show pointer cursor
    >
      <div className="overlay-text">
        <h1 ref={el}></h1> {/* Using ref for typing effect */}
        <p className="enter-instruction">
          <span className="desktop-instruction">Press Enter</span>
          <span className="mobile-instruction">Tap anywhere</span>
          {" "}to continue
        </p>
      </div>
      <div className="background-iframe" style={{ width: '100%', height: '100%' }}>
        <iframe
          src="https://my.spline.design/travellinginfinitecopycopycopycopy-825b5dec4e3080b4bea5ff4974857513/"
          style={{ width: '100%', height: '100%', border: 'none' }}
          title="Spline 3D Scene"
          onMouseDown={handleIframeClick} // Handle mouse down on iframe
        ></iframe>
      </div>
    </div>
  );
};

export default LandingPage;
