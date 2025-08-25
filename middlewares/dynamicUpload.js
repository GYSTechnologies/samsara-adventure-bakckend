// middleware/dynamicUpload.js
const parser = require('./upload');
const multer = require("multer");
const dynamicUpload = (req, res, next) => {
// In dynamicUpload middleware, add more specific error handling:
parser.any()(req, res, (err) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File too large' });
    }
  }
  if (err) {
    return res.status(400).json({ message: 'File upload error', error: err.message });
  }
  next();
});
};

module.exports = dynamicUpload;