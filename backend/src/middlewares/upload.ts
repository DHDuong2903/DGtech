// @ts-nocheck
import multer from "multer";

export const MAX_PRODUCT_IMAGE_FILE_SIZE_BYTES = 5 * 1024 * 1024;
export const MAX_PRODUCT_MODEL_FILE_SIZE_BYTES = 25 * 1024 * 1024;
export const MAX_SHOWROOM_ROOM_MODEL_FILE_SIZE_BYTES = 100 * 1024 * 1024;

function isGlbUpload(file: any) {
  if (!file) return false;
  if (file.mimetype === "model/gltf-binary") return true;
  return /\.glb$/i.test(String(file.originalname || ""));
}

/** Memory storage: file goes to memory; Cloudinary upload runs in service/controller. */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_PRODUCT_MODEL_FILE_SIZE_BYTES,
  },
  fileFilter: (req: any, file: any, cb: any) => {
    if (file.fieldname === "image" && file.mimetype?.startsWith("image/")) {
      cb(null, true);
    } else if (file.fieldname === "model3d" && isGlbUpload(file)) {
      cb(null, true);
    } else {
      cb(new Error("Only image files and .glb model files are allowed!"));
    }
  },
});

const showroomSceneUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_SHOWROOM_ROOM_MODEL_FILE_SIZE_BYTES,
  },
  fileFilter: (_req: any, file: any, cb: any) => {
    if (file.fieldname === "roomModel" && isGlbUpload(file)) {
      cb(null, true);
    } else {
      cb(new Error("Only .glb room model files are allowed!"));
    }
  },
});

/**
 * Wraps multer so parse errors become JSON instead of Express HTML.
 */
function handleProductUploadFields() {
  return (req: any, res: any, next: any) => {
    upload.fields([
      { name: "image", maxCount: 1 },
      { name: "model3d", maxCount: 1 },
    ])(req, res, (err: any) => {
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

function handleShowroomSceneUpload() {
  return (req: any, res: any, next: any) => {
    showroomSceneUpload.single("roomModel")(req, res, (err: any) => {
      if (!err) return next();
      console.error("Showroom room upload error:", err?.message || err);
      const code = err.code;
      const status = code === "LIMIT_FILE_SIZE" || code === "LIMIT_FIELD_VALUE" ? 413 : 400;
      const message =
        typeof err.message === "string" && err.message.length > 0 ? err.message : "File upload failed";
      return res.status(status).json({ error: message, code: code || undefined });
    });
  };
}

export { upload, handleProductUploadFields, handleShowroomSceneUpload, isGlbUpload };
