import React, { useEffect } from "react";
import css from "@/styles/howItWorks/HowItWorks.module.scss";
import { Button, Icon } from "semantic-ui-react";
import { useTimer } from "react-timer-hook";

class HowItWorksClass {
  constructor(icon, title, desc) {
    this.icon = icon;
    this.title = title;
    this.desc = desc;
  }
}

const HowItWorksList = [
  new HowItWorksClass(
    "fas fa-computer-mouse",
    "Register",
    "To start using our auction, you’ll need to register. It’s completely free and requires just a few clicks!"
  ),
  new HowItWorksClass(
    "fa-solid fa-cart-shopping",
    "Buy or bid",
    "You can instantly buy or place a bid on any desired product right after registration on our website."
  ),
  new HowItWorksClass(
    "fas fa-gavel",
    "Submit a bid",
    "Submitting a bid to our auction is quick and easy. The process takes approximately 5 minutes."
  ),
  new HowItWorksClass(
    "fas fa-trophy",
    "Win",
    "Easily win at our auction and enjoy owning the product you dream of after the bidding is closed."
  ),
];

const Card = ({ item }) => {
  return (
    <div className={css["card"]}>
      <div className={css["icon-container"]}>
        <i className={item?.icon} />
      </div>
      <h1>{item?.title}</h1>
      <p>{item?.desc}</p>
    </div>
  );
};

const HowItWorks = () => {
  return (
    <div className={css["how-it-works"]}>
      <h1 className={css.title}>
        <b>How</b> <em>it works</em>
      </h1>
      <div className={css.items}>
        {HowItWorksList.map((eachCard, i) => (
          <Card item={eachCard} key={i} />
        ))}
      </div>
    </div>
  );
};

export default HowItWorks;
