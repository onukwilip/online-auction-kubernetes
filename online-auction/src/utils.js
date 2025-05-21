import jwt from "jsonwebtoken";
import nodeMailer from "nodemailer";
import { getCookie, setCookie } from "cookies-next";
import RefreshToken from "@/models/RefreshToken";
import { v4 as uuidv4 } from "uuid";
import multer from "multer";
import DataURIParser from "datauri/parser";
import path from "path";
import cloudinary from "./cloudinary";
import SubscribedUsers from "@/models/NotificationSubscriptions";
import Bid from "@/models/Bid";
import Users from "@/models/User";
import web_push from "web-push";

export const generateRandom = (min, max) => {
  return Math.floor(Math.random() * (max - min) + min);
};

export const sendMail = async ({ from, to, subject, html, text }) => {
  const transporter = nodeMailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: "onukwilip@gmail.com",
      pass: process.env.SMTP_APP_PASSWORD,
    },
  });

  const mailOptions = {
    from,
    to,
    subject,
    text,
    html,
  };

  console.log(`SENDING MAIL TO ${to}`);

  const sent = await transporter
    .sendMail(mailOptions)
    .catch((e) => console.error(`ERROR SENDING MAIL TO ${to}. ${e.message}`));

  return sent;
};

export const toBase64 = (string) => {
  return Buffer.from(string, "utf-8").toString("base64");
};

export const fromBase64 = (string) => {
  try {
    return Buffer.from(string, "base64").toString("utf-8");
  } catch (e) {
    return string;
  }
};

export const generateJWT = ({ id, email }) => {
  return jwt.sign(
    {
      id,
      email,
      iat: Math.floor(Date.now() / 1000) - 30,
    },
    process.env.JWT_KEY,
    { expiresIn: 60 * 10 }
  );
};

export const refreshExistingToken = async ({ refresh_token_id, req, res }) => {
  const refreshToken = await RefreshToken.findOne({ id: refresh_token_id });

  if (!refreshToken)
    return { code: 401, data: "Refresh token id doesn't exist" };

  if (new Date().getTime() >= new Date(refreshToken?.expiry).getTime())
    return { code: 401, data: "Refresh token is expired" };

  const new_refresh_token = {
    id: uuidv4(),
    email: refreshToken?.email || "",
    userId: refreshToken?.userId,
    expiry: refreshToken?.expiry,
  };

  await RefreshToken.create(new_refresh_token);
  await RefreshToken.remove({ id: refresh_token_id });
  const token = {
    accessToken: generateJWT({
      id: refreshToken?.userId,
      email: refreshToken?.email,
    }),
    refreshToken: new_refresh_token.id,
  };
  setCookie("access-token", token.accessToken, {
    req,
    res,
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 30,
  });
  setCookie("refresh-token", token.refreshToken, {
    req,
    res,
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 30,
  });
  return {
    code: 200,
    data: { ...token, id: refreshToken?.userId, email: refreshToken?.email },
  };
};

export const generateToken = async ({ userId, email, req, res }) => {
  const new_refresh_token = {
    id: uuidv4(),
    email: email,
    userId: userId,
    expiry: new Date().setDate(new Date().getDate() + 30),
  };

  const refreshToken = await RefreshToken.create(new_refresh_token);

  if (!refreshToken) return { code: 400, data: null };

  const access_token = generateJWT({ id: userId, email: email });

  const token = {
    accessToken: access_token,
    refreshToken: new_refresh_token.id,
  };

  setCookie("access-token", token.accessToken, {
    req,
    res,
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 7,
  });
  setCookie("refresh-token", token.refreshToken, {
    req,
    res,
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 7,
  });

  return {
    code: 200,
    data: token,
  };
};

export const verifyJWT = async ({
  access_token,
  refresh_token_id,
  executable,
  req,
  res,
}) => {
  return jwt.verify(access_token, process.env.JWT_KEY, async (err, decoded) => {
    return typeof executable === "function"
      ? await executable({
          err,
          decoded,
          refresh_token_id,
          req,
          res,
        })
      : { code: 401, data: "Not a function" };
  });
};

const checkJWTValue = async ({ err, decoded, refresh_token_id, req, res }) => {
  if (decoded) return { code: 200, data: decoded };
  else {
    return await refreshExistingToken({
      refresh_token_id: refresh_token_id,
      req,
      res,
    });
  }
};

export const authMiddleware = async ({ req, res }) => {
  const headers = req.headers;
  const authorization = headers?.Authorization?.split(" ") || [];
  const h_refresh_token = headers["Refresh-token"];
  const h_access_token =
    authorization[0] === "Bearer" ? authorization[1] : null;

  const access_token =
    getCookie("access-token", { req, res }) || h_access_token;
  const refresh_token =
    getCookie("refresh-token", { req, res }) || h_refresh_token;

  return verifyJWT({
    access_token,
    refresh_token_id: refresh_token,
    executable: checkJWTValue,
    req,
    res,
  });
};

export const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./public/uploads");
  },
  filename: (req, file, cb) => {
    cb(null, `${new Date().getTime()}-${file.originalname}`);
  },
});

export const mapFunction = (url) => {
  // return `/uploads/${eachFile?.filename}`;
  return url;
};

export const uploadImage = async (image, folder) => {
  const parser = new DataURIParser();
  const base64Image = parser.format(
    path.extname(image.originalname).toString(),
    image.buffer
  );
  return await cloudinary.uploader.upload(base64Image.content, folder, {
    resource_type: "image",
  });
};

export const getUploadedImagesUrl = async (files) => {
  const imagesUrls = [];
  for (const image of files) {
    const uploadedImage = await uploadImage(
      image,
      process.env.CLOUDINARY_FOLDER
    );

    imagesUrls.push(uploadedImage?.url);
  }
  return imagesUrls;
};

export const manageSubscriptionsAndBidNotifications = async (
  subscriptionBody,
  parsedBid,
  userID,
  res,
  { skipIfExists = false }
) => {
  // * MANAGE USER SUBSCRIPTIONS
  let newSubscription = false;
  if (
    subscriptionBody?.endpoint &&
    subscriptionBody?.keys?.p256dh &&
    subscriptionBody?.keys?.auth
  ) {
    const subscription = {
      endpoint: subscriptionBody.endpoint,
      keys: {
        p256dh: subscriptionBody.keys.p256dh,
        auth: subscriptionBody.keys.auth,
      },
    };

    // GET USER FROM LIST OF ALL USERS ON THE PLATFORM
    const userDetails = await Users.findOne({ _id: userID }).catch((e) =>
      console.error(
        `Could not find user with id: ${userID}, due to ${e.message}`
      )
    );
    const parsedUser = JSON.parse(JSON.stringify(userDetails));

    // GET USER FROM LIST OF SUBSCRIBED USERS ON THE PLATFORM
    const getSubscribedUser = await SubscribedUsers.findOne({
      userID: userID,
    });

    // IF USER DOESN'T EXIST, CREATE HIM/HER
    if (!getSubscribedUser) {
      await SubscribedUsers.create({
        userID: userID,
        email: parsedUser?.email,
        subscriptions: [subscription],
      }).catch((e) =>
        console.log(`Could not subscribe user due to ${e.message}`)
      );
    }
    // IF HE/SHE EXISTS
    else {
      const parsedUser = JSON.parse(JSON.stringify(getSubscribedUser));

      // GET HIS/HER EXISTING SUBSCRIPTIONS
      const subscriptionExists = parsedUser?.subscriptions?.find(
        (subsc) => subsc.endpoint === subscription.endpoint
      );

      // IF THE NEW SUBSCRIPTION DOESN'T EXIST, ADD IT
      if (!subscriptionExists) {
        newSubscription = true;
        await SubscribedUsers.updateOne(
          {
            userID: userID,
          },
          {
            $push: {
              subscriptions: {
                $each: [subscription],
              },
            },
          }
        ).catch((e) =>
          console.log(`Could not subscribe user due to ${e.message}`)
        );
      }
    }
  }

  // * IF USER IS THE FIRST TO ENABLE NOTIFICATION FOR THIS PRODUCT
  if (!parsedBid?.enabledNotifications) {
    const updatedBid = await Bid.updateOne(
      { _id: parsedBid._id },
      {
        enabledNotifications: [userID],
      }
    );

    if (!updatedBid) {
      return res.status(400).json({
        message:
          "Something went wrong. Could not enable notifications on this bid",
      });
    }

    return;
  }

  // * IF THE PARAMETER IS FALSE, GO AHEAD AND VALIDATE FOR IF A USER HAS ALREADY ENABLED NOTIFICATIONS, ELSE SKIP
  if (!skipIfExists && !newSubscription) {
    // * IF USER HAS PREVIOUSLY ENABLED NOTIFICATIONS
    if (
      Array.isArray(parsedBid?.enabledNotifications) &&
      parsedBid.enabledNotifications.includes(userID)
    ) {
      // FILTER USER FROM THE LIST OF USERS TO BE NOTIFIED
      const newEnabledNotifications = parsedBid?.enabledNotifications?.filter(
        (id) => id !== userID
      );

      const updatedBid = await Bid.updateOne(
        { _id: parsedBid._id },
        {
          enabledNotifications: [...newEnabledNotifications],
        }
      );

      if (!updatedBid) {
        return res.status(400).json({
          message:
            "Something went wrong. Could not enable notifications on this bid",
        });
      }

      return;
    }
  }

  // * IF USER HAS NOT PREVIOUSLY ENABLED NOTIFICATIONS
  if (
    Array.isArray(parsedBid?.enabledNotifications) &&
    !parsedBid.enabledNotifications.includes(userID)
  ) {
    // PUSH THE USER'S ID TO LIST OF USER TO BE NOTIFIED
    const updatedBid = await Bid.updateOne(
      { _id: parsedBid._id },
      {
        $push: {
          enabledNotifications: {
            $each: [userID],
          },
        },
      }
    );

    if (!updatedBid) {
      return res.status(400).json({
        message:
          "Something went wrong. Could not enable notifications on this bid",
      });
    }

    return;
  }
};

export const notifyUsers = async (
  parsedBid,
  userID,
  idsToSend,
  highestBid,
  notificationOptions
) => {
  console.log("Sending notifications");

  const keys = {
    publicKey:
      "BCBHO6YGYiig_WJ4i-A3If6Axi20Sbn07oLCDqTL-rkqWY9sMX58LOjkPFq4nVjP9EjdNlgC9-8Gr2SVIT_UDgU",
    privateKey: "5Jne3tSF56RCcmEHzIZKzB6M0alNCq7BId2iy6LxA4I",
  };

  web_push.setVapidDetails(
    "https://bit.ly/3Thf9PG",
    keys.publicKey,
    keys.privateKey
  );

  const allSubscribersDetils = [];

  if (idsToSend?.length > 0) {
    for (const id of idsToSend) {
      const subscriber = await SubscribedUsers.findOne({ userID: id }).catch(
        (e) => console.log(`Could not retrieve user: ${id} due to ${e.message}`)
      );
      if (!subscriber) {
        console.log(`User with ID ${id} does not exist`);
        continue;
      }
      allSubscribersDetils.push(subscriber);
    }
  }

  console.log("ALL SUBSCRIBERS", allSubscribersDetils);

  const sendEmailAndNotifications = async () => {
    for (const rawSubscriber of allSubscribersDetils) {
      const subscriber = JSON.parse(JSON.stringify(rawSubscriber));
      const id = subscriber.id;

      if (!subscriber) continue;
      if (userID === id) continue;

      const email = subscriber.email;
      const subscriptions = subscriber.subscriptions;

      console.log(`SENDING MAIL TO USER: ${email}`);
      const sentMail = await sendMail({
        from: "onukwilip@gmail.com",
        to: email,
        subject: "You've been out-bid! Place another bid before it's too late!",
        text: null,
        html: outbidOTPTemplate(
          "valued user",
          parsedBid?.name,
          highestBid,
          parsedBid?.images[0],
          parsedBid?._id
        ),
      }).catch((e) => console.log(`COULD NOT SEND MAIL TO USER: ${email}`));

      if (!sentMail) console.log(`COULD NOT SEND MAIL TO EMAIL ${email}`);
      else console.log(`MAIL SENT TO EMAIL ${email}`);

      if (Array.isArray(subscriptions)) {
        console.log(`${email} SUBSCRIPTION DETAILS`, subscriptions);
        for (const channel of subscriptions) {
          if (
            !channel?.endpoint ||
            !channel?.keys?.auth ||
            !channel?.keys?.p256dh
          ) {
            console.log(
              `Incomplete channel details for channel ${
                channel.endpoint ? channel.endpoint?.slice(0, 30) : ""
              } for user ${id}`
            );
            continue;
          }

          console.log(
            `SENDING NOTIFICATIONS TO ${email}. SUBSCRIPTION DETAILS: ${channel.endpoint?.slice(
              0,
              30
            )}`
          );
          const pushed = await web_push
            .sendNotification(
              {
                endpoint: channel.endpoint,
                keys: {
                  p256dh: channel.keys.p256dh,
                  auth: channel.keys.auth,
                },
              },
              JSON.stringify({
                title: notificationOptions?.title,
                message: notificationOptions?.message,
                destinationURL: notificationOptions?.destination,
              })
            )
            .catch((e) =>
              console.error(
                `Error sending notification to user ${id} channel ${
                  typeof channel?.endpoint === "string" &&
                  channel?.endpoint?.slice(0, 30)
                }...: ${e.message}`
              )
            );
          if (pushed)
            console.log(
              `Sucessfully sent message to user ${id} on channel ${channel?.endpoint?.slice(
                0,
                30
              )}...`
            );
        }
      } else {
        console.error(`User ${id} has no subscriptions`);
      }
    }
  };

  await sendEmailAndNotifications();
};

export const getKey = (req, ...args) =>
  `${req?.url}_${req?.method}_${args?.join("_")}`;

export const passwordOTPTemplate = (code, to) => {
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html
  xmlns="http://www.w3.org/1999/xhtml"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  style="font-family: Montserrat, sans-serif"
>
  <head>
    <meta charset="UTF-8" />
    <meta content="width=device-width, initial-scale=1" name="viewport" />
    <meta name="x-apple-disable-message-reformatting" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <meta content="telephone=no" name="format-detection" />
    <title>New email template 2023-01-26</title>
    <style type="text/css">
      #outlook a {
        padding: 0;
      }
      .es-button {
        mso-style-priority: 100 !important;
        text-decoration: none !important;
      }
      a[x-apple-data-detectors] {
        color: inherit !important;
        text-decoration: none !important;
        font-size: inherit !important;
        font-family: inherit !important;
        font-weight: inherit !important;
        line-height: inherit !important;
      }
      .es-desk-hidden {
        display: none;
        float: left;
        overflow: hidden;
        width: 0;
        max-height: 0;
        line-height: 0;
        mso-hide: all;
      }
      [data-ogsb] .es-button {
        border-width: 0 !important;
        padding: 10px 30px 10px 30px !important;
      }
      [data-ogsb] .es-button.es-button-1 {
        padding: 10px 30px !important;
      }
      @media only screen and (max-width: 600px) {
        p,
        ul li,
        ol li,
        a {
          line-height: 150% !important;
        }
        h1,
        h2,
        h3,
        h1 a,
        h2 a,
        h3 a {
          line-height: 120%;
        }
        h1 {
          font-size: 42px !important;
          text-align: center;
        }
        h2 {
          font-size: 26px !important;
          text-align: center;
        }
        h3 {
          font-size: 20px !important;
          text-align: center;
        }
        .es-header-body h1 a,
        .es-content-body h1 a,
        .es-footer-body h1 a {
          font-size: 42px !important;
        }
        .es-header-body h2 a,
        .es-content-body h2 a,
        .es-footer-body h2 a {
          font-size: 26px !important;
        }
        .es-header-body h3 a,
        .es-content-body h3 a,
        .es-footer-body h3 a {
          font-size: 20px !important;
        }
        .es-menu td a {
          font-size: 14px !important;
        }
        .es-header-body p,
        .es-header-body ul li,
        .es-header-body ol li,
        .es-header-body a {
          font-size: 16px !important;
        }
        .es-content-body p,
        .es-content-body ul li,
        .es-content-body ol li,
        .es-content-body a {
          font-size: 16px !important;
        }
        .es-footer-body p,
        .es-footer-body ul li,
        .es-footer-body ol li,
        .es-footer-body a {
          font-size: 16px !important;
        }
        .es-infoblock p,
        .es-infoblock ul li,
        .es-infoblock ol li,
        .es-infoblock a {
          font-size: 12px !important;
        }
        *[class="gmail-fix"] {
          display: none !important;
        }
        .es-m-txt-c,
        .es-m-txt-c h1,
        .es-m-txt-c h2,
        .es-m-txt-c h3 {
          text-align: center !important;
        }
        .es-m-txt-r,
        .es-m-txt-r h1,
        .es-m-txt-r h2,
        .es-m-txt-r h3 {
          text-align: right !important;
        }
        .es-m-txt-l,
        .es-m-txt-l h1,
        .es-m-txt-l h2,
        .es-m-txt-l h3 {
          text-align: left !important;
        }
        .es-m-txt-r img,
        .es-m-txt-c img,
        .es-m-txt-l img {
          display: inline !important;
        }
        .es-button-border {
          display: block !important;
        }
        a.es-button,
        button.es-button {
          font-size: 16px !important;
          display: block !important;
          border-right-width: 0px !important;
          border-left-width: 0px !important;
          border-bottom-width: 15px !important;
          border-top-width: 15px !important;
        }
        .es-adaptive table,
        .es-left,
        .es-right {
          width: 100% !important;
        }
        .es-content table,
        .es-header table,
        .es-footer table,
        .es-content,
        .es-footer,
        .es-header {
          width: 100% !important;
          max-width: 600px !important;
        }
        .es-adapt-td {
          display: block !important;
          width: 100% !important;
        }
        .adapt-img {
          width: 100% !important;
          height: auto !important;
        }
        .es-m-p0 {
          padding: 0 !important;
        }
        .es-m-p0r {
          padding-right: 0 !important;
        }
        .es-m-p0l {
          padding-left: 0 !important;
        }
        .es-m-p0t {
          padding-top: 0 !important;
        }
        .es-m-p0b {
          padding-bottom: 0 !important;
        }
        .es-m-p20b {
          padding-bottom: 20px !important;
        }
        .es-mobile-hidden,
        .es-hidden {
          display: none !important;
        }
        tr.es-desk-hidden,
        td.es-desk-hidden,
        table.es-desk-hidden {
          width: auto !important;
          overflow: visible !important;
          float: none !important;
          max-height: inherit !important;
          line-height: inherit !important;
        }
        tr.es-desk-hidden {
          display: table-row !important;
        }
        table.es-desk-hidden {
          display: table !important;
        }
        td.es-desk-menu-hidden {
          display: table-cell !important;
        }
        .es-menu td {
          width: 1% !important;
        }
        table.es-table-not-adapt,
        .esd-block-html table {
          width: auto !important;
        }
        table.es-social {
          display: inline-block !important;
        }
        table.es-social td {
          display: inline-block !important;
        }
        .es-m-p5 {
          padding: 5px !important;
        }
        .es-m-p5t {
          padding-top: 5px !important;
        }
        .es-m-p5b {
          padding-bottom: 5px !important;
        }
        .es-m-p5r {
          padding-right: 5px !important;
        }
        .es-m-p5l {
          padding-left: 5px !important;
        }
        .es-m-p10 {
          padding: 10px !important;
        }
        .es-m-p10t {
          padding-top: 10px !important;
        }
        .es-m-p10b {
          padding-bottom: 10px !important;
        }
        .es-m-p10r {
          padding-right: 10px !important;
        }
        .es-m-p10l {
          padding-left: 10px !important;
        }
        .es-m-p15 {
          padding: 15px !important;
        }
        .es-m-p15t {
          padding-top: 15px !important;
        }
        .es-m-p15b {
          padding-bottom: 15px !important;
        }
        .es-m-p15r {
          padding-right: 15px !important;
        }
        .es-m-p15l {
          padding-left: 15px !important;
        }
        .es-m-p20 {
          padding: 20px !important;
        }
        .es-m-p20t {
          padding-top: 20px !important;
        }
        .es-m-p20r {
          padding-right: 20px !important;
        }
        .es-m-p20l {
          padding-left: 20px !important;
        }
        .es-m-p25 {
          padding: 25px !important;
        }
        .es-m-p25t {
          padding-top: 25px !important;
        }
        .es-m-p25b {
          padding-bottom: 25px !important;
        }
        .es-m-p25r {
          padding-right: 25px !important;
        }
        .es-m-p25l {
          padding-left: 25px !important;
        }
        .es-m-p30 {
          padding: 30px !important;
        }
        .es-m-p30t {
          padding-top: 30px !important;
        }
        .es-m-p30b {
          padding-bottom: 30px !important;
        }
        .es-m-p30r {
          padding-right: 30px !important;
        }
        .es-m-p30l {
          padding-left: 30px !important;
        }
        .es-m-p35 {
          padding: 35px !important;
        }
        .es-m-p35t {
          padding-top: 35px !important;
        }
        .es-m-p35b {
          padding-bottom: 35px !important;
        }
        .es-m-p35r {
          padding-right: 35px !important;
        }
        .es-m-p35l {
          padding-left: 35px !important;
        }
        .es-m-p40 {
          padding: 40px !important;
        }
        .es-m-p40t {
          padding-top: 40px !important;
        }
        .es-m-p40b {
          padding-bottom: 40px !important;
        }
        .es-m-p40r {
          padding-right: 40px !important;
        }
        .es-m-p40l {
          padding-left: 40px !important;
        }
        .es-desk-hidden {
          display: table-row !important;
          width: auto !important;
          overflow: visible !important;
          max-height: inherit !important;
        }
      }
    </style>
  </head>
  <body
    style="
      width: 100%;
      font-family: Montserrat, sans-serif;
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
      padding: 0;
      margin: 0;
    "
  >
    <div class="es-wrapper-color" style="background-color: #ffffff">
      <!--[if gte mso 9]>
        <v:background xmlns:v="urn:schemas-microsoft-com:vml" fill="t">
          <v:fill type="tile" color="#ffffff"></v:fill>
        </v:background>
      <![endif]-->
      <table
        class="es-wrapper"
        width="100%"
        cellspacing="0"
        cellpadding="0"
        style="
          mso-table-lspace: 0pt;
          mso-table-rspace: 0pt;
          border-collapse: collapse;
          border-spacing: 0px;
          padding: 0;
          margin: 0;
          width: 100%;
          height: 100%;
          background-repeat: repeat;
          background-position: center top;
          background-color: #ffffff;
        "
      >
        <tr>
          <td valign="top" style="padding: 0; margin: 0">
            <table
              cellpadding="0"
              cellspacing="0"
              class="es-header"
              align="center"
              style="
                mso-table-lspace: 0pt;
                mso-table-rspace: 0pt;
                border-collapse: collapse;
                border-spacing: 0px;
                table-layout: fixed !important;
                width: 100%;
                background-color: transparent;
                background-repeat: repeat;
                background-position: center top;
              "
            >
              <tr>
                <td align="center" style="padding: 0; margin: 0">
                  <table
                    bgcolor="#ffffff"
                    class="es-header-body"
                    align="center"
                    cellpadding="0"
                    cellspacing="0"
                    style="
                      mso-table-lspace: 0pt;
                      mso-table-rspace: 0pt;
                      border-collapse: collapse;
                      border-spacing: 0px;
                      background-color: #ffffff;
                      width: 700px;
                    "
                  >
                    <tr>
                      <td
                        align="left"
                        style="
                          margin: 0;
                          padding-bottom: 10px;
                          padding-top: 20px;
                          padding-left: 20px;
                          padding-right: 20px;
                        "
                      >
                        <table
                          cellpadding="0"
                          cellspacing="0"
                          width="100%"
                          style="
                            mso-table-lspace: 0pt;
                            mso-table-rspace: 0pt;
                            border-collapse: collapse;
                            border-spacing: 0px;
                          "
                        >
                          <tr>
                            <td
                              class="es-m-p0r"
                              valign="top"
                              align="center"
                              style="padding: 0; margin: 0; width: 660px"
                            >
                              <table
                                cellpadding="0"
                                cellspacing="0"
                                width="100%"
                                role="presentation"
                                style="
                                  mso-table-lspace: 0pt;
                                  mso-table-rspace: 0pt;
                                  border-collapse: collapse;
                                  border-spacing: 0px;
                                "
                              >
                                <tr>
                                  <td
                                    align="center"
                                    style="
                                      padding: 0;
                                      margin: 0;
                                      padding-top: 10px;
                                      padding-bottom: 10px;
                                      font-size: 0;
                                    "
                                  >
                                    <table
                                      border="0"
                                      width="100%"
                                      height="100%"
                                      cellpadding="0"
                                      cellspacing="0"
                                      role="presentation"
                                      style="
                                        mso-table-lspace: 0pt;
                                        mso-table-rspace: 0pt;
                                        border-collapse: collapse;
                                        border-spacing: 0px;
                                      "
                                    >
                                      <tr>
                                        <td
                                          style="
                                            padding: 0;
                                            margin: 0;
                                            border-bottom: 1px solid #cccccc;
                                            background: none;
                                            height: 1px;
                                            width: 100%;
                                            margin: 0px;
                                          "
                                        ></td>
                                      </tr>
                                    </table>
                                  </td>
                                </tr>
                                <tr>
                                  <td
                                    align="center"
                                    bgcolor="#333333"
                                    style="padding: 0; margin: 0"
                                  >
                                    <a
                                      name="https://aunction.vercel.app/"
                                      href=""
                                      style="
                                        -webkit-text-size-adjust: none;
                                        -ms-text-size-adjust: none;
                                        mso-line-height-rule: exactly;
                                        text-decoration: underline;
                                        color: #134f5c;
                                        font-size: 14px;
                                      "
                                    ></a>
                                    <p
                                      style="
                                        margin: 0;
                                        -webkit-text-size-adjust: none;
                                        -ms-text-size-adjust: none;
                                        mso-line-height-rule: exactly;
                                        font-family: Montserrat, sans-serif;
                                        line-height: 45px;
                                        color: #f1c232;
                                        font-size: 30px;
                                      "
                                    >
                                      <strong>onlineAuction</strong>
                                    </p>
                                  </td>
                                </tr>
                                <tr>
                                  <td style="padding: 0; margin: 0">
                                    <table
                                      cellpadding="0"
                                      cellspacing="0"
                                      width="100%"
                                      class="es-menu"
                                      role="presentation"
                                      style="
                                        mso-table-lspace: 0pt;
                                        mso-table-rspace: 0pt;
                                        border-collapse: collapse;
                                        border-spacing: 0px;
                                      "
                                    >
                                      <tr class="links">
                                        <td
                                          align="center"
                                          valign="top"
                                          width="50%"
                                          id="esd-menu-id-0"
                                          style="
                                            margin: 0;
                                            padding-left: 5px;
                                            padding-right: 5px;
                                            padding-top: 10px;
                                            padding-bottom: 10px;
                                            border: 0;
                                          "
                                        >
                                          <a
                                            target="_blank"
                                            href="https://aunction.vercel.app/shop"
                                            style="
                                              -webkit-text-size-adjust: none;
                                              -ms-text-size-adjust: none;
                                              mso-line-height-rule: exactly;
                                              text-decoration: none;
                                              display: block;
                                              font-family: arial,
                                                'helvetica neue', helvetica,
                                                sans-serif;
                                              color: #333333;
                                              font-size: 14px;
                                            "
                                            >SHOP</a
                                          >
                                        </td>
                                        <td
                                          align="center"
                                          valign="top"
                                          width="50%"
                                          id="esd-menu-id-1"
                                          style="
                                            margin: 0;
                                            padding-left: 5px;
                                            padding-right: 5px;
                                            padding-top: 10px;
                                            padding-bottom: 10px;
                                            border: 0;
                                          "
                                        >
                                          <a
                                            target="_blank"
                                            href="https://aunction.vercel.app/shop"
                                            style="
                                              -webkit-text-size-adjust: none;
                                              -ms-text-size-adjust: none;
                                              mso-line-height-rule: exactly;
                                              text-decoration: none;
                                              display: block;
                                              font-family: arial,
                                                'helvetica neue', helvetica,
                                                sans-serif;
                                              color: #333333;
                                              font-size: 14px;
                                            "
                                            >BUY</a
                                          >
                                        </td>
                                      </tr>
                                    </table>
                                  </td>
                                </tr>
                                <tr>
                                  <td
                                    align="center"
                                    style="
                                      padding: 0;
                                      margin: 0;
                                      padding-top: 10px;
                                      padding-bottom: 10px;
                                      font-size: 0;
                                    "
                                  >
                                    <table
                                      border="0"
                                      width="100%"
                                      height="100%"
                                      cellpadding="0"
                                      cellspacing="0"
                                      role="presentation"
                                      style="
                                        mso-table-lspace: 0pt;
                                        mso-table-rspace: 0pt;
                                        border-collapse: collapse;
                                        border-spacing: 0px;
                                      "
                                    >
                                      <tr>
                                        <td
                                          style="
                                            padding: 0;
                                            margin: 0;
                                            border-bottom: 1px solid #cccccc;
                                            background: none;
                                            height: 1px;
                                            width: 100%;
                                            margin: 0px;
                                          "
                                        ></td>
                                      </tr>
                                    </table>
                                  </td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
            <table
              cellpadding="0"
              cellspacing="0"
              class="es-content"
              align="center"
              style="
                mso-table-lspace: 0pt;
                mso-table-rspace: 0pt;
                border-collapse: collapse;
                border-spacing: 0px;
                table-layout: fixed !important;
                width: 100%;
              "
            >
              <tr>
                <td align="center" style="padding: 0; margin: 0">
                  <table
                    bgcolor="#ffffff"
                    class="es-content-body"
                    align="center"
                    cellpadding="0"
                    cellspacing="0"
                    style="
                      mso-table-lspace: 0pt;
                      mso-table-rspace: 0pt;
                      border-collapse: collapse;
                      border-spacing: 0px;
                      background-color: #ffffff;
                      width: 700px;
                    "
                  >
                    <tr>
                      <td
                        align="left"
                        style="
                          margin: 0;
                          padding-bottom: 20px;
                          padding-left: 20px;
                          padding-right: 20px;
                          padding-top: 40px;
                        "
                      >
                        <table
                          cellpadding="0"
                          cellspacing="0"
                          width="100%"
                          style="
                            mso-table-lspace: 0pt;
                            mso-table-rspace: 0pt;
                            border-collapse: collapse;
                            border-spacing: 0px;
                          "
                        >
                          <tr>
                            <td
                              align="center"
                              valign="top"
                              style="padding: 0; margin: 0; width: 660px"
                            >
                              <table
                                cellpadding="0"
                                cellspacing="0"
                                width="100%"
                                role="presentation"
                                style="
                                  mso-table-lspace: 0pt;
                                  mso-table-rspace: 0pt;
                                  border-collapse: collapse;
                                  border-spacing: 0px;
                                "
                              >
                                <tr>
                                  <td
                                    align="center"
                                    style="
                                      padding: 0;
                                      margin: 0;
                                      font-size: 0px;
                                    "
                                  >
                                    <img
                                      src="https://amxtbg.stripocdn.email/content/guids/CABINET_2663efe83689b9bda1312f85374f56d2/images/10381620386430630.png"
                                      alt
                                      style="
                                        display: block;
                                        border: 0;
                                        outline: none;
                                        text-decoration: none;
                                        -ms-interpolation-mode: bicubic;
                                      "
                                      width="100"
                                    />
                                  </td>
                                </tr>
                                <tr>
                                  <td
                                    align="center"
                                    style="padding: 0; margin: 0"
                                  >
                                    <h2
                                      style="
                                        margin: 0;
                                        line-height: 43px;
                                        mso-line-height-rule: exactly;
                                        font-family: Montserrat, sans-serif;
                                        font-size: 36px;
                                        font-style: normal;
                                        font-weight: normal;
                                        color: #333333;
                                      "
                                    >
                                      Verify your email to change your password
                                    </h2>
                                  </td>
                                </tr>
                                <tr>
                                  <td
                                    align="center"
                                    class="es-m-txt-c"
                                    style="
                                      padding: 0;
                                      margin: 0;
                                      padding-top: 10px;
                                      padding-bottom: 10px;
                                      font-size: 0;
                                    "
                                  >
                                    <table
                                      border="0"
                                      width="40%"
                                      height="100%"
                                      cellpadding="0"
                                      cellspacing="0"
                                      style="
                                        mso-table-lspace: 0pt;
                                        mso-table-rspace: 0pt;
                                        border-collapse: collapse;
                                        border-spacing: 0px;
                                        width: 40% !important;
                                        display: inline-table;
                                      "
                                      role="presentation"
                                    >
                                      <tr>
                                        <td
                                          style="
                                            padding: 0;
                                            margin: 0;
                                            border-bottom: 1px solid #cccccc;
                                            background: none;
                                            height: 1px;
                                            width: 100%;
                                            margin: 0px;
                                          "
                                        ></td>
                                      </tr>
                                    </table>
                                  </td>
                                </tr>
                                <tr>
                                  <td
                                    align="center"
                                    class="es-m-p0r"
                                    style="
                                      padding: 0;
                                      margin: 0;
                                      padding-top: 5px;
                                      padding-bottom: 5px;
                                      padding-right: 40px;
                                    "
                                  >
                                    <p
                                      style="
                                        margin: 0;
                                        -webkit-text-size-adjust: none;
                                        -ms-text-size-adjust: none;
                                        mso-line-height-rule: exactly;
                                        font-family: Montserrat, sans-serif;
                                        line-height: 24px;
                                        color: #333333;
                                        font-size: 16px;
                                      "
                                    >
                                      Thank you for choosing onlineAuction.
                                    </p>
                                    <p
                                      style="
                                        margin: 0;
                                        -webkit-text-size-adjust: none;
                                        -ms-text-size-adjust: none;
                                        mso-line-height-rule: exactly;
                                        font-family: Montserrat, sans-serif;
                                        line-height: 24px;
                                        color: #333333;
                                        font-size: 16px;
                                      "
                                    >
                                      <br />
                                    </p>
                                    <p
                                      style="
                                        margin: 0;
                                        -webkit-text-size-adjust: none;
                                        -ms-text-size-adjust: none;
                                        mso-line-height-rule: exactly;
                                        font-family: Montserrat, sans-serif;
                                        line-height: 24px;
                                        color: #333333;
                                        font-size: 16px;
                                      "
                                    >
                                      Please confirm that ${to}&nbsp;is your
                                      email address by copying this one time password
                                     <b style='background: darkgray; color: black; padding: 5px; border-radius: 5px;'>${code}</b> &nbsp;within
                                      30<strong>&nbsp;minutes</strong>.
                                    </p>
                                  </td>
                                </tr>
                                <tr>
                                  <td
                                    align="center"
                                    class="es-m-txt-c"
                                    style="
                                      padding: 0;
                                      margin: 0;
                                      padding-top: 10px;
                                      padding-bottom: 10px;
                                      font-size: 0;
                                    "
                                  >
                                    <table
                                      border="0"
                                      width="40%"
                                      height="100%"
                                      cellpadding="0"
                                      cellspacing="0"
                                      style="
                                        mso-table-lspace: 0pt;
                                        mso-table-rspace: 0pt;
                                        border-collapse: collapse;
                                        border-spacing: 0px;
                                        width: 40% !important;
                                        display: inline-table;
                                      "
                                      role="presentation"
                                    >
                                      <tr>
                                        <td
                                          style="
                                            padding: 0;
                                            margin: 0;
                                            border-bottom: 1px solid #cccccc;
                                            background: none;
                                            height: 1px;
                                            width: 100%;
                                            margin: 0px;
                                          "
                                        ></td>
                                      </tr>
                                    </table>
                                  </td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
            <table
              cellpadding="0"
              cellspacing="0"
              class="es-content"
              align="center"
              style="
                mso-table-lspace: 0pt;
                mso-table-rspace: 0pt;
                border-collapse: collapse;
                border-spacing: 0px;
                table-layout: fixed !important;
                width: 100%;
              "
            >
              <tr>
                <td align="center" style="padding: 0; margin: 0">
                  <table
                    bgcolor="#ffffff"
                    class="es-content-body"
                    align="center"
                    cellpadding="0"
                    cellspacing="0"
                    style="
                      mso-table-lspace: 0pt;
                      mso-table-rspace: 0pt;
                      border-collapse: collapse;
                      border-spacing: 0px;
                      background-color: #ffffff;
                      width: 700px;
                    "
                  >
                    <tr>
                      <td
                        align="left"
                        style="
                          padding: 0;
                          margin: 0;
                          padding-left: 20px;
                          padding-right: 20px;
                          padding-top: 40px;
                        "
                      >
                        <table
                          cellpadding="0"
                          cellspacing="0"
                          width="100%"
                          style="
                            mso-table-lspace: 0pt;
                            mso-table-rspace: 0pt;
                            border-collapse: collapse;
                            border-spacing: 0px;
                          "
                        >
                          <tr>
                            <td
                              align="center"
                              valign="top"
                              style="padding: 0; margin: 0; width: 660px"
                            >
                              <table
                                cellpadding="0"
                                cellspacing="0"
                                width="100%"
                                role="presentation"
                                style="
                                  mso-table-lspace: 0pt;
                                  mso-table-rspace: 0pt;
                                  border-collapse: collapse;
                                  border-spacing: 0px;
                                "
                              >
                                <tr>
                                  <td
                                    align="center"
                                    style="padding: 0; margin: 0"
                                  >
                                    <h2
                                      style="
                                        margin: 0;
                                        line-height: 43px;
                                        mso-line-height-rule: exactly;
                                        font-family: Montserrat, sans-serif;
                                        font-size: 36px;
                                        font-style: normal;
                                        font-weight: normal;
                                        color: #333333;
                                      "
                                    >
                                      Need help?
                                    </h2>
                                  </td>
                                </tr>
                                <tr>
                                  <td
                                    align="center"
                                    class="es-m-txt-c"
                                    style="
                                      padding: 0;
                                      margin: 0;
                                      padding-top: 10px;
                                      padding-bottom: 10px;
                                      font-size: 0;
                                    "
                                  >
                                    <table
                                      border="0"
                                      width="40%"
                                      height="100%"
                                      cellpadding="0"
                                      cellspacing="0"
                                      style="
                                        mso-table-lspace: 0pt;
                                        mso-table-rspace: 0pt;
                                        border-collapse: collapse;
                                        border-spacing: 0px;
                                        width: 40% !important;
                                        display: inline-table;
                                      "
                                      role="presentation"
                                    >
                                      <tr>
                                        <td
                                          style="
                                            padding: 0;
                                            margin: 0;
                                            border-bottom: 1px solid #cccccc;
                                            background: none;
                                            height: 1px;
                                            width: 100%;
                                            margin: 0px;
                                          "
                                        ></td>
                                      </tr>
                                    </table>
                                  </td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    <tr>
                      <td
                        align="left"
                        style="
                          padding: 0;
                          margin: 0;
                          padding-bottom: 20px;
                          padding-left: 20px;
                          padding-right: 20px;
                        "
                      >
                        <!--[if mso]><table style="width:660px" cellpadding="0" cellspacing="0"><tr><td style="width:310px" valign="top"><![endif]-->
                        <table
                          cellpadding="0"
                          cellspacing="0"
                          class="es-left"
                          align="left"
                          style="
                            mso-table-lspace: 0pt;
                            mso-table-rspace: 0pt;
                            border-collapse: collapse;
                            border-spacing: 0px;
                            float: left;
                          "
                        >
                          <tr>
                            <td
                              class="es-m-p20b"
                              align="left"
                              style="padding: 0; margin: 0; width: 310px"
                            >
                              <table
                                cellpadding="0"
                                cellspacing="0"
                                width="100%"
                                role="presentation"
                                style="
                                  mso-table-lspace: 0pt;
                                  mso-table-rspace: 0pt;
                                  border-collapse: collapse;
                                  border-spacing: 0px;
                                "
                              >
                                <tr>
                                  <td
                                    align="center"
                                    class="es-m-txt-l"
                                    style="
                                      padding: 0;
                                      margin: 0;
                                      padding-bottom: 5px;
                                      padding-top: 10px;
                                    "
                                  >
                                    <h3
                                      style="
                                        margin: 0;
                                        line-height: 24px;
                                        mso-line-height-rule: exactly;
                                        font-family: Montserrat, sans-serif;
                                        font-size: 20px;
                                        font-style: normal;
                                        font-weight: normal;
                                        color: #333333;
                                      "
                                    >
                                      Ask at
                                    </h3>
                                  </td>
                                </tr>
                                <tr>
                                  <td
                                    align="left"
                                    class="es-m-txt-l"
                                    style="
                                      padding: 0;
                                      margin: 0;
                                      padding-top: 10px;
                                      padding-bottom: 10px;
                                    "
                                  >
                                    <span
                                      class="es-button-border"
                                      style="
                                        border-style: solid;
                                        border-color: #999999;
                                        background: #ffffff;
                                        border-width: 1px;
                                        display: block;
                                        border-radius: 0px;
                                        width: auto;
                                      "
                                      ><a
                                        href="mailto:greydragos@gmail.com"
                                        class="es-button"
                                        target="_blank"
                                        style="
                                          mso-style-priority: 100 !important;
                                          text-decoration: none;
                                          -webkit-text-size-adjust: none;
                                          -ms-text-size-adjust: none;
                                          mso-line-height-rule: exactly;
                                          color: #666666;
                                          font-size: 16px;
                                          border-style: solid;
                                          border-color: #ffffff;
                                          border-width: 10px 30px 10px 30px;
                                          display: block;
                                          background: #ffffff;
                                          border-radius: 0px;
                                          font-family: Montserrat, sans-serif;
                                          font-weight: normal;
                                          font-style: normal;
                                          line-height: 19px;
                                          width: auto;
                                          text-align: center;
                                          border-left-width: 30px;
                                          border-right-width: 30px;
                                        "
                                        >greydragos@gmail.com</a
                                      ></span
                                    >
                                  </td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                        </table>
                        <!--[if mso]></td><td style="width:40px"></td><td style="width:310px" valign="top"><![endif]-->
                        <table
                          cellpadding="0"
                          cellspacing="0"
                          class="es-right"
                          align="right"
                          style="
                            mso-table-lspace: 0pt;
                            mso-table-rspace: 0pt;
                            border-collapse: collapse;
                            border-spacing: 0px;
                            float: right;
                          "
                        >
                          <tr>
                            <td
                              align="left"
                              style="padding: 0; margin: 0; width: 310px"
                            >
                              <table
                                cellpadding="0"
                                cellspacing="0"
                                width="100%"
                                role="presentation"
                                style="
                                  mso-table-lspace: 0pt;
                                  mso-table-rspace: 0pt;
                                  border-collapse: collapse;
                                  border-spacing: 0px;
                                "
                              >
                                <tr>
                                  <td
                                    align="center"
                                    class="es-m-txt-l"
                                    style="
                                      padding: 0;
                                      margin: 0;
                                      padding-bottom: 5px;
                                      padding-top: 10px;
                                    "
                                  >
                                    <h3
                                      style="
                                        margin: 0;
                                        line-height: 24px;
                                        mso-line-height-rule: exactly;
                                        font-family: Montserrat, sans-serif;
                                        font-size: 20px;
                                        font-style: normal;
                                        font-weight: normal;
                                        color: #333333;
                                      "
                                    >
                                      Visit our
                                    </h3>
                                  </td>
                                </tr>
                                <tr>
                                  <td
                                    align="left"
                                    class="es-m-txt-l"
                                    style="
                                      padding: 0;
                                      margin: 0;
                                      padding-top: 10px;
                                      padding-bottom: 10px;
                                    "
                                  >
                                    <span
                                      class="es-button-border"
                                      style="
                                        border-style: solid;
                                        border-color: #999999;
                                        background: #ffffff;
                                        border-width: 1px;
                                        display: block;
                                        border-radius: 0px;
                                        width: auto;
                                      "
                                      ><a
                                        href="https://viewstripo.email"
                                        class="es-button es-button-1"
                                        target="_blank"
                                        style="
                                          mso-style-priority: 100 !important;
                                          text-decoration: none;
                                          -webkit-text-size-adjust: none;
                                          -ms-text-size-adjust: none;
                                          mso-line-height-rule: exactly;
                                          color: #666666;
                                          font-size: 16px;
                                          border-style: solid;
                                          border-color: #ffffff;
                                          border-width: 10px 30px;
                                          display: block;
                                          background: #ffffff;
                                          border-radius: 0px;
                                          font-family: Montserrat, sans-serif;
                                          font-weight: normal;
                                          font-style: normal;
                                          line-height: 19px;
                                          width: auto;
                                          text-align: center;
                                        "
                                        >Help center</a
                                      ></span
                                    >
                                  </td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                        </table>
                        <!--[if mso]></td></tr></table><![endif]-->
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
            <table
              cellpadding="0"
              cellspacing="0"
              class="es-footer"
              align="center"
              style="
                mso-table-lspace: 0pt;
                mso-table-rspace: 0pt;
                border-collapse: collapse;
                border-spacing: 0px;
                table-layout: fixed !important;
                width: 100%;
                background-color: transparent;
                background-repeat: repeat;
                background-position: center top;
              "
            >
              <tr>
                <td align="center" style="padding: 0; margin: 0">
                  <table
                    bgcolor="#ffffff"
                    class="es-footer-body"
                    align="center"
                    cellpadding="0"
                    cellspacing="0"
                    style="
                      mso-table-lspace: 0pt;
                      mso-table-rspace: 0pt;
                      border-collapse: collapse;
                      border-spacing: 0px;
                      background-color: #ffffff;
                      width: 700px;
                    "
                  >
                    <tr>
                      <td
                        align="left"
                        style="
                          padding: 0;
                          margin: 0;
                          padding-left: 20px;
                          padding-right: 20px;
                        "
                      >
                        <table
                          cellpadding="0"
                          cellspacing="0"
                          width="100%"
                          style="
                            mso-table-lspace: 0pt;
                            mso-table-rspace: 0pt;
                            border-collapse: collapse;
                            border-spacing: 0px;
                          "
                        >
                          <tr>
                            <td
                              align="left"
                              style="padding: 0; margin: 0; width: 660px"
                            >
                              <table
                                cellpadding="0"
                                cellspacing="0"
                                width="100%"
                                role="presentation"
                                style="
                                  mso-table-lspace: 0pt;
                                  mso-table-rspace: 0pt;
                                  border-collapse: collapse;
                                  border-spacing: 0px;
                                "
                              >
                                <tr>
                                  <td
                                    align="center"
                                    style="
                                      padding: 0;
                                      margin: 0;
                                      padding-top: 10px;
                                      padding-bottom: 10px;
                                      font-size: 0;
                                    "
                                  >
                                    <table
                                      border="0"
                                      width="100%"
                                      height="100%"
                                      cellpadding="0"
                                      cellspacing="0"
                                      role="presentation"
                                      style="
                                        mso-table-lspace: 0pt;
                                        mso-table-rspace: 0pt;
                                        border-collapse: collapse;
                                        border-spacing: 0px;
                                      "
                                    >
                                      <tr>
                                        <td
                                          style="
                                            padding: 0;
                                            margin: 0;
                                            border-bottom: 1px solid #cccccc;
                                            background: none;
                                            height: 1px;
                                            width: 100%;
                                            margin: 0px;
                                          "
                                        ></td>
                                      </tr>
                                    </table>
                                  </td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    <tr>
                      <td align="left" style="padding: 20px; margin: 0">
                        <table
                          cellpadding="0"
                          cellspacing="0"
                          width="100%"
                          style="
                            mso-table-lspace: 0pt;
                            mso-table-rspace: 0pt;
                            border-collapse: collapse;
                            border-spacing: 0px;
                          "
                        >
                          <tr>
                            <td
                              align="center"
                              valign="top"
                              style="padding: 0; margin: 0; width: 660px"
                            >
                              <table
                                cellpadding="0"
                                cellspacing="0"
                                width="100%"
                                role="presentation"
                                style="
                                  mso-table-lspace: 0pt;
                                  mso-table-rspace: 0pt;
                                  border-collapse: collapse;
                                  border-spacing: 0px;
                                "
                              >
                                <tr>
                                  <td
                                    align="center"
                                    style="padding: 0; margin: 0"
                                  >
                                    <p
                                      style="
                                        margin: 0;
                                        -webkit-text-size-adjust: none;
                                        -ms-text-size-adjust: none;
                                        mso-line-height-rule: exactly;
                                        font-family: Montserrat, sans-serif;
                                        line-height: 18px;
                                        color: #333333;
                                        font-size: 12px;
                                      "
                                    >
                                      You are recieving this mail, either
                                      because you signed up at onlineAuction or
                                      tried to change your password. Please
                                      ignore if you didn't initiate this rquest
                                    </p>
                                  </td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>
  </body>
</html>
`;
};

export const outbidOTPTemplate = (
  name,
  productName,
  highestBid,
  image,
  productId
) => {
  return `<!DOCTYPE html>

<html
  lang="en"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:v="urn:schemas-microsoft-com:vml"
>
  <head>
    <title></title>
    <meta content="text/html; charset=utf-8" http-equiv="Content-Type" />
    <meta content="width=device-width, initial-scale=1.0" name="viewport" />
    <!--[if mso
      ]><xml
        ><o:OfficeDocumentSettings
          ><o:PixelsPerInch>96</o:PixelsPerInch
          ><o:AllowPNG /></o:OfficeDocumentSettings></xml
    ><![endif]-->
    <style>
      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        padding: 0;
      }

      a[x-apple-data-detectors] {
        color: inherit !important;
        text-decoration: inherit !important;
      }

      #MessageViewBody a {
        color: inherit;
        text-decoration: none;
      }

      p {
        line-height: inherit;
      }

      .desktop_hide,
      .desktop_hide table {
        mso-hide: all;
        display: none;
        max-height: 0px;
        overflow: hidden;
      }

      .image_block img + div {
        display: none;
      }

      @media (max-width: 700px) {
        .desktop_hide table.icons-inner {
          display: inline-block !important;
        }

        .icons-inner {
          text-align: center;
        }

        .icons-inner td {
          margin: 0 auto;
        }

        .mobile_hide {
          display: none;
        }

        .row-content {
          width: 100% !important;
        }

        .stack .column {
          width: 100%;
          display: block;
        }

        .mobile_hide {
          min-height: 0;
          max-height: 0;
          max-width: 0;
          overflow: hidden;
          font-size: 0px;
        }

        .desktop_hide,
        .desktop_hide table {
          display: table !important;
          max-height: none !important;
        }

        .row-3 .column-1 .block-5.button_block td.pad {
          padding: 10px 10px 10px 20px !important;
        }

        .row-3 .column-1 .block-5.button_block a,
        .row-3 .column-1 .block-5.button_block div,
        .row-3 .column-1 .block-5.button_block span {
          line-height: 32px !important;
        }

        .row-3 .column-1 .block-2.heading_block td.pad {
          padding: 10px 20px 20px !important;
        }

        .row-3 .column-1 .block-3.paragraph_block td.pad {
          padding: 10px 20px !important;
        }

        .row-3 .column-1 .block-6.spacer_block {
          height: 30px !important;
        }
      }
    </style>
  </head>
  <body
    style="
      background-color: #eaeef0;
      margin: 0;
      padding: 0;
      -webkit-text-size-adjust: none;
      text-size-adjust: none;
    "
  >
    <table
      border="0"
      cellpadding="0"
      cellspacing="0"
      class="nl-container"
      role="presentation"
      style="
        mso-table-lspace: 0pt;
        mso-table-rspace: 0pt;
        background-color: #eaeef0;
      "
      width="100%"
    >
      <tbody>
        <tr>
          <td>
            <table
              align="center"
              border="0"
              cellpadding="0"
              cellspacing="0"
              class="row row-1"
              role="presentation"
              style="mso-table-lspace: 0pt; mso-table-rspace: 0pt"
              width="100%"
            >
              <tbody>
                <tr>
                  <td>
                    <table
                      align="center"
                      border="0"
                      cellpadding="0"
                      cellspacing="0"
                      class="row-content stack"
                      role="presentation"
                      style="
                        mso-table-lspace: 0pt;
                        mso-table-rspace: 0pt;
                        color: #000000;
                        width: 680px;
                        margin: 0 auto;
                      "
                      width="680"
                    >
                      <tbody>
                        <tr>
                          <td
                            class="column column-1"
                            style="
                              font-weight: 400;
                              text-align: left;
                              mso-table-lspace: 0pt;
                              mso-table-rspace: 0pt;
                              padding-bottom: 5px;
                              padding-top: 5px;
                              vertical-align: top;
                              border-top: 0px;
                              border-right: 0px;
                              border-bottom: 0px;
                              border-left: 0px;
                            "
                            width="100%"
                          >
                            <div
                              class="spacer_block block-1"
                              style="
                                height: 60px;
                                line-height: 60px;
                                font-size: 1px;
                              "
                            >
                               
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                </tr>
              </tbody>
            </table>
            <table
              align="center"
              border="0"
              cellpadding="0"
              cellspacing="0"
              class="row row-2"
              role="presentation"
              style="mso-table-lspace: 0pt; mso-table-rspace: 0pt"
              width="100%"
            >
              <tbody>
                <tr>
                  <td>
                    <table
                      align="center"
                      border="0"
                      cellpadding="0"
                      cellspacing="0"
                      class="row-content stack"
                      role="presentation"
                      style="
                        mso-table-lspace: 0pt;
                        mso-table-rspace: 0pt;
                        background-color: #ffffff;
                        border-radius: 15px 15px 0 0;
                        color: #000000;
                        width: 680px;
                        margin: 0 auto;
                      "
                      width="680"
                    >
                      <tbody>
                        <tr>
                          <td
                            class="column column-1"
                            style="
                              font-weight: 400;
                              text-align: left;
                              mso-table-lspace: 0pt;
                              mso-table-rspace: 0pt;
                              padding-bottom: 5px;
                              padding-top: 5px;
                              vertical-align: top;
                              border-top: 0px;
                              border-right: 0px;
                              border-bottom: 0px;
                              border-left: 0px;
                            "
                            width="100%"
                          >
                            <div
                              class="spacer_block block-1"
                              style="
                                height: 30px;
                                line-height: 30px;
                                font-size: 1px;
                              "
                            >
                               
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                </tr>
              </tbody>
            </table>
            <table
              align="center"
              border="0"
              cellpadding="0"
              cellspacing="0"
              class="row row-3"
              role="presentation"
              style="mso-table-lspace: 0pt; mso-table-rspace: 0pt"
              width="100%"
            >
              <tbody>
                <tr>
                  <td>
                    <table
                      align="center"
                      border="0"
                      cellpadding="0"
                      cellspacing="0"
                      class="row-content stack"
                      role="presentation"
                      style="
                        mso-table-lspace: 0pt;
                        mso-table-rspace: 0pt;
                        background-color: #ffffff;
                        border-radius: 0;
                        color: #000000;
                        width: 680px;
                        margin: 0 auto;
                      "
                      width="680"
                    >
                      <tbody>
                        <tr>
                          <td
                            class="column column-1"
                            style="
                              font-weight: 400;
                              text-align: left;
                              mso-table-lspace: 0pt;
                              mso-table-rspace: 0pt;
                              padding-bottom: 5px;
                              padding-top: 5px;
                              vertical-align: top;
                              border-top: 0px;
                              border-right: 0px;
                              border-bottom: 0px;
                              border-left: 0px;
                            "
                            width="100%"
                          >
                            <table
                              border="0"
                              cellpadding="0"
                              cellspacing="0"
                              class="icons_block block-1"
                              role="presentation"
                              style="
                                mso-table-lspace: 0pt;
                                mso-table-rspace: 0pt;
                              "
                              width="100%"
                            >
                              <tr>
                                <td
                                  class="pad"
                                  style="
                                    vertical-align: middle;
                                    color: #000000;
                                    font-family: inherit;
                                    font-size: 14px;
                                    font-weight: 400;
                                    padding-bottom: 15px;
                                    padding-left: 40px;
                                    padding-right: 15px;
                                    padding-top: 15px;
                                    text-align: left;
                                  "
                                >
                                  <table
                                    align="left"
                                    cellpadding="0"
                                    cellspacing="0"
                                    class="alignment"
                                    role="presentation"
                                    style="
                                      mso-table-lspace: 0pt;
                                      mso-table-rspace: 0pt;
                                    "
                                  >
                                    <tr>
                                      <td
                                        style="
                                          vertical-align: middle;
                                          text-align: center;
                                          padding-top: 5px;
                                          padding-bottom: 5px;
                                          padding-left: 5px;
                                          padding-right: 5px;
                                        "
                                      >
                                        <img
                                          align="center"
                                          class="icon"
                                          height="64"
                                          src="${process.env.DOMAIN}/icon-192x192.png"
                                          style="
                                            display: block;
                                            height: auto;
                                            margin: 0 auto;
                                            border: 0;
                                          "
                                          width="64"
                                        />
                                      </td>
                                    </tr>
                                  </table>
                                </td>
                              </tr>
                            </table>
                            <table
                              border="0"
                              cellpadding="0"
                              cellspacing="0"
                              class="heading_block block-2"
                              role="presentation"
                              style="
                                mso-table-lspace: 0pt;
                                mso-table-rspace: 0pt;
                              "
                              width="100%"
                            >
                              <tr>
                                <td
                                  class="pad"
                                  style="
                                    padding-bottom: 20px;
                                    padding-left: 40px;
                                    padding-right: 10px;
                                    padding-top: 10px;
                                    text-align: center;
                                    width: 100%;
                                  "
                                >
                                  <h1
                                    style="
                                      margin: 0;
                                      color: #111418;
                                      direction: ltr;
                                      font-family: Helvetica Neue, Helvetica,
                                        Arial, sans-serif;
                                      font-size: 38px;
                                      font-weight: 700;
                                      letter-spacing: normal;
                                      line-height: 120%;
                                      text-align: left;
                                      margin-top: 0;
                                      margin-bottom: 0;
                                      mso-line-height-alt: 45.6px;
                                    "
                                  >
                                    <span class="tinyMce-placeholder"
                                      >Hey ${name} You've been outbid!</span
                                    >
                                  </h1>
                                </td>
                              </tr>
                            </table>
                            <table
                              border="0"
                              cellpadding="0"
                              cellspacing="0"
                              class="paragraph_block block-3"
                              role="presentation"
                              style="
                                mso-table-lspace: 0pt;
                                mso-table-rspace: 0pt;
                                word-break: break-word;
                              "
                              width="100%"
                            >
                              <tr>
                                <td
                                  class="pad"
                                  style="
                                    padding-bottom: 10px;
                                    padding-left: 40px;
                                    padding-right: 10px;
                                    padding-top: 10px;
                                  "
                                >
                                  <div
                                    style="
                                      color: #6f7376;
                                      direction: ltr;
                                      font-family: Helvetica Neue, Helvetica,
                                        Arial, sans-serif;
                                      font-size: 18px;
                                      font-weight: 400;
                                      letter-spacing: 0px;
                                      line-height: 150%;
                                      text-align: left;
                                      mso-line-height-alt: 27px;
                                    "
                                  >
                                    <p style="margin: 0">
                                      You signed up to be notified in the case
                                      you got out-bid from this product, which
                                      you have. Place a higher bid to stand a
                                      chance of winning your product😊
                                    </p>
                                  </div>
                                </td>
                              </tr>
                            </table>
                            <div
                              class="spacer_block block-4"
                              style="
                                height: 30px;
                                line-height: 30px;
                                font-size: 1px;
                              "
                            >
                               
                            </div>
                            <table
                              border="0"
                              cellpadding="0"
                              cellspacing="0"
                              class="button_block block-5"
                              role="presentation"
                              style="
                                mso-table-lspace: 0pt;
                                mso-table-rspace: 0pt;
                              "
                              width="100%"
                            >
                              <tr>
                                <td
                                  class="pad"
                                  style="
                                    padding-bottom: 10px;
                                    padding-left: 40px;
                                    padding-right: 10px;
                                    padding-top: 10px;
                                    text-align: left;
                                  "
                                >
                                  <div align="left" class="alignment">
                                    <!--[if mso]>
<v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="https://bit.ly/3Thf9PG" style="height:52px;width:210px;v-text-anchor:middle;" arcsize="8%" stroke="false" fillcolor="#ffd613">
<w:anchorlock/>
<v:textbox inset="0px,0px,0px,0px">
<center style="color:#000; font-family:Arial, sans-serif; font-size:16px">
<!
                                    [endif]--><a
                                      href="https://${process.env.DOMAIN}/product${productId}"
                                      style="
                                        text-decoration: none;
                                        display: inline-block;
                                        color: #000;
                                        background-color: #ffd613;
                                        border-radius: 4px;
                                        width: auto;
                                        border-top: 0px solid transparent;
                                        font-weight: 400;
                                        border-right: 0px solid transparent;
                                        border-bottom: 0px solid transparent;
                                        border-left: 0px solid transparent;
                                        padding-top: 10px;
                                        padding-bottom: 10px;
                                        font-family: Helvetica Neue, Helvetica,
                                          Arial, sans-serif;
                                        font-size: 16px;
                                        text-align: center;
                                        mso-border-alt: none;
                                        word-break: keep-all;
                                      "
                                      target="_blank"
                                      ><span
                                        style="
                                          padding-left: 25px;
                                          padding-right: 25px;
                                          font-size: 16px;
                                          display: inline-block;
                                          letter-spacing: 1px;
                                        "
                                        ><span
                                          style="
                                            word-break: break-word;
                                            line-height: 32px;
                                          "
                                          >Go to product page!</span
                                        ></span
                                      ></a
                                    >><!--[if mso]></center></v:textbox></v:roundrect><![endif]-->
                                  </div>
                                </td>
                              </tr>
                            </table>
                            <div
                              class="spacer_block block-6"
                              style="
                                height: 45px;
                                line-height: 45px;
                                font-size: 1px;
                              "
                            >
                               
                            </div>
                            <table
                              border="0"
                              cellpadding="10"
                              cellspacing="0"
                              class="paragraph_block block-7"
                              role="presentation"
                              style="
                                mso-table-lspace: 0pt;
                                mso-table-rspace: 0pt;
                                word-break: break-word;
                              "
                              width="100%"
                            >
                              <tr>
                                <td class="pad">
                                  <div
                                    style="
                                      color: #101112;
                                      direction: ltr;
                                      font-family: Helvetica Neue, Helvetica,
                                        Arial, sans-serif;
                                      font-size: 16px;
                                      font-weight: 400;
                                      letter-spacing: 0px;
                                      line-height: 120%;
                                      text-align: left;
                                      mso-line-height-alt: 19.2px;
                                    "
                                  >
                                    <p style="margin: 0">
                                      PRODUCT NAME: ${productName}<br />HIGHEST
                                      BID: $${highestBid}
                                    </p>
                                  </div>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                </tr>
              </tbody>
            </table>
            <table
              align="center"
              border="0"
              cellpadding="0"
              cellspacing="0"
              class="row row-4"
              role="presentation"
              style="mso-table-lspace: 0pt; mso-table-rspace: 0pt"
              width="100%"
            >
              <tbody>
                <tr>
                  <td>
                    <table
                      align="center"
                      border="0"
                      cellpadding="0"
                      cellspacing="0"
                      class="row-content stack"
                      role="presentation"
                      style="
                        mso-table-lspace: 0pt;
                        mso-table-rspace: 0pt;
                        border-radius: 0;
                        color: #000000;
                        width: 680px;
                        margin: 0 auto;
                      "
                      width="680"
                    >
                      <tbody>
                        <tr>
                          <td
                            class="column column-1"
                            style="
                              font-weight: 400;
                              text-align: left;
                              mso-table-lspace: 0pt;
                              mso-table-rspace: 0pt;
                              padding-bottom: 5px;
                              vertical-align: top;
                              border-top: 0px;
                              border-right: 0px;
                              border-bottom: 0px;
                              border-left: 0px;
                            "
                            width="100%"
                          >
                            <table
                              border="0"
                              cellpadding="0"
                              cellspacing="0"
                              class="image_block block-1"
                              role="presentation"
                              style="
                                mso-table-lspace: 0pt;
                                mso-table-rspace: 0pt;
                              "
                              width="100%"
                            >
                              <tr>
                                <td class="pad" style="width: 100%">
                                  <div
                                    align="center"
                                    class="alignment"
                                    style="line-height: 10px"
                                  >
                                    <div style="max-width: 680px">
                                      <img
                                        src="${image}"
                                        style="
                                          display: block;
                                          height: auto;
                                          border: 0;
                                          width: 100%;
                                        "
                                        width="680"
                                      />
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                </tr>
              </tbody>
            </table>
            <table
              align="center"
              border="0"
              cellpadding="0"
              cellspacing="0"
              class="row row-5"
              role="presentation"
              style="mso-table-lspace: 0pt; mso-table-rspace: 0pt"
              width="100%"
            >
              <tbody>
                <tr>
                  <td>
                    <table
                      align="center"
                      border="0"
                      cellpadding="0"
                      cellspacing="0"
                      class="row-content stack"
                      role="presentation"
                      style="
                        mso-table-lspace: 0pt;
                        mso-table-rspace: 0pt;
                        border-radius: 0;
                        color: #000000;
                        width: 680px;
                        margin: 0 auto;
                      "
                      width="680"
                    >
                      <tbody>
                        <tr>
                          <td
                            class="column column-1"
                            style="
                              font-weight: 400;
                              text-align: left;
                              mso-table-lspace: 0pt;
                              mso-table-rspace: 0pt;
                              padding-bottom: 5px;
                              padding-top: 5px;
                              vertical-align: top;
                              border-top: 0px;
                              border-right: 0px;
                              border-bottom: 0px;
                              border-left: 0px;
                            "
                            width="100%"
                          >
                            <div
                              class="spacer_block block-1"
                              style="
                                height: 70px;
                                line-height: 70px;
                                font-size: 1px;
                              "
                            >
                               
                            </div>
                            <table
                              border="0"
                              cellpadding="0"
                              cellspacing="0"
                              class="paragraph_block block-2"
                              role="presentation"
                              style="
                                mso-table-lspace: 0pt;
                                mso-table-rspace: 0pt;
                                word-break: break-word;
                              "
                              width="100%"
                            >
                              <tr>
                                <td
                                  class="pad"
                                  style="
                                    padding-bottom: 5px;
                                    padding-left: 10px;
                                    padding-right: 10px;
                                    padding-top: 10px;
                                  "
                                >
                                  <div
                                    style="
                                      color: #545352;
                                      direction: ltr;
                                      font-family: Helvetica Neue, Helvetica,
                                        Arial, sans-serif;
                                      font-size: 18px;
                                      font-weight: 400;
                                      letter-spacing: 0px;
                                      line-height: 150%;
                                      text-align: center;
                                      mso-line-height-alt: 27px;
                                    "
                                  >
                                    <p style="margin: 0">
                                      You are receiving this email because you
                                      signed up for notifications at
                                      OnlineAuction.
                                    </p>
                                  </div>
                                </td>
                              </tr>
                            </table>
                            <div
                              class="spacer_block block-3"
                              style="
                                height: 15px;
                                line-height: 15px;
                                font-size: 1px;
                              "
                            >
                               
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                </tr>
              </tbody>
            </table>
            <table
              align="center"
              border="0"
              cellpadding="0"
              cellspacing="0"
              class="row row-6"
              role="presentation"
              style="mso-table-lspace: 0pt; mso-table-rspace: 0pt"
              width="100%"
            >
              <tbody>
                <tr>
                  <td>
                    <table
                      align="center"
                      border="0"
                      cellpadding="0"
                      cellspacing="0"
                      class="row-content stack"
                      role="presentation"
                      style="
                        mso-table-lspace: 0pt;
                        mso-table-rspace: 0pt;
                        color: #000000;
                        width: 680px;
                        margin: 0 auto;
                      "
                      width="680"
                    >
                      <tbody>
                        <tr>
                          <td
                            class="column column-1"
                            style="
                              font-weight: 400;
                              text-align: left;
                              mso-table-lspace: 0pt;
                              mso-table-rspace: 0pt;
                              padding-bottom: 5px;
                              padding-top: 5px;
                              vertical-align: top;
                              border-top: 0px;
                              border-right: 0px;
                              border-bottom: 0px;
                              border-left: 0px;
                            "
                            width="100%"
                          >
                            <div
                              class="spacer_block block-1"
                              style="
                                height: 30px;
                                line-height: 30px;
                                font-size: 1px;
                              "
                            >
                               
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                </tr>
              </tbody>
            </table>
            <table
              align="center"
              border="0"
              cellpadding="0"
              cellspacing="0"
              class="row row-7"
              role="presentation"
              style="
                mso-table-lspace: 0pt;
                mso-table-rspace: 0pt;
                background-color: #ffffff;
              "
              width="100%"
            >
              <tbody>
                <tr>
                  <td>
                    <table
                      align="center"
                      border="0"
                      cellpadding="0"
                      cellspacing="0"
                      class="row-content stack"
                      role="presentation"
                      style="
                        mso-table-lspace: 0pt;
                        mso-table-rspace: 0pt;
                        background-color: #ffffff;
                        color: #000000;
                        width: 680px;
                        margin: 0 auto;
                      "
                      width="680"
                    >
                      <tbody>
                        <tr>
                          <td
                            class="column column-1"
                            style="
                              font-weight: 400;
                              text-align: left;
                              mso-table-lspace: 0pt;
                              mso-table-rspace: 0pt;
                              padding-bottom: 5px;
                              padding-top: 5px;
                              vertical-align: top;
                              border-top: 0px;
                              border-right: 0px;
                              border-bottom: 0px;
                              border-left: 0px;
                            "
                            width="100%"
                          >
                            <table
                              border="0"
                              cellpadding="0"
                              cellspacing="0"
                              class="icons_block block-1"
                              role="presentation"
                              style="
                                mso-table-lspace: 0pt;
                                mso-table-rspace: 0pt;
                              "
                              width="100%"
                            >
                              <tr>
                                <td
                                  class="pad"
                                  style="
                                    vertical-align: middle;
                                    color: #1e0e4b;
                                    font-family: 'Inter', sans-serif;
                                    font-size: 15px;
                                    padding-bottom: 5px;
                                    padding-top: 5px;
                                    text-align: center;
                                  "
                                >
                                  <table
                                    cellpadding="0"
                                    cellspacing="0"
                                    role="presentation"
                                    style="
                                      mso-table-lspace: 0pt;
                                      mso-table-rspace: 0pt;
                                    "
                                    width="100%"
                                  >
                                    <tr>
                                      <td
                                        class="alignment"
                                        style="
                                          vertical-align: middle;
                                          text-align: center;
                                        "
                                      >
                                        <!--[if vml]><table align="center" cellpadding="0" cellspacing="0" role="presentation" style="display:inline-block;padding-left:0px;padding-right:0px;mso-table-lspace: 0pt;mso-table-rspace: 0pt;"><![endif]-->
                                        <!--[if !vml]><!-->
                                        <table
                                          cellpadding="0"
                                          cellspacing="0"
                                          class="icons-inner"
                                          role="presentation"
                                          style="
                                            mso-table-lspace: 0pt;
                                            mso-table-rspace: 0pt;
                                            display: inline-block;
                                            margin-right: -4px;
                                            padding-left: 0px;
                                            padding-right: 0px;
                                          "
                                        >
                                          <!--<![endif]-->
                                          <tr>
                                            <td
                                              style="
                                                vertical-align: middle;
                                                text-align: center;
                                                padding-top: 5px;
                                                padding-bottom: 5px;
                                                padding-left: 5px;
                                                padding-right: 6px;
                                              "
                                            >
                                              <a
                                                href="http://designedwithbeefree.com/"
                                                style="text-decoration: none"
                                                target="_blank"
                                                ><img
                                                  align="center"
                                                  alt="Beefree Logo"
                                                  class="icon"
                                                  height="32"
                                                  src="images/Beefree-logo.png"
                                                  style="
                                                    display: block;
                                                    height: auto;
                                                    margin: 0 auto;
                                                    border: 0;
                                                  "
                                                  width="34"
                                              /></a>
                                            </td>
                                            <td
                                              style="
                                                font-family: 'Inter', sans-serif;
                                                font-size: 15px;
                                                font-weight: undefined;
                                                color: #1e0e4b;
                                                vertical-align: middle;
                                                letter-spacing: undefined;
                                                text-align: center;
                                              "
                                            >
                                              <a
                                                href="http://designedwithbeefree.com/"
                                                style="
                                                  color: #1e0e4b;
                                                  text-decoration: none;
                                                "
                                                target="_blank"
                                                >Designed with Beefree</a
                                              >
                                            </td>
                                          </tr>
                                        </table>
                                      </td>
                                    </tr>
                                  </table>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                </tr>
              </tbody>
            </table>
          </td>
        </tr>
      </tbody>
    </table>
    <!-- End -->
  </body>
</html>
`;
};
