import { Webhook } from "svix";
export const verifyClerkSignature = (req, res, next) => {
  try {
    const payload = JSON.stringify(req.body);
    const headers = req.headers;
    const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET);
    const event = wh.verify(payload, headers);

    req.body = event;
    next();
  } catch (error) {
    console.log("Loi khi verifyClerkSignature", error);
    return res.status(400).json({ message: "Chu ky khong hop le" });
  }
};
