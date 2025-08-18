import React, { useState } from "react";
import { auth, googleProvider, db } from "../firebaseConfig"; // Import db from firebaseConfig
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signInWithPopup,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore"; // Use setDoc to create a document
import { useNavigate } from "react-router-dom";
import '../App.css';

const SignUp = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      alert("Passwords do not match!");
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Save user data in Firestore using email as the document ID
      await setDoc(doc(db, "users", email), {
        uid: user.uid,  // Store the user UID
        email: user.email, // Initialize with an empty array
      });

      await sendEmailVerification(user);
      alert("Signup successful! Please check your email for verification.");
      navigate("/login");
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  };

  const handleGoogleSignUp = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      // Save user data in Firestore using email as the document ID
      await setDoc(doc(db, "users", user.email), {
        uid: user.uid,  // Store the user UID
        email: user.email,
        registeredPlaces: [], // Initialize with an empty array
      });

      alert("Google signup successful!");
      navigate("/"); // Redirect to homepage
    } catch (error) {
      alert(`Google Sign-In Error: ${error.message}`);
    }
  };

  return (
    <div className="form-container">
      <h2>Sign Up</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Confirm Password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />
        <button type="submit">SIGN UP</button>
      </form>
      <button className="google-btn" onClick={handleGoogleSignUp}>
        Continue with Google
      </button>
    </div>
  );
};

export default SignUp;
