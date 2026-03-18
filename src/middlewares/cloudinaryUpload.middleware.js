import multer from "multer";

const upload = multer({
  storage: multer.memoryStorage(), // 🔥 important
  limits: {
    fileSize: 2 * 1024 * 1024,
  },
});

export default upload;
