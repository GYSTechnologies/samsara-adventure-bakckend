const express = require("express");
const app = express();
const multer = require("multer");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

// ✅ Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  cors({
    origin: "*", // You can change this later to process.env.CLIENT_URL for security
    credentials: true,
  })
);

// ✅ MongoDB Connection
mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB connected successfully"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// ✅ Import Routes
const authRoute = require("./routes/AuthRoute");
const bookRoute = require("./routes/BookingRoute");
const tripRoute = require("./routes/TripRoute");
const userTripRoute = require("./routes/UserTripRoute");
const dashboardRoute = require("./routes/web/DashboardRoute");
const adminTripsRoute = require("./routes/web/AdminTripsRoute");
const eventRoute = require("./routes/EventRoute");
const paymentRoute = require("./routes/payment.routes");
const customRoutes = require("./routes/customtrip.routes");
const userRoutes = require("./routes/profile.routes");
const adminRoutes = require("./routes/web/admin.routes");
const eventRoutes = require("./routes/event.routes");
const categoryRoute = require("./routes/new/home/CategoryRoute");
const stateRoute = require("./routes/new/home/StateRoute");

// ✅ Route Middleware
app.use("/api/auth", authRoute);
app.use("/api/booking", bookRoute);
app.use("/api/trip", tripRoute);
app.use("/api/user", userTripRoute);
app.use("/", dashboardRoute);
app.use("/api/admin", adminRoutes);
app.use("/api/adminTrip", adminTripsRoute);
app.use("/api/events", eventRoutes);
app.use("/", eventRoute);
app.use("/api/payment", paymentRoute);
app.use("/api/custom-trip", customRoutes);
app.use("/api/users", userRoutes);
app.use("/api/category", categoryRoute);
app.use("/api/state", stateRoute);

// ✅ Default route
app.get("/", (req, res) => {
  res.send("Samsara Backend is running on Vercel 🚀");
});

// ✅ Error Handler
function errHandler(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      success: 0,
      message: err.message,
    });
  }
  next(err);
}
app.use(errHandler);

// ❌ DO NOT USE app.listen() on Vercel
// app.listen(3030, "0.0.0.0", () => console.log("Server running on port 3030"));

// ✅ Instead, export the Express app
module.exports = app;
