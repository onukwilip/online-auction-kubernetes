import React, { useEffect, useMemo, useState } from "react";
import css from "@/styles/product/Product.module.scss";
import PreHeader from "./PreHeader";
import Header from "./Header";
import Link from "next/link";
import {
  Button,
  Divider,
  Feed,
  Form,
  Icon,
  Input,
  Loader,
  Message,
} from "semantic-ui-react";
import Footer from "./Footer";
import Bid from "./Bid";
import useAjaxHook from "use-ajax-request";
import axios from "axios";
import { useRouter } from "next/router";
import dummyImage from "@/assets/img/dummy-product.png";
import dummyUser from "@/assets/img/dummy.png";
import CustomLoader from "./Loader";
import ResponseError from "./ResponseError";
import { useInput } from "use-manage-form";
import ErrorMessage from "./Error";
import LoginSignup from "./LoginSignup";
import Modal from "./Modal";
import { useTimer } from "react-timer-hook";
import useRequest from "@/hooks/useRequest";
import { getCookies } from "cookies-next";

const product = {
  name: "Apple MacBook Pro 13'' 2.3GHz 128GB Space Gray",
  startingBid: 200,
  currentBid: 500,
  image:
    "https://images.unsplash.com/photo-1504707748692-419802cf939d?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=847&q=80",
  images: [
    "https://images.unsplash.com/photo-1504707748692-419802cf939d?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=847&q=80",
    ,
    "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxzZWFyY2h8Mnx8bWFjYm9va3xlbnwwfHwwfHw%3D&auto=format&fit=crop&w=500&q=60",
    "https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxzZWFyY2h8Nnx8bWFjYm9va3xlbnwwfHwwfHw%3D&auto=format&fit=crop&w=500&q=60",
    "https://images.unsplash.com/photo-1541807084-5c52b6b3adef?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxzZWFyY2h8M3x8bWFjYm9va3xlbnwwfHwwfHw%3D&auto=format&fit=crop&w=500&q=60",
    "https://images.unsplash.com/photo-1526570207772-784d36084510?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxzZWFyY2h8MTR8fG1hY2Jvb2t8ZW58MHx8MHx8&auto=format&fit=crop&w=500&q=60",
  ],
  expiry: 1674810091746,
  numberOfBids: 20,
  description:
    "Lorem ipsum dolor sit, amet consectetur adipisicing elit. Possimus doloremque tenetur nihil porro cumque nostrum illum temporibus provident, illo distinctio?",
};
const applicationServerKey =
  "BCBHO6YGYiig_WJ4i-A3If6Axi20Sbn07oLCDqTL-rkqWY9sMX58LOjkPFq4nVjP9EjdNlgC9-8Gr2SVIT_UDgU";
const notifications_db = "notifications";
const notification_index = "notification_index";

class NoificationClass {
  constructor(user_id, product_id) {
    this.user_id = user_id;
    this.product_id = product_id;
  }
}

const ImageComponent = ({ product, image, getProduct }) => {
  const [expired, setExpired] = useState(product?.expired);

  const { sendRequest: sendExpired } = useAjaxHook({
    instance: axios,
    options: {
      url: `${process.env.API_DOMAIN}/api/bids/${product?._id}/expire`,
      method: "PUT",
    },
  });

  const onExpire = () => {
    if (product.expired !== true) {
      sendExpired((res) => {
        setExpired(true);
        getProduct();
      });
    }
  };

  const autoSendExpired = () => {
    if (
      new Date().getTime() >= new Date(product?.expired).getTime() &&
      product?.expired !== true &&
      expired === false
    ) {
      onExpire();
    }
  };

  const { seconds, minutes, hours, days, start } = useTimer({
    expiryTimestamp: new Date(product?.expiry),
    onExpire,
    autoStart: true,
  });

  useEffect(() => {
    if (product.expired !== true) {
      start();
      autoSendExpired();
    } else {
      setExpired(true);
    }
  }, []);

  return (
    <>
      {!expired ? (
        <div className="timer">
          <em>
            {days} <em className={css.day}>{days === 1 ? "day" : "days"}</em>
          </em>
          &nbsp;
          <em>{hours} </em>:<em>{minutes} </em>:<em>{seconds}</em>
        </div>
      ) : (
        <>
          <div className={css.badge}>
            <em>Final price</em>
            <em>
              <sup>$</sup> <em>{product?.currentBid || 0}</em>
            </em>
          </div>
        </>
      )}
      <img src={image?.trim() !== "" ? image : dummyImage?.src} alt="Image" />
    </>
  );
};

const ProductComponent = ({ productId }) => {
  const [image, setImage] = useState("");
  const [enabledNotifications, setEnabledNotifications] = useState(false);

  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  // let productId = router.query.productId;
  const [postedSuccessfully, setPostedSuccessfully] = useState(false);
  // const [enableNotifications, setEnableNotifications] = useState(false)
  const {
    value: amount,
    isValid: amountIsValid,
    reset: resetAmount,
    onChange: onAmountChange,
    onBlur: onAmountBlur,
  } = useInput((value) => value?.trim() !== "");
  const [showLogin, setShowLogin] = useState(false);

  const {
    sendRequest: getProduct,
    data: product,
    loading,
    error,
  } = useAjaxHook({
    instance: axios,
    options: {
      url: `${process.env.API_DOMAIN}/api/bids/${productId}`,
      method: "GET",
    },
  });

  const {
    sendRequest: getRecommended,
    data: recommended,
    loading: recommendedLoading,
    error: recommendedError,
  } = useAjaxHook({
    instance: axios,
    options: {
      url: `${process.env.API_DOMAIN}/api/bids/query`,
      method: "POST",
      data: [
        {
          $match: {
            category: product?.category,
            ["_id"]: { $ne: product?._id },
          },
        },
        {
          $limit: 4,
        },
      ],
    },
  });

  const {
    sendRequest: postBid,
    error: postError,
    loading: postingBid,
  } = useRequest({
    instance: axios,
    config: {
      url: `${process.env.API_DOMAIN}/api/bids/${productId}/bid`,
      method: "PUT",
      data: {
        amount: +amount,
      },
    },
    options: {
      resetDataOnSend: true,
      resetErrorAfterSeconds: 3,
    },
  });

  const {
    sendRequest: getUser,
    data: userData,
    error: userError,
    loading: loadingUser,
  } = useAjaxHook({
    instance: axios,
    options: {
      url: `${process.env.API_DOMAIN}/api/user/${product?.userId}`,
      method: "GET",
    },
  });

  const {
    sendRequest: toogleProductNotifications,
    error: toogleNotificationsError,
    loading: tooglingNotification,
  } = useRequest({
    instance: axios,
    config: {
      url: `${process.env.API_DOMAIN}/api/bids/${productId}/toogleNotification`,
      method: "PUT",
    },
    options: {
      resetDataOnSend: true,
      resetErrorAfterSeconds: 3,
    },
  });

  const callGetProduct = () => {
    getProduct(
      (res) => {
        setImage(res?.data?.image);
      },
      (err) =>
        [404].includes(err?.response?.status) ? router.replace("/") : null
    );
  };

  const toogleIndexedDBNotification = async () => {
    console.log("Toogling notification");
    await openIndexedDB(async (/** @type IDBDatabase */ db) => {
      const user_id = window.atob(getCookies()?.session_id || "");

      const transaction = db.transaction(notifications_db, "readwrite");
      const notificationsStore = transaction.objectStore(notifications_db);

      const notificationIndex = notificationsStore.index(notification_index);

      // TODO: IMPLEMENT ALGO. FOR UPDATING THE USER-BID NOTIFICATION STATUS

      const getNotifications = () => {
        return new Promise((res, rej) => {
          const notifications = notificationIndex.getAll([user_id, productId]);

          notifications.addEventListener("error", (e) => {
            console.error(
              `An error occurred while retriving notifications list: ${e.message}`
            );
            rej(e);
          });

          notifications.addEventListener("success", () => {
            res(notifications.result);
          });
        });
      };
      const deleteBidNotification = (id) => {
        console.log("Deleting notification");

        return new Promise((res, rej) => {
          const deleted_notification = notificationsStore.delete(id);

          deleted_notification.addEventListener("error", (e) => {
            console.error(
              `An error occurred while deleting notification with id ${id}: ${e.message}`
            );
            rej(e);
          });

          deleted_notification.addEventListener("success", () => {
            res(deleted_notification.result);
          });
        });
      };
      const addNotification = () => {
        console.log("Adding notification");

        return new Promise((res, rej) => {
          const added_notification = notificationsStore.add(
            new NoificationClass(user_id, productId)
          );

          added_notification.addEventListener("error", (e) => {
            console.error(
              `An error occurred while adding notification: ${e.message}`
            );
            rej(e);
          });

          added_notification.addEventListener("success", () => {
            res(added_notification.result);
          });
        });
      };

      const bid_notifications = await getNotifications().catch((e) => {});

      // * DELETE BID NOTIFICATIONS FROM INDEXEDDB IF NOTIFICATION EXISTS
      if (
        bid_notifications &&
        Array.isArray(bid_notifications) &&
        bid_notifications?.length > 0
      ) {
        console.log("bid notifications", bid_notifications);

        for (const bid_notification of bid_notifications) {
          await deleteBidNotification(bid_notification._id);
        }
      }
      // * CREATE NOTIFICATION IN NOTIFICATION DB IF NOT EXIST
      else {
        console.log("Calling add notification");

        await addNotification();
      }

      transaction.addEventListener("complete", () => {
        console.log("Transaction completed");
        db.close();
      });
    });
  };

  const userBidNotificationExists = async () => {
    return await openIndexedDB(async (/** @type IDBDatabase */ db) => {
      const user_id = window.atob(getCookies()?.session_id || "");

      const transaction = db.transaction(notifications_db, "readwrite");
      const notificationsStore = transaction.objectStore(notifications_db);

      const notification_index_index =
        notificationsStore.index(notification_index);

      const getNotification = () => {
        return new Promise((res, rej) => {
          const user_bid_notification = notification_index_index.get([
            user_id,
            productId,
          ]);

          user_bid_notification.addEventListener("error", (e) => {
            console.error(
              `Error retrieving user-bid notification, ${e.message}`
            );
            rej(e);
          });
          user_bid_notification.addEventListener("success", (e) => {
            res(user_bid_notification.result);
          });
        });
      };

      const user_bid_notification = await getNotification().catch((e) => {});

      console.log("user bid notification", user_bid_notification);
      console.log("product notification id", productId);
      console.log("user notification id", user_id);

      return user_bid_notification ? true : false;
    });
  };

  const updateEnabledNotification = async () => {
    const userEnabledNotification = await userBidNotificationExists();
    setEnabledNotifications(userEnabledNotification);
    console.log("USER ENABLED NOTIFICATION", userEnabledNotification);
  };

  const onSuccess = async (res) => {
    setPostedSuccessfully(true);
    resetAmount();

    callGetProduct();

    setTimeout(() => {
      setPostedSuccessfully(false);
    }, [1000 * 6]);
  };

  const onError = (err) => {
    if (err?.response?.status === 401) {
      // Show login modal
      setShowLogin(true);
    }
  };

  const openIndexedDB = (/**@type Function */ onSuccess) => {
    return new Promise((res, rej) => {
      /** @type IDBDatabase */
      let db;
      const opendDB = indexedDB.open(notifications_db, 1);

      opendDB.addEventListener("error", (e) => {
        console.error(
          `An error occurred while opening '${notifications_db}' database`,
          e.message
        );
        rej(e);
      });

      opendDB.addEventListener("upgradeneeded", (e) => {
        db = opendDB.result;

        db.addEventListener("error", (e) =>
          console.error(
            `An error occurred while opening '${notifications_db}' database`,
            e.message
          )
        );

        const notificationsStore = db.createObjectStore(notifications_db, {
          keyPath: "_id",
          autoIncrement: true,
        });
        notificationsStore.createIndex(
          notification_index,
          ["user_id", "product_id"],
          { unique: false }
        );
      });

      opendDB.addEventListener("success", async (e) => {
        if (!db) db = opendDB.result;

        const returnVal = await onSuccess(db);
        res(returnVal);
      });
    });
  };

  const submitHandler = async () => {
    // if (product.userBid?.enabledNotifications)
    if (await userBidNotificationExists())
      return await postBid(onSuccess, onError);

    const res = confirm(
      "Do you want to enable notifications for this product (in case you get outbid, you'll be notified)?"
    );

    if (!res) {
      return await postBid(onSuccess, onError, {
        amount: +amount,
        enableNotifications: false,
      });
    }

    const notificationResponse = await Notification.requestPermission();
    if (notificationResponse === "granted") {
      const sw = await navigator.serviceWorker.ready.catch((e) => {
        console.log("An error occurred", e);
        alert("Service worker is not ready");
      });

      if (!sw) return;

      const requestPush = await sw.pushManager
        .subscribe({
          userVisibleOnly: true,
          applicationServerKey: applicationServerKey,
        })
        .catch((e) => {
          console.error(
            `An error occurred while subscribing to push notifications: ${e.message}`
          );
          alert("Could not subscribe to push notifications");
        });

      if (!requestPush) return;

      let parsedPushSubscription = JSON.parse(
        JSON.stringify(requestPush) || {}
      );

      await postBid(
        async (res) => {
          await toogleIndexedDBNotification();
          const userEnabledNotifications = await userBidNotificationExists();
          await updateEnabledNotification();
          await onSuccess(res);
        },
        onError,
        {
          amount: +amount,
          enableNotifications: true,
          newSubscription: { ...parsedPushSubscription },
        }
      );
    } else {
      alert("Please enable notifications for this browser");
    }
  };

  const toogleNofitifcation = async () => {
    const res = confirm(
      // product?.userBid?.enabledNotifications
      (await userBidNotificationExists())
        ? "Do you want to disable notifications for this product?"
        : "Do you want to enable notifications for this product (if you get outbid)"
    );
    if (!res) return;

    const notificationResponse = await Notification.requestPermission();
    if (notificationResponse === "granted") {
      const sw = await navigator.serviceWorker.ready.catch((e) => {
        console.log("An error occurred", e);
        alert("Service worker is not ready");
      });

      if (!sw) return;

      const requestPush = await sw.pushManager
        .subscribe({
          userVisibleOnly: true,
          applicationServerKey: applicationServerKey,
        })
        .catch((e) => {
          console.error(
            `An error occurred while subscribing to push notifications: ${e.message}`
          );
          alert("Could not subscribe to push notifications");
        });

      if (!requestPush) return;

      let parsedPushSubscription = JSON.parse(JSON.stringify(requestPush));

      await toogleProductNotifications(
        async () => {
          await toogleIndexedDBNotification();
          await updateEnabledNotification();
          callGetProduct();
        },
        undefined,
        {
          ...parsedPushSubscription,
        }
      );
    } else {
      alert("Please enable notifications for this browser");
    }
  };

  useEffect(() => {
    // productId = router.query.productId;
    console.log("Props product id", productId);
    updateEnabledNotification();
  }, []);

  useEffect(() => {
    if (!product && productId) {
      callGetProduct();
    }
  }, [productId]);

  useEffect(() => {
    if (!recommended) {
      getRecommended();
    }
    if (!userData) {
      getUser();
    }
  }, [product]);

  if (!productId || !product)
    return (
      <>
        <div style={{ width: "100vw", height: "80vh" }}>
          <CustomLoader />
        </div>
      </>
    );

  return (
    <>
      {showModal && (
        <Modal show={setShowModal}>
          <div className={css.notification_modal}>
            <div className={css.message}>
              Do you want to get notified when you get outbid from this product?
            </div>
            <div className={css.actions}>
              <Button>Skip</Button>
            </div>
          </div>
        </Modal>
      )}
      {showLogin && (
        <Modal show={setShowLogin}>
          <LoginSignup toogle="login" />
        </Modal>
      )}
      <div className={css.product}>
        <div className={css["pre-header"]}>
          <PreHeader />
        </div>
        <Header />
        <div className={css.body}>
          <div className={css.link}>
            <Link href="/shop">
              <Icon name="arrow left" />
              Back to shop
            </Link>
          </div>
          {loading ? (
            <CustomLoader />
          ) : (
            <>
              {error?.response?.status === 404 ? (
                <ResponseError>Bid doesn't exist</ResponseError>
              ) : !product ? (
                <>
                  <div style={{ width: "100%" }}>
                    <ResponseError>Please reload the page</ResponseError>
                  </div>
                </>
              ) : (
                <div className={css["sub-body"]}>
                  <div className={css.photos}>
                    {product?.images?.map((image, i) => (
                      <img
                        src={image}
                        alt="Photo"
                        key={i}
                        onClick={() => {
                          setImage(image);
                        }}
                      />
                    ))}
                  </div>
                  <div className={css.image}>
                    <ImageComponent
                      product={product}
                      image={image}
                      getProduct={callGetProduct}
                    />
                  </div>
                  <div className={css["desc-container"]}>
                    <h1>{product?.name}</h1>
                    <p>{product?.description}</p>
                    <Divider />
                    <p>
                      Starting bid:{" "}
                      <b>
                        <sup>$</sup>
                        {product?.startingBid}
                      </b>
                    </p>
                    {product?.userBid?.previousBid && (
                      <p>
                        Previous bid:{" "}
                        <b>
                          <sup>$</sup>
                          {product.userBid.previousBid}
                        </b>
                      </p>
                    )}
                    <p>
                      Highest bid:{" "}
                      <b className={css["current-bid"]}>
                        <sup>$</sup>
                        {product?.currentBid}
                      </b>
                    </p>
                    {!product?.expired ? (
                      <Form onSubmit={submitHandler}>
                        <Input
                          className={css.bid}
                          label="Set a bid"
                          placeholder="E.g: $100"
                          min={product?.startingBid}
                          type="number"
                          value={amount}
                          onChange={(e) => {
                            onAmountChange(e?.target?.value);
                          }}
                        />
                        <div className={css.action}>
                          <div
                            className={`${css.bid_notification_container}`}
                            style={
                              enabledNotifications
                                ? { background: "black" }
                                : { background: "rgba(255, 215, 0, 1)" }
                            }
                            onClick={toogleNofitifcation}
                          >
                            {!tooglingNotification ? (
                              <i
                                className={`${
                                  enabledNotifications
                                    ? "fas fa-bell"
                                    : "fa-regular fa-bell-slash"
                                } ${css.bid_notification}`}
                                style={
                                  enabledNotifications
                                    ? { color: "rgba(255, 215, 0, 1)" }
                                    : { color: "black" }
                                }
                              ></i>
                            ) : (
                              <>
                                <i
                                  className="fa-solid fa-spinner fa-pulse"
                                  style={
                                    enabledNotifications
                                      ? { color: "rgba(255, 215, 0, 1)" }
                                      : { color: "black" }
                                  }
                                ></i>
                              </>
                            )}
                          </div>
                          <Button disabled={postingBid}>
                            {postingBid ? "Loading..." : "Send bid"}
                          </Button>
                        </div>
                        {postError && postError?.response?.status !== 401 && (
                          <ErrorMessage textColor="red">
                            {postError?.response?.data?.message}
                          </ErrorMessage>
                        )}
                        {toogleNotificationsError && (
                          <ErrorMessage textColor="red">
                            Couldn't enable/disable notifications. Please check
                            your internet connection and try again
                          </ErrorMessage>
                        )}
                        {postedSuccessfully && (
                          <Message
                            color="green"
                            content="Bid posted successfully"
                          />
                        )}
                      </Form>
                    ) : (
                      <>
                        <ErrorMessage>This bid has expired</ErrorMessage>
                      </>
                    )}
                    <Divider />
                    {userData && (
                      <Feed className={css.user}>
                        <Feed.Event>
                          <Feed.Label
                            image={
                              userData?.image ? userData?.image : dummyUser?.src
                            }
                          />
                          <Feed.Content>
                            <Feed.Summary>{userData?.name}</Feed.Summary>
                            <Feed.Date content="Author" />
                          </Feed.Content>
                        </Feed.Event>
                      </Feed>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          <div className={css.recommended}>
            <div>
              <h1>Recommended</h1>{" "}
              <Link href="/shop">
                View more <Icon name="arrow right" />
              </Link>
            </div>
            <div className={css.products}>
              {recommendedLoading ? (
                <div style={{ width: "100%" }}>
                  <CustomLoader />
                </div>
              ) : (
                <>
                  {(recommendedError || recommended?.length < 1) && (
                    <ResponseError>No bids available</ResponseError>
                  )}
                  {recommended
                    ?.filter((product) => product._id !== productId)
                    ?.map((product, i) => (
                      <Bid item={product} />
                    ))}
                </>
              )}
            </div>
          </div>
        </div>
        <br />
        <Footer />
      </div>
    </>
  );
};

export default ProductComponent;
