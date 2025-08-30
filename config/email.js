const nodemailer = require("nodemailer");
require("dotenv").config();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});


//  User Cancellation Request Confirmation
exports.sendCancellationRequestUserEmail = async (email, booking, reason) => {
  const formatDate = (date) =>
    date ? new Date(date).toLocaleDateString("en-IN", { dateStyle: "medium" }) : "N/A";

  const mailOptions = {
    from: `"Samsara Adventure" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `📌 Cancellation Request Received – ${booking.title || "Your Booking"}`,
    html: `
      <div style="font-family: Arial, sans-serif; color: #333; padding: 16px;">
        <h2>📌 Your Cancellation Request Has Been Received</h2>
        <p>Hi ${booking.name || "User"},</p>
        <p>We’ve received your cancellation request for <strong>${booking.title || "Booking"}</strong>.</p>
        <ul style="list-style:none;padding:0;">
          <li><strong>Booking Date:</strong> ${formatDate(booking.startDate)}</li>
          <li><strong>Amount Paid:</strong> ₹${booking.payment?.grandTotal || 0}</li>
          <li><strong>Reason:</strong> ${reason || "Not provided"}</li>
        </ul>
        <p>✅ Our team will review your request and notify you once it’s processed.</p>
        <br/>
        <p style="color: #555;">Warm regards,<br/><strong>Team Samsara Adventure</strong></p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

//  Admin  Cancellation Alert
exports.sendCancellationRequestAdminEmail = async (booking, reason) => {
  const formatDate = (date) =>
    date ? new Date(date).toLocaleDateString("en-IN", { dateStyle: "medium" }) : "N/A";

  const mailOptions = {
    from: `"Samsara Adventure" <${process.env.EMAIL_USER}>`,
    to: process.env.ADMIN_EMAIL, 
    subject: `⚠️ Cancellation Request – ${booking.title || "Booking"}`,
    html: `
      <div style="font-family: Arial, sans-serif; color: #333; padding: 16px;">
        <h2>⚠️ New Cancellation Request Received</h2>
        <p><strong>User:</strong> ${booking.email}</p>
        <p><strong>Booking:</strong> ${booking.title || "Booking"}</p>
        <ul style="list-style:none;padding:0;">
          <li><strong>Start Date:</strong> ${formatDate(booking.startDate)}</li>
          <li><strong>Total Amount:</strong> ₹${booking.payment?.grandTotal || 0}</li>
          <li><strong>Reason:</strong> ${reason || "Not provided"}</li>
          <li><strong>Potential Refund:</strong> ₹${booking.payment?.potentialRefundAmount || 0} (${booking.payment?.potentialRefundPercentage || 0}%)</li>
        </ul>
        <br/>
        <p style="color: #555;">📌 Please login to the admin panel to approve/deny this request.</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};


//  Admin custom mail
exports.sendAdminCustomTripEmail = async (formData) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: process.env.ADMIN_EMAIL, // .env me set kar admin email
    subject: `New Custom Trip Request - ${formData.tripId}`,
    html: `
      <h2>New Custom Trip Request</h2>
      <p><strong>Name:</strong> ${formData.fullName || "Not Provided"}</p>
      <p><strong>Email:</strong> ${formData.email}</p>
      <p><strong>Phone:</strong> ${formData.phone}</p>
      <p><strong>Trip ID:</strong> ${formData.tripId}</p>
      <p><strong>Start Date:</strong> ${formData.startDate}</p>
      <p><strong>Adults:</strong> ${formData.adults}</p>
      <p><strong>Children:</strong> ${formData.childrens || 0}</p>
      <p><strong>Pickup Location:</strong> ${formData.current_location}</p>
      <p><strong>Special Requests:</strong> ${formData.specialRequests || "None"}</p>
    `,
  };

  await transporter.sendMail(mailOptions);
};

//User custom mail
exports.sendUserCustomTripEmail = async (formData) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: formData.email,
    subject: "Your Custom Trip Request Submitted",
    html: `
      <h2>Thank you for your request!</h2>
      <p>Dear ${formData.fullName || "Traveller"},</p>
      <p>We have received your custom trip request for <strong>Trip ID: ${formData.tripId}</strong>.</p>
      <p>Our team will contact you within <strong>24 hours</strong> to discuss and finalize the details.</p>
      <br/>
      <p>Best regards,</p>
      <p><strong>Samsara Adventures Team</strong></p>
    `,
  };

  await transporter.sendMail(mailOptions);
};
