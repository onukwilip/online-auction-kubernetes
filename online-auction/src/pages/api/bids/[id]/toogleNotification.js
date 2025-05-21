import connect from "@/config/db";
import Bid from "@/models/Bid";
import SubscribedUsers from "@/models/NotificationSubscriptions";
import {
  authMiddleware,
  manageSubscriptionsAndBidNotifications,
} from "@/utils";
import nextConnect from "next-connect";
import cors from "cors";

connect();

const api = nextConnect({
  onNoMatch: (req, res) =>
    res.status(404).json({ message: `${req.method} method not allowed` }),
});

api.use(cors());

api.put(async (req, res) => {
  const { body, query } = req;

  const auth = await authMiddleware({ req, res });
  if (auth?.code !== 200) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const bid = await Bid.findOne({ _id: query.id });

  const parsedBid = JSON.parse(JSON.stringify(bid));

  await manageSubscriptionsAndBidNotifications(
    body,
    parsedBid,
    auth?.data?.id,
    res,
    { skipIfExists: false }
  );

  return res.status(200).json("User notification changed successfully");
});

export default api;
