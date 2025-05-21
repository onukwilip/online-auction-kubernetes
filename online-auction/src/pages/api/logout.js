import connect from "@/config/db";
import RefreshToken from "@/models/RefreshToken";
import User from "@/models/User";
import { deleteCookie, getCookie } from "cookies-next";
import nextConnect from "next-connect";
import cors from "cors";

connect();

const api = nextConnect({
  onNoMatch: (req, res) => {
    return res.status(400).json({ message: "Only POST ruests are allowed" });
  },
});

api.use(cors());

api.post(async (req, res) => {
  const refreshToken = getCookie("refresh-token", { req, res });
  await RefreshToken.remove({ id: refreshToken });

  deleteCookie("access-token", { req, res });
  deleteCookie("session_id", { req, res });
  deleteCookie("refresh-token", { req, res });

  return res.status(200).json({ message: "User logged out successfully" });
});

export default api;

// export default async function Login(req, res) {
//   connect();
//   const refreshToken = getCookie("refresh-token", { req, res });
//   await RefreshToken.remove({ id: refreshToken });

//   deleteCookie("access-token", { req, res });
//   deleteCookie("refresh-token", { req, res });

//   return res.status(200).json({ message: "User logged out successfully" });
// }
