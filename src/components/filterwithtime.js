//map.js midterm code


import React, { useEffect, useRef, useState } from "react";
import { FaDirections } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom'; // Add useNavigate import
import './cssfiles/Map.css';
import FetchLatLng from './FetchLatLng';

const mapsApiKey = process.env.REACT_APP_MAPS_API_KEY;

const Map = () => {
    const navigate = useNavigate(); // Add useNavigate hook
    const [places, setPlaces] = useState([]);
    const mapRef = useRef(null);
    const [searchMarker, setSearchMarker] = useState(null);
    const [userMarker, setUserMarker] = useState(null);
    const [directionsRenderer, setDirectionsRenderer] = useState(null);
    const [directionsService, setDirectionsService] = useState(null);
    const [popupVisible, setPopupVisible] = useState(false);
    const [selectedPlace, setSelectedPlace] = useState({});

    const onFetchPlaces = (newPlaces) => {
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
                center: { lat: 20.5937, lng: 78.9629 }, // Centered on India
                zoom: 5,
            });

            // Set user marker to current location
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

            const service = new window.google.maps.places.PlacesService(map);
            setDirectionsService(new window.google.maps.DirectionsService());
            const renderer = new window.google.maps.DirectionsRenderer();
            renderer.setMap(map);
            setDirectionsRenderer(renderer);

            const input = document.getElementById("pac-input");
            const autocomplete = new window.google.maps.places.Autocomplete(input);
            autocomplete.bindTo("bounds", map);

            autocomplete.addListener("place_changed", () => {
                const place = autocomplete.getPlace();
                if (!place.geometry) {
                    window.alert("No details available for input: '" + place.name + "'");
                    return;
                }

                map.setCenter(place.geometry.location);
                map.setZoom(15);

                if (searchMarker) {
                    searchMarker.setMap(null); // Remove previous marker
                }

                const newSearchMarker = new window.google.maps.Marker({
                    position: place.geometry.location,
                    map: map,
                    title: place.name,
                });
                setSearchMarker(newSearchMarker);

                setSelectedPlace({
                    address: place.formatted_address,
                    charge: place.charge,
                    availabilityFrom: place.availability_from,
                    availabilityTo: place.availability_to,
                    name: place.name,
                    id: place.id,
                    lat: place.geometry.location.lat(),
                    lng: place.geometry.location.lng(),
                    reservations: place.reservations || [],
                });
                setPopupVisible(true);
            });

            places.forEach(place => {
                const marker = new window.google.maps.Marker({
                    position: { lat: place.lat, lng: place.lng },
                    map: map,
                    title: place.id,
                });

                marker.addListener("click", () => {
                    const reservationDetails = place.reservations || [];
                    setSelectedPlace({
                        charge: place.charge,
                        availabilityFrom: place.availability.from,
                        availabilityTo: place.availability.to,
                        address: place.address,
                        id: place.id,
                        lat: place.lat,
                        lng: place.lng,
                        reservations: reservationDetails,
                    });
                    setPopupVisible(true);
                });
            });
        };

        loadScript(`https://maps.googleapis.com/maps/api/js?key=${mapsApiKey}&callback=initMap&libraries=places`);
    }, [places]);

    const searchNearbyPlaces = () => {
        const searchInput = document.getElementById("pac-input").value;
        const travelMode = document.getElementById("travel-mode").value;

        const request = {
            location: userMarker.getPosition(),
            radius: "500",
            query: searchInput,
        };

        const service = new window.google.maps.places.PlacesService(mapRef.current);
        service.textSearch(request, (results, status) => {
            if (status === window.google.maps.places.PlacesServiceStatus.OK) {
                const place = results[0];
                const destination = {
                    lat: place.geometry.location.lat(),
                    lng: place.geometry.location.lng(),
                    charge: place.charge,
                    address: place.formatted_address,
                    availabilityFrom: place.availability.from,
                    availabilityTo: place.availability.to,
                };

                if (searchMarker) {
                    searchMarker.setMap(null);
                }

                const newSearchMarker = new window.google.maps.Marker({
                    position: destination,
                    map: mapRef.current,
                    title: place.name,
                });
                setSearchMarker(newSearchMarker);
                const reservationDetails = place.reservations;
                setSelectedPlace({
                    name: place.name,
                    id: place.id,
                    availabilityFrom: place.availability.from,
                    availabilityTo: place.availability.to,
                    chargeAvailability: place.charge,
                    lat: place.geometry.location.lat(),
                    lng: place.geometry.location.lng(),
                    reservations: reservationDetails,
                });
                setPopupVisible(true);

                const requestDirections = {
                    origin: userMarker.getPosition(),
                    destination: destination,
                    travelMode: window.google.maps.TravelMode[travelMode],
                };

                directionsService.route(requestDirections, (result, status) => {
                    if (status === window.google.maps.DirectionsStatus.OK) {
                        directionsRenderer.setDirections(result);
                        // Show directions panel
                        document.getElementById("directions-panel").style.display = "block";
                        // Populate the directions panel
                        const steps = result.routes[0].legs[0].steps.map(step => `<li>${step.instructions}</li>`).join('');
                        document.getElementById("directions-panel").innerHTML =
                            `<h3>Directions</h3><ul>${steps}</ul><button onClick={closeDirectionsPanel}>Close</button>`;
                    } else {
                        window.alert("Directions request failed due to " + status);
                    }
                });
            }
        });
    };

    const closeDirectionsPanel = () => {
        document.getElementById("directions-panel").style.display = "none";
    };

    const closeRegisterForm = () => {
        document.getElementById("register-form").style.display = "none";
    };

    const proceedToBook = (place) => {
        const query = `?lat=${place.lat}&lng=${place.lng}&name=${encodeURIComponent(place.name)}&charge=${place.chargeAvailability}&id=${selectedPlace.id}&address=${place.address}`;
        navigate(`/reservation${query}`);
    };

    const getDirections = () => {
        if (directionsService && userMarker) {
            const requestDirections = {
                origin: userMarker.getPosition(),
                destination: { lat: selectedPlace.lat, lng: selectedPlace.lng },
                travelMode: window.google.maps.TravelMode.DRIVING,
            };

            directionsService.route(requestDirections, (result, status) => {
                if (status === window.google.maps.DirectionsStatus.OK) {
                    directionsRenderer.setDirections(result);
                    // Show directions panel
                    document.getElementById("directions-panel").style.display = "block";
                    // Populate the directions panel
                    const steps = result.routes[0].legs[0].steps.map(step => `<li>${step.instructions}</li>`).join('');
                    document.getElementById("directions-panel").innerHTML =
                        `<h3>Directions</h3><ul>${steps}</ul><button onClick={closeDirectionsPanel}>Close</button>`;
                } else {
                    window.alert("Directions request failed due to " + status);
                }
            });
        }
    };

    return (
        <div style={{ position: "relative" }}>
            <div id="map" ref={mapRef} >
            </div>
            <div className="map-search">
            <h5>Find your perfect parking spot on UrbanDepot </h5>
            <p>Search for nearby parking space according to their availability</p>
            <div className="park-search-div"><label ><span>Locality for parking</span><input
                id="pac-input"
                type="text"
                placeholder="Anywhere"
            /></label></div>
            <div className="map-row-2">
            <label><span>Type of Parking</span> 
            <select id="type-parking">
            <option value="All">All</option>
                <option value="Public">Public</option>
                <option value="Private">Private</option>  
               </select> </label>
            <div className="trave-mode"><label><span>Travel-mode</span>
            <select id="travel-mode" >
                <option value="DRIVING">Driving</option>
                <option value="WALKING">Walking</option>
                <option value="BICYCLING">Bicycling</option>
                <option value="TRANSIT">Transit</option>
            </select></label></div>
            </div>
            <div className="date">
            <div className="from-date">
                <label>From Date:</label>
                <input type="date" id="from-date" />
            </div>

            <div className="to-date">
                <label>To Date:</label>
                <input type="date" id="to-date" />
            </div>
            </div>
            <div className="time">
            <div className="from-time">
                <label>From Time:</label>
                <input type="time" id="from-time" />
            </div>

            <div className="to-time">
                <label>To Time:</label>
                <input type="time" id="to-time" />
            </div>
            </div>
            <button onClick={searchNearbyPlaces} >
                Search Nearby
            </button>
            </div>

            <div
                id="directions-panel"
                style={{
                    position: "absolute",
                    top: "150px",
                    left: "10px",
                    maxHeight: "400px",
                    overflowY: "scroll",
                    border: "1px solid #ccc",
                    background: "#fff",
                    padding: "10px",
                    borderRadius: "5px",
                    boxShadow: "0 0 10px rgba(0,0,0,0.5)",
                    zIndex: 2,
                }}
            ></div>

            <div id="register-form" style={{ display: "none" }}>
                {/* Registration form can be added here */}
                <h2>Register Place</h2>
                <button onClick={closeRegisterForm}>Close</button>
            </div>

            {/* Popup for displaying selected place details */}
            {popupVisible && (
                <div
                    style={{
                        position: 'absolute',
                        top: '100px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        background: 'white',
                        padding: '10px',
                        border: '1px solid #ccc',
                        boxShadow: '0 0 10px rgba(0,0,0,0.5)',
                    }}
                >
                    <h3>Address: {selectedPlace.address}</h3>
                    <p>Latitude: {selectedPlace.lat}</p>
                    <p>Longitude: {selectedPlace.lng}</p>
                    <p>ID:{selectedPlace.id}</p>
                    <p>Charge (Rs.): {selectedPlace.chargeAvailability}</p>
                    <p>Availability From: {selectedPlace.availabilityFrom}</p> {/* Add availability from */}
                    <p>Availability To: {selectedPlace.availabilityTo}</p>
                    

                     {/* Add availability to */}
                     {selectedPlace.reservations && selectedPlace.reservations.length > 0 ? (
    <div>
    <h4>Reservations:</h4>
    <ul>
        {selectedPlace.reservations.map((reservation) => (
            <p 
                key={reservation.reservationId} 
                style={{
                    color: '#ff4d4d', // Use a softer red for readability
                    fontWeight: 'bold',
                    padding: '8px 0',
                    borderBottom: '1px solid #ccc', // Optional: to visually separate entries
                }}
            >
                🚫 Already booked slots: From {reservation.checkinTime} to {reservation.checkoutTime}
            </p>
        ))}
    </ul>
</div>
) : (
    <p>No reservations available.</p>
)}
                    <button onClick={() => proceedToBook(selectedPlace)}>Proceed to Book</button>
                    <button onClick={getDirections}><FaDirections /> Get Directions</button>
                    <button onClick={() => setPopupVisible(false)}>Close</button>
                </div>
            )}
            <FetchLatLng onFetchPlaces={onFetchPlaces} />
        </div>
    );
};

export default Map;
