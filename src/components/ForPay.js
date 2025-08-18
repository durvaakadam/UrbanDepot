// import { collection, getDocs } from 'firebase/firestore';
// import React, { useEffect, useState } from 'react';
// import db from '../firebaseConfig';
// import { useLocation } from 'react-router-dom';
// import './cssfiles/ForPay.css'; // Assuming your CSS file is named Forpay.css
// import Loading from './Loading'; // Import the Loading component



// const Forpay = () => {
//     const [datewiseReservations, setDatewiseReservations] = useState({});
//     const location = useLocation();
//     const { platformFee } = location.state || {};
//     const [loading, setLoading] = useState(true); // Initialize loading state

    
//     // Function to fetch all reservations across all places
//     const fetchAllReservations = async () => {
//         try {
//             const placesSnapshot = await getDocs(collection(db, 'places'));
//             let reservationsList = [];

//             // Loop through each place
//             for (const placeDoc of placesSnapshot.docs) {
//                 const placeId = placeDoc.id;

//                 // Get the reservations subcollection for each place
//                 const reservationsSnapshot = await getDocs(collection(db, 'places', placeId, 'reservations'));

//                 // Add each reservation to the list, including the placeId
//                 reservationsSnapshot.forEach((reservationDoc) => {
//                     const reservationData = reservationDoc.data();
//                     const createdAt = reservationData.createdAt;

//                     // Convert createdAt timestamp to date format
//                     const reservationDate = new Date(createdAt).toLocaleDateString();

//                     // Add formatted reservation with place ID and reservation ID
//                     reservationsList.push({
//                         placeId,
//                         reservationId: reservationDoc.id,
//                         reservationDate,
//                         ...reservationData,
//                     });
//                 });
//             }

//             // Group reservations by date and calculate total for each date
//             const groupedReservations = reservationsList.reduce((acc, reservation) => {
//                 const { reservationDate, platform_fee } = reservation;
//                 if (!acc[reservationDate]) {
//                     acc[reservationDate] = {
//                         reservations: [],
//                         total: 0,
//                     };
//                 }
//                 acc[reservationDate].reservations.push(reservation);
//                 acc[reservationDate].total += Number(platform_fee) || 0; // Ensure platform_fee is treated as a number
//                 return acc;
//             }, {});

//             setDatewiseReservations(groupedReservations); // Set the grouped reservations in state
//         } catch (error) {
//             console.error("Error fetching all reservations:", error);
//         } finally {
//             setLoading(false); // Set loading to false when fetching is done
//         }
//     };

//     useEffect(() => {
//         fetchAllReservations(); // Call fetch function on component mount
//     }, []);

//     return (
//         <div className="admin-page">
//             {loading ? ( // Display Loading component while loading
//                 <Loading />
//             ) : (
//                 <div>
//                     {Object.keys(datewiseReservations).length > 0 ? (
//                         Object.entries(datewiseReservations).map(([date, { reservations, total }]) => (
//                             <div key={date}>
//                                 <h4>{date} (Total Earned: ₹{total})</h4>
//                                 {reservations.map((reservation) => (
//                                     <div key={reservation.reservationId} className="reservation-card">
//                                         <p><strong>Place ID:</strong> {reservation.placeId}</p>
//                                         <p><strong>Reservation ID:</strong> {reservation.reservationId}</p>
//                                         <p><strong>Contact:</strong> {reservation.contactNumber}</p>
//                                         <p><strong>Email:</strong> {reservation.email}</p>
//                                         <span className="total-amount">+{reservation.platform_fee}</span>
//                                     </div>
//                                 ))}
//                             </div>
//                         ))
//                     ) : (
//                         <p>No reservations available.</p>
//                     )}
//                 </div>
//             )}
//         </div>
//     );
// };

// export default Forpay;


import { collection, getDocs } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import db from '../firebaseConfig';
import { useLocation } from 'react-router-dom';
import './cssfiles/ForPay.css';
import Loading from './Loading';



const Forpay = () => {
    const [datewiseReservations, setDatewiseReservations] = useState({});
    const location = useLocation();
    const { platformFee } = location.state || {};
    const [loading, setLoading] = useState(true);
    const [openReservationId, setOpenReservationId] = useState(null); // track open dropdown

    const fetchAllReservations = async () => {
        try {
            const placesSnapshot = await getDocs(collection(db, 'places'));
            let reservationsList = [];

            for (const placeDoc of placesSnapshot.docs) {
                const placeId = placeDoc.id;
                const reservationsSnapshot = await getDocs(collection(db, 'places', placeId, 'reservations'));

                reservationsSnapshot.forEach((reservationDoc) => {
                    const reservationData = reservationDoc.data();
                    const createdAt = reservationData.createdAt;
                    const reservationDate = new Date(createdAt).toLocaleDateString();

                    reservationsList.push({
                        placeId,
                        reservationId: reservationDoc.id,
                        reservationDate,
                        ...reservationData,
                    });
                });
            }

            const groupedReservations = reservationsList.reduce((acc, reservation) => {
                const { reservationDate, platform_fee } = reservation;
                if (!acc[reservationDate]) {
                    acc[reservationDate] = { reservations: [], total: 0 };
                }
                acc[reservationDate].reservations.push(reservation);
                acc[reservationDate].total += Number(platform_fee) || 0;
                return acc;
            }, {});

            setDatewiseReservations(groupedReservations);
        } catch (error) {
            console.error("Error fetching all reservations:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAllReservations();
    }, []);

    const toggleDropdown = (id) => {
        setOpenReservationId((prev) => (prev === id ? null : id));
    };

    return (
        <div className="admin-page">
            {loading ? (
                <Loading />
            ) : (
                <div>
                    {Object.keys(datewiseReservations).length > 0 ? (
                        Object.entries(datewiseReservations).map(([date, { reservations, total }]) => (
                            <div key={date} className="date-group">
                                <h4>{date} (Total Earned: ₹{total})</h4>
                                {reservations.map((reservation) => {
                                    const initial = reservation.email ? reservation.email.charAt(0).toUpperCase() : "?";
                                    const isOpen = openReservationId === reservation.reservationId;

                                    return (
                                        <div
                                            key={reservation.reservationId}
                                            className={`reservation-card ${isOpen ? "open" : ""}`}
                                            onClick={() => toggleDropdown(reservation.reservationId)}
                                        >
                                            <div className="reservation-header">
                                                <div className="avatar">{initial}</div>
                                                <div className="reservation-summary">
                                                    <p><strong>ID:</strong> {reservation.reservationId}</p>
                                                    <p><strong>Email:</strong> {reservation.email}</p>
                                                </div>
                                                <span className="amount">₹{reservation.platform_fee}</span>
                                            </div>

                                            {isOpen && (
                                                <div className="reservation-details">
                                                    <p><strong>Place ID:</strong> {reservation.placeId}</p>
                                                    <p><strong>Contact:</strong> {reservation.contactNumber}</p>
                                                    <p><strong>Destination:</strong> {reservation.destination || "N/A"}</p>
                                                    <p><strong>Time:</strong> {reservation.time || "N/A"}</p>
                                                    <p><strong>Created At:</strong> {new Date(reservation.createdAt).toLocaleString()}</p>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ))
                    ) : (
                        <p>No reservations available.</p>
                    )}
                </div>
            )}
        </div>
    );
};

export default Forpay;
