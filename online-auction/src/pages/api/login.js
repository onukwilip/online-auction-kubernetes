import connect from "@/config/db";
import User from "@/models/User";
import { generateJWT, generateToken, toBase64 } from "@/utils";
import bcrypt from "bcrypt";
import nextConnect from "next-connect";
import cors from "cors";
import { setCookie } from "cookies-next";

connect();

const api = nextConnect({
  onNoMatch: (req, res) => {
    return res.status(400).json({ message: "Only POST ruests are allowed" });
  },
});

api.use(cors());

api.post(async (req, res) => {
  const body = req.body;
  const password = body?.password;
  const user = await User.findOne({ email: body?.email });

  if (user && (await bcrypt.compare(password, user?.password))) {
    if (user.authenticated === true) {
      // Return JWT token
      const token = await generateToken({
        userId: user?.id,
        email: user?.email,
        req,
        res,
      });

      setCookie("session_id", toBase64(user?._id), {
        req,
        res,
        maxAge: 60 * 60 * 24 * 7,
      });

      return res.status(200).json({
        message: "Login successfull",
        access_token: token?.data?.accessToken,
        refresh_token: token?.data?.refreshToken,
        user: user,
      });
    }
    return res
      .status(400)
      .json({ message: "User not authenticated", user: { _id: user?._id } });
  }

  return res.status(404).json({ message: "Incorrect username or password" });
});

export default api;

// export default async function Login(req, res) {
//   connect();

//   const body = req.body;
//   const password = body?.password;
//   const user = await User.findOne({ email: body?.email });

//   if (user && (await bcrypt.compare(password, user?.password))) {
//     if (user.authenticated === true) {
//       // Return JWT token
//       const token = await generateToken({
//         userId: user?.id,
//         email: user?.email,
//         req,
//         res,
//       });

//       return res.status(200).json({
//         message: "Login successfull",
//         access_token: token?.data?.accessToken,
//         refresh_token: token?.data?.refreshToken,
//         user: user,
//       });
//     }
//     return res
//       .status(400)
//       .json({ message: "User not authenticated", user: { _id: user?._id } });
//   }

//   return res.status(404).json({ message: "Incorrect username or password" });
// }
