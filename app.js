const express = require('express');
const app = express();
const multer = require('multer');
const mongoose = require('mongoose');
require('dotenv').config();

app.use(express.json());

mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log("Mongo connected"))
    .catch((err) => console.log("Error connecting to MongoDB:", err));


app.use(express.json())

const authRoute = require('./routes/AuthRoute')
const bookRoute = require('./routes/BookingRoute')

app.use('/',authRoute);
app.use('/',bookRoute);

app.use('/',(req,res)=>{
    res.send("Samsara Backend")
});

function errHandler(err, req, res, next) {
    if (err instanceof multer.MulterError) {
        res.json({
            success: 0,
            message: err.message
        })
    }
}
app.use(errHandler)

app.listen(3030, '0.0.0.0', () => {
    console.log("Server running on port 3030");
});