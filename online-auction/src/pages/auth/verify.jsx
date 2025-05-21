import Glassmorphism from "@/components/Glassmorphism";
import React, { useEffect } from "react";
import { HeadComponent } from "..";
import PreHeader from "@/components/PreHeader";
import Header from "@/components/Header";
import css from "@/styles/auth/Auth.module.scss";
import useAjaxHook from "use-ajax-request";
import axios from "axios";
import Link from "next/link";

const Verify = (props) => {
  return (
    <>
      <HeadComponent></HeadComponent>
      <div className={css.auth}>
        <div className={css["pre-header"]}>
          <PreHeader />
        </div>
        <Header />
        <div className={css.body}>
          <Glassmorphism className={css.trans}>
            <h1>{props.message}</h1>
            <p>
              <Link href="/"> Go to home page </Link>{" "}
              {props.code === 200 && (
                <Link href="/dashboard"> Go to Dashboard </Link>
              )}
            </p>
          </Glassmorphism>
        </div>
      </div>
    </>
  );
};

export default Verify;

export const getServerSideProps = async ({ req, res, query }) => {
  //!REMOVE
  // process.env.DOMAIN = "http://localhost:3000";

  const response = await axios
    .get(`${process.env.DOMAIN}/api/auth?id=${query?.id}&code=${query?.code}`)
    .catch((e) =>
      console.error(
        `Error verifying details, ${e.message}. URL: ${e?.config?.request?.url}`,
        e
      )
    );

  console.log("QUERY", query);
  console.log("RESPONSE", response);

  if (response.status === 200) {
    return {
      props: {
        message: "Congratulations, your email address has been confirmed",
        code: 200,
      },
    };
  }

  return {
    props: {
      message: "Sorry, your link is either invalid or expired",
      code: 400,
    },
  };
};
