import React, { useState, useEffect } from "react";
import {
  auth,
  googleProvider
} from "../firebaseConfig";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  signInWithPopup,
  onAuthStateChanged,
} from "firebase/auth";
import { useNavigate } from "react-router-dom";
import styles from './cssfiles/Login.css';
import 'boxicons/css/boxicons.min.css';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';


const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [currentUserEmail, setCurrentUserEmail] = useState(null);
  const [isSignUp, setIsSignUp] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const navigate = useNavigate();

  // Admin credentials
  const adminEmail = "admin@gmail.com";
  const adminPassword = "123";

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) setCurrentUserEmail(user.email);
      else setCurrentUserEmail(null);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (email === adminEmail && password === adminPassword) {
      alert("Admin login successful!");
      navigate("/adminpage");
      return;
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);

      if (!userCredential.user.emailVerified) {
        alert("Please verify your email before logging in.");
        return;
      }

      const token = await userCredential.user.getIdToken();
      console.log("✅ ID Token:", token);

      // Test protected route
      const response = await fetch("http://localhost:5000/api/protected", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const data = await response.json();
      console.log("✅ Backend Response:", data);

      alert("Login successful!");
      navigate("/map");

    } catch (error) {
      alert(`Login Error: ${error.message}`);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      alert("Passwords do not match!");
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await sendEmailVerification(userCredential.user);
      alert("Signup successful! Please check your email for verification.");
      navigate("/login");
    } catch (error) {
      alert(`Signup Error: ${error.message}`);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    try {
      await sendPasswordResetEmail(auth, email);
      alert("Password reset email sent! Check your inbox.");
      setShowForgotPassword(false);
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const token = await result.user.getIdToken();
      console.log("✅ Google Login Token:", token);

      // Optional: send to backend
      const response = await fetch("http://localhost:5000/api/protected", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const data = await response.json();
      console.log("✅ Backend Google Login Response:", data);

      alert("Google login successful!");
      navigate("/map");

    } catch (error) {
      alert(`Google Login Error: ${error.message}`);
    }
  };

  return (
    <div className="login-page" style={{
    backgroundImage: `url("/grey3.jpg")`}}>
      <ToastContainer position="top-right" autoClose={5000} hideProgressBar={false} />

      <div className={`form-container ${isSignUp ? "show-signup" : "show-login"}`}>
        <div className="col col-1">
          <div className="image-layer" >
            <img src="car.png" className="car-bg" />
            
          </div>
          <p className="words">Few Seconds Away From Solving Parking Issue!</p>
        </div>
        <div className="col col-2">
          <div className="btn-box">
            <button className={`btn ${!isSignUp ? "btn-1" : ""}`} onClick={() => setIsSignUp(false)}>
              LOG IN
            </button>
            <button className={`btn ${isSignUp ? "btn-2" : ""}`} onClick={() => setIsSignUp(true)}>
              SIGN UP
            </button>
          </div>

          {/* SIGN UP FORM */}
          <div className={`register-form ${isSignUp ? "active" : ""}`}>
            <div className="form-title"><span>SIGN UP</span></div>
            <form onSubmit={handleSignUp}>
              <div className="form-inputs">
                <div className="input-box">
                  <input
                    className="input-field"
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                  <i className="bx bx-envelope icon"></i>
                </div>
                <div className="input-box">
                  <input
                    className="input-field"
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <i className="bx bx-lock-alt icon"></i>
                </div>
                <div className="input-box">
                  <input type="password" placeholder="Confirm Password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
                  <i className="bx bx-lock-alt icon"></i>
                </div>
                <button className="input-submit" type="submit">
                  <span>Sign Up</span>
                  <i className="bx bx-right-arrow-alt"></i>
                </button>
              </div>
            </form>
            <button className="google-btn" onClick={handleGoogleLogin}>
              <span className="google-icon"><i className="bx bxl-google"></i></span>
              <span>Continue with Google</span>
            </button>
          </div>

          {/* LOGIN FORM */}
          <div className={`login-form ${!isSignUp ? "active" : ""}`}>
            <div className="form-title"><span>LOGIN</span></div>
            <form onSubmit={handleLogin}>
              <div className="form-inputs">
                <div className="input-box">
                  <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                  <i className="bx bx-envelope icon"></i>
                </div>
                <div className="input-box">
                  <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                  <i className="bx bx-lock-alt icon"></i>
                </div>
                <button className="input-submit" type="submit">
                  <span>LOG IN</span>
                  <i className="bx bx-right-arrow-alt"></i>
                </button>
              </div>
            </form>
            <button className="google-btn" onClick={handleGoogleLogin}>
              <span className="google-icon"><i className="bx bxl-google"></i></span>
              <span>Continue with Google</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

};


export default Login;
