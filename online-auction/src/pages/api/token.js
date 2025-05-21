import connect from "@/config/db";
import { authMiddleware } from "@/utils";
import nextConnect from "next-connect";
import cors from "cors";

connect();

const api = nextConnect({
  onNoMatch: (req, res) => {
    return res.status(400).json({ message: "Only POST ruests are allowed" });
  },
});

api.use(cors());

api.get(async (req, res) => {
  const response = await authMiddleware({ req, res });
  return res.status(response?.code || 400).json(response);
});

export default api;

// export default async function Token(req, res) {
//   connect();

//   if (req.method === "GET") {
//     const response = await authMiddleware({ req, res });
//     return res.status(response?.code || 400).json(response);
//   }
//   return res.status(400).json({ message: "Method not allowed" });
// }
