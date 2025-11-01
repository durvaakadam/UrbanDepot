import React, { useState, useEffect, useRef } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import db, { auth, storage } from '../firebaseConfig'; 
import emailjs from 'emailjs-com';
import './cssfiles/Register.css';
import { onAuthStateChanged } from 'firebase/auth';
import '@fortawesome/fontawesome-free/css/all.min.css';
import Tesseract from 'tesseract.js';
import { toast, ToastContainer } from 'react-toastify'; 
import 'react-toastify/dist/ReactToastify.css';
import './cssfiles/toastStyles.css'; 
import FileUpload from './FileUpload';
import Loading from './Loading'; // Import your loading component

import ProgressBar from './ProgressBar'; 

const mapsApiKey = process.env.REACT_APP_MAPS_API_KEY;


const RegisterPlace = () => {
  const [placeName, setPlaceName] = useState('');
  const [address, setAddress] = useState('');
  const [name,setName]=useState('');
  const [parkingNumber, setParkingNumber] = useState('');
  const [fromTime, setFromTime] = useState('');
  const [toTime, setToTime] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [landmark, setLandmark] = useState({ lat: null, lng: null });
  const [useLiveLocation, setUseLiveLocation] = useState(false);
  const [accessType, setAccessType] = useState('public');
  const [errorMessage, setErrorMessage] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState(''); 
  const [currentStep, setCurrentStep] = useState(1);
  const [ownerEmail, setOwnerEmail] = useState('');

  const [hasCameras, setHasCameras] = useState('no'); // State for camera presence
  const [hasSecurityGuard, setHasSecurityGuard] = useState('no'); // State for security guard presence
  const [guardName, setGuardName] = useState(''); // State for security guard's name
  const [guardContact, setGuardContact] = useState(''); // State for security guard's contact
  
const [aadhaarUrl, setAadhaarUrl] = useState(null);
  const [aashaarcard, setAadharCard] = useState(null);
  const [nocLetter, setNocLetter] = useState(null);
  const [buildingPermission, setBuildingPermission] = useState(null);
  const [placePicture, setPlacePicture] = useState(null);
  
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const inputRef = useRef(null);
  const [loading, setLoading] = useState(false); // Add loading state

  const [aadharName, setAadharName] = useState(''); // State to hold the name extracted from Aadhar
  const [isAadharValid, setIsAadharValid] = useState(null); // State to track Aadhar validity

  const totalSteps = 6; // Define the total number of steps
  

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
    


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        console.log("✅ AUTH: User logged in:", user.email);
        setUserEmail(user.email);
        setOwnerEmail(user.email);
        setUserName(user.displayName || user.email.split('@')[0]);
      } else {
        console.log("❌ AUTH: No user logged in");
        setErrorMessage('No user is logged in. Please log in to register a place.');
      }
    });
  
    return () => unsubscribe();
  }, []);
  
  // Log state changes for debugging Aadhaar card
  useEffect(() => {
    console.log("📊 AADHAAR STATE: aashaarcard changed:", aashaarcard ? (typeof aashaarcard === 'string' ? 'URL' : 'File') : 'null');
  }, [aashaarcard]);
  
  useEffect(() => {
    console.log("📊 AADHAAR STATE: aadhaarUrl changed:", aadhaarUrl);
  }, [aadhaarUrl]);
  
  useEffect(() => {
  window.scrollTo({ top: 0, behavior: "smooth" });
}, [currentStep]);

  useEffect(() => {
    const loadScript = (src) => {
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
    };

    if (currentStep === 6) {
      window.initMap = () => {
        const map = new window.google.maps.Map(mapRef.current, {
          center: { lat: 20.5937, lng: 78.9629 },
          zoom: 5,
        });

        const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current);
        autocomplete.bindTo('bounds', map);

        markerRef.current = new window.google.maps.Marker({
          map: map,
          draggable: true,
          anchorPoint: new window.google.maps.Point(0, -29),
        });

        const setMarkerPosition = (location) => {
          markerRef.current.setPosition(location);
          markerRef.current.setVisible(true);
          setLandmark({ lat: location.lat(), lng: location.lng() });
        };

        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace();
          if (!place.geometry) {
            window.alert('No details available for input: ' + place.name);
            return;
          }
          if (place.geometry.viewport) {
            map.fitBounds(place.geometry.viewport);
          } else {
            map.setCenter(place.geometry.location);
            map.setZoom(15);
          }
          setMarkerPosition(place.geometry.location);
        });

        if (useLiveLocation && navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const { latitude, longitude } = position.coords;
              const liveLocation = new window.google.maps.LatLng(latitude, longitude);
              map.setCenter(liveLocation);
              setMarkerPosition(liveLocation);
            },
            (error) => {
              console.error("Error obtaining live location:", error);
              setErrorMessage('Unable to retrieve live location. Please enable location services.');
            }
          );
        }

        window.google.maps.event.addListener(markerRef.current, 'dragend', function () {
          const position = markerRef.current.getPosition();
          setLandmark({ lat: position.lat(), lng: position.lng() });
        });
      };

      loadScript(`https://maps.googleapis.com/maps/api/js?key=${mapsApiKey}&callback=initMap&libraries=places`);
    }
  }, [useLiveLocation, currentStep]);

  const handleSendEmail = async () => {
    if (!userEmail) {
      alert("No user logged in to send email to!");
      return;
    }
    setLoading(true); // Start loading
  
    const templateParams = {
      to_email: ownerEmail,
      message: `You have successfully registered a new place named "${placeName}" at address: ${address}.`,
    };
  
    // Start sending email in the background
    emailjs.send('service_47vx99l', 'template_jv1q5vo', templateParams, 'ekSsPejJYK6BBqm2F')
      .then(() => {
        console.log('Email sent successfully');
        toast.success("Email sent successfully!", {
          style: {
            backgroundColor: '#28a745',
            color: '#fff',
            fontSize: '16px',
            borderRadius: '8px',
          },
        });
      })
      .catch((error) => {
        console.error('Failed to send email:', error);
        toast.error("Failed to send email.", {
          style: {
            fontSize: '16px',
            borderRadius: '8px',
          },
        });
      })
      .finally(() => {
        setLoading(false); // End loading
      });
  };

  

  useEffect(() => {
    const fetchAadhaar = async () => {
      try {
        console.log("📄 AADHAAR FETCH: Starting fetch process...");
        console.log("📄 AADHAAR FETCH: User email:", userEmail);
        
        if (!userEmail) {
          console.log("⚠️ AADHAAR FETCH: No user email, skipping fetch");
          return;
        }

        console.log("🔗 AADHAAR FETCH: Connecting to Firestore...");
        console.log("🔗 AADHAAR FETCH: Database instance:", db ? "Connected" : "Not connected");
        
        // go inside user -> register subcollection
        const registerRef = collection(db, "users", userEmail, "register");
        console.log("📂 AADHAAR FETCH: Querying collection path: users/" + userEmail + "/register");
        
        const snapshot = await getDocs(registerRef);
        console.log("📊 AADHAAR FETCH: Query complete. Documents found:", snapshot.size);

        if (!snapshot.empty) {
          // pick first place (you can loop if you want multiple)
          const firstPlaceDoc = snapshot.docs[0];
          const data = firstPlaceDoc.data();
          console.log("📝 AADHAAR FETCH: First document data:", data);
          console.log("📝 AADHAAR FETCH: Documents field:", data.documents);

          if (data.documents?.aashaarcard) {
            console.log("✅ AADHAAR FETCH: Aadhaar URL found:", data.documents.aashaarcard);
            setAadhaarUrl(data.documents.aashaarcard);
            setAadharCard(data.documents.aashaarcard);
            console.log("✅ AADHAAR FETCH: States updated with URL");
          } else {
            console.log("⚠️ AADHAAR FETCH: No aashaarcard field in documents");
            setAadhaarUrl(null);
          }
        } else {
          console.log("⚠️ AADHAAR FETCH: No documents in register collection");
          setAadhaarUrl(null);
        }
      } catch (error) {
        console.error("❌ AADHAAR FETCH ERROR:", error);
        console.error("❌ AADHAAR FETCH ERROR Details:", error.message);
      } finally {
        setLoading(false);
        console.log("🏁 AADHAAR FETCH: Process complete");
      }
    };

    fetchAadhaar();
  }, [userEmail]);

  const processOCR = async (file) => {
    try {
      const { data: { text } } = await Tesseract.recognize(file, 'eng', {
        logger: (m) => console.log(m), // Log progress
      });
      console.log('Extracted text:', text); // Log extracted text to the console
  
      // Validate Aadhaar after extracting text
      validateAadhaarCard(text);
    } catch (error) {
      console.error('Error during OCR processing:', error);
      toast.error("Failed to extract text from the document.", {
        style: {
          fontSize: '16px',
          borderRadius: '8px',
        },
      });
    }
  };

  // Function to upload a file to Firebase Storage and return the download URL
  const uploadFile = async (file) => {
    const storageRef = ref(storage, `documents/${userEmail}/${file.name}`);
    await uploadBytes(storageRef, file);
    return getDownloadURL(storageRef);
  };

  const handleSubmit = async (e) => {
  e.preventDefault();
  
  console.log("🚀 SUBMIT: Form submission started");
  console.log("📋 SUBMIT: Checking all fields...");
  console.log("📋 placeName:", placeName, "- Valid:", !!placeName);
  console.log("📋 address:", address, "- Valid:", !!address);
  console.log("📋 name:", name, "- Valid:", !!name);
  console.log("📋 fromTime:", fromTime, "- Valid:", !!fromTime);
  console.log("📋 toTime:", toTime, "- Valid:", !!toTime);
  console.log("📋 fromDate:", fromDate, "- Valid:", !!fromDate);
  console.log("📋 toDate:", toDate, "- Valid:", !!toDate);
  console.log("📋 landmark.lat:", landmark.lat, "- Valid:", landmark.lat !== null);
  console.log("📋 landmark.lng:", landmark.lng, "- Valid:", landmark.lng !== null);
  console.log("📋 aashaarcard:", aashaarcard ? (typeof aashaarcard === 'string' ? 'URL' : 'File') : 'MISSING', "- Valid:", !!aashaarcard);
  console.log("📋 nocLetter:", nocLetter, "- Valid:", !!nocLetter);
  console.log("📋 buildingPermission:", buildingPermission, "- Valid:", !!buildingPermission);
  console.log("📋 placePicture:", placePicture, "- Valid:", !!placePicture);

  // Check which fields are missing
  const missingFields = [];
  if (!placeName) missingFields.push("Place Name");
  if (!address) missingFields.push("Address");
  if (!name) missingFields.push("Name");
  if (!fromTime) missingFields.push("From Time");
  if (!toTime) missingFields.push("To Time");
  if (!fromDate) missingFields.push("From Date");
  if (!toDate) missingFields.push("To Date");
  if (landmark.lat === null) missingFields.push("Landmark Latitude");
  if (landmark.lng === null) missingFields.push("Landmark Longitude");
  if (!aashaarcard) missingFields.push("Aadhaar Card");
  if (!nocLetter) missingFields.push("NOC Letter");
  if (!buildingPermission) missingFields.push("Building Permission");
  if (!placePicture) missingFields.push("Place Picture");

  if (!placeName || !address || !fromTime || !toTime || !fromDate || !toDate || !name ||
    landmark.lat === null || landmark.lng === null || !aashaarcard || !nocLetter || !buildingPermission || !placePicture) {
    console.log("❌ SUBMIT: Validation failed. Missing fields:", missingFields);
    toast.error("Please fill all fields and upload all documents. Missing: " + missingFields.join(", "));
    return;
  }
  
  console.log("✅ SUBMIT: All fields validated successfully");

  setLoading(true);

  try {
    const formData = new FormData();

    // Add text data
    const payload = {
      placeName,
      address,
      name,
      ownerEmail,
      userEmail,
      parking_number: parkingNumber || 'N/A',
      availability: { from: fromTime, to: toTime },
      dateRange: { from: fromDate, to: toDate },
      landmark,
      accessType,
    };

    formData.append('data', JSON.stringify(payload));
    
    console.log("📦 SUBMIT: Building FormData...");
    console.log("📦 aashaarcard type:", typeof aashaarcard);
    
    // If aashaarcard is a string (URL), just append the URL, else append the file
    if (typeof aashaarcard === 'string') {
      console.log("📦 SUBMIT: Using existing Aadhaar URL");
      formData.append('aashaarcardUrl', aashaarcard);
    } else {
      console.log("📦 SUBMIT: Uploading new Aadhaar file");
      formData.append('aashaarcard', aashaarcard);
    }
    
    formData.append('nocLetter', nocLetter);
    formData.append('buildingPermission', buildingPermission);
    formData.append('placePicture', placePicture);
    
    console.log("🌐 SUBMIT: Sending request to:", `${process.env.REACT_APP_API_URL}/api/register-place`);

    const response = await fetch(`${process.env.REACT_APP_API_URL}/api/register-place`, {
      method: 'POST',
      body: formData
    });

    console.log("📡 SUBMIT: Response status:", response.status);
    const result = await response.json();
    console.log("📡 SUBMIT: Response data:", result);

    if (response.ok) {
      console.log("✅ SUBMIT: Registration successful!");
      toast.success("Place registered successfully");
      handleSendEmail(); // Still done from frontend if needed
      setCurrentStep(1);
    } else {
      console.log("❌ SUBMIT: Registration failed:", result.error);
      toast.error(result.error || "Failed to register place");
    }
  } catch (error) {
    console.error('❌ SUBMIT ERROR:', error);
    console.error('❌ SUBMIT ERROR Details:', error.message);
    toast.error("Something went wrong");
  } finally {
    setLoading(false);
    console.log("🏁 SUBMIT: Process complete");
  }
};

  const handleFileChange = (file, setter, isAadhar = false) => {
    console.log("📁 FILE UPLOAD:", isAadhar ? "AADHAAR CARD" : "Other document", "- File:", file?.name || file);
    setter(file);
  
    // Only run OCR and Aadhaar validation for the Aadhaar field
    if (isAadhar) {
      console.log("🔍 AADHAAR: Starting OCR validation...");
      processOCR(file)
        .then(() => console.log("✅ AADHAAR: OCR validation complete"))
        .catch((error) => console.error("❌ AADHAAR: OCR failed:", error));
    }
  };
  
  
  // Adjusted validateAadhaarCard to avoid running on other fields
// Function to validate Aadhaar card by checking the number and keywords
const validateAadhaarCard = (ocrText) => {
  const aadhaarNumberMatch = ocrText.match(/\b[2-9]{1}[0-9]{11}\b/);
  
  // Check for Aadhaar-related keywords directly within the validate function
  const keywords = ["Aadhaar", "Government of India", "Unique Identification"];
  const hasAadhaarKeywords = keywords.some((keyword) => ocrText.includes(keyword));

  if (aadhaarNumberMatch && hasAadhaarKeywords) {
    toast.success("The uploaded document is a valid Aadhaar card.");
    console.log("The uploaded document is a valid Aadhaar card.");
    return true;
  } else {
    toast.error("The uploaded document is not a valid Aadhaar card.");
    console.log("The uploaded document is not a valid Aadhaar card.");
    return false;
  }
};

return (
<div className="form123">
    {/* Move ToastContainer outside conditional rendering */}
    <ToastContainer 
      position="top-right"
      autoClose={5000}
      hideProgressBar={false}
      newestOnTop={false}
      closeOnClick
      rtl={false}
      pauseOnFocusLoss
      draggable
      pauseOnHover
    />
    {loading ? ( // Conditionally render loading state
      <Loading /> // Replace with your loading component
    ) : (
      <>
       <ProgressBar
  currentStep={currentStep}
  totalSteps={totalSteps}
  onNext={handleNext}
  onPrev={handlePrev}
  onSubmit={(e) => {
    // Prevent page reload
    e.preventDefault();
    handleSubmit(e);
  }}
/>

        <div className="register-layout-container">
        <div className="text123">
          {currentStep === 1 && (
      <>
        {/* <h2>Place Registration Form</h2> */}
        <p className='stepNo'>Step 1</p>
        <p className='head123'>Welcome! Let's Get to Know You</p>
        <p className='explain'>This will help us to make your registration seamless. This information will also help us to stay connected with you!</p>
      </>
    )}
    {currentStep === 2 && (
      <>
        <p className='stepNo'>Step 2</p>
        <p className='head123'>Location Details</p>
        <p className='explain'>Please provide the name and address of the place you wish to register. This helps us know where to reach out if needed.</p>
      </>
    )}
    {currentStep === 3 && (
      <>
        <p className='stepNo'>Step 3</p>
        <p className='head123'>Document Uploads</p>
        <p className='explain'>Upload the necessary documents to verify your registration. This step ensures compliance and safety.</p>
      </>
    )}
    {currentStep === 4 && (
      <>
        <p className='stepNo'>Step 4</p>
        <p className='head123'>Availability & Slots</p>
        <p className='explain'>Specify the parking availability and timing to help us manage your space more effectively.</p>
      </>
    )}
    {currentStep === 5 && (
      <>
        <p className='stepNo'>Step 5</p>
        <p className='head123'>Location Details</p>
        <p className='explain'>Please provide the name and address of the place you wish to register. This helps us know where to reach out if needed.</p>
      </>
    )}
    {currentStep === 6 && (
      <>
        <p className='stepNo'>Step 6</p>
        <p className='head123'>Map Location</p>
        <p className='explain'>Set your location on the map to allow easy navigation and accessibility to your place.</p>
      </>
    )}
  </div>
      <div className="register-place-container">
        {/* <h2>Place Registration Form</h2> */}
        {userName && <h3>HI, welcome {userName}</h3>}

        <div className="slider">
          <form onSubmit={handleSubmit} className="register-place-form">
            {/* Step 1: Basic Information */}
            {currentStep === 1 && (
              <div className="step">
                
                
      <div className="register-s1-name">    
      <label className="floating-label">Name:</label>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Your Name"
        required
      />
    </div>
    <div className="register-s1-email">
    <label className="floating-label">Email:</label>
      <input
        type="email"
        value={ownerEmail} // Use the auto-filled email
         // Make the field read-only if you want to prevent editing
        placeholder="example@gmail.com"
      />
    </div>
    
    
              </div>
              
            )}
            
            {currentStep === 2 && (
              <div className="step">
                <div className='register-s2-placename'>
                <label className="floating-label">Place Name:</label>
                  <input
                    type="text"
                    value={placeName}
                    onChange={(e) => setPlaceName(e.target.value)}
                    placeholder='Place Name'
                    required
                  />
                </div>
                <div className="register-s2-placeaddress">
                <label className="floating-label">Address:</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder='Address'
                    required
                  />
                </div>
                
                
              </div>
              
            )}

            {/* Step 2: Document Uploads */}
            {currentStep === 3 && (
  <div className="step">
    <div className="row1">
      {/* Aadhaar Upload / Preview */}
<label className="flabel">Upload Aadhaar Card:</label>
{aadhaarUrl ? (
  <div className="file-preview-box">
    <iframe
      src={aadhaarUrl}
      title="Aadhaar Preview"
      className="aadhaar-preview"
    ></iframe>
  </div>
) : (
  <FileUpload
    id="aadhar"
    className="register-s3-u"
    required
    onFileChange={(file) => handleFileChange(file, setAadharCard, true)} // Aadhaar validation
  />
)}

      {/* NOC Upload */}
      <label className="flabel">Upload NOC Letter:</label>
      <FileUpload
        id="noc"
        className="register-s3-u"
        required
        onFileChange={(file) => handleFileChange(file, setNocLetter)}
      />
    </div>

    <div className="row1">
      {/* Building Permission Upload */}
      <label className="flabel">Upload Building Permission Letter:</label>
      <FileUpload
        id="buildingPermission"
        className="register-s3-u"
        required
        onFileChange={(file) => handleFileChange(file, setBuildingPermission)}
      />

      {/* Place Picture Upload */}
      <label className="flabel">Upload Picture of the Place:</label>
      <FileUpload
        id="placePicture"
        className="register-s3-u"
        required
        onFileChange={(file) => handleFileChange(file, setPlacePicture)}
      />
    </div>
  </div>
)}

            {/* Step 3: Availability */}
            {currentStep === 4 && (
              <div className="step">
                <div className='register-s4-noOfPark'>
                  <label>Number of Parking Slots:</label>
                  <input
                    type="text"
                    value={parkingNumber}
                    
                    onChange={(e) => setParkingNumber(e.target.value)}
                  />
                </div>
               
                <div className='date-time-container'>
  <div className='from-container'>
    <div className='register-s4-date'>
      <label>From Date:</label>
      <input
        type="date"
        value={fromDate}
        onChange={(e) => setFromDate(e.target.value)}
        required
      />
    </div>
    <div className='register-s4-time'>
      <label>From Time:</label>
      <input
        type="time"
        value={fromTime}
        onChange={(e) => setFromTime(e.target.value)}
        required
      />
    </div>
  </div>

  <div className='to-container'>
    <div className='register-s4-date'>
      <label>To Date:</label>
      <input
        type="date"
        value={toDate}
        onChange={(e) => setToDate(e.target.value)}
        required
      />
    </div>
    <div className='register-s4-time'>
      <label>To Time:</label>
      <input
        type="time"
        value={toTime}
        onChange={(e) => setToTime(e.target.value)}
        required
      />
    </div>
  </div>
</div>

                
              </div>
            )}

            {/* Step 4: Map */}
            {currentStep === 6 && (
              <div className="step">
                <h3>Set Location on the Map</h3>
                <div>
                  <input type="text" className='register-s5-loc' ref={inputRef} placeholder="Search for a place" />
                  <button type="button" className='liveloc' onClick={() => setUseLiveLocation(!useLiveLocation)}>
                    {useLiveLocation ? 'Use Custom Location' : 'Use Live Location'}
                  </button>
                </div>
                <div ref={mapRef} className="map" style={{ width: '100%', height: '401px' }}></div>
                {/* <div className="button-container">
                  
                  <button type="submit">Submit</button>
                </div> */}
              </div>
            )}

{currentStep === 5 && (
            <div className="step">
              <h3>Security and Monitoring</h3>
              <div className="register-place-security">
                <label>Are there cameras in that location?</label>
                <label>
                  <input
                    type="checkbox"
                    checked={hasCameras === 'yes'}
                    onChange={() => setHasCameras('yes')}
                  />
                  Yes
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={hasCameras === 'no'}
                    onChange={() => setHasCameras('no')}
                  />
                  No
                </label>
              </div>
              
              <div className="register-place-security">
                <label>Is there a security guard or watchman?</label>
                <label>
                  <input
                    type="checkbox"
                    checked={hasSecurityGuard === 'yes'}
                    onChange={() => setHasSecurityGuard('yes')}
                  />
                  Yes
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={hasSecurityGuard === 'no'}
                    onChange={() => setHasSecurityGuard('no')}
                  />
                  No
                </label>
              </div>

              {/* Display name and contact fields if a security guard is present */}
              {hasSecurityGuard === 'yes' && (
                <div>
                  <div className="register-place-guard-name">
                    <label>Security Guard's Name:</label>
                    <input
                      type="text"
                      value={guardName}
                      onChange={(e) => setGuardName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="register-place-guard-contact">
                    <label>Security Guard's Contact Number:</label>
                    <input
                      type="tel"
                      value={guardContact}
                      onChange={(e) => setGuardContact(e.target.value)}
                      required
                    />
                  </div>
                </div>
              )}
                
              </div>
            )}
          

          </form>
        </div>

        {errorMessage && <div className="error-message">{errorMessage}</div>}
        </div>
        </div>
      </>
    )}
  </div>
);
};

export default RegisterPlace;