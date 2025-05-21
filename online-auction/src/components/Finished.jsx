import React, { useEffect } from "react";
import css from "@/styles/finished/Finished.module.scss";
import { Card, Image } from "semantic-ui-react";
import useAjaxHook from "use-ajax-request";
import axios from "axios";
import ResponseError from "./ResponseError";
import CustomLoader from "./Loader";
import { FinishedBid } from "./Bid";

class FinishedItemClass {
  constructor(name, price, image) {
    this.name = name;
    this.price = price;
    this.image = image;
  }
}

const AllItems = [
  new FinishedItemClass(
    "Apple MacBook Pro 13'' 2.3GHz 128GB Space Gray",
    876,
    "https://images.unsplash.com/photo-1504707748692-419802cf939d?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=847&q=80"
  ),
  new FinishedItemClass(
    "Apple iPad Pro 11” Wi-Fi 64GB Silver",
    176,
    "https://images.unsplash.com/photo-1605556448160-4cfb9aca921a?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=774&q=80"
  ),
  new FinishedItemClass(
    "Ray-Ban High Street 54mm Sunglasses",
    16,
    "https://images.unsplash.com/photo-1511499767150-a48a237f0083?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=580&q=80"
  ),
  new FinishedItemClass(
    "Pier One Classic Dark Blue Ankle Boots",
    86,
    "https://images.unsplash.com/photo-1608256246200-53e635b5b65f?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=387&q=80"
  ),
];

// const FinishedItem = ({ item }) => {
//   return (
//     <div className={css["finished-item"]}>
//       <Card>
//         <div className={css["img-container"]}>
//           <div className={css.badge}>
//             <em>Final price</em>
//             <em>
//               <sup>$</sup> <em>{item?.price}</em>
//             </em>
//           </div>
//           <img src={item?.image} alt="" />
//         </div>
//         <Card.Content>
//           <Card.Header>{item?.name}</Card.Header>
//         </Card.Content>
//       </Card>
//     </div>
//   );
// };

const Finished = () => {
  const {
    sendRequest,
    data: bids,
    error,
    loading,
  } = useAjaxHook({
    instance: axios,
    options: {
      url: `${process.env.API_DOMAIN}/api/bids/query`,
      method: "POST",
      data: [
        {
          $match: {
            expired: true,
          },
        },
        {
          $limit: 4,
        },
      ],
    },
  });

  useEffect(() => {
    sendRequest();
  }, []);

  return (
    <div className={css.finished}>
      <h1 className={css.title}>
        <b>Finished</b> <em>Auctions</em>
      </h1>
      <div className={css.auctions}>
        {loading ? (
          <CustomLoader />
        ) : (
          <>
            {error && <ResponseError>No bids available</ResponseError>}
            {bids?.map((finished, i) => (
              <FinishedBid item={finished} key={i} />
            ))}
          </>
        )}
      </div>
    </div>
  );
};

export default Finished;
