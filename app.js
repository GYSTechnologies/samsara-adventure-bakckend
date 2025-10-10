const express = require("express");
const app = express();
const multer = require("multer");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

app.use(express.json());

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("Mongo connected"))
  .catch((err) => console.log("Error connecting to MongoDB:", err));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Example for Express
app.use(
  cors({
      // origin: 'http://localhost:5173',
    origin: process.env.CLIENT_URL,
    credentials: true,
  })
);

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

const categoryRoute = require('./routes/new/home/CategoryRoute');
const stateRoute = require('./routes/new/home/StateRoute');

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

// new Apis home
app.use("/api/category", categoryRoute);
app.use("/api/state", stateRoute);

app.use("/", (req, res) => {
  res.send("Samsara Backend");
});

function errHandler(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    res.json({
      success: 0,
      message: err.message,
    });
  }
}
app.use(errHandler);

app.listen(3030, "0.0.0.0", () => {
  console.log("Server running on port 3030");
});
