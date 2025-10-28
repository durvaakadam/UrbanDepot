const express = require("express")
const cors = require("cors")
const bodyParser = require("body-parser")
const admin = require("firebase-admin")
const multer = require("multer")
const { v4: uuidv4 } = require("uuid")
let serviceAccount = null
try {
  if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON environment variable is not set")
  }
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
} catch (err) {
  console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON:", err.message)
  process.exit(1)
}
const path = require("path")
const Razorpay = require("razorpay")
const crypto = require("crypto")
require("dotenv").config()

const app = express()
const PORT = 8080

// Health check endpoint for CI/CD
app.get("/healthz", (req, res) => res.status(200).send("OK"))

// Middleware
app.use(cors())
app.use(bodyParser.json())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

const demoRoutes = require("./routes/demo.js")
app.use("/api", demoRoutes)

// Firebase Admin Init
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "urbandepot-cbda0.appspot.com",
})

const db = admin.firestore()
const bucket = admin.storage().bucket()

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
})

// Multer config
const upload = multer({ storage: multer.memoryStorage() })

// ✅ Auth middleware for protected routes
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized: No token provided" })
  }

  const idToken = authHeader.split("Bearer ")[1]

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken)
    req.user = decodedToken
    next()
  } catch (err) {
    res.status(401).json({ error: "Unauthorized: Invalid token" })
  }
}

// ✅ Protected route test
app.get("/api/protected", authenticateToken, (req, res) => {
  res.json({
    message: "✅ Protected route accessed!",
    user: req.user,
  })
})

// ============================
// 🔻 Admin routes below
// ============================
app.post("/api/bookings/checkAvailability", async (req, res) => {
  try {
    const { place, checkin, checkout } = req.body

    if (!place || !checkin || !checkout) {
      return res.status(400).json({ available: false, error: "Missing data" })
    }

    const checkinDate = new Date(checkin)
    const checkoutDate = new Date(checkout)

    // ✅ Get today's date range
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)

    const endOfDay = new Date()
    endOfDay.setHours(23, 59, 59, 999)

    // ✅ Fetch all reservations for this place
    const reservationsRef = db.collection("places").doc(place).collection("reservations")
    const snapshot = await reservationsRef.get()
    const todayBookings = snapshot.docs
      .map((doc) => doc.data())
      .filter((b) => {
        const bCheckin = new Date(b.checkin)
        const bCheckout = new Date(b.checkout)
        // Filter bookings that overlap with today
        return bCheckin < endOfDay && bCheckout > startOfDay
      })

    console.log("📌 Availability check for place:", place)
    console.log("🕒 Requested:", checkinDate.toISOString(), "→", checkoutDate.toISOString())
    console.log("📅 Today bookings for this place:")
    todayBookings.forEach((b) => {
      console.log(`   ➡️ ${b.checkin} → ${b.checkout}`)
    })

    // ✅ Overlap check with requested slot
    const overlapping = todayBookings.find((b) => {
      const bCheckin = new Date(b.checkin)
      const bCheckout = new Date(b.checkout)
      return bCheckin < checkoutDate && bCheckout > checkinDate
    })

    if (overlapping) {
      console.log("❌ Slot overlaps with:", overlapping.checkin, "→", overlapping.checkout)
      return res.json({ available: false, todayBookings })
    }

    console.log("✅ Slot is free")
    return res.json({ available: true, todayBookings })
  } catch (err) {
    console.error("❌ Availability check error:", err)
    res.status(500).json({ available: false, error: "Server error" })
  }
})

app.get("/api/places", async (req, res) => {
  try {
    const snapshot = await db.collection("places").get()
    const places = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))
    res.status(200).json(places)
  } catch (error) {
    console.error("Error fetching places:", error)
    res.status(500).json({ error: "Internal Server Error" })
  }
})

app.get("/api/places/:placeId", async (req, res) => {
  const { placeId } = req.params
  try {
    const doc = await db.collection("places").doc(placeId).get()
    if (!doc.exists) {
      return res.status(404).json({ error: "Place not found" })
    }
    res.status(200).json({ id: doc.id, ...doc.data() })
  } catch (error) {
    console.error("Error fetching place:", error)
    res.status(500).json({ error: "Internal Server Error" })
  }
})

app.get("/api/places/:placeId/reservations", async (req, res) => {
  const { placeId } = req.params
  try {
    const reservationsRef = db.collection("places").doc(placeId).collection("reservations")
    const snapshot = await reservationsRef.get()
    const reservations = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))
    res.status(200).json(reservations)
  } catch (error) {
    console.error("Error fetching reservations:", error)
    res.status(500).json({ error: "Internal Server Error" })
  }
})

app.post("/api/verify/:id", async (req, res) => {
  const placeId = req.params.id

  try {
    const placeRef = db.collection("places").doc(placeId)
    await placeRef.update({ verified: true })
    res.status(200).send({ message: "Place verified successfully" })
  } catch (error) {
    console.error("Verification error:", error)
    res.status(500).send({ error: "Verification failed" })
  }
})

app.delete("/api/places/:id", async (req, res) => {
  const placeId = req.params.id

  try {
    const placeRef = db.collection("places").doc(placeId)
    await placeRef.delete()
    res.status(200).send({ message: "Place deleted successfully" })
  } catch (error) {
    console.error("Delete error:", error)
    res.status(500).send({ error: "Delete failed" })
  }
})

// ✅ Fetch all bookings for a place (improved search)
app.get("/api/profile/bookings/place/:placeName", async (req, res) => {
  try {
    const { placeName } = req.params
    console.log("📌 Fetching bookings for place:", placeName)

    let placeDoc = null

    // Method 1: Try exact match first
    try {
      const exactDoc = await db.collection("places").doc(placeName).get()
      if (exactDoc.exists) {
        placeDoc = exactDoc
        console.log("✅ Found place by exact match:", placeName)
      }
    } catch (error) {
      console.log("⚠️ Exact match failed for:", placeName)
    }

    // Method 2: Try with underscores (placeName with spaces converted)
    if (!placeDoc) {
      try {
        const underscoreVersion = placeName.replace(/\s+/g, "_")
        const underscoreDoc = await db.collection("places").doc(underscoreVersion).get()
        if (underscoreDoc.exists) {
          placeDoc = underscoreDoc
          console.log("✅ Found place by underscore version:", underscoreVersion)
        }
      } catch (error) {
        console.log("⚠️ Underscore match failed for:", placeName)
      }
    }

    // Method 3: Search by placeName field in documents
    if (!placeDoc) {
      try {
        const placesSnapshot = await db.collection("places").where("placeName", "==", placeName).get()
        if (!placesSnapshot.empty) {
          placeDoc = placesSnapshot.docs[0]
          console.log("✅ Found place by placeName field:", placeName)
        }
      } catch (error) {
        console.log("⚠️ Field search failed for:", placeName)
      }
    }

    // Method 4: Fallback to startsWith search
    if (!placeDoc) {
      try {
        const placesSnapshot = await db.collection("places").get()
        const foundDoc = placesSnapshot.docs.find((doc) => {
          const docId = doc.id
          const data = doc.data()
          return docId.startsWith(placeName) || 
                 docId.startsWith(placeName.replace(/\s+/g, "_")) ||
                 (data.placeName && data.placeName.toLowerCase() === placeName.toLowerCase())
        })
        
        if (foundDoc) {
          placeDoc = foundDoc
          console.log("✅ Found place by fallback search:", foundDoc.id)
        }
      } catch (error) {
        console.log("⚠️ Fallback search failed for:", placeName)
      }
    }

    if (!placeDoc) {
      console.log("⚠️ Place not found for name:", placeName)
      return res.status(200).json([])
    }

    console.log("📍 Using place document:", placeDoc.id)
    const reservationsRef = db.collection("places").doc(placeDoc.id).collection("reservations")
    const snapshot = await reservationsRef.get()

    if (snapshot.empty) {
      console.log("⚠️ No bookings found for place:", placeDoc.id)
      return res.status(200).json([])
    }

    const bookings = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))

    // Sort bookings by creation time (newest first)
    bookings.sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt) : new Date(0)
      const timeB = b.createdAt ? new Date(b.createdAt) : new Date(0)
      return timeB - timeA
    })

    console.log("✅ Bookings fetched and sorted:", bookings.length, "bookings for", placeDoc.id)
    res.status(200).json(bookings)
  } catch (err) {
    console.error("❌ Error fetching bookings for place:", err)
    res.status(500).json({ error: "Failed to fetch bookings for this place" })
  }
})

app.post("/api/create-order", async (req, res) => {
  const { amount } = req.body

  const options = {
    amount: amount, // already in paise from frontend
    currency: "INR",
    receipt: `receipt_order_${Math.random()}`,
  }

  try {
    const order = await razorpay.orders.create(options)
    res.status(200).json(order)
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: "Error creating Razorpay order" })
  }
})

// ✅ Verify Razorpay Signature
app.post("/api/verify-payment", (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ message: "Missing fields" })
  }

  const body = razorpay_order_id + "|" + razorpay_payment_id

  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(body.toString())
    .digest("hex")

  // ✅ Logging AFTER declaration
  console.log("BODY RECEIVED: ", req.body)
  console.log("Expected Signature: ", expectedSignature)
  console.log("Received Signature: ", razorpay_signature)
  console.log("Match:", expectedSignature === razorpay_signature)

  if (expectedSignature === razorpay_signature) {
    console.log("✅ Payment verified successfully")
    res.status(200).json({ verified: true })
  } else {
    console.log("❌ Payment verification failed")
    res.status(400).json({ verified: false })
  }
})

app.get("/availability/:placeId", async (req, res) => {
  const { placeId } = req.params
  try {
    const placeRef = db.collection("places").doc(placeId)
    const placeSnap = await placeRef.get()

    if (!placeSnap.exists) {
      return res.status(404).json({ error: "Place not found" })
    }

    const { availability } = placeSnap.data()

    if (typeof availability !== "string") {
      return res.status(400).json({ error: "Invalid availability format" })
    }

    const reservationsSnap = await placeRef.collection("reservations").get()
    const reservations = reservationsSnap.docs.map((doc) => doc.data())

    const availableSlots = calculateAvailableSlots(availability, reservations)

    res.json({ availableSlots })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Internal server error" })
  }
})

function calculateAvailableSlots(availability, reservations) {
  const [startTime, endTime] = availability.split(" - ").map((time) => new Date(`1970-01-01T${time}:00`))

  const reservedSlots = reservations.map((r) => ({
    checkin: new Date(`1970-01-01T${r.checkin}:00`),
    checkout: new Date(`1970-01-01T${r.checkout}:00`),
  }))

  const availableSlots = []
  let lastEndTime = startTime

  reservedSlots.forEach((slot) => {
    if (lastEndTime < slot.checkin) {
      availableSlots.push(`${formatTime(lastEndTime)} - ${formatTime(slot.checkin)}`)
    }
    lastEndTime = slot.checkout > lastEndTime ? slot.checkout : lastEndTime
  })

  if (lastEndTime < endTime) {
    availableSlots.push(`${formatTime(lastEndTime)} - ${formatTime(endTime)}`)
  }

  return availableSlots
}

function formatTime(date) {
  return date.toTimeString().slice(0, 5)
}

app.get("/api/fetch-places", async (req, res) => {
  try {
    const snapshot = await db.collection("places").get()
    const places = []

    const today = new Date()
    const formattedToday = today.toISOString().split("T")[0]

    for (const doc of snapshot.docs) {
      const data = doc.data()

      // Skip unverified places
      if (!data.verified) continue

      const { lat, lng } = data.landmark || {}
      const address = data.address || "Not available"
      const availability = data.availability || { from: "Not available", to: "Not available" }
      const charge = data.charge || "Not available"
      const accessType = data.accessType || "Not available"
      const dateRange = data.dateRange || { from: "Not available", to: "Not available" }

      const dateRangeTo = dateRange.to

      // Skip expired places
      if (dateRangeTo && new Date(dateRangeTo) < today) continue

      // Fetch reservations for today
      const reservationsSnapshot = await db.collection("places").doc(doc.id).collection("reservations").get()

      const reservations = []
      reservationsSnapshot.forEach((reservationDoc) => {
        const r = reservationDoc.data()
        if (r.checkinDate === formattedToday) {
          reservations.push({
            reservationId: reservationDoc.id,
            checkinTime: r.checkinTime || "Not available",
            checkoutTime: r.checkoutTime || "Not available",
          })
        }
      })

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
      })
    }

    res.status(200).json(places)
  } catch (error) {
    console.error("Error fetching places with lat/lng:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// ✅ Fetch all reservations for admin grouped by date
app.get("/api/reservations-grouped", async (req, res) => {
  try {
    const placesSnapshot = await db.collection("places").get()
    const reservationsList = []

    for (const placeDoc of placesSnapshot.docs) {
      const placeId = placeDoc.id
      const reservationsSnapshot = await db.collection("places").doc(placeId).collection("reservations").get()

      reservationsSnapshot.forEach((reservationDoc) => {
        const reservationData = reservationDoc.data()
        const createdAt = reservationData.createdAt

        if (!createdAt) return

        const reservationDate = new Date(createdAt).toLocaleDateString()

        reservationsList.push({
          placeId,
          reservationId: reservationDoc.id,
          reservationDate,
          ...reservationData,
        })
      })
    }

    const groupedReservations = reservationsList.reduce((acc, reservation) => {
      const { reservationDate, total_amount } = reservation

      if (!acc[reservationDate]) {
        acc[reservationDate] = {
          reservations: [],
          total: 0,
        }
      }

      acc[reservationDate].reservations.push(reservation)
      acc[reservationDate].total += Number(total_amount) || 0

      return acc
    }, {})

    res.status(200).json(groupedReservations)
  } catch (error) {
    console.error("Error fetching grouped reservations:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Get all bookings for a user
app.get("/api/profile/bookings/:email", async (req, res) => {
  try {
    const { email } = req.params
    const snapshot = await db.collection("users").doc(email).collection("bookings").get()
    const bookings = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
    res.status(200).json(bookings)
  } catch (err) {
    console.error("Error fetching bookings:", err)
    res.status(500).json({ error: "Error fetching bookings" })
  }
})

// Get all registered places for a user
app.get("/api/profile/places/:email", async (req, res) => {
  try {
    const { email } = req.params
    const snapshot = await db.collection("users").doc(email).collection("register").get()
    const places = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
    res.status(200).json(places)
  } catch (err) {
    console.error("Error fetching places:", err)
    res.status(500).json({ error: "Error fetching registered places" })
  }
})

// Delete a booking
app.delete("/api/profile/bookings/:email/:bookingId", async (req, res) => {
  try {
    const { email, bookingId } = req.params
    await db.collection("users").doc(email).collection("bookings").doc(bookingId).delete()
    res.status(200).json({ message: "Booking canceled" })
  } catch (err) {
    console.error("Error deleting booking:", err)
    res.status(500).json({ error: "Failed to cancel booking" })
  }
})

// Delete a registered place
app.delete("/api/profile/places/:email/:placeId", async (req, res) => {
  try {
    const { email, placeId } = req.params
    await db.collection("users").doc(email).collection("register").doc(placeId).delete()
    res.status(200).json({ message: "Place deleted" })
  } catch (err) {
    console.error("Error deleting place:", err)
    res.status(500).json({ error: "Failed to delete place" })
  }
})

app.post(
  "/api/register-place",
  upload.fields([
    { name: "aashaarcard" },
    { name: "nocLetter" },
    { name: "buildingPermission" },
    { name: "placePicture" },
  ]),
  async (req, res) => {
    try {
      const data = JSON.parse(req.body.data)
      const files = req.files

      const uploadFile = async (file, filename) => {
        const fileUpload = bucket.file(`documents/${data.userEmail}/${filename}`)
        await fileUpload.save(file[0].buffer, {
          metadata: {
            contentType: file[0].mimetype,
          },
        })
        const [url] = await fileUpload.getSignedUrl({
          action: "read",
          expires: "03-09-2500",
        })
        return url
      }

      // Handle Aadhar: use existing URL or upload new file
      let aadharUrl;
      if (data.existingAadhaarUrl) {
        aadharUrl = data.existingAadhaarUrl;
      } else if (files.aashaarcard && files.aashaarcard[0]) {
        aadharUrl = await uploadFile(files.aashaarcard, files.aashaarcard[0].originalname);
      } else {
        return res.status(400).json({ error: "No Aadhar card provided" });
      }

      // Upload other required files
      if (!files.nocLetter || !files.nocLetter[0]) {
        return res.status(400).json({ error: "NOC Letter is required" });
      }
      if (!files.buildingPermission || !files.buildingPermission[0]) {
        return res.status(400).json({ error: "Building Permission is required" });
      }
      if (!files.placePicture || !files.placePicture[0]) {
        return res.status(400).json({ error: "Place Picture is required" });
      }

      const nocUrl = await uploadFile(files.nocLetter, files.nocLetter[0].originalname)
      const buildingUrl = await uploadFile(files.buildingPermission, files.buildingPermission[0].originalname)
      const picUrl = await uploadFile(files.placePicture, files.placePicture[0].originalname)

      const placeData = {
        ...data,
        documents: {
          aashaarcard: aadharUrl,
          nocLetter: nocUrl,
          buildingPermission: buildingUrl,
          placePicture: picUrl,
        },
        verified: false,
      }

      const docName = `${data.placeName.replace(/\s+/g, "_")}-${Date.now()}`

      await db.doc(`users/${data.userEmail}/register/${docName}`).set(placeData)
      await db.doc(`places/${data.placeName.replace(/\s+/g, "_")}`).set(placeData)

      return res.status(200).json({ message: "Place registered successfully" })
    } catch (err) {
      console.error("Error in /register-place:", err)
      return res.status(500).json({ error: "Failed to register place" })
    }
  },
)

app.post("/api/reserve", upload.fields([{ name: "licensePhoto" }, { name: "platePhoto" }]), async (req, res) => {
  try {
    const data = JSON.parse(req.body.data) // all text fields (formData)
    const licenseFile = req.files.licensePhoto?.[0]
    const plateFile = req.files.platePhoto?.[0]

    if (!licenseFile || !plateFile) {
      return res.status(400).json({ error: "Missing uploaded files." })
    }

    const now = Date.now()
    const licenseFileName = `licenses/${data.licensePlate}-${now}${path.extname(licenseFile.originalname)}`
    const plateFileName = `plates/${data.licensePlate}-${now}${path.extname(plateFile.originalname)}`

    // Upload files to Firebase Storage
    const [licenseUpload, plateUpload] = await Promise.all([
      bucket.file(licenseFileName).save(licenseFile.buffer),
      bucket.file(plateFileName).save(plateFile.buffer),
    ])

    // Get download URLs
    const [licensePhotoURL, platePhotoURL] = await Promise.all([
      bucket.file(licenseFileName).getSignedUrl({ action: "read", expires: "03-01-2500" }),
      bucket.file(plateFileName).getSignedUrl({ action: "read", expires: "03-01-2500" }),
    ])

    // Check for time conflicts
    const reservationsRef = db.collection("places").doc(data.place).collection("reservations")
    const snapshot = await reservationsRef.get()
    const requestedCheckin = new Date(`${data.checkinDate}T${data.checkinTime}:00`)
    const requestedCheckout = new Date(`${data.checkoutDate}T${data.checkoutTime}:00`)

    let conflict = false

    snapshot.forEach((doc) => {
      const res = doc.data()
      const existingCheckin = new Date(res.checkin)
      const existingCheckout = new Date(res.checkout)

      if (
        (requestedCheckin >= existingCheckin && requestedCheckin < existingCheckout) ||
        (requestedCheckout > existingCheckin && requestedCheckout <= existingCheckout) ||
        (requestedCheckin <= existingCheckin && requestedCheckout >= existingCheckout)
      ) {
        conflict = true
      }
    })

    if (conflict) {
      return res.status(409).json({ error: "Time slot already booked" })
    }

    // Calculate total & platform fee based on duration
    const checkin = new Date(`${data.checkinDate}T${data.checkinTime}`)
    const checkout = new Date(`${data.checkoutDate}T${data.checkoutTime}`)
    const differenceInHours = (checkout - checkin) / (1000 * 60 * 60) // Hours difference

    const hourlyRates = {
      car: 30,
      bike: 20,
      scooter: 20,
      bicycle: 10
    }

    const hourlyRate = hourlyRates[data.vehicleType.toLowerCase()] || 0
    const baseAmount = differenceInHours * hourlyRate
    const platformFeePercentage = 0.05
    const platformFee = (baseAmount * platformFeePercentage).toFixed(2)
    const totalAmount = (baseAmount + Number.parseFloat(platformFee)).toFixed(2)

    const reservationData = {
      ...data,
      licensePhoto: licensePhotoURL[0],
      platePhoto: platePhotoURL[0],
      checkin: `${data.checkinDate} ${data.checkinTime}`,
      checkout: `${data.checkoutDate} ${data.checkoutTime}`,
      total_amount: totalAmount,
      platform_fee: platformFee,
    }

    const reservationId = `${data.licensePlate}-${now}`
    await db.collection("places").doc(data.place).collection("reservations").doc(reservationId).set(reservationData)
    await db.collection("users").doc(data.email).collection("bookings").doc(reservationId).set(reservationData)

    return res.status(200).json({ message: "Reservation successful", reservationData })
  } catch (error) {
    console.error("Reservation error:", error)
    return res.status(500).json({ error: "Internal server error" })
  }
})

// ============================
// 🔻 Dashboard Analytics Endpoints
// ============================

// Get user activity metrics - bookings count per user
app.get("/api/dashboard/user-activity", async (req, res) => {
  try {
    const usersSnapshot = await db.collection("users").get()
    const userActivity = []

    for (const userDoc of usersSnapshot.docs) {
      const userEmail = userDoc.id
      const bookingsSnapshot = await db.collection("users").doc(userEmail).collection("bookings").get()

      userActivity.push({
        email: userEmail,
        bookingsCount: bookingsSnapshot.size,
        userData: userDoc.data(),
      })
    }

    // Sort by bookings count descending
    userActivity.sort((a, b) => b.bookingsCount - a.bookingsCount)

    res.status(200).json(userActivity)
  } catch (error) {
    console.error("Error fetching user activity:", error)
    res.status(500).json({ error: "Failed to fetch user activity" })
  }
})

// Get booking trends - reservations over time (daily/weekly)
app.get("/api/dashboard/booking-trends", async (req, res) => {
  try {
    const { period = "daily", days = 30 } = req.query
    const placesSnapshot = await db.collection("places").get()
    const bookingTrends = {}

    const now = new Date()
    const startDate = new Date(now.getTime() - Number.parseInt(days) * 24 * 60 * 60 * 1000)

    for (const placeDoc of placesSnapshot.docs) {
      const reservationsSnapshot = await db.collection("places").doc(placeDoc.id).collection("reservations").get()

      reservationsSnapshot.forEach((reservationDoc) => {
        const reservation = reservationDoc.data()
        const createdAt = reservation.createdAt ? new Date(reservation.createdAt) : null

        if (!createdAt || createdAt < startDate) return

        let dateKey
        if (period === "weekly") {
          const weekStart = new Date(createdAt)
          weekStart.setDate(createdAt.getDate() - createdAt.getDay())
          dateKey = weekStart.toISOString().split("T")[0]
        } else {
          dateKey = createdAt.toISOString().split("T")[0]
        }

        if (!bookingTrends[dateKey]) {
          bookingTrends[dateKey] = {
            date: dateKey,
            count: 0,
            revenue: 0,
          }
        }

        bookingTrends[dateKey].count += 1
        bookingTrends[dateKey].revenue += Number.parseFloat(reservation.total_amount || 0)
      })
    }

    const trendsArray = Object.values(bookingTrends).sort((a, b) => new Date(a.date) - new Date(b.date))
    res.status(200).json(trendsArray)
  } catch (error) {
    console.error("Error fetching booking trends:", error)
    res.status(500).json({ error: "Failed to fetch booking trends" })
  }
})

// Get revenue insights - platform fees and totals aggregated
app.get("/api/dashboard/revenue-insights", async (req, res) => {
  try {
    const placesSnapshot = await db.collection("places").get()
    let totalRevenue = 0
    let totalBookings = 0
    const revenueByPlace = {}
    const revenueByVehicleType = {}

    for (const placeDoc of placesSnapshot.docs) {
      const placeId = placeDoc.id
      const placeData = placeDoc.data()

      const reservationsSnapshot = await db.collection("places").doc(placeId).collection("reservations").get()

      let placeRevenue = 0
      let placeBookings = 0

      reservationsSnapshot.forEach((reservationDoc) => {
        const reservation = reservationDoc.data()
        const platformFee = Number.parseFloat(reservation.platform_fee || 0)
        const totalAmount = Number.parseFloat(reservation.total_amount || 0)
        const vehicleType = reservation.vehicleType || "unknown"

        // Use total amount paid by user, not just platform fee
        totalRevenue += totalAmount
        placeRevenue += totalAmount
        totalBookings += 1
        placeBookings += 1

        // Revenue by vehicle type
        if (!revenueByVehicleType[vehicleType]) {
          revenueByVehicleType[vehicleType] = { revenue: 0, count: 0 }
        }
        revenueByVehicleType[vehicleType].revenue += totalAmount
        revenueByVehicleType[vehicleType].count += 1
      })

      if (placeBookings > 0) {
        revenueByPlace[placeId] = {
          placeName: placeData.placeName || placeId,
          revenue: placeRevenue,
          bookings: placeBookings,
          averageRevenue: placeRevenue / placeBookings,
        }
      }
    }

    res.status(200).json({
      totalRevenue: totalRevenue.toFixed(2),
      totalBookings,
      averageRevenuePerBooking: totalBookings > 0 ? (totalRevenue / totalBookings).toFixed(2) : 0,
      revenueByPlace,
      revenueByVehicleType,
    })
  } catch (error) {
    console.error("Error fetching revenue insights:", error)
    res.status(500).json({ error: "Failed to fetch revenue insights" })
  }
})

// Get occupancy patterns - availability vs booked slots per place
app.get("/api/dashboard/occupancy-patterns", async (req, res) => {
  try {
    const placesSnapshot = await db.collection("places").get()
    const occupancyData = []

    const today = new Date()
    const last30Days = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)

    for (const placeDoc of placesSnapshot.docs) {
      const placeId = placeDoc.id
      const placeData = placeDoc.data()

      const reservationsSnapshot = await db.collection("places").doc(placeId).collection("reservations").get()

      let totalBookedHours = 0
      let recentBookings = 0

      reservationsSnapshot.forEach((reservationDoc) => {
        const reservation = reservationDoc.data()
        const checkinDate = reservation.checkinDate ? new Date(reservation.checkinDate) : null

        if (checkinDate && checkinDate >= last30Days) {
          recentBookings += 1

          // Calculate booked hours (simplified - assumes 1 hour per booking)
          totalBookedHours += 1
        }
      })

      // Calculate theoretical available hours (simplified - 12 hours per day * 30 days)
      const theoreticalAvailableHours = 12 * 30
      const occupancyRate =
        theoreticalAvailableHours > 0 ? ((totalBookedHours / theoreticalAvailableHours) * 100).toFixed(2) : 0

      occupancyData.push({
        placeId,
        placeName: placeData.placeName || placeId,
        address: placeData.address || "Unknown",
        totalBookedHours,
        theoreticalAvailableHours,
        occupancyRate: Number.parseFloat(occupancyRate),
        recentBookings,
        verified: placeData.verified || false,
      })
    }

    // Sort by occupancy rate descending
    occupancyData.sort((a, b) => b.occupancyRate - a.occupancyRate)

    res.status(200).json(occupancyData)
  } catch (error) {
    console.error("Error fetching occupancy patterns:", error)
    res.status(500).json({ error: "Failed to fetch occupancy patterns" })
  }
})

// Get owner-specific dashboard data
app.get("/api/dashboard/owner/:email", async (req, res) => {
  try {
    const { email } = req.params

    // Get owner's registered places from the main places collection directly
    const placesSnapshot = await db.collection("places").where("ownerEmail", "==", email).get()
    const ownerPlaces = placesSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))

    let totalRevenue = 0
    let totalBookings = 0
    const placeMetrics = []

    // Process each place individually
    for (const place of ownerPlaces) {
      const reservationsSnapshot = await db.collection("places").doc(place.id).collection("reservations").get()

      let placeRevenue = 0
      const placeBookings = reservationsSnapshot.size

      // Calculate owner's 2% commission from all reservations for this place
      reservationsSnapshot.forEach((reservationDoc) => {
        const reservation = reservationDoc.data()
        const totalAmount = Number.parseFloat(reservation.total_amount || 0)
        // Owner gets 2% of each booking
        const ownerCommission = totalAmount * 0.02
        placeRevenue += ownerCommission
      })

      totalRevenue += placeRevenue
      totalBookings += placeBookings

      placeMetrics.push({
        placeId: place.id,
        placeName: place.placeName,
        revenue: placeRevenue.toFixed(2),
        bookings: placeBookings,
        verified: place.verified || false,
      })
    }

    res.status(200).json({
      ownerEmail: email,
      totalPlaces: ownerPlaces.length,
      totalRevenue: totalRevenue.toFixed(2),
      totalBookings,
      placeMetrics,
    })
  } catch (error) {
    console.error("Error fetching owner dashboard:", error)
    res.status(500).json({ error: "Failed to fetch owner dashboard data" })
  }
})

// Get user-specific dashboard data
app.get("/api/dashboard/user/:email", async (req, res) => {
  try {
    const { email } = req.params

    // Get user's bookings
    const bookingsSnapshot = await db.collection("users").doc(email).collection("bookings").get()
    const userBookings = bookingsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))

    let totalSpent = 0
    const bookingsByVehicleType = {}
    const recentBookings = []

    const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    userBookings.forEach((booking) => {
      const totalAmount = Number.parseFloat(booking.total_amount || 0)
      const vehicleType = booking.vehicleType || "unknown"
      const bookingDate = booking.createdAt ? new Date(booking.createdAt) : null

      totalSpent += totalAmount

      // Group by vehicle type
      if (!bookingsByVehicleType[vehicleType]) {
        bookingsByVehicleType[vehicleType] = { count: 0, totalSpent: 0 }
      }
      bookingsByVehicleType[vehicleType].count += 1
      bookingsByVehicleType[vehicleType].totalSpent += totalAmount

      // Recent bookings (last 30 days)
      if (bookingDate && bookingDate >= last30Days) {
        recentBookings.push(booking)
      }
    })

    res.status(200).json({
      userEmail: email,
      totalBookings: userBookings.length,
      totalSpent: totalSpent.toFixed(2),
      averageSpentPerBooking: userBookings.length > 0 ? (totalSpent / userBookings.length).toFixed(2) : 0,
      bookingsByVehicleType,
      recentBookingsCount: recentBookings.length,
      recentBookings: recentBookings.slice(0, 10), // Last 10 recent bookings
    })
  } catch (error) {
    console.error("Error fetching user dashboard:", error)
    res.status(500).json({ error: "Failed to fetch user dashboard data" })
  }
})

// ✅ Start the server
app.listen(PORT, () => {
  console.log(`✅ Backend server running at http://localhost:${PORT}`)
})
