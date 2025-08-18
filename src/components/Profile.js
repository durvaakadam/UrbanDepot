import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebaseConfig';
import { collection, getDocs, doc, deleteDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import './cssfiles/Profile.css';
import { FaCar, FaMapMarkerAlt, FaSignOutAlt, FaParking, FaMoneyBill, FaTrash, FaUserCircle, FaBell, FaCog } from 'react-icons/fa';
import { ToastContainer, toast } from 'react-toastify'; 
import 'react-toastify/dist/ReactToastify.css'; 
import './cssfiles/toastStyles.css';
import Loading from './Loading'; // Import Loading component


const Profile = () => {
    const [loading, setLoading] = useState(true); // Loading state

    const [bookings, setBookings] = useState([]);
    const [registeredPlaces, setRegisteredPlaces] = useState([]);
    const [userEmail, setUserEmail] = useState('');
    const [userName, setUserName] = useState('');
    const [notifications, setNotifications] = useState([]); // New state for notifications
    const [activeTab, setActiveTab] = useState('bookings'); 
    const navigate = useNavigate();

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            if (user) {
                setUserEmail(user.email);
                const extractedName = extractNameFromEmail(user.email);
                setUserName(extractedName); 
                await fetchProfileData(user.email);
                setLoading(false); // Stop loading once data is fetched

            } else {
                console.log("No user is signed in.");
                navigate('/login'); 
            }
        });

        return () => unsubscribe(); 
    }, [navigate]);

    const extractNameFromEmail = (email) => {
        const namePart = email.split('@')[0];
        const nameSegments = namePart.split(/[\._]/);
        const firstName = nameSegments[0].replace(/\d+/g, '');
        const lastName = nameSegments[1] ? nameSegments[1].replace(/\d+/g, '') : '';
        const capitalizedFirstName = firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
        const capitalizedLastName = lastName.charAt(0).toUpperCase() + lastName.slice(1).toLowerCase();
        return `${capitalizedFirstName} ${capitalizedLastName}`.trim();
    };

    const getInitials = (email) => {
        if (email) {
            const namePart = email.split('@')[0];
            const initials = namePart.split('.').map(name => name.charAt(0).toUpperCase()).join('');
            return initials;
        }
        return '';
    };

    const fetchProfileData = async (email) => {
  try {
    const [bookingsRes, placesRes] = await Promise.all([
      fetch(`http://localhost:5000/api/profile/bookings/${email}`),
      fetch(`http://localhost:5000/api/profile/places/${email}`)
    ]);

    const bookingsData = await bookingsRes.json();
    const placesData = await placesRes.json();

    setBookings(bookingsData);
    setRegisteredPlaces(placesData);

    // Sample notifications
    const notificationList = [
      { id: 1, message: "Your booking for Parking Spot A is confirmed!", date: "2024-10-28" },
      { id: 2, message: "Check-in reminder: Parking Spot B tomorrow at 10 AM.", date: "2024-10-29" },
    ];
    setNotifications(notificationList);
  } catch (error) {
    console.error("Error fetching profile data:", error);
    toast.error("Error fetching profile data.");
  }
};

    const getBookingStatus = (booking) => {
        const now = new Date();
        const checkinDate = new Date(booking.checkin);
        const checkoutDate = new Date(booking.checkout);
        
        if (now < checkinDate) {
            return 'Upcoming'; // Booking is in the future
        } else if (now >= checkinDate && now <= checkoutDate) {
            return 'Active'; // Booking is currently active
        } else {
            return 'Completed'; // Booking is in the past
        }
    };

    const handleLogout = () => {
        auth.signOut();
        navigate('/login');
    };
    const handleTabClick = (tabName) => {
        setActiveTab(tabName);
    };

    const handleDeletePlace = async (placeId) => {
  try {
    const user = auth.currentUser;
    if (user) {
      await fetch(`http://localhost:5000/api/profile/places/${user.email}/${placeId}`, {
        method: "DELETE",
      });

      setRegisteredPlaces(prev => prev.filter(place => place.id !== placeId));
      toast.success("Place deleted successfully.");
    }
  } catch (error) {
    console.error("Error deleting place:", error);
    toast.error("Error deleting place.");
  }
};

    const cancelBooking = async (bookingId) => {
  try {
    const user = auth.currentUser;
    if (user) {
      await fetch(`http://localhost:5000/api/profile/bookings/${user.email}/${bookingId}`, {
        method: "DELETE",
      });

      setBookings(prev => prev.filter(booking => booking.id !== bookingId));
      toast.success("Booking canceled successfully.");
    }
  } catch (error) {
    console.error("Error canceling booking:", error);
    toast.error("Error canceling booking.");
  }
};

    const confirmCancelBooking = (bookingId) => {
        const confirmToastId = toast(
            <div>
                <span>Are you sure you want to cancel this booking?</span>
                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}> {/* Flex container */}
                    <button 
                        onClick={() => {
                            cancelBooking(bookingId); 
                            toast.dismiss(confirmToastId);
                        }}
                        style={{ padding: '4px 8px', fontSize: '12px', width: '80px' }} // Wider button
                    >
                        Yes
                    </button>
                    <button 
                        onClick={() => toast.dismiss(confirmToastId)} 
                        style={{ padding: '4px 8px', fontSize: '12px', width: '80px' }} // Wider button
                    >
                        No
                    </button>
                </div>
            </div>,
            {
                autoClose: false,
                closeOnClick: false,
                draggable: false,
            }
        );
    };
    const sortBookings = (bookings, sortOption) => {
        switch (sortOption) {
            case 'date':
                return bookings.sort((a, b) => new Date(a.checkin) - new Date(b.checkin));
            case 'status':
                return bookings.sort((a, b) => {
                    const statusA = getBookingStatus(a);
                    const statusB = getBookingStatus(b);
                    return statusA.localeCompare(statusB);
                });
            case 'amount':
                return bookings.sort((a, b) => a.total_amount - b.total_amount);
            default:
                return bookings;
        }
    };
    
    const confirmDeletePlace = (placeId) => {
        const confirmToastId = toast(
            <div>
                <span>Are you sure you want to delete this place?</span>
                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}> {/* Flex container */}
                    <button 
                        onClick={() => {
                            handleDeletePlace(placeId); 
                            toast.dismiss(confirmToastId);
                        }}
                        style={{ padding: '4px 8px', fontSize: '12px', width: '80px' }} // Wider button
                    >
                        Yes
                    </button>
                    <button 
                        onClick={() => toast.dismiss(confirmToastId)} 
                        style={{ padding: '4px 8px', fontSize: '12px', width: '80px' }} // Wider button
                    >
                        No
                    </button>
                </div>
            </div>,
            {
                autoClose: false,
                closeOnClick: false,
                draggable: false,
            }
        );
    };
    
    
    return (
        <div className='Profilebackground'>
        <div className="profile-container">
            <div className="header1">
                <div className="avatar">
                    {getInitials(userEmail)}
                </div>
                <h2>Welcome, {userName}</h2>
                <p className="user-email">{userEmail}</p> {/* Display the email below the username */}

            </div>
    
            <div className="tab-navigation">
                <button
                    className={`tab-buttonpro ${activeTab === 'bookings' ? 'active-tab' : ''}`}
                    onClick={() => handleTabClick('bookings')}
                >
                    <FaCar /> <span>Bookings</span>
                </button>
                <button
                    className={`tab-buttonpro ${activeTab === 'places' ? 'active-tab' : ''}`}
                    onClick={() => handleTabClick('places')}
                >
                    <FaMapMarkerAlt /> <span>Registered Places</span>
                </button>
                <button
                    className={`tab-buttonpro ${activeTab === 'notifications' ? 'active-tab' : ''}`}
                    onClick={() => handleTabClick('notifications')}
                >
                    <FaBell /> <span>Notifications</span>
                </button>
                <button
                    className={`tab-buttonpro ${activeTab === 'settings' ? 'active-tab' : ''}`}
                    onClick={() => handleTabClick('settings')}
                >
                    <FaCog /> <span>Settings</span>
                </button>
            </div>
    
            {activeTab === 'bookings' && (
    <div className="section">
        <h3 className="section-heading">Your Bookings</h3>
        <div className="section-space"></div>
        {bookings.length > 0 ? (
            <div className="card-container">
                {bookings.map((booking) => (
                    <div key={booking.id} className="card">
                        <span className={`badge1 ${getBookingStatus(booking).toLowerCase()}`}>
                            {getBookingStatus(booking)}
                        </span>
                        <h4><FaParking />   Booking ID: {booking.id}</h4>
                        <p><strong>Place:</strong> {booking.place}</p> {/* Display Place Name */}
                        <p><strong>License Plate:</strong> {booking.licensePlate}</p>
                        <p><strong>Check-in:</strong> {booking.checkin}</p>
                        <p><strong>Check-out:</strong> {booking.checkout}</p>
                        <p><strong>Vehicle Type:</strong> {booking.vehicleType}</p>
                        <p><FaMoneyBill /> <strong>Charge:</strong> Rs. {booking.total_amount}</p>
                        <button
                            className="delete-button"
                            onClick={() => confirmCancelBooking(booking.id)}
                        >
                            <FaTrash /> Cancel Booking
                        </button>
                    </div>
                ))}
            </div>
        ) : (
            <p>No bookings found.</p>
        )}
    </div>
)}


{activeTab === 'places' && (
    <div className="section">
        <h3 className="section-heading">Registered Places</h3>
        <div className="section-space"></div>
        {registeredPlaces.length > 0 ? (
            <div className="card-container">
                {registeredPlaces.map((place) => (
                    <div key={place.id} className="card">
                        <h4><FaMapMarkerAlt /> {place.placeName}</h4> {/* Display Place Name as Title */}
                        <p><strong>Address:</strong> {place.address}</p>
                        <p><strong>Start Date:</strong> {place.dateRange.from}</p> {/* Start Date */}
                        <p><strong>End Date:</strong> {place.dateRange.to}</p>   {/* End Date */}
                        <p><strong>Access Type:</strong> {place.accessType}</p> {/* Display Access Type */}
                        <button
                            className="delete-button"
                            onClick={() => confirmDeletePlace(place.id)}
                        >
                            <FaTrash /> Delete
                        </button>
                    </div>
                ))}
            </div>
        ) : (
            <p>No registered places found.</p>
        )}
    </div>
)}



            {activeTab === 'notifications' && (
                <div className="section">
                    <h3 className="section-heading">Notifications</h3>
                    <div className="section-space"></div>
                    {notifications.length > 0 ? (
                        <ul className="notification-list">
                            {notifications.map((notification) => (
                                <li key={notification.id} className="notification-item">
                                    <p>{notification.message}</p>
                                    <span className="notification-date">{notification.date}</span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p>No notifications found.</p>
                    )}
                </div>
            )}

            {activeTab === 'settings' && (
                <div className="section">
                    <h3 className="section-heading">Account Settings</h3>
                    <div className="section-space"></div>
                    <p>You can update your account information and preferences here.</p>
                    <button className="settings-button" onClick={() => navigate('/settings')}>
                        <FaCog /> Manage Account
                    </button>
                </div>
            )}
    
         
            <ToastContainer position="top-right" autoClose={5000} hideProgressBar={false} closeOnClick draggable pauseOnHover />
        </div>
        </div>
    );
};

export default Profile;