import connect from "@/config/db";
import Bid from "@/models/Bid";
import Biddings from "@/models/Biddings";
import { authMiddleware } from "@/utils";
import nextConnect from "next-connect";
import cors from "cors";

connect();

const api = nextConnect({
  onNoMatch: (req, res) => {
    return res.status(400).json({ message: `${req.method} not allowed` });
  },
});

api.use(cors());

api.delete(async (req, res) => {
  const { query } = req;

  const auth = await authMiddleware({ req, res });
  if (auth?.code !== 200) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const bid = await Bid.findOne({ _id: query.id });

  if (!bid) {
    return res.status(400).json({ message: "Something went wrong" });
  }

  // DELETE USER BID FROM LIST OF BID BIDS
  const otherBids =
    bid?.bids?.filter((eachBid) => eachBid?.userId !== auth?.data?.id) || [];

  //GET THE HIGHEST BID AMONGST THE BIDS ARRAY
  const highestBid = otherBids?.bids?.sort((p1, p2) =>
    p1?.amount < p2?.amount ? 1 : p1?.amount > p2?.amount ? -1 : 0
  )[0] || { amount: 0, userId: "" };

  // UPDATE THE BID
  await Bid.updateOne(
    { _id: query.id },
    {
      $set: {
        bids: otherBids,
        currentBid: highestBid?.amount || 0,
        highestBidder: highestBid?.userId || "",
      },
    }
  );
  //DELETE USER BID FROM BIDDINGS WHERE USERID = THE USER'S ID AND BIDID = BID ID
  await Biddings.deleteOne({ userId: auth?.data?.id, bidId: bid?._id });

  return res.status(204).json({ message: "User bid removed successfully" });
});

export default api;

// export default async function Bids(req, res) {
//   connect();
//   const { query } = req;

//   if (req.method === "DELETE") {
//     const auth = await authMiddleware({ req, res });
//     if (auth?.code !== 200) {
//       return res.status(401).json({ message: "Unauthorized" });
//     }

//     const bid = await Bid.findOne({ _id: query.id });

//     if (!bid) {
//       return res.status(400).json({ message: "Something went wrong" });
//     }

//     // DELETE USER BID FROM LIST OF BID BIDS
//     const otherBids =
//       bid?.bids?.filter((eachBid) => eachBid?.userId !== auth?.data?.id) || [];

//     //GET THE HIGHEST BID AMONGST THE BIDS ARRAY
//     const highestBid = otherBids?.bids?.sort((p1, p2) =>
//       p1?.amount < p2?.amount ? 1 : p1?.amount > p2?.amount ? -1 : 0
//     )[0] || { amount: 0, userId: "" };

//     // UPDATE THE BID
//     await Bid.updateOne(
//       { _id: query.id },
//       {
//         $set: {
//           bids: otherBids,
//           currentBid: highestBid?.amount || 0,
//           highestBidder: highestBid?.userId || "",
//         },
//       }
//     );
//     //DELETE USER BID FROM BIDDINGS WHERE USERID = THE USER'S ID AND BIDID = BID ID
//     await Biddings.deleteOne({ userId: auth?.data?.id, bidId: bid?._id });

//     return res.status(204).json({ message: "User bid removed successfully" });
//   }

//   return res.status(400).json({ message: "Method not allowed" });
// }
