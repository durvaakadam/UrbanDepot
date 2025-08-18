
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const admin = require("firebase-admin");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
const serviceAccount = require("./serviceAccountKey.json");
const path = require('path');
const Razorpay = require('razorpay');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Firebase Admin Init
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: "urbandepot-cbda0.appspot.com" // replace this with your actual bucket
});

const db = admin.firestore();
const bucket = admin.storage().bucket();

// Multer config
const upload = multer({ storage: multer.memoryStorage() });
// ✅ Auth middleware for protected routes
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized: No token provided" });
  }

  const idToken = authHeader.split("Bearer ")[1];

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.user = decodedToken;
    next();
  } catch (err) {
    res.status(401).json({ error: "Unauthorized: Invalid token" });
  }
};

// ✅ Protected route test
app.get("/api/protected", authenticateToken, (req, res) => {
  res.json({
    message: "✅ Protected route accessed!",
    user: req.user,
  });
});

// ============================
// 🔻 Admin routes below
// ============================

app.get("/api/places", async (req, res) => {
  try {
    const snapshot = await db.collection("places").get();
    const places = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    res.status(200).json(places);
  } catch (error) {
    console.error("Error fetching places:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/api/places/:placeId", async (req, res) => {
  const { placeId } = req.params;
  try {
    const doc = await db.collection("places").doc(placeId).get();
    if (!doc.exists) {
      return res.status(404).json({ error: "Place not found" });
    }
    res.status(200).json({ id: doc.id, ...doc.data() });
  } catch (error) {
    console.error("Error fetching place:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/api/places/:placeId/reservations", async (req, res) => {
  const { placeId } = req.params;
  try {
    const reservationsRef = db.collection("places").doc(placeId).collection("reservations");
    const snapshot = await reservationsRef.get();
    const reservations = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    res.status(200).json(reservations);
  } catch (error) {
    console.error("Error fetching reservations:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post('/api/verify/:id', async (req, res) => {
  const placeId = req.params.id;

  try {
    const placeRef = db.collection('places').doc(placeId);
    await placeRef.update({ verified: true });
    res.status(200).send({ message: 'Place verified successfully' });
  } catch (error) {
    console.error("Verification error:", error);
    res.status(500).send({ error: 'Verification failed' });
  }
});

app.delete('/api/places/:id', async (req, res) => {
  const placeId = req.params.id;

  try {
    const placeRef = db.collection('places').doc(placeId);
    await placeRef.delete();
    res.status(200).send({ message: 'Place deleted successfully' });
  } catch (error) {
    console.error("Delete error:", error);
    res.status(500).send({ error: 'Delete failed' });
  }
});

// ❌ Don't do login from backend
app.post("/login", (req, res) => {
  const { email, password } = req.body;

  // TODO: verify user in DB
  const user = { id: 1, email }; // Example user object

  const token = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: "1h" });
  
  res.json({ token });
});






app.post('/api/create-order', async (req, res) => {
  const { amount } = req.body;

  const options = {
    amount: amount * 100, // in paise
    currency: 'INR',
    receipt: `receipt_order_${Math.random()}`,
  };

  try {
    const order = await razorpay.orders.create(options);
    res.status(200).json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error creating Razorpay order' });
  }
});

// ✅ Verify Razorpay Signature
app.post("/api/verify-payment", (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ message: "Missing fields" });
  }

  const body = razorpay_order_id + "|" + razorpay_payment_id;

  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(body.toString())
    .digest("hex");

  // ✅ Logging AFTER declaration
  console.log("BODY RECEIVED: ", req.body);
  console.log("Expected Signature: ", expectedSignature);
  console.log("Received Signature: ", razorpay_signature);
  console.log("Match:", expectedSignature === razorpay_signature);

  if (expectedSignature === razorpay_signature) {
  console.log("✅ Payment verified successfully");
  res.status(200).json({ verified: true });
} else {
  console.log("❌ Payment verification failed");
  res.status(400).json({ verified: false });
}
});



app.get("/availability/:placeId", async (req, res) => {
  const { placeId } = req.params;
  try {
    const placeRef = db.collection("places").doc(placeId);
    const placeSnap = await placeRef.get();

    if (!placeSnap.exists) {
      return res.status(404).json({ error: "Place not found" });
    }

    const { availability } = placeSnap.data();

    if (typeof availability !== "string") {
      return res.status(400).json({ error: "Invalid availability format" });
    }

    const reservationsSnap = await placeRef.collection("reservations").get();
    const reservations = reservationsSnap.docs.map(doc => doc.data());

    const availableSlots = calculateAvailableSlots(availability, reservations);

    res.json({ availableSlots });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

function calculateAvailableSlots(availability, reservations) {
  const [startTime, endTime] = availability.split(" - ").map(time => new Date(`1970-01-01T${time}:00`));

  const reservedSlots = reservations.map(r => ({
    checkin: new Date(`1970-01-01T${r.checkin}:00`),
    checkout: new Date(`1970-01-01T${r.checkout}:00`),
  }));

  const availableSlots = [];
  let lastEndTime = startTime;

  reservedSlots.forEach(slot => {
    if (lastEndTime < slot.checkin) {
      availableSlots.push(`${formatTime(lastEndTime)} - ${formatTime(slot.checkin)}`);
    }
    lastEndTime = slot.checkout > lastEndTime ? slot.checkout : lastEndTime;
  });

  if (lastEndTime < endTime) {
    availableSlots.push(`${formatTime(lastEndTime)} - ${formatTime(endTime)}`);
  }

  return availableSlots;
}

function formatTime(date) {
  return date.toTimeString().slice(0, 5);
}


app.get("/api/fetch-places", async (req, res) => {
  try {
    const snapshot = await db.collection("places").get();
    const places = [];

    const today = new Date();
    const formattedToday = today.toISOString().split("T")[0];

    for (const doc of snapshot.docs) {
      const data = doc.data();

      // Skip unverified places
      if (!data.verified) continue;

      const { lat, lng } = data.landmark || {};
      const address = data.address || "Not available";
      const availability = data.availability || { from: "Not available", to: "Not available" };
      const charge = data.charge || "Not available";
      const accessType = data.accessType || "Not available";
      const dateRange = data.dateRange || { from: "Not available", to: "Not available" };

      const dateRangeTo = dateRange.to;

      // Skip expired places
      if (dateRangeTo && new Date(dateRangeTo) < today) continue;

      // Fetch reservations for today
      const reservationsSnapshot = await db
        .collection("places")
        .doc(doc.id)
        .collection("reservations")
        .get();

      const reservations = [];
      reservationsSnapshot.forEach((reservationDoc) => {
        const r = reservationDoc.data();
        if (r.checkinDate === formattedToday) {
          reservations.push({
            reservationId: reservationDoc.id,
            checkinTime: r.checkinTime || "Not available",
            checkoutTime: r.checkoutTime || "Not available",
          });
        }
      });

      places.push({
        id: doc.id,
        lat,
        lng,
        address,
        availability,
        charge,
        accessType,
        dateRange,
        reservations,
      });
    }

    res.status(200).json(places);
  } catch (error) {
    console.error("Error fetching places with lat/lng:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ✅ Fetch all reservations for admin grouped by date
app.get("/api/reservations-grouped", async (req, res) => {
  try {
    const placesSnapshot = await db.collection("places").get();
    let reservationsList = [];

    for (const placeDoc of placesSnapshot.docs) {
      const placeId = placeDoc.id;
      const reservationsSnapshot = await db
        .collection("places")
        .doc(placeId)
        .collection("reservations")
        .get();

      reservationsSnapshot.forEach((reservationDoc) => {
        const reservationData = reservationDoc.data();
        const createdAt = reservationData.createdAt;

        if (!createdAt) return;

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
        acc[reservationDate] = {
          reservations: [],
          total: 0,
        };
      }

      acc[reservationDate].reservations.push(reservation);
      acc[reservationDate].total += Number(platform_fee) || 0;

      return acc;
    }, {});

    res.status(200).json(groupedReservations);
  } catch (error) {
    console.error("Error fetching grouped reservations:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get all bookings for a user
app.get("/api/profile/bookings/:email", async (req, res) => {
  try {
    const { email } = req.params;
    const snapshot = await db.collection("users").doc(email).collection("bookings").get();
    const bookings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.status(200).json(bookings);
  } catch (err) {
    console.error("Error fetching bookings:", err);
    res.status(500).json({ error: "Error fetching bookings" });
  }
});

// Get all registered places for a user
app.get("/api/profile/places/:email", async (req, res) => {
  try {
    const { email } = req.params;
    const snapshot = await db.collection("users").doc(email).collection("register").get();
    const places = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.status(200).json(places);
  } catch (err) {
    console.error("Error fetching places:", err);
    res.status(500).json({ error: "Error fetching registered places" });
  }
});

// Delete a booking
app.delete("/api/profile/bookings/:email/:bookingId", async (req, res) => {
  try {
    const { email, bookingId } = req.params;
    await db.collection("users").doc(email).collection("bookings").doc(bookingId).delete();
    res.status(200).json({ message: "Booking canceled" });
  } catch (err) {
    console.error("Error deleting booking:", err);
    res.status(500).json({ error: "Failed to cancel booking" });
  }
});

// Delete a registered place
app.delete("/api/profile/places/:email/:placeId", async (req, res) => {
  try {
    const { email, placeId } = req.params;
    await db.collection("users").doc(email).collection("register").doc(placeId).delete();
    res.status(200).json({ message: "Place deleted" });
  } catch (err) {
    console.error("Error deleting place:", err);
    res.status(500).json({ error: "Failed to delete place" });
  }
});


const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Route to create Razorpay order
app.post('/api/create-order', async (req, res) => {
  try {
    const { amount } = req.body;

    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100),
      currency: 'INR',
      receipt: `receipt_order_${Date.now()}`,
    });

    res.json(order);
  } catch (error) {
    console.error("Error creating Razorpay order:", error);
    res.status(500).json({ error: "Failed to create order" });
  }
});

// Route to verify Razorpay payment
app.post('/api/verify-payment', (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  const sign = razorpay_order_id + '|' + razorpay_payment_id;
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(sign)
    .digest('hex');

  if (expectedSignature === razorpay_signature) {
    res.json({ verified: true });
  } else {
    res.status(400).json({ verified: false });
  }
});


app.post('/api/register-place', upload.fields([
  { name: 'aashaarcard' },
  { name: 'nocLetter' },
  { name: 'buildingPermission' },
  { name: 'placePicture' }
]), async (req, res) => {
  try {
    const data = JSON.parse(req.body.data);
    const files = req.files;

    const uploadFile = async (file, filename) => {
      const fileUpload = bucket.file(`documents/${data.userEmail}/${filename}`);
      await fileUpload.save(file[0].buffer, {
        metadata: {
          contentType: file[0].mimetype
        }
      });
      const [url] = await fileUpload.getSignedUrl({
        action: 'read',
        expires: '03-09-2500'
      });
      return url;
    };

    const aadharUrl = await uploadFile(files.aashaarcard, files.aashaarcard[0].originalname);
    const nocUrl = await uploadFile(files.nocLetter, files.nocLetter[0].originalname);
    const buildingUrl = await uploadFile(files.buildingPermission, files.buildingPermission[0].originalname);
    const picUrl = await uploadFile(files.placePicture, files.placePicture[0].originalname);

    const placeData = {
      ...data,
      documents: {
        aashaarcard: aadharUrl,
        nocLetter: nocUrl,
        buildingPermission: buildingUrl,
        placePicture: picUrl
      },
      verified: false
    };

    const docName = `${data.placeName.replace(/\s+/g, '_')}-${Date.now()}`;

    await db.doc(`users/${data.userEmail}/register/${docName}`).set(placeData);
    await db.doc(`places/${data.placeName.replace(/\s+/g, '_')}`).set(placeData);

    return res.status(200).json({ message: "Place registered successfully" });

  } catch (err) {
    console.error("Error in /register-place:", err);
    return res.status(500).json({ error: "Failed to register place" });
  }
});


app.post('/api/reserve', upload.fields([{ name: 'licensePhoto' }, { name: 'platePhoto' }]), async (req, res) => {
  try {
    const data = JSON.parse(req.body.data); // all text fields (formData)
    const licenseFile = req.files.licensePhoto?.[0];
    const plateFile = req.files.platePhoto?.[0];

    if (!licenseFile || !plateFile) {
      return res.status(400).json({ error: 'Missing uploaded files.' });
    }

    const now = Date.now();
    const licenseFileName = `licenses/${data.licensePlate}-${now}${path.extname(licenseFile.originalname)}`;
    const plateFileName = `plates/${data.licensePlate}-${now}${path.extname(plateFile.originalname)}`;

    // Upload files to Firebase Storage
    const [licenseUpload, plateUpload] = await Promise.all([
      bucket.file(licenseFileName).save(licenseFile.buffer),
      bucket.file(plateFileName).save(plateFile.buffer),
    ]);

    // Get download URLs
    const [licensePhotoURL, platePhotoURL] = await Promise.all([
      bucket.file(licenseFileName).getSignedUrl({ action: 'read', expires: '03-01-2500' }),
      bucket.file(plateFileName).getSignedUrl({ action: 'read', expires: '03-01-2500' }),
    ]);

    // Check for time conflicts
    const reservationsRef = db.collection('places').doc(data.place).collection('reservations');
    const snapshot = await reservationsRef.get();
    const requestedCheckin = new Date(`${data.checkinDate}T${data.checkinTime}:00`);
    const requestedCheckout = new Date(`${data.checkoutDate}T${data.checkoutTime}:00`);

    let conflict = false;

    snapshot.forEach(doc => {
      const res = doc.data();
      const existingCheckin = new Date(res.checkin);
      const existingCheckout = new Date(res.checkout);

      if (
        (requestedCheckin >= existingCheckin && requestedCheckin < existingCheckout) ||
        (requestedCheckout > existingCheckin && requestedCheckout <= existingCheckout) ||
        (requestedCheckin <= existingCheckin && requestedCheckout >= existingCheckout)
      ) {
        conflict = true;
      }
    });

    if (conflict) {
      return res.status(409).json({ error: 'Time slot already booked' });
    }

    // Calculate total & platform fee
    let baseAmount = 0;
    const type = data.vehicleType.toLowerCase();
    if (type === 'car') baseAmount = 30;
    else if (type === 'bike' || type === 'scooter') baseAmount = 20;
    else if (type === 'bicycle') baseAmount = 10;

    const platformFee = (baseAmount * 0.05).toFixed(2);
    const totalAmount = (baseAmount + parseFloat(platformFee)).toFixed(2);

    const reservationData = {
      ...data,
      licensePhoto: licensePhotoURL[0],
      platePhoto: platePhotoURL[0],
      checkin: `${data.checkinDate} ${data.checkinTime}`,
      checkout: `${data.checkoutDate} ${data.checkoutTime}`,
      total_amount: totalAmount,
      platform_fee: platformFee,
    };

    const reservationId = `${data.licensePlate}-${now}`;
    await db.collection('places').doc(data.place).collection('reservations').doc(reservationId).set(reservationData);
    await db.collection('users').doc(data.email).collection('bookings').doc(reservationId).set(reservationData);

    return res.status(200).json({ message: 'Reservation successful', reservationData });
  } catch (error) {
    console.error('Reservation error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ✅ Start the server
app.listen(PORT, () => {
  console.log(`✅ Backend server running at http://localhost:${PORT}`);
});
