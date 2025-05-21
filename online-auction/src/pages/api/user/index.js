import { authMiddleware, getKey, storage, uploadImage } from "@/utils";
import User from "@/models/User";
import connect from "@/config/db";
import nextConnect from "next-connect";
import multer from "multer";
import cors from "cors";
import redisConfig from "@/config/redis-config";

connect();

const client = redisConfig();

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

api.use(upload.single("image"));

api.use(cors());

api.get(async (req, res) => {
  const auth = await authMiddleware({ req, res });
  if (auth?.code !== 200) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const key = getKey(req, auth?.data?.id);
  const cachedUser = await client.get(key);

  if (cachedUser) return res.status(200).json(JSON.parse(cachedUser));

  const user = await User.findOne({ _id: auth?.data?.id });

  if (!user) return res.status(404).json({ message: "User not found" });

  client.set(key, JSON.stringify(user));

  return res.status(200).json(user);
});

api.put(async (req, res) => {
  const { body, file } = req;

  const auth = await authMiddleware({ req, res });
  if (auth?.code !== 200) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const image = await uploadImage(file, process.env.CLOUDINARY_FOLDER);

  const user = await User.updateOne(
    { _id: auth?.data?.id },
    { $set: { ...body, image: image?.url } },
    { new: true }
  );

  if (!user) return res.status(404).json({ message: "User not found" });

  const key = getKey({ url: req.url, method: "GET" }, auth?.data?.id);

  const oldUserDetails = JSON.parse(await client.get(key));

  await client.set(
    key,
    JSON.stringify({ ...oldUserDetails, ...body, image: image?.url })
  );

  return res.status(200).json(user);
});

export default api;
