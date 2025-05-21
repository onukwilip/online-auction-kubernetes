import React, { useEffect } from "react";
import css from "@/styles/current/Current.module.scss";
import { Button, Card, Icon } from "semantic-ui-react";
import { useTimer } from "react-timer-hook";
import useAjaxHook from "use-ajax-request";
import ResponseError from "./ResponseError";
import CustomLoader from "./Loader";
import axios from "axios";
import Bid from "@/components/Bid";
import { useRouter } from "next/router";

class CurrentAuctionClass {
  constructor(name, price, start, image, expiry) {
    this.name = name;
    this.currentBid = price;
    this.startingBid = start;
    this.image = image;
    this.expiry = expiry;
  }
}

const CurrentAuctions = [
  new CurrentAuctionClass(
    "Apple MacBook Pro 13'' 2.3GHz 128GB Space Gray",
    876,
    200,
    "https://images.unsplash.com/photo-1504707748692-419802cf939d?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=847&q=80",
    1674567258459
  ),
  new CurrentAuctionClass(
    "Apple iPad Pro 11” Wi-Fi 64GB Silver",
    176,
    100,
    "https://images.unsplash.com/photo-1605556448160-4cfb9aca921a?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=774&q=80",
    1674599658459
  ),
  new CurrentAuctionClass(
    "Ray-Ban High Street 54mm Sunglasses",
    16,
    5,
    "https://images.unsplash.com/photo-1511499767150-a48a237f0083?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=580&q=80",
    1674614058459
  ),
  new CurrentAuctionClass(
    "Pier One Classic Dark Blue Ankle Boots",
    86,
    86,
    "https://images.unsplash.com/photo-1608256246200-53e635b5b65f?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=387&q=80",
    1674605058459
  ),
];

const Current = () => {
  const router = useRouter();
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
            expired: false,
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
    <div className={css["current"]}>
      <h1 className={css.title}>
        <b>Current</b> <em>Auctions</em>
      </h1>
      <div className={css.auctions}>
        {loading ? (
          <CustomLoader />
        ) : (
          <>
            {error && <ResponseError>No bids available</ResponseError>}
            {bids?.map((finished, i) => (
              <Bid item={finished} key={i} />
            ))}
          </>
        )}
      </div>
      <div className={css["actions"]}>
        <Button
          icon
          labelPosition="right"
          className={css.more}
          onClick={() => {
            router.push("/shop");
          }}
        >
          View more
          <Icon name="right arrow" />
        </Button>
      </div>
    </div>
  );
};

export default Current;
