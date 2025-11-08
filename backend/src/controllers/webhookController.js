import { User } from "../models/userModel.js";

export const handleClerkWebhook = async (req, res) => {
  try {
    const event = req.body;
    console.log("Nhan webhook: ", event.type);

    // Kiem tra loai su kien tu Clerk
    if (event.type !== "user.created") {
      return res.status(400).json({ message: "Loai su kien khong hop le" });
    }

    // Lay thong tin user tu payload cua Clerk
    const user = event.data;

    const clerkId = user.id;
    const username = user.username || `${user.first_name || ""} ${user.last_name || ""}`.trim();
    const email = user.email_addresses?.[0]?.email_address || null;
    const phone = user.phone_numbers?.[0]?.phone_number || null;

    // Tao user moi trong database neu chua ton tai
    await User.findOrCreate({
      where: { clerkId },
      defaults: {
        username,
        email,
        phone,
        role: "user",
      },
    });

    console.log(`User co (${email}) đã được thêm vào database`);

    return res.status(200).json({ message: "Webhook xu ly thanh cong" });
  } catch (error) {
    console.log("Loi khi handleClerkWebhook", error);
    return res.status(500).json({ message: "Loi he thong" });
  }
};
