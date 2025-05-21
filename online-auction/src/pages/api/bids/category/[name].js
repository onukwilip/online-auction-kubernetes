import connect from "@/config/db";
import Bid from "@/models/Bid";
import { getKey } from "@/utils";
import nextConnect from "next-connect";
import cors from "cors";
import redisConfig from "@/config/redis-config";

connect();
const client = redisConfig();

const api = nextConnect({
  onNoMatch: (req, res) => {
    return res.status(400).json({ message: `${req.method} not allowed` });
  },
});

api.use(cors());

api.get(async (req, res) => {
  const { query } = req;

  const key = getKey(req, query.name);
  const cachedBids = await client.get(key);
  if (cachedBids) return res.status(200).json(JSON.parse(cachedBids));

  const bids = await Bid.find({ category: query.name });

  if (bids?.length < 1) {
    return res.status(404).json({ message: "No bid available" });
  }

  await client.setEx(key, 1000 * 15, JSON.stringify(bids));
  return res.status(200).json(bids);
});

export default api;

// export default async function Bids(req, res) {
//   connect();
//   const { query } = req;
//   if (req.method === "GET") {
//     const bids = await Bid.find({ category: query.name });

//     if (bids?.length < 1) {
//       return res.status(404).json({ message: "No bid available" });
//     }
//     return res.status(200).json(bids);
//   }

//   return res.status(400).json({ message: "Method not allowed" });
// }
