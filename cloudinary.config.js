const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");

cloudinary.config({
  cloud_name: "dvvqawfal",
  api_key: "165278648878932",
  api_secret: "KxMziF9dSRjS91Mv8lIkBrRZ7zw",
});

const storage = new CloudinaryStorage({
  cloudinary,
  allowedFormats: ["jpg", "png"],
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const uploadCloud = multer({ storage });

module.exports = uploadCloud;