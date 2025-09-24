const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Create uploads folder if not exists
const uploadPath = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath);
}

// Multer config
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        const ext = path.extname(file.originalname);
        cb(null, Date.now() + ext); // unique file name
    }
});

const upload = multer({ storage });

module.exports = upload;
