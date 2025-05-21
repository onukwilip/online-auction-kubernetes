import connect from "@/config/db";
import User from "@/models/User";
import {
  fromBase64,
  generateRandom,
  passwordOTPTemplate,
  sendMail,
  toBase64,
} from "@/utils";
import nextConnect from "next-connect";
import cors from "cors";
import jwt from "jsonwebtoken";
import { setCookie } from "cookies-next";

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
connect();

export const sendAuth = async (email, body) => {
  const code = generateRandom(100000, 999999);
  const updatedUser = await User.updateOne(
    { email: email },
    {
      $set: {
        "auth.code": code,
        "auth.expiry": new Date().setMinutes(new Date().getMinutes() + 30),
      },
    },
    { new: true }
  );
  const user = await User.findOne({ email: email });

  if (user) {
    const mail = await sendMail({
      from: "gerydragos@gmail.com",
      to: email,
      subject: "onlineAuction (Confirm your email address)",
      text: null,
      html: passwordOTPTemplate(code, body?.to),
    });
    if (mail) {
      return 200;
    }
    return 400;
  }
  return 404;
};

const api = nextConnect({
  onNoMatch: (req, res) => {
    return res
      .status(400)
      .json({ message: "Only GET and POST ruests are allowed" });
  },
});

api.use(cors());

api.post(async (req, res) => {
  const body = req.body;

  const sent = await sendAuth(body?.email, body);

  if (sent === 200) {
    const passwordToken = jwt.sign(
      { email: body?.email, type: "password" },
      process.env.JWT_KEY,
      { expiresIn: 60 * 30 }
    );
    setCookie("password-token", passwordToken, { req, res, httpOnly: true });
    return res.status(200).json({ message: "Mail sent successfully" });
  }
  if (sent === 400) {
    return res.status(400).json({ message: "Could not send mail to client" });
  }
  if (sent === 404) {
    return res.status(404).json({ message: "User doesn't exist" });
  }
  return res.status(400).json({ message: "An error occured" });
});

export default api;
