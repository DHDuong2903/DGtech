import { Webhook } from "svix";
export const verifyClerkSignature = (req, res, next) => {
  try {
    // Với express.raw(), req.body là Buffer, cần convert sang string
    const payload = req.body.toString();
    const headers = req.headers;
    const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET);
    const event = wh.verify(payload, headers);

    // Set lại req.body thành parsed event để controller dùng
    req.body = event;
    next();
  } catch (error) {
    console.log("Loi khi verifyClerkSignature", error);
    return res.status(400).json({ message: "Chu ky khong hop le" });
  }
};
