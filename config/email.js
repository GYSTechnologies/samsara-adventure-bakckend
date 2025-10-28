const nodemailer = require("nodemailer");
require("dotenv").config();

// const transporter = nodemailer.createTransport({
//   service: "gmail",
//   auth: {
//     user: process.env.EMAIL,
//     pass: process.env.EMAIL_PASSWORD,
//   },
// });
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true, // Use STARTTLS
  requireTLS: true,
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASSWORD, // Use App Password, not regular password
  },
  connectionTimeout: 10000, // 10 seconds
  greetingTimeout: 5000,
  socketTimeout: 10000,
});


//  User Cancellation Request Confirmation
exports.sendCancellationRequestUserEmail = async (email, booking, reason) => {
  const formatDate = (date) =>
    date ? new Date(date).toLocaleDateString("en-IN", { dateStyle: "medium" }) : "N/A";

  const mailOptions = {
    from: `"Samsara Adventures" <${process.env.EMAIL}>`,
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
        <p style="color: #555;">Warm regards,<br/><strong>Team Samsara Adventures</strong></p>
      </div>
    `,
  };

  // await transporter.sendMail(mailOptions);
  await new Promise((resolve, reject) => {
    transporter.sendMail(mailOptions, (err, info) => {
      if (err) {
        reject(err);
      } else {
        resolve(info);
      }
    });
  });
};

//  Admin  Cancellation Alert
exports.sendCancellationRequestAdminEmail = async (booking, reason) => {
  transporter.verify((error, success) => {
    if (error) {
      console.error('SMTP Connection Failed:', error);
    } else {
      console.log('SMTP Server is ready');
    }
  });
  const formatDate = (date) =>
    date ? new Date(date).toLocaleDateString("en-IN", { dateStyle: "medium" }) : "N/A";

  const mailOptions = {
    from: `"Samsara Adventures" <${process.env.EMAIL}>`,
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

  // await transporter.sendMail(mailOptions);
  await new Promise((resolve, reject) => {
    transporter.sendMail(mailOptions, (err, info) => {
      if (err) {
        reject(err);
      } else {
        resolve(info);
      }
    });
  });
};


//  Admin custom mail
exports.sendAdminCustomTripEmail = async (formData) => {
  const mailOptions = {
    from: process.env.EMAIL,
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
    from: `"Samsara Adventures" <${process.env.EMAIL}>`,
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


// Custom Itinerary Confirmation Email
exports.sendCustomItineraryEmail = async (email, enquiry) => {
  const formatDate = (date) =>
    date ? new Date(date).toLocaleDateString("en-IN", { dateStyle: "medium" }) : "N/A";

  const itinerary = enquiry.customItinerary || {};
  const payment = itinerary.payment || {};

  const mailOptions = {
    from: `"Samsara Adventures" <${process.env.EMAIL}>`,
    to: email,
    subject: `📝 Custom Itinerary Approved – ${enquiry.title || "Your Trip"}`,
    html: `
      <div style="font-family: Arial, sans-serif; color: #333; padding: 16px; line-height:1.6;">
        <h2 style="color:#2c3e50;">📝 Your Custom Itinerary Has Been Created</h2>
        <p>Hi ${enquiry.name || "Traveler"},</p>
        <p>We’re excited to share your personalized travel plan for <strong>${enquiry.title}</strong>.</p>
        
        ${enquiry.image
        ? `<img src="${enquiry.image}" alt="Trip Image" style="max-width:100%; border-radius:8px; margin:16px 0;" />`
        : ""
      }

        <h3>📌 Trip Information</h3>
        <ul style="list-style:none; padding:0; margin:0;">
          <li><strong>Trip ID:</strong> ${enquiry.tripId}</li>
          <li><strong>Duration:</strong> ${enquiry.duration}</li>
          <li><strong>Start Date:</strong> ${formatDate(itinerary.startDate || enquiry.startDate)}</li>
          <li><strong>End Date:</strong> ${formatDate(itinerary.endDate || enquiry.endDate)}</li>
          <li><strong>Total Members:</strong> ${enquiry.total_members}</li>
          <li><strong>Pickup & Drop:</strong> ${itinerary.pickupDropLocation || "N/A"}</li>
        </ul>

        <h3 style="margin-top:20px;">🌍 Overview</h3>
        <ul>
          ${(itinerary.overview || [])
        .map((item) => `<li>${item}</li>`)
        .join("")}
        </ul>

        <h3 style="margin-top:20px;">✅ Inclusions</h3>
        <ul>
          ${(itinerary.inclusions || [])
        .map((item) => `<li>${item}</li>`)
        .join("")}
        </ul>

        <h3 style="margin-top:20px;">❌ Exclusions</h3>
        <ul>
          ${(itinerary.exclusions || [])
        .map((item) => `<li>${item}</li>`)
        .join("")}
        </ul>

        <h3 style="margin-top:20px;">🎯 Activities</h3>
        <p>${(itinerary.activities || []).join(", ") || "N/A"}</p>

        <h3 style="margin-top:20px;">🗓️ Day-wise Itinerary</h3>
        ${(itinerary.itinerary || [])
        .map(
          (day) => `
            <div style="margin-bottom:12px; padding:10px; border-left:3px solid #007BFF; background:#f9f9f9; border-radius:6px;">
              <strong>Day ${day.dayNumber}: ${day.title}</strong><br/>
              <em>${day.description}</em>
              <ul>
                ${(day.points || []).map((p) => `<li>${p}</li>`).join("")}
              </ul>
            </div>
          `
        )
        .join("")}

        <h3 style="margin-top:20px;">💳 Payment Summary</h3>
        <ul style="list-style:none;padding:0;">
          <li><strong>Sub Total:</strong> ₹${payment.subTotal || 0}</li>
          <li><strong>Activities:</strong> ₹${payment.activities || 0}</li>
          <li><strong>Insurance:</strong> ₹${payment.insurance || 0}</li>
          <li><strong>Taxation:</strong> ₹${payment.taxation || 0}</li>
          <li><strong>Grand Total:</strong> <span style="color:green;font-weight:bold;">₹${payment.grandTotal || 0}</span></li>
        </ul>

        <p style="margin-top:20px;">✅ Your itinerary has been approved. Please proceed with payment when ready to confirm your booking.</p>

        <br/>
        <p style="color:#555;">Warm regards,<br/><strong>Team Samsara Adventures</strong></p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};



// User Cancellation Approval & Refund Email
exports.sendCancellationApprovalEmail = async (email, booking) => {
  const formatDate = (date) =>
    date ? new Date(date).toLocaleDateString("en-IN", { dateStyle: "medium" }) : "N/A";

  const payment = booking.payment || {};

  const mailOptions = {
    from: `"Samsara Adventures" <${process.env.EMAIL}>`,
    to: email,
    subject: `✅ Cancellation Approved – ${booking.title || "Your Booking"}`,
    html: `
      <div style="font-family: Arial, sans-serif; color: #333; padding:16px; line-height:1.6;">
        <h2 style="color:#27ae60;">✅ Your Cancellation Has Been Approved</h2>
        <p>Hi ${booking.name || "Traveler"},</p>
        <p>We’ve processed your cancellation request for <strong>${booking.title || "your trip"}</strong>.</p>
        
        <h3>📌 Booking Details</h3>
        <ul style="list-style:none; padding:0;">
          <li><strong>Trip ID:</strong> ${booking.tripId}</li>
          <li><strong>Duration:</strong> ${booking.duration || "N/A"}</li>
          <li><strong>Start Date:</strong> ${formatDate(booking.startDate)}</li>
          <li><strong>End Date:</strong> ${formatDate(booking.endDate)}</li>
          <li><strong>Total Members:</strong> ${booking.total_members || 1}</li>
        </ul>

        <h3 style="margin-top:20px;">💳 Refund Information</h3>
        ${payment.refundStatus === "NOT_APPLICABLE"
        ? `<p>No refund is applicable for this booking as per the cancellation policy.</p>`
        : `
              <ul style="list-style:none; padding:0;">
                <li><strong>Refund Amount:</strong> ₹${payment.refundAmount || 0}</li>
                <li><strong>Refund Percentage:</strong> ${payment.refundPercentage || 0}%</li>
                <li><strong>Status:</strong> ${payment.refundStatus === "PROCESSED"
          ? "<span style='color:green;font-weight:bold;'>Processed</span>"
          : payment.refundStatus === "FAILED"
            ? "<span style='color:red;font-weight:bold;'>Failed</span>"
            : payment.refundStatus
        }</li>
                ${payment.refundId
          ? `<li><strong>Refund ID:</strong> ${payment.refundId}</li>`
          : ""
        }
                ${payment.refundProcessedAt
          ? `<li><strong>Processed At:</strong> ${formatDate(payment.refundProcessedAt)}</li>`
          : ""
        }
              </ul>
            `
      }

        <p style="margin-top:20px;">If you have any questions, feel free to contact our support team.</p>
        
        <br/>
        <p style="color:#555;">Warm regards,<br/><strong>Team Samsara Adventures</strong></p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};
