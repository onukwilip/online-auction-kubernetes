import connect from "@/config/db";
import User from "@/models/User";
import nextConnect from "next-connect";
import cors from "cors";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { getCookie } from "cookies-next";

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
connect();

const api = nextConnect({
  onNoMatch: (req, res) => {
    return res
      .status(400)
      .json({ message: "Only GET and POST ruests are allowed" });
  },
});

api.use(cors());

api.post(async (req, res) => {
  // DESTRUCTURE BODY
  const { body } = req;
  //GET PASSWORD TOKEN COOKIE
  const passwordToken = getCookie("password-token", { req, res });
  //VERIFY IF PASSWORD TOKEN IS VALID
  const isValid = jwt.verify(passwordToken, process.env.JWT_KEY);

  //IF PASSWORD TOKEN IS NOT VALID RETURN 401 RESPONSE
  if (!isValid) return res.status(401).json({ message: "Unauthorized token" });

  //GET THE USER WITH THE EMAIL FROM PASSWORD TOKEN
  const user = await User.findOne({ email: isValid?.email });

  //IF THE OTP IS CORRECT AND IS NOT EXPIRED
  if (
    +body?.otp === user?.auth?.code &&
    new Date().getTime() < new Date(user?.auth?.expiry)?.getTime()
  ) {
    //IF THE PASSWORD AND CONFIRM PASSWORD ARE NOT THE SAME RETURN 400
    if (body.password !== body.confirmPassword)
      return res
        .status(400)
        .json({ message: "Password and confirm password must match" });

    //ENCRYPT NEW PASSWORD
    const salted = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(body?.password, salted);

    //UPDATE USER WITH NEW PASSWORD
    const updatedUser = await User.updateOne(
      { email: isValid?.email },
      {
        $set: {
          password: hashedPassword,
          "auth.code": 0,
          "auth.expiry": null,
        },
      }
    );

    //IF ERROR UPDATING USER RETURN 400
    if (!updatedUser)
      return res
        .status(400)
        .json({ message: "An error occured please try again" });

    // RETURN 200 RESPONSE
    return res.status(200).json({ message: "Password changed successfully" });
  }
  //ELSE IF THE OTP IS INCORRECT OR EXPIRED
  else {
    //RETURN 400 RESPONSE
    return res.status(400).json({
      message:
        "OTP is either incorrect OR expired, please retry or generate another",
    });
  }
});

export default api;
