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

api.post(async (req, res) => {
  const { body } = req;
  if (!Array.isArray(body) || body?.length < 1)
    return res
      .status(400)
      .json({ message: "Body must contain an array of at least one object" });

  const key = getKey(req, body);
  const cachedBids = await client.get(key);
  if (cachedBids) return res.status(200).json(JSON.parse(cachedBids));

  const bids = await Bid.find({ $or: body });
  const filteredBids = bids?.filter((bid) => bid?.expired === false);

  if (filteredBids?.length < 1) {
    return res.status(404).json({ message: "No bid available" });
  }

  await client.setEx(key, 1000 * 15, JSON.stringify(filteredBids));
  return res.status(200).json(filteredBids);
});

export default api;

// export default async function Bids(req, res) {
//   connect();
//   const { body } = req;
//   if (req.method === "POST") {
//     if (!Array.isArray(body) || body?.length < 1)
//       return res
//         .status(400)
//         .json({ message: "Body must contain an array of at least one object" });

//     const bids = await Bid.find({ $or: body });

//     if (bids?.length < 1) {
//       return res.status(404).json({ message: "No bid available" });
//     }
//     return res.status(200).json(bids);
//   }

//   return res.status(400).json({ message: "Method not allowed" });
// }
