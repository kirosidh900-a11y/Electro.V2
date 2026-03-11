import multer from "multer";
import path from "path";
import fs from "fs";
import AppError from "../../utils/partials/AppError.utils.js";
import HTTP_STATUS from "../../constant/statusCode.js";

const storage = multer.diskStorage({
  destination: (req, file, cb) => {

    const dir = path.join(process.cwd(),"src", "public", "uploads", "brands");

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    cb(null, dir);
  },

  filename: (req, file, cb) => {

    const ext = path.extname(file.originalname);
    const name = Date.now() + ext;

    cb(null, name);
  }
});

const fileFilter = (req, file, cb) => {

  const allowed = [
    "image/png",
    "image/jpeg",
    "image/webp",
    "image/svg+xml"
  ];

  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError("Only image files allowed", HTTP_STATUS.UNPROCESSABLE_ENTITY), false);
  }

};

const uploadBrandLogo = multer({
  storage,
  fileFilter
});

export default uploadBrandLogo;