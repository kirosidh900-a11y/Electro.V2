import multer from "multer";
import pkg from "multer-storage-cloudinary";
import cloudinary from "../config/cloudinary.js";

// ✅ FIXED IMPORT
const CloudinaryStorage = pkg.default || pkg;

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder: req.folder || "general",
    format: file.mimetype.split("/")[1],
  }),
});

const upload = multer({ storage });

export default upload;
