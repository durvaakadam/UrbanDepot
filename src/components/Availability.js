import React, { useEffect, useState, useCallback } from 'react';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig'; // Adjust the path if necessary

const Availability = ({ placeId }) => {
  const [availableTimes, setAvailableTimes] = useState([]);
  const [error, setError] = useState(null);

  // Memoize the calculateAvailableSlots function
  const calculateAvailableSlots = useCallback((availability, reservations) => {
    // Split availability time string into start and end times
    const [startTime, endTime] = availability.split(' - ').map(time => new Date(`1970-01-01T${time}:00`));

    // Calculate reserved time slots
    const reservedSlots = reservations.map(reservation => {
      const checkin = new Date(`1970-01-01T${reservation.checkin}:00`);
      const checkout = new Date(`1970-01-01T${reservation.checkout}:00`);
      return { checkin, checkout };
    });

    const availableSlots = [];
    let lastEndTime = startTime;

    reservedSlots.forEach(slot => {
      // If there is time before the current reservation
      if (lastEndTime < slot.checkin) {
        availableSlots.push(`${formatTime(lastEndTime)} - ${formatTime(slot.checkin)}`);
      }
      // Update the last end time
      lastEndTime = slot.checkout > lastEndTime ? slot.checkout : lastEndTime;
    });

    // If there's time after the last reservation
    if (lastEndTime < endTime) {
      availableSlots.push(`${formatTime(lastEndTime)} - ${formatTime(endTime)}`);
    }

    return availableSlots;
  }, []); // No dependencies, as it does not rely on props or state

  useEffect(() => {
  const fetchData = async () => {
    try {
      const res = await fetch(`http://localhost:5000/availability/${placeId}`);
      const data = await res.json();
      setAvailableTimes(data.availableSlots || []);
    } catch (err) {
      setError("Failed to fetch data.");
    }
  };
  fetchData();
}, [placeId]);
  // Helper function to format time
  const formatTime = (date) => {
    return date.toTimeString().slice(0, 5); // Format to HH:MM
  };

  return (
    <div>
      <h2>Available Times</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <ul>
        {availableTimes.length > 0 ? (
          availableTimes.map((slot, index) => <li key={index}>{slot}</li>)
        ) : (
          <li>No available times</li>
        )}
      </ul>
    </div>
  );
};

export default Availability;
