import { authMiddleware, getKey } from "@/utils";
import User from "@/models/User";
import connect from "@/config/db";
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
  const auth = await authMiddleware({ req, res });
  if (auth?.code !== 200) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  const { query } = req;

  const key = getKey(req, query?.id);
  const cachedUser = await client.get(key);

  if (cachedUser) return res.status(200).json(JSON.parse(cachedUser));

  const user = await User.findOne({ _id: query?.id });

  if (!user) return res.status(404).json({ message: "User not found" });

  await client.setEx(key, 1000 * 10, JSON.stringify(user));
  return res.status(200).json(user);
});

export default api;

// export default async function UserAPI(req, res) {
//   connect();

//   const auth = await authMiddleware({ req, res });
//   if (auth?.code !== 200) {
//     return res.status(401).json({ message: "Unauthorized" });
//   }
//   const { query } = req;
//   if (req.method === "GET") {
//     const user = await User.findOne({ _id: query?.id });

//     if (!user) return res.status(404).json({ message: "User not found" });

//     return res.status(200).json(user);
//   }
// }
