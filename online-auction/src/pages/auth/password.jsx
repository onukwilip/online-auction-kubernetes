import React, { useEffect } from "react";
import css from "@/styles/auth/Auth.module.scss";
import Glassmorphism from "@/components/Glassmorphism";
import { Button, Divider, Form, Input } from "semantic-ui-react";
import PreHeader from "@/components/PreHeader";
import Header from "@/components/Header";
import { HeadComponent } from "..";
import useAjaxHook from "use-ajax-request";
import axios from "axios";
import { useRouter } from "next/router";
import CustomLoader from "@/components/Loader";
import { useInput } from "use-manage-form";
import ResponseError from "@/components/ResponseError";

const Auth = () => {
  const router = useRouter();
  const id = router.query.id;
  const {
    value: email,
    isValid: emailIsValid,
    inputIsInValid: emailInputIsInValid,
    onChange: onEmailChange,
    onBlur: onEmailBlur,
  } = useInput((value) => value?.includes("@"));

  const { sendRequest, loading, error } = useAjaxHook({
    instance: axios,
    options: {
      url: `${process.env.API_DOMAIN}/api/auth/password`,
      method: "POST",
      data: { email },
    },
  });

  const onSubmit = () => {
    if (!emailIsValid) return onEmailBlur();
    sendRequest(
      (res) => {
        router.push("/auth/change-password");
      },
      (err) => {}
    );
  };

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
            <h1>Enter your email in which OTP should be sent to</h1>
            <Divider />
            <Form>
              <Form.Input
                icon="mail"
                iconPosition="left"
                placeholder="Enter email address..."
                className={css.input}
                value={email}
                onChange={(e) => onEmailChange(e.target.value)}
                onBlur={onEmailBlur}
                error={
                  emailInputIsInValid && {
                    content: "Value must be a valid email address",
                    pointing: "above",
                  }
                }
              />
              <p>
                If the an account with this email address exists in our records,
                you'll receive an OTP which will be used to change your password
              </p>
              <div className={css.actions}>
                <Button className={css.send} onClick={onSubmit}>
                  Send
                </Button>
              </div>
            </Form>
            {loading && <CustomLoader />}
            <br />
            {error && (
              <ResponseError>{error?.response?.data?.message}</ResponseError>
            )}
          </Glassmorphism>
        </div>
      </div>
    </>
  );
};

export default Auth;
