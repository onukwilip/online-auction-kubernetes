import React, { useState } from "react";
import css from "@/styles/banner/Banner.module.scss";
import { Button } from "semantic-ui-react";
import happy from "@/assets/img/happy.png";
import LoginSignup from "./LoginSignup";
import Modal from "./Modal";

const Banner = () => {
  const [showModal, setShowModal] = useState(false);
  return (
    <>
      {showModal && (
        <Modal show={setShowModal}>
          <LoginSignup active="signup" />
        </Modal>
      )}
      <div className={css.banner}>
        <div className={css.desc}>
          <em>The best place </em>
          <em>
            <b>to buy and sell!</b>
          </em>
          <Button
            animated="fade"
            onClick={() => {
              setShowModal((prev) => !prev);
            }}
          >
            <Button.Content visible className={css["normal"]}>
              Register
            </Button.Content>
            <Button.Content hidden className={css["hover"]}>
              Sign up! It's free
            </Button.Content>
          </Button>
        </div>
        <div className={css.img}>
          <img src={happy.src} alt="" />
        </div>
      </div>
    </>
  );
};

export default Banner;
