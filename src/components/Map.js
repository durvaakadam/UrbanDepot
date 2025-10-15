import React, { useEffect, useRef, useState } from "react";
import './cssfiles/Map.css';
import FetchLatLng from './FetchLatLng';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { db } from '../firebaseConfig';
import { collection, onSnapshot } from "firebase/firestore";

import { Navigate, useNavigate } from "react-router-dom"; // Import Navigate and useNavigate from react-router-dom
const mapsApiKey = process.env.REACT_APP_MAPS_API_KEY;
const Map = () => {
    const navigate = useNavigate(); // Add useNavigate hook

    const [isLoggedIn, setIsLoggedIn] = useState(false); // New state for login status
    const [places, setPlaces] = useState([]);
    const mapRef = useRef(null);
    const originalCenter = { lat: 19.0760, lng: 72.8777 }; // Original center
    const originalZoom = 11; // Original zoom level

    const [userMarker, setUserMarker] = useState(null);
    const [directionsRenderer, setDirectionsRenderer] = useState(null);
    const [mapInstance, setMapInstance] = useState(null);
    const [popupVisible, setPopupVisible] = useState(false);
    const [selectedPlace, setSelectedPlace] = useState({});
    const [searchMarkers, setSearchMarkers] = useState([]); // State to hold markers
    const [directionsSteps, setDirectionsSteps] = useState([]); 
    const [loading, setLoading] = useState(true); // Loading state

    const [defaultFromDate, setDefaultFromDate] = useState('');
    const [defaultToDate, setDefaultToDate] = useState('');
    const [defaultFromTime, setDefaultFromTime] = useState('');
    const [defaultToTime, setDefaultToTime] = useState('');

  const autocompleteRef = useRef(null); 
    useEffect(() => {
        // Set default date and time values
        const today = new Date();
        const todayDate = today.toISOString().split('T')[0]; // YYYY-MM-DD format
        const currentTime = today.toTimeString().split(' ')[0].slice(0, 5); // HH:MM format
        const oneHourLater = new Date(today.getTime() + 60 * 60 * 1000);
        const oneHourLaterTime = oneHourLater.toTimeString().split(' ')[0].slice(0, 5); // HH:MM format
        
        setDefaultFromDate(todayDate);
        setDefaultToDate(todayDate);
        setDefaultFromTime(currentTime);
        setDefaultToTime(oneHourLaterTime);
    }, []);

    const addMarkersForPlaces = (places) => {
        if (!mapInstance) return; // Ensure map is initialized

        // Clear existing markers
        searchMarkers.forEach(marker => marker.setMap(null));
        setSearchMarkers([]);

        places.forEach(place => {
            if (typeof place.lat !== "number" || typeof place.lng !== "number") {
                console.warn("Invalid lat/lng for place:", place);
                return; // Skip this marker
              }
            const marker = new window.google.maps.Marker({
                position: { lat: place.lat, lng: place.lng },
                map: mapInstance,
                title: place.address || place.id,
            });

            marker.addListener("click", () => {
                setSelectedPlace(place);
                setPopupVisible(true);
                
                // Center map to show both marker and popup
                const popupOffset = 200; // Adjust this based on your popup size
                const latLng = new window.google.maps.LatLng(place.lat, place.lng);
                const bounds = new window.google.maps.LatLngBounds();
    
                bounds.extend(latLng);
    
                // Adjust bounds to fit the popup
                bounds.extend({
                    lat: place.lat - (popupOffset / 111320), // Approximation to convert pixels to lat
                    lng: place.lng,
                });
    
                mapInstance.fitBounds(bounds);
            });
    
            setSearchMarkers(prevMarkers => [...prevMarkers, marker]);
        });
        };

    const onFetchPlaces = (newPlaces) => {
        console.log("Fetched places:", newPlaces);
        setPlaces(newPlaces);
    };

    useEffect(() => {
        const loadScript = (src) => {
            const script = document.createElement("script");
            script.src = src;
            script.async = true;
            script.defer = true;
            document.body.appendChild(script);
        };

        window.initMap = () => {
            const map = new window.google.maps.Map(mapRef.current, {
                center: originalCenter,
                zoom: originalZoom,
            });

            setMapInstance(map);
            setLoading(false); // Map loading finished

            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition((position) => {
                    const userLocation = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                    };

                    const userMarkerInstance = new window.google.maps.Marker({
                        position: userLocation,
                        map,
                        icon: "https://maps.google.com/mapfiles/ms/icons/blue-dot.png",
                    });
                    setUserMarker(userMarkerInstance);
                    map.setCenter(userLocation);
                });
            } else {
                alert("Geolocation is not supported by this browser.");
            }

            const renderer = new window.google.maps.DirectionsRenderer();
            renderer.setMap(map);
            setDirectionsRenderer(renderer);
        const input = document.getElementById("pac-input");
            const autocomplete = new window.google.maps.places.Autocomplete(input);
            autocomplete.setFields(["place_id", "geometry", "name"]);
            
            autocomplete.addListener("place_changed", () => {
                const place = autocomplete.getPlace();
                if (!place.geometry) {
                    alert("No details available for the selected location.");
                    return;
                }

                const searchLocation = place.geometry.location;
                map.setCenter(searchLocation);
                map.setZoom(13);

                // Optional: Trigger a search for nearby places based on the autocomplete location
                searchNearbyPlaces();
            });

            autocompleteRef.current = autocomplete;
        };
        loadScript(`https://maps.googleapis.com/maps/api/js?key=${mapsApiKey}&callback=initMap&libraries=places`);
    }, []);

    useEffect(() => {
  if (mapInstance && places.length > 0) {
    addMarkersForPlaces(places);
  }
}, [mapInstance, places]);



    const addMarkersForFetchedPlaces = (fetchedPlaces) => {
        if (!mapInstance || !fetchedPlaces || fetchedPlaces.length === 0) return;

        // Clear existing markers
        searchMarkers.forEach(marker => marker.setMap(null));
        setSearchMarkers([]);

        fetchedPlaces.forEach(place => {
            const marker = new window.google.maps.Marker({
                position: { lat: place.lat, lng: place.lng },
                map: mapInstance,
                title: place.address || place.id,
            });

            marker.addListener("click", () => {
                setSelectedPlace(place);
                setPopupVisible(true);
            });

            setSearchMarkers(prevMarkers => [...prevMarkers, marker]);
        });
    };

    const searchNearbyPlaces = () => {
        const searchInput = document.getElementById("pac-input").value;
        if (!searchInput) {
            alert("Please enter a location to search.");
            return;
        }
    
        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode({ address: searchInput }, (results, status) => {
            if (status === "OK" && results[0]) {
                const searchLocation = results[0].geometry.location;
                const searchRadius = 1000000; // 10 km radius
    
                // Filter places within the search radius based on distance to search location
                const filteredPlaces = places.filter((place) => {
                    const placeLocation = new window.google.maps.LatLng(place.lat, place.lng);
                    const distance = window.google.maps.geometry.spherical.computeDistanceBetween(
                        searchLocation,
                        placeLocation
                    );
    
                    return distance <= searchRadius;
                });
    
                // Use filtered places and apply additional filters (time, date, access type) if needed
                filterPlacesByCriteria(filteredPlaces, searchLocation);
            } else {
                alert("Could not find location: " + status);
            }
        });
    };
    
    // Modify filterPlacesByCriteria to accept filtered places
    const filterPlacesByCriteria = (filteredPlaces = places, searchLocation) => {
        const fromTime = document.getElementById("from-time").value;
        const toTime = document.getElementById("to-time").value;
        const fromDate = document.getElementById("from-date").value;
        const toDate = document.getElementById("to-date").value;
        const selectedAccessType = document.getElementById("access-type").value;
    
        // Parse time and date values
        const fromTimeDate = new Date(`1970-01-01T${fromTime}:00Z`);
        const toTimeDate = new Date(`1970-01-01T${toTime}:00Z`);
        const fromDateObj = new Date(fromDate);
        const toDateObj = new Date(toDate);

        console.log("Filtering with criteria:");
        console.log("From Time:", fromTimeDate);
        console.log("To Time:", toTimeDate);
        console.log("From Date:", fromDateObj);
        console.log("To Date:", toDateObj);
        console.log("Selected Access Type:", selectedAccessType);
    
        // Filter based on criteria, using only places within the search radius
        const finalFilteredPlaces = filteredPlaces.filter(place => {
            if (!place.availability || !place.dateRange) return false;
    
            const placeFromTime = new Date(`1970-01-01T${place.availability.from}:00Z`);
            const placeToTime = new Date(`1970-01-01T${place.availability.to}:00Z`);
            const placeDateRangeFrom = new Date(place.dateRange.from);
            const placeDateRangeTo = new Date(place.dateRange.to);
            const isTimeValid = fromTimeDate >= placeFromTime && toTimeDate <= placeToTime;
            const isDateValid = placeDateRangeFrom <= toDateObj && placeDateRangeTo >= fromDateObj;
            const isAccessTypeValid = selectedAccessType === "" || place.accessType === selectedAccessType;
    

            console.log(`Checking place: ${place.name} (ID: ${place.id})`);
        console.log("  Availability:", place.availability);
        console.log("  Date Range:", place.dateRange);
        console.log("  Is Time Valid:", isTimeValid);
        console.log("  Is Date Valid:", isDateValid);
        console.log("  Is Access Type Valid:", isAccessTypeValid);


            return isTimeValid && isDateValid && isAccessTypeValid;
        });
    
        updateMapMarkers(finalFilteredPlaces, searchLocation);
    };
    
    const updateMapMarkers = (filteredPlaces, searchLocation) => {
        if (!mapInstance) {
            console.error("Map instance is not initialized.");
            return;
        }
    
        searchMarkers.forEach(marker => marker.setMap(null));
        setSearchMarkers([]);
    
        filteredPlaces.forEach(place => {
             console.log(`Adding marker for place: ${place.id} at coordinates: ${place.lat}, ${place.lng}`); // Log details
            const marker = new window.google.maps.Marker({
                position: { lat: place.lat, lng: place.lng },
                map: mapInstance,
                title: place.address || place.id,
            });
    
            marker.addListener("click", () => {
                setSelectedPlace(place);
                setPopupVisible(true);
            });
    
setSearchMarkers(prevMarkers => [...prevMarkers, marker]);
        });
    
        if (searchLocation) {
            mapInstance.setCenter(searchLocation);
            mapInstance.setZoom(13); // Optional: Adjust zoom level based on proximity
        }
    };

     const getDirections = () => {
    if (!directionsRenderer || !userMarker || !selectedPlace) {
        alert("Ensure a place is selected and user location is detected.");
        return;
    }

    const travelModeSelect = document.getElementById("travel-mode");
    const travelMode = travelModeSelect.value || window.google.maps.TravelMode.DRIVING;

    const request = {
        origin: userMarker.getPosition(),
        destination: { lat: selectedPlace.lat, lng: selectedPlace.lng },
        travelMode: travelMode,
    };
    const directionsService = new window.google.maps.DirectionsService();

    directionsService.route(request, (result, status) => {
        if (status === "OK") {
            directionsRenderer.setDirections(result);
            directionsRenderer.setMap(mapInstance);

            // Extract and set directions steps
            const steps = result.routes[0].legs[0].steps.map((step, index) => (
                <li key={index} className="direction-step">
                    <span className="direction-icon">➡️</span> {/* Customize icons per step type */}
                    <div className="direction-details">
                        <span className="instruction">
                            {step.instructions.replace(/<[^>]*>/g, "")}
                        </span>
                        <span className="distance">{Math.round(step.distance.value / 1000)} km</span>
                    </div>
                </li>
            ));
            setDirectionsSteps(steps);
            setPopupVisible(false); //closing the popup
            setIsMapShrunk(false); //shrinking the map on get-diretion event
            setDirectionsVisible(true);

        } else {
            alert("Directions request failed due to " + status);
        }
    });
};

    const [directionsVisible, setDirectionsVisible] = useState(false);
    const [isMapShrunk, setIsMapShrunk] = useState(false); //for shrinking the map on get-direction event

    const proceedToBook = (place) => {
        const query = `?lat=${place.lat}&lng=${place.lng}&name=${encodeURIComponent(place.id)}&charge=${place.chargeAvailability}&id=${selectedPlace.id}&address=${place.address}`;
        navigate(`/reservation${query}`);
    };
 
    const resetMap = () => {
        if (mapInstance) {
            mapInstance.setCenter(originalCenter); // Reset to original center
            mapInstance.setZoom(originalZoom); // Reset to original zoom
        }
    }

useEffect(() => {
  const unsubscribe = onSnapshot(collection(db, "places"), (snapshot) => {
    setPlaces((prevPlaces) => {
      let updated = [...prevPlaces];

      snapshot.docChanges().forEach((change) => {
        const data = { id: change.doc.id, ...change.doc.data(), 
          lat: change.doc.data().landmark?.lat,
          lng: change.doc.data().landmark?.lng
        };

        if (change.type === "added") {
          updated.push(data);
        }
        if (change.type === "modified") {
          updated = updated.map((p) => (p.id === data.id ? data : p));
        }
        if (change.type === "removed") {
          updated = updated.filter((p) => p.id !== data.id);
        }
      });

      return updated;
    });
  });

  return () => unsubscribe();
}, []);


    return (
        <div >
        <div style={{ position: "relative" }} className="firstmap">
        <ToastContainer />

        <div className={`map ${isMapShrunk ? 'shrunk' : ''}`} ref={mapRef}></div>
        <div className="map-search">
        <h5>Find your perfect parking spot on UrbanDepot </h5>
        <p>Search for nearby parking space according to their availability</p>
            <div className="park-search-div" id="park-search-div">
                <label>Locality for parking</label>
                    <input className="pac-input" id="pac-input" type="text" placeholder="Anywhere" />     
            </div>
            <div className="map-row-2">
            <div className="type-parking">
            <label>Type of Parking </label>
            <select id="access-type">
                        <option value="">Any</option>
                        <option value="public">Public</option>
                        <option value="private">Private</option>
                    </select></div>
            <div class="divider"></div>
            <div className="travel-mode"><label>Travel-mode</label>
            <select id="travel-mode">
                <option value="DRIVING">Driving</option>
                <option value="WALKING">Walking</option>
                <option value="BICYCLING">Bicycling</option>
                <option value="TRANSIT">Transit</option>
            </select></div>
            </div>
            <div className="date">
                <div className="from-date">
                    <label>From Date:</label>
                    <input type="date" id="from-date" defaultValue={defaultFromDate} />
                </div>
                <div class="divider"></div>
                <div className="to-date">
                    <label>To Date:</label>
                    <input type="date" id="to-date" defaultValue={defaultToDate} />
                </div>
            </div>    
            <div className="time">
                <div className="from-time">
                    <label>From Time:</label>
                    <input type="time" id="from-time" defaultValue={defaultFromTime} />
                    </div>
                    <div class="divider"></div>
                    <div className="to-time">
                        <label>To Time:</label>
                        <input type="time" id="to-time" defaultValue={defaultToTime} />
                        </div>
                </div>
                
                <button onClick={searchNearbyPlaces}>
                    Search Nearby
                </button>
                
            </div>
       
            {/* Popup for displaying selected place details */}
            {popupVisible && (
                <>
                <div className="map-popup-overlay" onClick={() => { resetMap(); setPopupVisible(false); }}></div>
                <div className="map-popup">
                    <div className="map-popup-content">
                    <h3>Place: {selectedPlace.id}</h3>
                    <p>Address: {selectedPlace.address}</p>
                    <p>Availability From: {selectedPlace.availability.from}</p>
                    <p>Availability To: {selectedPlace.availability.to}</p>
                    {/* Display dateRange and accessType */}
                    <p>Date Range: From {selectedPlace.dateRange?.from} To {selectedPlace.dateRange?.to}</p>
                    <p>Access Type: {selectedPlace.accessType}</p>
                    {/* Show booked slots */}
                    <h4>🚫 Already booked slots:</h4>
            <ul style={{ color: 'red' }}>
                {selectedPlace.reservations && selectedPlace.reservations.length > 0 ? (
                    selectedPlace.reservations.map((reservation, index) => (
                        <li key={index}>
                            🚫 Already booked: {reservation.checkinTime} to {reservation.checkoutTime}
                        </li>
                    ))
                ) : (
                    <li>No bookings available</li>
                )}
            </ul>

            
            <div
  className="map-popup-butt"
  style={{
    display: 'flex',
    justifyContent: 'space-between',
    gap: '2px',
    marginTop: '10px',
  }}
>
<button
    onClick={() => proceedToBook(selectedPlace)}
    style={{
      flex: 1,
      border: '1px solid #ccc',
      borderRadius: '10px',
      cursor: 'pointer',
      display: 'flex',            // Flex display for icon and text alignment
      alignItems: 'center',       // Center align icon and text
      justifyContent: 'center',   // Center the content horizontally
      padding: '10px',            // Add padding for better clickability
      fontSize: '16px',           // Adjust font size
      gap: '8px',  
      backgroundColor: 'black',  // Set background to black
      color: 'gold',             // Set text color to gold
      cursor: 'pointer',
      transition: 'background-color 0.3s ease',
    }}
  >
    Proceed to Pay
  </button>
  
  <button
  onClick={() => getDirections()}
  style={{
    flex: 1,
    borderRadius: '10px',
    backgroundColor: '#ff4d4d', // Red background color
    color: 'white',             // White text color
    cursor: 'pointer',
    display: 'flex',            // Flex display for icon and text alignment
    alignItems: 'center',       // Center align icon and text
    justifyContent: 'center',   // Center the content horizontally
    padding: '10px',            // Add padding for better clickability
    fontSize: '16px',           // Adjust font size
    gap: '8px',                 // Space between icon and text
    transition: 'background-color 0.3s ease',
  }}
>
  <span className="material-icons" style={{ fontSize: '20px' }}>directions</span>
  Get Directions
</button>

<button
className="map-popup-close"
    onClick={() => { resetMap(); setPopupVisible(false); }}
    style={{
        position: 'absolute',
        top: '-8px',         // Adjust to desired spacing from the top
        left: '234px',        // Adjust to desired spacing from the left
        border: 'none',
        backgroundColor: 'transparent', // Make the background transparent
        color: 'red',      // Set text color to red
        fontSize: '24px',    // Increase font size for better visibility
        fontWeight: 'bold',
        cursor: 'pointer',
        zIndex: 1000,        // Ensure the button is above other elements
    }}
>
     ✖
    </button>

</div>

    </div>
        </div></>
            )}
            {directionsSteps.length > 0 && (
            <div className="direction-box">
            <div className={`directions-box-directions ${directionsVisible ? "show":""}`}>
<button className="dir_panel-exit-button" onClick={() => {
    if (directionsRenderer) {
        directionsRenderer.setMap(null); // Clear directions from the map
    }
    setDirectionsVisible(false); // Close the directions panel
    setIsMapShrunk(false); // Expand the map back to its original size
    setDirectionsSteps([]); // Clear the directions steps
}}>
    Close
</button>
                <h4>Directions:</h4>
                <ul id="direction-list">{directionsSteps}</ul>
            </div></div>
        )}

        <FetchLatLng onFetchPlaces={onFetchPlaces} />
       </div> 
       </div>
    );
};

export default Map;
