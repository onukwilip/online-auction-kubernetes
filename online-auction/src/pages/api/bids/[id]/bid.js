import connect from "@/config/db";
import Bid from "@/models/Bid";
import Biddings from "@/models/Biddings";
import {
  authMiddleware,
  manageSubscriptionsAndBidNotifications,
  notifyUsers,
} from "@/utils";
import nextConnect from "next-connect";
import cors from "cors";

connect();

const api = nextConnect({
  onNoMatch: (req, res) => {
    return res
      .status(400)
      .json({ code: "InvalidMethod", message: "Method not allowed" });
  },
});

api.use(cors());

api.put(async (req, res) => {
  const auth = await authMiddleware({ req, res });
  if (auth?.code !== 200) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const { query, body } = req;

  // GET BID WITH ID
  const bid = await Bid.findOne({ _id: query.id });

  // IF BID DOES NOT EXIST RETURN 404
  if (!bid) return res.status(404).json({ message: "Bid not found" });

  // PARSE BID AND MANAGE NOTIFICATIONS AND SUBSCRIPTION
  const parsedBid = JSON.parse(JSON.stringify(bid));

  if (body.enableNotifications)
    await manageSubscriptionsAndBidNotifications(
      body,
      parsedBid,
      auth?.data?.id,
      res,
      {
        skipIfExists: true,
      }
    );

  //IF THIS BID WAS POSTED BY THIS USER RETURN 405
  if (bid?.userId === auth?.data?.id)
    return res.status(405).json({
      code: "ItemPostedByUser",
      message: "You can't bid for an item you posted",
    });

  //IF AMOUNT IS LESS THAN STARTING BID RETURN 400
  if (body.amount < bid?.startingBid)
    return res.status(400).json({
      code: "AmountLessThanStartBid",
      message: "Amount must be greater than the starting bid",
    });

  // GET THE CURRENT BID
  const currentBid = {
    userId: auth?.data?.id,
    amount: body.amount,
  };
  //GET THE PREVIOUS BIDS
  const updatedBids = bid?.bids || [];

  //FIND THE INDEX OF BID WHERE BID.USERID EQUALS CURRENT USER
  const userHasBidIndex = updatedBids?.findIndex(
    (prevBids) => prevBids?.userId === auth?.data?.id
  );
  //IF USER HAS PREVIOUSLY BID
  if (userHasBidIndex >= 0) {
    //UPDATE  BID WITH USERID WITH NEW AMOUNT
    updatedBids[userHasBidIndex].amount = currentBid?.amount;
  }
  //ELSE
  else {
    //ADD CURRENT BID TO LIST OF PREVIOUS BIDS
    updatedBids.push(currentBid);
  }

  //GET THE HIGHEST BID AMONGST THE BID ARRAY
  const highestBid = updatedBids.sort((p1, p2) =>
    p1?.amount < p2?.amount ? 1 : p1?.amount > p2?.amount ? -1 : 0
  )[0];

  //UPDATE BID IN DATABASE
  const updatedBid = await Bid.updateOne(
    { _id: query.id },
    {
      $set: {
        bids: updatedBids,
        currentBid: highestBid?.amount,
        highestBidder: highestBid?.userId,
      },
    },
    { new: true }
  );

  //IF BID NOT UPDATED RETURN 400
  if (!updatedBid) {
    return res.status(400).json({
      code: "ServerError",
      message: "Something went wrong",
    });
  }

  // GET ROW FROM BIDDINGS COLLECTION WHERE USERID = USER'S ID AND BIDID = BID ID
  const getPrevBidding = await Biddings.findOne({
    userId: auth?.data?.id,
    bidId: query.id,
  });

  // IF EXISTS
  if (getPrevBidding) {
    // UPDATE THE COLLECTION SET AMOUNT = NEW AMOUNT, WHERE USERID = USER'S ID AND BIDID = BID'S ID
    await Biddings.updateOne(
      { userId: auth?.data?.id, bidId: query.id },
      { $set: { amount: currentBid.amount } },
      { new: true }
    );
  }
  // ELSE
  else {
    // INSERT NEW RECORD
    await Biddings.create({
      userId: auth?.data?.id,
      bidId: query.id,
      datePosted: new Date(),
      amount: currentBid.amount,
    });
  }

  // IF THERE ARE USERS
  const surpasedBidders = parsedBid?.bids?.filter(
    (bid) => currentBid.amount >= bid?.amount
  );
  const subscribedBidders = surpasedBidders
    ?.filter((bidder) =>
      parsedBid?.enabledNotifications?.find((id) => id === bidder.userId)
    )
    ?.filter((filteredUsers) => filteredUsers?.userId !== auth?.data?.id)
    ?.map((filteredUsers) => filteredUsers?.userId);
  if (subscribedBidders?.length > 0) {
    console.log("SURPASSED BIDDERS", surpasedBidders);
    console.log("SUBSCRIBED BIDDERS", subscribedBidders);
    await notifyUsers(
      parsedBid,
      auth?.data?.id,
      subscribedBidders,
      highestBid?.amount,
      {
        title: `You've been outbid!`,
        message: `You previously placed a bid for the '${bid?.name}' product, now you've been outbidded. Place another bid to stand a chance of winning the auction!`,
        destination: `${process.env.DOMAIN}/product/${bid?._id}`,
      }
    );
  }

  //   ELSE RETURN 200
  return res.status(200).json(updatedBid);
});

export default api;

// export default async function Bids(req, res) {
//   connect();

//   const auth = await authMiddleware({ req, res });
//   if (auth?.code !== 200) {
//     return res.status(401).json({ message: "Unauthorized" });
//   }

//   const { query, body } = req;

//   if (req.method === "PUT") {
//     // GET BID WITH ID
//     const bid = await Bid.findOne({ _id: query.id });

//     // IF BID DOES NOT EXIST RETURN 404
//     if (!bid) return res.status(404).json({ message: "Bid not found" });

//     //IF THIS BID WAS POSTED BY THIS USER RETURN 405
//     if (bid?.userId === auth?.data?.id)
//       return res.status(405).json({
//         code: "ItemPostedByUser",
//         message: "You can't bid for an item you posted",
//       });

//     //IF AMOUNT IS LESS THAN STARTING BID RETURN 400
//     if (body.amount < bid?.startingBid)
//       return res.status(400).json({
//         code: "AmountLessThanStartBid",
//         message: "Amount must be greater than the starting bid",
//       });

//     // GET THE CURRENT BID
//     const currentBid = {
//       userId: auth?.data?.id,
//       amount: body.amount,
//     };
//     //GET THE PREVIOUS BIDS
//     const updatedBids = bid?.bids || [];

//     //FIND THE INDEX OF BID WHERE BID.USERID EQUALS CURRENT USER
//     const userHasBidIndex = updatedBids?.findIndex(
//       (prevBids) => prevBids?.userId === auth?.data?.id
//     );
//     //IF USER HAS PREVIOUSLY BID
//     if (userHasBidIndex >= 0) {
//       //UPDATE  BID WITH USERID WITH NEW AMOUNT
//       updatedBids[userHasBidIndex].amount = currentBid?.amount;
//     }
//     //ELSE
//     else {
//       //ADD CURRENT BID TO LIST OF PREVIOUS BIDS
//       updatedBids.push(currentBid);
//     }

//     //GET THE HIGHEST BID AMONGST THE BID ARRAY
//     const highestBid = updatedBids.sort((p1, p2) =>
//       p1?.amount < p2?.amount ? 1 : p1?.amount > p2?.amount ? -1 : 0
//     )[0];

//     //UPDATE BID IN DATABASE
//     const updatedBid = await Bid.updateOne(
//       { _id: query.id },
//       {
//         $set: {
//           bids: updatedBids,
//           currentBid: highestBid?.amount,
//           highestBidder: highestBid?.userId,
//         },
//       },
//       { new: true }
//     );

//     //IF BID NOT UPDATED RETURN 400
//     if (!updatedBid) {
//       return res.status(400).json({
//         code: "ServerError",
//         message: "Something went wrong",
//       });
//     }

//     // GET ROW FROM BIDDINGS COLLECTION WHERE USERID = USER'S ID AND BIDID = BID ID
//     const getPrevBidding = await Biddings.findOne({
//       userId: auth?.data?.id,
//       bidId: query.id,
//     });

//     // IF EXISTS
//     if (getPrevBidding) {
//       // UPDATE THE COLLECTION SET AMOUNT = NEW AMOUNT, WHERE USERID = USER'S ID AND BIDID = BID'S ID
//       await Biddings.updateOne(
//         { userId: auth?.data?.id, bidId: query.id },
//         { $set: { amount: currentBid.amount } },
//         { new: true }
//       );
//     }
//     // ELSE
//     else {
//       // INSERT NEW RECORD
//       await Biddings.create({
//         userId: auth?.data?.id,
//         bidId: query.id,
//         datePosted: new Date(),
//         amount: currentBid.amount,
//       });
//     }

//     //   ELSE RETURN 200
//     return res.status(200).json(updatedBid);
//   }

//   return res
//     .status(400)
//     .json({ code: "InvalidMethod", message: "Method not allowed" });
// }
