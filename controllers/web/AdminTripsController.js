const TripItinerary = require('../../models/TripItinerarySchema')
const Booking = require('../../models/BookingSchema')

const getPackagesTrips = async (req, res) => {
    try {
        const trips = await TripItinerary.find({ tripType: 'PACKAGE' })
            .select('tripId title duration startDate endDate isActive payment.grandTotal images'); // <-- image add kiya

        if (!trips || trips.length === 0) {
            return res.status(404).json({ message: "Package Trips not found." });
        }

        // Add booking count for each trip
        const tripsWithBookingCount = await Promise.all(
            trips.map(async (trip) => {
                const enrolledCount = await Booking.countDocuments({ tripId: trip.tripId });
                return {
                    tripId: trip.tripId,
                    title: trip.title,
                    duration: trip.duration,
                    startDate: trip.startDate,
                    endDate: trip.endDate,
                    isActive: trip.isActive,
                    grandTotal: trip.payment?.grandTotal || 0,
                    enrolledCount,
                    image: trip.images || null // <-- yaha image bhej raha
                };
            })
        );

        return res.status(200).json(tripsWithBookingCount);
    } catch (error) {
        console.error('Error getting package trips:', error);
        return res.status(500).json({ message: 'Server error' });
    }
};


// ================== PLAN OWN TRIPS ==================
const getPlanOwnTrips = async (req, res) => {
    try {
        // 1. Fetch all bookings
        const bookings = await Booking.find({ tripType: 'CUSTOMIZED' }).select(
            "name title duration startDate endDate payment.grandTotal total_members tripId"
        );

        if (!bookings || bookings.length === 0) {
            return res.status(404).json({ message: "No bookings found" });
        }

        // 2. For each booking, fetch related trip's isActive + image
        const results = await Promise.all(
            bookings.map(async (booking) => {
                const trip = await TripItinerary.findOne({ tripId: booking.tripId })
                    .select("isActive images"); // <-- image add kiya

                return {
                    name: booking.name,
                    title: booking.title,
                    duration: booking.duration,
                    startDate: booking.startDate,
                    endDate: booking.endDate,
                    total_members: booking.total_members,
                    grandTotal: booking.payment?.grandTotal || 0,
                    isActive: trip ? trip.isActive : false,
                    image: trip ? trip.images : null 
                };
            })
        );

        return res.status(200).json(results);
    } catch (error) {
        console.error("Error fetching booking with trip status:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }

};

//payments
const getPayments = async (req, res) => {
    try {
        const bookings = await Booking.find({ isPaymentPending: false })
            .select("name email phone payment.grandTotal tripId payment.paymentDate payment.transactionId tripType payment.status title")
            .sort({ "payment.paymentDate": -1 });

        if (!bookings || bookings.length === 0) {
            return res.status(404).json({ message: "No payments found" });
        }

        const results = bookings.map((booking) => {
            return {
                name: booking.name,
                email: booking.email,
                phone: booking.phone,
                title: booking.title,
                tripId: booking.tripId,
                grandTotal: booking.payment?.grandTotal || 0,
                paymentDate: booking.payment?.paymentDate || '',
                transactionId: booking.payment?.transactionId || '',
                tripType: booking.tripType,
                status: booking.payment?.status || 'completed'
            }
        });

        return res.status(200).json(results);
    } catch (error) {
        console.error("Error fetching payments:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

// // GET payment-stats
// const getPaymentStats = async (req, res) => {
//     try {
//         const bookings = await Booking.find({ isPaymentPending: false })
//             .select("payment.grandTotal tripType");

//         if (!bookings || bookings.length === 0) {
//             return res.status(200).json({
//                 totalRevenue: 0,
//                 totalTransactions: 0,
//                 packageRevenue: 0,
//                 customRevenue: 0,
//                 successfulPayments: 0,
//                 failedPayments: 0
//             });
//         }

//         const totalRevenue = bookings.reduce((sum, booking) => 
//             sum + (booking.payment?.grandTotal || 0), 0);
        
//         const packageRevenue = bookings
//             .filter(booking => booking.tripType === 'PACKAGE')
//             .reduce((sum, booking) => sum + (booking.payment?.grandTotal || 0), 0);
        
//         const customRevenue = bookings
//             .filter(booking => booking.tripType === 'CUSTOMIZED')
//             .reduce((sum, booking) => sum + (booking.payment?.grandTotal || 0), 0);

//         // Count successful vs failed payments
//         const successfulPayments = bookings.filter(b => b.payment?.status === 'COMPLETED').length;
//         const failedPayments = bookings.filter(b => b.payment?.status === 'FAILED').length;

//         return res.status(200).json({
//             totalRevenue,
//             totalTransactions: bookings.length,
//             packageRevenue,
//             customRevenue,
//             successfulPayments,
//             failedPayments
//         });
//     } catch (error) {
//         console.error("Error fetching payment statistics:", error);
//         return res.status(500).json({ message: "Internal Server Error" });
//     }
// };

// GET payment-stats
const getPaymentStats = async (req, res) => {
  try {
    // Fetch only necessary fields to keep memory usage low
    const bookings = await Booking.find({ isPaymentPending: false }).select(
      "payment.grandTotal payment.razorpay_payment_id payment.transactionId payment.status tripType"
    );

    if (!bookings || bookings.length === 0) {
      return res.status(200).json({
        totalRevenue: 0,
        totalTransactions: 0,
        packageRevenue: 0,
        customRevenue: 0,
        successfulPayments: 0,
        failedPayments: 0,
      });
    }

    let totalRevenue = 0;
    let packageRevenue = 0;
    let customRevenue = 0;
    let successfulPayments = 0;
    let failedPayments = 0;

    for (const b of bookings) {
      const grand = Number(b.payment?.grandTotal ?? 0);
      const tripType = (b.tripType || "").toString().toUpperCase();
      const razorpayId = b.payment?.razorpay_payment_id;
      const txId = b.payment?.transactionId;
      const rawStatus = b.payment?.status;
      const status = rawStatus ? rawStatus.toString().toUpperCase() : null;

      // totals
      totalRevenue += grand;
      if (tripType === "PACKAGE") packageRevenue += grand;
      if (tripType === "CUSTOMIZED") customRevenue += grand;

      // Determine success/failed
      if (status) {
        if (status === "COMPLETED" || status === "SUCCESS" || status === "PAID") {
          successfulPayments += 1;
        } else if (status === "FAILED" || status === "DECLINED") {
          failedPayments += 1;
        } else {
          // unknown explicit status -> fallback to ids
          if (razorpayId || txId) successfulPayments += 1;
          else failedPayments += 1;
        }
      } else {
        // no explicit status -> use presence of transaction identifiers as success heuristic
        if (razorpayId || txId) successfulPayments += 1;
        else failedPayments += 1;
      }
    }

    return res.status(200).json({
      totalRevenue,
      totalTransactions: bookings.length,
      packageRevenue,
      customRevenue,
      successfulPayments,
      failedPayments,
    });
  } catch (error) {
    console.error("Error fetching payment statistics:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// GET payment-details
const getPaymentDetails = async (req, res) => {
    try {
        const { tripId } = req.params;

        const booking = await Booking.findOne({ tripId })
            .select("name email phone payment.grandTotal tripId payment.paymentDate payment.transactionId tripType adults childrens total_members travelWithPet decoration photographer translator payment.refundAmount payment.refundPercentage payment.refundStatus payment.refundProcessedAt payment.refundId payment.razorpay_payment_id payment.status");

        if (!booking) {
            return res.status(404).json({ message: "Payment not found" });
        }

        const paymentDetails = {
            // Basic info
            name: booking.name,
            email: booking.email,
            phone: booking.phone,
            tripId: booking.tripId,
            tripType: booking.tripType,
            
            // Payment info
            grandTotal: booking.payment?.grandTotal || 0,
            transactionId: booking.payment?.transactionId || '',
            razorpayPaymentId: booking.payment?.razorpay_payment_id || '',
            paymentDate: booking.payment?.paymentDate || '',
            paymentStatus: booking.payment?.status || 'completed',
            
            // Member details
            adults: booking.adults || 0,
            children: booking.childrens || 0,
            totalMembers: booking.total_members || 0,
            travelWithPet: booking.travelWithPet || false,
            decoration: booking.decoration || false,
            photographer: booking.photographer || false,
            translator: booking.translator || "",
            
            // Refund info (READ ONLY)
            refundAmount: booking.payment?.refundAmount || 0,
            refundPercentage: booking.payment?.refundPercentage || 0,
            refundStatus: booking.payment?.refundStatus || "NOT_APPLICABLE",
            refundProcessedAt: booking.payment?.refundProcessedAt || '',
            refundId: booking.payment?.refundId || ''
        };

        return res.status(200).json(paymentDetails);
    } catch (error) {
        console.error("Error fetching payment details:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

// GET refunds
const getRefundData = async (req, res) => {
    try {
        const refunds = await Booking.find({ 
            "payment.refundStatus": { $in: ["PROCESSED", "FAILED", "PENDING"] } 
        })
        .select("name email tripId tripType payment.grandTotal payment.refundAmount payment.refundPercentage payment.refundStatus payment.refundProcessedAt payment.refundId payment.razorpay_payment_id")
        .sort({ "payment.refundProcessedAt": -1 });

        res.status(200).json(refunds);
    } catch (error) {
        console.error("Refund data fetch error:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

// // GET revenue-analytics
const getRevenueAnalytics = async (req, res) => {
    try {
        const { period = 'monthly' } = req.query;
        
        // Filter out documents without paymentDate
        const revenueData = await Booking.aggregate([
            { 
                $match: { 
                    isPaymentPending: false,
                    "payment.paymentDate": { $exists: true, $ne: "" }
                } 
            },
            {
                $group: {
                    _id: {
                        $dateToString: { 
                            format: period === 'daily' ? "%Y-%m-%d" : 
                                   period === 'weekly' ? "%Y-%U" : "%Y-%m",
                            date: { 
                                $dateFromString: { 
                                    dateString: "$payment.paymentDate" 
                                } 
                            }
                        }
                    },
                    totalRevenue: { $sum: "$payment.grandTotal" },
                    transactionCount: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        res.status(200).json(revenueData);
    } catch (error) {
        console.error("Revenue analytics error:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

// GET failed-payments
const getFailedPayments = async (req, res) => {
    try {
        const failedPayments = await Booking.find({
            $or: [
                { isPaymentPending: true },
                { "payment.status": "failed" }
            ]
        }).select("name email phone tripId tripType payment.grandTotal payment.paymentDate payment.status");

        res.status(200).json(failedPayments);
    } catch (error) {
        console.error("Failed payments error:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

// GET /refund-analytics
const getRefundAnalytics = async (req, res) => {
    try {
        const refundStats = await Booking.aggregate([
            {
                $match: {
                    "payment.refundStatus": { $in: ["PROCESSED", "FAILED", "PENDING"] }
                }
            },
            {
                $group: {
                    _id: "$payment.refundStatus",
                    count: { $sum: 1 },
                    totalRefundAmount: { $sum: "$payment.refundAmount" },
                    averageRefundPercentage: { $avg: "$payment.refundPercentage" }
                }
            }
        ]);

        const totalRefunded = await Booking.aggregate([
            {
                $match: {
                    "payment.refundStatus": "PROCESSED"
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: "$payment.refundAmount" }
                }
            }
        ]);

        res.status(200).json({
            statusBreakdown: refundStats,
            totalRefunded: totalRefunded[0]?.total || 0
        });
    } catch (error) {
        console.error("Refund analytics error:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

const getPassengers = async (req, res) => {
    try {
        const bookings = await Booking.find().select(
            "name email phone tripType payment.grandTotal tripId"
        );
        if (!bookings || bookings.length === 0) {
            return res.status(404).json({ message: "No bookings found" });
        }
        const results = await Promise.all(
            bookings.map(async (booking) => {
                return {
                    name: booking.name,
                    email: booking.email,
                    tripId: booking.tripId,
                    grandTotal: booking.payment?.grandTotal || 0,
                    tripType: booking.tripType,
                    phone: booking.phone
                }
            })
        );
        return res.status(200).json(results);
    } catch (error) {
        console.error("Error fetching payments:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}

const getEnquiries = async (req, res) => {
    try {
        const bookings = await Booking.find().select(
            "name email phone duration total_members title tripId"
        );
        if (!bookings || bookings.length === 0) {
            return res.status(404).json({ message: "No bookings found" });
        }
        const results = await Promise.all(
            bookings.map(async (booking) => {
                return {
                    name: booking.name,
                    email: booking.email,
                    tripId: booking.tripId,
                    title: booking.title,
                    duration: booking.duration,
                    total_members: booking.total_members,
                    phone: booking.phone
                }
            })
        );
        return res.status(200).json(results);
    } catch (error) {
        console.error("Error fetching enquiries:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}

module.exports = { getPackagesTrips, getPlanOwnTrips, getPayments, getPassengers, getEnquiries,getPaymentStats, getPaymentDetails,getRefundData,getRevenueAnalytics,getFailedPayments,getRefundAnalytics };