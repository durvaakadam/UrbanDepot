import React, { useEffect, useState } from "react";
import { FaTrash } from 'react-icons/fa';

import AdminSidebar from "./AdminSidebar";
import "./cssfiles/AdminPage.css";
import Forpay from "./ForPay";
import Loading from "./Loading";

const AdminPage = () => {
  const [places, setPlaces] = useState([]);
  const [activeTab, setActiveTab] = useState("registered");
  const [activeSubTab, setActiveSubTab] = useState("verified");
  const [loading, setLoading] = useState(true);

  // Fetch places from backend
  const fetchPlaces = async () => {
    setLoading(true);
    try {
      const response = await fetch("http://localhost:5000/api/places");
      const data = await response.json();
      setPlaces(data);
    } catch (error) {
      console.error("Error fetching places:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPlace = async (placeId) => {
    try {
      const response = await fetch(`http://localhost:5000/api/verify/${placeId}`, {
        method: "POST",
      });

      if (response.ok) {
        // Refetch data or update locally
        setPlaces(prev =>
          prev.map(p => (p.id === placeId ? { ...p, verified: true } : p))
        );
      } else {
        console.error("Failed to verify place");
      }
    } catch (error) {
      console.error("Error verifying place:", error);
    }
  };

  const handleDeletePlace = async (placeId) => {
    if (window.confirm("Are you sure you want to delete this place?")) {
      try {
        const response = await fetch(`http://localhost:5000/api/places/${placeId}`, {
          method: "DELETE",
        });

        if (response.ok) {
          setPlaces((prev) => prev.filter((p) => p.id !== placeId));
          alert("Place deleted successfully");
        } else {
          console.error("Failed to delete place");
        }
      } catch (error) {
        console.error("Error deleting place:", error);
      }
    }
  };

  useEffect(() => {
    fetchPlaces();
  }, []);

  const verifiedPlaces = places.filter((place) => place.verified);
  const nonVerifiedPlaces = places.filter((place) => !place.verified);

  return (
    <div className="admin-page">
      <AdminSidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="main-content">
        {activeTab === "registered" && (
          <div>
            <div className="notification-banner">
              {activeSubTab === "verified" && <p>Displaying all verified places</p>}
              {activeSubTab === "nonVerified" && <p>Displaying places pending verification</p>}
            </div>

            <div className="tabs">
              <button
                className={`tab-button ${activeSubTab === "verified" ? "active" : ""}`}
                onClick={() => setActiveSubTab("verified")}
              >
                Verified
              </button>
              <button
                className={`tab-button ${activeSubTab === "nonVerified" ? "active" : ""}`}
                onClick={() => setActiveSubTab("nonVerified")}
              >
                Non-Verified
              </button>
            </div>

            {loading ? (
              <Loading />
            ) : (
              <div className="place-list">
                {activeSubTab === "verified" &&
                  verifiedPlaces.map((place) => (
                    <div key={place.id} className="place-card verified-card">
                      <div className="place-info">
                        <span><b>{place.placeName || "Unknown Place"}</b></span>
                        <span> Address: {place.address}</span>
                        <span> Charge: {place.charge}</span>
                        <span> Availability: {place.availability?.from} - {place.availability?.to}</span>
                        <span> Verified: Yes</span>
                      </div>
                      <FaTrash
                        className="delete-icon"
                        onClick={() => handleDeletePlace(place.id)}
                        style={{ color: "red", cursor: "pointer" }}
                      />
                    </div>
                  ))}

                {activeSubTab === "nonVerified" &&
                  nonVerifiedPlaces.map((place) => (
                    <div key={place.id} className="place-card non-verified-card">
                      <div className="place-info">
                        <span><b>{place.placeName || "Unknown Place"}</b></span>
                        <span> Address: {place.address}</span>
                        <span> Charge: {place.charge}</span>
                        <span> Availability: {place.availability?.from} - {place.availability?.to}</span>
                        <span> Verified: No</span>
                      </div>
                      <button
                        className="verify-button"
                        onClick={() => handleVerifyPlace(place.id)}
                      >
                        Verify
                      </button>
                      <FaTrash
                        className="delete-icon"
                        onClick={() => handleDeletePlace(place.id)}
                        style={{ color: "red", cursor: "pointer" }}
                      />
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "payment" && (
          <div className="bookings-list">
            <h3>Payment History</h3>
            <Forpay />
          </div>
        )}

        {activeTab === "notifications" && (
          <div className="notifications-list">
            <h2>Notifications</h2>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminPage;
