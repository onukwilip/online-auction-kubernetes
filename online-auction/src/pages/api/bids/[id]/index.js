import connect from "@/config/db";
import Bid from "@/models/Bid";
import Biddings from "@/models/Biddings";
import {
  authMiddleware,
  getKey,
  getUploadedImagesUrl,
  mapFunction,
  storage,
} from "@/utils";
import multer from "multer";
import nextConnect from "next-connect";
import cors from "cors";
import redisConfig from "@/config/redis-config";

connect();
// const client = redisConfig();

export const config = {
  api: {
    bodyParser: false,
  },
};

const upload = multer({
  storage: multer.memoryStorage(),
});

const api = nextConnect({
  onNoMatch: (req, res) =>
    res.status(404).json({ message: `${req.method} method not allowed` }),
});

api.use(upload.array("images"));
api.use(cors());

api.get(async (req, res) => {
  const { query } = req;
  // const key = getKey(req, query.id);
  // const cachedBid = await client.get(key);
  // if (cachedBid) return res.status(200).json(JSON.parse(cachedBid));

  const bid = await Bid.findOne({ _id: query.id });

  if (bid?.length < 1) {
    return res.status(404).json({ message: "No bid available" });
  }

  const auth = await authMiddleware({ req, res });
  if (auth?.code !== 200) {
    return res.status(200).json(bid);
  }

  const parsedBid = JSON.parse(JSON.stringify(bid));
  const userPrevBid = parsedBid?.bids?.find(
    (bids) => bids.userId === auth?.data?.id
  );
  const userEnabledNotifications = parsedBid?.enabledNotifications?.find(
    (id) => id === auth?.data?.id
  );

  if (userPrevBid) {
    parsedBid.userBid = {
      ...parsedBid.userBid,
      previousBid: userPrevBid?.amount,
    };
  }
  if (userEnabledNotifications) {
    parsedBid.userBid = {
      ...parsedBid.userBid,
      enabledNotifications: userEnabledNotifications ? true : false,
    };
  }

  return res.status(200).json(parsedBid);
});

api.put(async (req, res) => {
  const { body, files, query } = req;

  const auth = await authMiddleware({ req, res });
  if (auth?.code !== 200) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const bid = await Bid.findOne({ _id: query.id });
  if (bid?.userId !== auth?.data?.id)
    return res.status(401).json({
      message: "You are NOT aothorized to make changes to this bid",
    });

  const imagesUrls = await getUploadedImagesUrl(files);

  const updatedBid = await Bid.updateOne(
    { _id: query.id },
    {
      $set: {
        ...body,
        image: files?.length > 0 ? imagesUrls[0] : bid.image,
        images: files?.length > 0 ? imagesUrls?.map(mapFunction) : bid?.images,
        expired: false,
        paid: false,
        "winner.userId": "",
      },
    }
  );

  if (!updatedBid) {
    return res.status(400).json({ message: "Something went wrong" });
  }
  return res.status(200).json(updatedBid);
});

api.delete(async (req, res) => {
  const { query } = req;

  const auth = await authMiddleware({ req, res });
  if (auth?.code !== 200) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const bid = await Bid.findOne({ _id: query.id });
  if (bid?.userId !== auth?.data?.id)
    return res.status(401).json({
      message: "You are NOT authorized to make changes to this bid",
    });

  const removedBid = await Bid.remove({ _id: query.id });
  await Biddings.remove({ bidId: query.id });

  if (!removedBid) {
    return res.status(400).json({ message: "Something went wrong" });
  }
  return res.status(204).json({ message: "Bid deleted successfully" });
});

export default api;
