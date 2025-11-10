import { User } from "../models/userModel.js";

export const getMe = async (req, res) => {
  try {
    // Lay clerkId tu req.auth duoc ho tro tu Clerk
    const clerkId = req.auth.userId;

    // Tim user trong database bang clerkId
    const user = await User.findOne({
      where: { clerkId },
    });

    // Neu khong tim thay user
    if (!user) {
      return res.status(404).json({ message: "User khong ton tai" });
    }

    // Tra ve thong tin user
    return res.status(200).json({ message: "GetMe thanh cong", user });
  } catch (error) {
    console.log("Loi khi goi getMe", error);
    return res.status(500).json({ message: "Loi he thong" });
  }
};
