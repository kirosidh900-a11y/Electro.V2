import multer from "multer";
import AppError from "../utils/partials/AppError.utils.js";
import HTTP_STATUS from "../constant/statusCode.js";
import { fileTypeFromBuffer } from "file-type";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/svg+xml", "image/gif"];

// First-pass filter: checks the declared MIME type from the browser
const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError("Only image files are allowed (JPG, PNG, WEBP, SVG, GIF)", HTTP_STATUS.BAD_REQUEST), false);
  }
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB
  },
  fileFilter,
});

// Second-pass middleware: validates actual file magic bytes (prevents MIME spoofing)
// Attach after upload.single() / upload.array() in routes that need it
export const validateImageBuffer = async (req, res, next) => {
  try {
    const files = req.files?.length ? req.files : req.file ? [req.file] : [];

    for (const file of files) {
      if (!file.buffer || file.buffer.length === 0) {
        return next(new AppError("Empty file uploaded", HTTP_STATUS.BAD_REQUEST));
      }

      // SVG is XML text — file-type won't detect it, trust the MIME filter above
      if (file.mimetype === "image/svg+xml") continue;

      const detected = await fileTypeFromBuffer(file.buffer);

      if (!detected || !ALLOWED_MIME_TYPES.includes(detected.mime)) {
        return next(
          new AppError(
            "Invalid file content. Only real image files are allowed.",
            HTTP_STATUS.BAD_REQUEST,
          ),
        );
      }
    }

    next();
  } catch (err) {
    next(err);
  }
};

export default upload;
