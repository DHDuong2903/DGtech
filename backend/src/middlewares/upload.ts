// @ts-nocheck
import multer from "multer";

/** Memory storage: file goes to req.file.buffer; Cloudinary upload runs in controller (more reliable than streaming middleware). */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (req: any, file: any, cb: any) => {
    if (file.mimetype?.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed!"));
    }
  },
});

/**
 * Wraps multer so parse errors become JSON instead of Express HTML.
 */
function handleUploadSingle(fieldName: string) {
  return (req: any, res: any, next: any) => {
    upload.single(fieldName)(req, res, (err: any) => {
      if (!err) return next();
      console.error("Product image upload error:", err?.message || err);
      const code = err.code;
      const status =
        code === "LIMIT_FILE_SIZE" || code === "LIMIT_FIELD_VALUE"
          ? 413
          : 400;
      const message =
        typeof err.message === "string" && err.message.length > 0
          ? err.message
          : "File upload failed";
      return res.status(status).json({ error: message, code: code || undefined });
    });
  };
}

export { upload, handleUploadSingle };
