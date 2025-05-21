import React, { useEffect } from "react";
import css from "@/styles/auth/Auth.module.scss";
import Glassmorphism from "@/components/Glassmorphism";
import { Divider } from "semantic-ui-react";
import PreHeader from "@/components/PreHeader";
import Header from "@/components/Header";
import { HeadComponent } from "..";
import useAjaxHook from "use-ajax-request";
import axios from "axios";
import { useRouter } from "next/router";
import CustomLoader from "@/components/Loader";

const Auth = () => {
  const router = useRouter();
  const id = router.query.id;

  const { sendRequest, loading } = useAjaxHook({
    instance: axios,
    options: {
      url: `${process.env.API_DOMAIN}/api/auth?id=${id}`,
      method: "POST",
    },
  });

  useEffect(() => {
    sendRequest(
      (res) => {},
      (err) => {}
    );

    console.log("Effect");
  }, []);

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
            <h1>Verify your email</h1>
            <Divider />
            <p>
              A link has been sent to your email address, please click the link
              to verify your email
            </p>
            <p>
              Didin't recieve the link?{" "}
              <a
                onClick={() => {
                  sendRequest(
                    (res) => {},
                    (err) => {}
                  );
                }}
              >
                Resend
              </a>
            </p>
            {loading && <CustomLoader />}
          </Glassmorphism>
        </div>
      </div>
    </>
  );
};

export default Auth;
