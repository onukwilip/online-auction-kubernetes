import connect from "@/config/db";
import Bid from "@/models/Bid";
import {
  authMiddleware,
  getKey,
  getUploadedImagesUrl,
  mapFunction,
  uploadImage,
} from "@/utils";
import multer from "multer";
import nextConnect from "next-connect";
import cors from "cors";
import redisConfig from "@/config/redis-config";

connect();
const redisClient = redisConfig();

export const config = {
  api: {
    bodyParser: false, // Disallow body parsing, consume as stream
  },
};

const upload = multer({
  storage: multer.memoryStorage(),
});

const api = nextConnect({
  onError: (err, req, res, next) => {
    return res.status(500).json({ message: err.stack });
  },
  onNoMatch: (req, res) => {
    return res.status(500).json({ message: `${req.method} not allowed` });
  },
});

api.use(upload.array("images"));
api.use(cors());

api.post(async (req, res) => {
  const { body, files } = req;

  const auth = await authMiddleware({ req, res });
  if (auth?.code !== 200) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const imagesUrls = await getUploadedImagesUrl(files);

  const bid = await Bid.create({
    name: body.name,
    startingBid: +body.startingBid,
    currentBid: 0,
    highestBidder: "null",
    expiry: new Date(body.expiry),
    image: imagesUrls[0],
    category: body.category,
    description: body.description,
    expired: false,
    userId: auth?.data?.id,
    paid: false,
    images: imagesUrls.map(mapFunction),
    dateCreated: new Date(),
    winner: {
      userId: "",
    },
  });

  if (!bid) {
    return res.status(400).json({ message: "An error occured" });
  }

  return res.status(200).json(bid);
});

api.get(async (req, res) => {
  const key = getKey(req);
  const cachedBids = await redisClient.get(key);

  if (cachedBids) return res.status(200).json(JSON.parse(cachedBids));

  const bids = await Bid.find().catch((e) => {
    return res.status(400).json({ message: "An error occured" });
  });

  if (bids?.length < 1) {
    return res.status(404).json({ message: "No bid's available" });
  }

  await redisClient.setEx(key, 1000 * 15, JSON.stringify(bids));
  return res.status(200).json(bids);
});

export default api;
