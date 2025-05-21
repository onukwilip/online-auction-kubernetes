import Header from "@/components/Header";
import PreHeader from "@/components/PreHeader";
import React, { useEffect, useState } from "react";
import css from "@/styles/dashboard/Dashboard.module.scss";
import { HeadComponent } from ".";
import Glassmorphism from "@/components/Glassmorphism";
import {
  Button,
  Divider,
  Form,
  Icon,
  Input,
  Message,
  Table,
} from "semantic-ui-react";
import { useRouter } from "next/router";
import { Products as allProducts } from "@/pages/shop";
import Footer from "@/components/Footer";
import useAjaxHook from "use-ajax-request";
import axios from "axios";
import CustomLoader from "@/components/Loader";
import dummyUser from "@/assets/img/dummy.png";
import dummyImage from "@/assets/img/dummy-product.png";
import ErrorMessage from "@/components/Error";
import ResponseError from "@/components/ResponseError";
import { useForm, useInput } from "use-manage-form";
import { authMiddleware } from "@/utils";

const validateExtension = (imgName, allowedExtensions) => {
  const ext = imgName.split(".").pop();

  if (!allowedExtensions.includes(`.${ext}`)) return false;
  return true;
};
const allowedImgExtensions = [".png", ".jpg", ".jpeg", ".webp", ".avif"];

class Menu {
  constructor(name, tab, icon) {
    this.name = name;
    this.tab = tab;
    this.icon = icon;
  }
}

const menus = [
  new Menu("User", "user", "fas fa-user"),
  new Menu("Products", "product", "fas fa-bag-shopping"),
  new Menu("Bids", "bid", "fas fa-gavel"),
  new Menu("Edit profile", "edit", "fas fa-pencil"),
  new Menu("Post bid", "new-bid", "fas fa-tags"),
  new Menu("Logout", "/", "fas  fa-right-from-bracket"),
];

class Tab {
  constructor(slug, component, name) {
    (this.slug = slug), (this.component = component), (this.name = name);
  }
}

const CustomCard = ({ children, className }) => {
  return (
    <div className={`${css.card} ${className}`}>
      <div className={css["vector-1"]}></div>
      <div className={css["vector-2"]}></div>
      {children}
    </div>
  );
};

class CardClass {
  constructor(title, icon, value) {
    (this.title = title), (this.icon = icon), (this.value = value);
  }
}

const User = () => {
  const {
    sendRequest: getUser,
    data: user,
    loading: loadingUser,
    error: userError,
  } = useAjaxHook({
    instance: axios,
    options: {
      url: `${process.env.API_DOMAIN}/api/user`,
      method: "GET",
    },
  });

  const {
    sendRequest: getUserBids,
    data: userBids,
    loading: loadingUserBids,
    error: userBidsError,
  } = useAjaxHook({
    instance: axios,
    options: {
      url: `${process.env.API_DOMAIN}/api/user/bids`,
      method: "GET",
    },
  });

  const {
    sendRequest: getUserBiddings,
    data: userBiddings,
    loading: loadingUserBiddings,
    error: userBiddingsError,
  } = useAjaxHook({
    instance: axios,
    options: {
      url: `${process.env.API_DOMAIN}/api/user/biddings`,
      method: "GET",
    },
  });

  const {
    sendRequest: getUserWonBids,
    data: userWonBids,
    loading: loadingUserWonBids,
    error: userWonBidsError,
  } = useAjaxHook({
    instance: axios,
    options: {
      url: `${process.env.API_DOMAIN}/api/user/bids/won`,
      method: "GET",
    },
  });

  const cards = [
    new CardClass(
      "Total bids created",
      "fas fa-tags",
      userBids ? userBids?.length : 0
    ),
    new CardClass(
      "Total items bidded",
      "fas fa-gavel",
      userBiddings ? userBiddings?.length : 0
    ),
    new CardClass(
      "Total bids won",
      "fa-solid fa-champagne-glasses",
      userWonBids ? userWonBids?.length : 0
    ),
  ];

  useEffect(() => {
    getUser();
    getUserBids();
    getUserBiddings();
  }, []);

  if (loadingUser) {
    return <CustomLoader />;
  }

  return (
    <div className={css.user}>
      <div>
        <h1>User</h1>
        <Divider />
        <div className={css.profile}>
          <div className={css.background}></div>
          <div className={css["profile-body"]}>
            <div className={css.details}>
              <div className={css["img-container"]}>
                <img
                  src={user?.image ? user?.image : dummyUser?.src}
                  alt="profile"
                />
              </div>
              <em className={css.name}>{user?.name}</em>
              {/* <em className={css.date}>Joined on {new Date().toUTCString()}</em> */}
              <ul className={css.others}>
                <li>
                  <Icon name="phone" /> {user?.phoneNumber}
                </li>
                <li>
                  <Icon name="mail" /> {user?.email}
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      <div className={css.statistics}>
        <div className={css["cards-container"]}>
          {cards.map((eachCard, i) => (
            <CustomCard className={css[`card${i}`]} key={i}>
              <div className={css.heading}>
                <p>{eachCard.title}</p>
                <i className={eachCard.icon} />
              </div>
              <div className={css.value}>{eachCard.value}</div>
            </CustomCard>
          ))}
        </div>
      </div>
    </div>
  );
};

const EachProduct = ({ eachProduct, callGetUserCreatedBids }) => {
  const router = useRouter();
  const { sendRequest: deleteBid, loading: deletingBid } = useAjaxHook({
    instance: axios,
    options: {
      url: `${process.env.API_DOMAIN}/api/bids/${eachProduct?._id}`,
      method: "DELETE",
    },
  });

  const confirmDeleteBid = () => {
    const confirm = window.confirm("Are you sure you want to delete this bid?");
    if (confirm === true) {
      deleteBid((res) => {
        callGetUserCreatedBids();
      });
    }
  };

  return (
    <>
      <Table.Row key={eachProduct?._id}>
        <Table.Cell>
          <img
            src={eachProduct.image ? eachProduct.image : dummyImage.src}
            alt=""
          />
        </Table.Cell>
        <Table.Cell>{eachProduct.name}</Table.Cell>
        <Table.Cell>
          {eachProduct.dateCreated
            ? new Date(eachProduct.dateCreated).toUTCString()
            : "-"}
        </Table.Cell>
        <Table.Cell>
          <sup>$</sup>
          {eachProduct.startingBid}
        </Table.Cell>
        <Table.Cell>
          <sup>$</sup>
          {eachProduct.currentBid}
        </Table.Cell>
        <Table.Cell>{eachProduct?.bids?.length}</Table.Cell>
        <Table.Cell>{new Date(eachProduct.expiry).toUTCString()}</Table.Cell>
        <Table.Cell>
          {eachProduct?.expired ? (
            <em style={{ color: "orangered" }}>Expired</em>
          ) : (
            <em style={{ color: "green" }}>Active</em>
          )}
        </Table.Cell>
        <Table.Cell>
          <Button
            className={css.edit}
            onClick={() => {
              router.push(
                `/dashboard/?tab=edit-bid&id=${eachProduct?._id}`,
                undefined,
                {
                  shallow: true,
                }
              );
            }}
          >
            Edit
          </Button>
        </Table.Cell>
        <Table.Cell>
          <Button className={css.delete} onClick={confirmDeleteBid}>
            {deletingBid ? "Loading..." : "Delete"}
          </Button>
        </Table.Cell>
      </Table.Row>
    </>
  );
};

const Products = () => {
  const [products, setProducts] = useState([]);
  const router = useRouter();

  const {
    sendRequest: getUserCreatedBids,
    data: userCreatedBids,
    loading: loadingUserCreatedBids,
    error: userCreatedBidsError,
  } = useAjaxHook({
    instance: axios,
    options: {
      url: `${process.env.API_DOMAIN}/api/user/bids`,
      method: "GET",
    },
  });

  const searchHandler = (value) => {
    const foundBids = userCreatedBids?.filter((eachBid) =>
      eachBid?.name?.toLowerCase()?.includes(value?.toLowerCase())
    );
    if (!Array.isArray(foundBids)) return;
    setProducts(foundBids);
  };

  const callGetUserCreatedBids = () => {
    getUserCreatedBids(({ data }) => {
      data?.sort((a, b) => {
        if (isNaN(Number(a?.dateCreated))) return -1;
        if (isNaN(Number(b?.dateCreated))) return 1;

        const result =
          new Date(a?.dateCreated)?.getTime() -
          new Date(b?.dateCreated)?.getTime();

        return result;
      });

      setProducts(data);
    });
  };

  useEffect(() => {
    callGetUserCreatedBids();
  }, []);

  return (
    <div className={css.products}>
      <h1>Created bids</h1>
      <Divider />
      <div className={css["search-container"]}>
        <Input
          label="Search "
          placeholder="Search bids..."
          onChange={(e) => {
            searchHandler(e.target.value);
          }}
        />
        <Button
          onClick={() => {
            router.push("/dashboard/?tab=new-bid", undefined, {
              shallow: true,
            });
          }}
        >
          Create new bid
        </Button>
      </div>
      <br />
      <div className={css.data}>
        {loadingUserCreatedBids ? (
          <CustomLoader />
        ) : (
          <>
            {products?.length < 1 ? (
              <ResponseError>No bids available</ResponseError>
            ) : (
              <Table>
                <Table.Header>
                  <Table.Row>
                    <Table.HeaderCell>
                      <em>Image</em>
                    </Table.HeaderCell>
                    <Table.HeaderCell>
                      <em>Name</em>
                    </Table.HeaderCell>
                    <Table.HeaderCell>
                      <em>Date created</em>
                    </Table.HeaderCell>
                    <Table.HeaderCell>
                      <em>Starting bid</em>
                    </Table.HeaderCell>
                    <Table.HeaderCell>
                      <em>Current bid</em>
                    </Table.HeaderCell>
                    <Table.HeaderCell>
                      <em>Total bids</em>
                    </Table.HeaderCell>
                    <Table.HeaderCell>
                      <em>Expiry date</em>
                    </Table.HeaderCell>
                    <Table.HeaderCell>
                      <em>Status</em>
                    </Table.HeaderCell>
                    <Table.HeaderCell></Table.HeaderCell>
                    <Table.HeaderCell></Table.HeaderCell>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {products?.map((eachProduct, i) => (
                    <EachProduct
                      eachProduct={eachProduct}
                      callGetUserCreatedBids={callGetUserCreatedBids}
                    />
                  ))}
                </Table.Body>
              </Table>
            )}
          </>
        )}
      </div>
    </div>
  );
};

const EachBid = ({ eachProduct, yourBid, callGetBiddings }) => {
  const router = useRouter();

  const {
    sendRequest: withdrawUserBid,
    loading: withdrawingBid,
    error: errorWithdrawingBid,
  } = useAjaxHook({
    instance: axios,
    options: {
      url: `${process.env.API_DOMAIN}/api/bids/${eachProduct?._id}/withdraw`,
      method: "DELETE",
    },
  });

  return (
    <>
      <Table.Row key={eachProduct?._id}>
        <Table.Cell>
          <img
            src={eachProduct?.image ? eachProduct?.image : dummyImage?.src}
            alt=""
          />
        </Table.Cell>
        <Table.Cell>{eachProduct?.name}</Table.Cell>
        <Table.Cell>
          <sup>$</sup>
          {eachProduct?.startingBid}
        </Table.Cell>
        <Table.Cell>
          <sup>$</sup>
          {yourBid}
        </Table.Cell>
        <Table.Cell>
          <sup>$</sup>
          {eachProduct?.currentBid}
        </Table.Cell>
        <Table.Cell>{new Date(eachProduct?.expiry).toUTCString()}</Table.Cell>
        <Table.Cell>
          {eachProduct?.expired ? (
            <em style={{ color: "orangered" }}>Expired</em>
          ) : (
            <em style={{ color: "green" }}>Active</em>
          )}
        </Table.Cell>
        <Table.Cell>
          <Button
            className={css.edit}
            onClick={() => {
              router.push(`/product/${eachProduct?._id}`);
            }}
          >
            Edit bid
          </Button>
        </Table.Cell>
        <Table.Cell>
          <Button
            className={css.delete}
            onClick={() => {
              withdrawUserBid((res) => callGetBiddings());
            }}
          >
            {withdrawingBid ? "Loading..." : "Withdraw bid"}
          </Button>
        </Table.Cell>
      </Table.Row>
    </>
  );
};

const Bids = () => {
  const [bids, setBids] = useState([]);
  const {
    sendRequest: getUserBiddings,
    data: userBiddings,
    loading: loadingUserBiddings,
    error: userBiddingsError,
  } = useAjaxHook({
    instance: axios,
    options: {
      url: `${process.env.API_DOMAIN}/api/user/biddings`,
      method: "GET",
    },
  });

  const searchHandler = (value) => {
    const foundBids = userBiddings?.filter((eachBid) =>
      eachBid?.bid?.name?.toLowerCase()?.includes(value?.toLowerCase())
    );
    if (!Array.isArray(foundBids)) return;
    setBids(foundBids);
  };

  const callGetUserBiddings = () => {
    getUserBiddings(({ data }) => {
      data?.sort((a, b) => {
        if (isNaN(Number(a?.datePosted))) return -1;
        if (isNaN(Number(b?.datePosted))) return 1;

        const result =
          new Date(a?.datePosted)?.getTime() -
          new Date(b?.datePosted)?.getTime();

        return result;
      });

      setBids(data);
    });
  };

  useEffect(() => {
    callGetUserBiddings();
  }, []);

  return (
    <div className={css.bids}>
      <h1>Bids</h1>
      <Divider />
      <div className={css["search-container"]}>
        <Input
          label="Search "
          placeholder="Search bids..."
          onChange={(e) => {
            searchHandler(e.target.value);
          }}
        />
      </div>
      <br />
      <div className={css.data}>
        {loadingUserBiddings ? (
          <CustomLoader />
        ) : (
          <>
            {bids?.length < 1 ? (
              <ResponseError>No bids available</ResponseError>
            ) : (
              <Table>
                <Table.Header>
                  <Table.Row>
                    <Table.HeaderCell>
                      <em>Image</em>
                    </Table.HeaderCell>
                    <Table.HeaderCell>
                      <em>Name</em>
                    </Table.HeaderCell>
                    <Table.HeaderCell>
                      <em>Amount bid</em>
                    </Table.HeaderCell>
                    <Table.HeaderCell>
                      <em>Your bid</em>
                    </Table.HeaderCell>
                    <Table.HeaderCell>
                      <em>Highest bid</em>
                    </Table.HeaderCell>
                    <Table.HeaderCell>
                      <em>Expiry date</em>
                    </Table.HeaderCell>
                    <Table.HeaderCell>
                      <em>Status</em>
                    </Table.HeaderCell>
                    <Table.HeaderCell></Table.HeaderCell>
                    <Table.HeaderCell></Table.HeaderCell>
                  </Table.Row>
                </Table.Header>

                <Table.Body>
                  {bids.map(({ bid: eachProduct, amount: yourBid }, i) => (
                    <EachBid
                      eachProduct={eachProduct}
                      yourBid={yourBid}
                      callGetBiddings={callGetUserBiddings}
                    />
                  ))}
                </Table.Body>
              </Table>
            )}
          </>
        )}
      </div>
    </div>
  );
};

const CreateBid = () => {
  const [categories, setCategories] = useState([]);
  const [postedSuccessfully, setPostedSuccessfully] = useState(false);
  const {
    value: name,
    isValid: nameIsValid,
    inputIsInValid: nameInputIsInValid,
    onChange: onNameChange,
    onBlur: onNameBlur,
    reset: resetName,
  } = useInput((/**@type String*/ value) => value?.trim() !== "");

  const {
    sendRequest: getCategories,
    error: getCategoriesError,
    loading: gettingCategories,
  } = useAjaxHook({
    instance: axios,
    options: {
      url: `${process.env.API_DOMAIN}/api/categories`,
      method: "GET",
    },
  });

  const {
    value: category,
    isValid: categoryIsValid,
    inputIsInValid: categoryInputIsInValid,
    onChange: onCategoryChange,
    onBlur: onCategoryBlur,
    reset: resetCategory,
  } = useInput((/**@type String*/ value) => {
    return (
      value?.trim() !== "" && categories.find((each) => each?.value === value)
    );
  });

  const {
    value: description,
    isValid: descriptionIsValid,
    inputIsInValid: descriptionInputIsInValid,
    onChange: onDescriptionChange,
    onBlur: onDescriptionBlur,
    reset: resetDescription,
  } = useInput((/**@type String*/ value) => value?.trim() !== "");

  const {
    value: startingBid,
    isValid: startingBidIsValid,
    inputIsInValid: startingBidInputIsInValid,
    onChange: onStartingBidChange,
    onBlur: onStartingBidBlur,
    reset: resetStartingBid,
  } = useInput((/**@type String*/ value) => value?.trim() !== "" && +value > 0);

  const {
    value: expiry,
    isValid: expiryIsValid,
    inputIsInValid: expiryInputIsInValid,
    onChange: onExpiryChange,
    onBlur: onExpiryBlur,
    reset: resetExpiry,
  } = useInput(
    (/**@type String*/ value) =>
      value?.trim() !== "" && new Date(value)?.getTime() > new Date().getTime()
  );

  const {
    value: images,
    isValid: imageIsValid,
    inputIsInValid: imageInputIsInValid,
    onChange: onImageChange,
    onBlur: onImageBlur,
    reset: resetImage,
  } = useInput((/**@type FileList */ images) => {
    // console.log("File validation", images);
    for (const /**@type File */ image of images) {
      // console.log("Each image", image);
      if (validateExtension(image.name, allowedImgExtensions)) continue;
      else return false;
    }
    return true;
  });

  const { executeBlurHandlers, formIsValid, reset } = useForm({
    blurHandlers: [
      onNameBlur,
      onDescriptionBlur,
      onExpiryBlur,
      onStartingBidBlur,
      onCategoryBlur,
      onImageBlur,
    ],
    resetHandlers: [
      resetName,
      resetDescription,
      resetStartingBid,
      resetExpiry,
      resetImage,
      resetCategory,
    ],
    validateOptions: () =>
      nameIsValid &&
      descriptionIsValid &&
      startingBidIsValid &&
      expiryIsValid &&
      category &&
      imageIsValid,
  });

  const data = new FormData();
  data.append("name", name);
  data.append("startingBid", startingBid);
  data.append("expiry", new Date(expiry));
  for (const image of images) {
    data.append("images", image);
  }
  data.append("category", category);
  data.append("description", description);

  const {
    sendRequest: postBid,
    error: postBidError,
    loading: postingBid,
  } = useAjaxHook({
    instance: axios,
    options: {
      url: `${process.env.API_DOMAIN}/api/bids`,
      method: "POST",
      data,
    },
  });

  const onSubmit = () => {
    if (!formIsValid) {
      return executeBlurHandlers();
    }

    postBid((res) => {
      setPostedSuccessfully(true);

      setTimeout(() => {
        setPostedSuccessfully(false);
      }, 1000 * 10);
    });
    console.log("SUBMITTED");
    reset();
  };

  const onCategorySuccess = (res) => {
    const { data } = res;
    setCategories(
      data?.map((eachCategory) => ({
        key: eachCategory?._id,
        value: eachCategory?.name,
        text: eachCategory?.name,
      }))
    );
  };

  const imageChangeValidation = (e) => {
    let sizeSum = 0;
    for (const file of e.target.files) {
      const size = Math.round(file?.size / 1024);
      if (size > 2048) {
        onImageBlur();
        return;
      }
      sizeSum += size;
    }
    if (sizeSum > 1024 * 10) {
      onImageBlur();
      return;
    }
    onImageChange(e.target.files);
  };

  useEffect(() => {
    getCategories(onCategorySuccess);
  }, []);

  return (
    <div className={css["create-bid"]}>
      <h1>Create Bid</h1>
      <Divider />
      <Form onSubmit={onSubmit}>
        {postedSuccessfully && (
          <Message content="Bid created successfully" color="green" />
        )}
        <Form.Input
          label="Name"
          placeholder="Enter product name..."
          className={css["form-input"]}
          value={name}
          onChange={(e) => {
            onNameChange(e.target.value);
          }}
          onBlur={onNameBlur}
          error={
            nameInputIsInValid && {
              content: "Input must not be empty",
              pointing: "above",
            }
          }
        />
        <Form.TextArea
          label="Description"
          placeholder="Enter bid description..."
          type="textarea"
          className={css["form-input"]}
          onChange={(e) => {
            onDescriptionChange(e.target.value);
          }}
          onBlur={onDescriptionBlur}
          value={description}
          error={
            descriptionInputIsInValid && {
              content: "Input must not be empty",
              pointing: "above",
            }
          }
        />
        <Form.Input
          label="Starting bid"
          placeholder="Enter starting bid..."
          type="number"
          className={css["form-input"]}
          value={startingBid}
          onChange={(e) => {
            onStartingBidChange(e.target.value);
          }}
          onBlur={onStartingBidBlur}
          error={
            startingBidInputIsInValid && {
              content: "Input must be greater than 0",
              pointing: "above",
            }
          }
        />
        <Form.Select
          label="Category"
          placeholder="Enter category"
          className={css["form-input"]}
          value={category}
          onChange={(e, other) => {
            onCategoryChange(other.value);
          }}
          onBlur={onCategoryBlur}
          error={
            categoryInputIsInValid && {
              content: "Input must be a valid category",
              pointing: "above",
            }
          }
          options={categories}
        />
        <Form.Input
          label="Expiry date"
          placeholder="Enter date at which bid will be closed..."
          type="date"
          className={css["form-input"]}
          value={expiry}
          onChange={(e) => {
            onExpiryChange(e.target.value);
          }}
          onBlur={onExpiryBlur}
          error={
            expiryInputIsInValid && {
              content: "Input must be greater than today",
              pointing: "above",
            }
          }
        />
        <Form.Input
          label="Image"
          placeholder="Enter bid image..."
          type="file"
          className={css["form-input"]}
          value={images[0]?.fileName}
          multiple={true}
          onChange={imageChangeValidation}
          onBlur={onImageBlur}
          error={
            imageInputIsInValid && {
              content:
                "File must be a jpg or png fileFiles must be less than 2mb each, less than 10mb overall and must be in png or jpg format",
              pointing: "above",
            }
          }
        />
        <Button className={css.submit} disabled={!formIsValid}>
          {postingBid ? "Loading..." : "Post"}
        </Button>
        {postBidError && (
          <ErrorMessage>{postBidError?.response?.data?.message}</ErrorMessage>
        )}
      </Form>
    </div>
  );
};

const EditBid = () => {
  const router = useRouter();
  const { id } = router.query;
  const [categories, setCategories] = useState([]);
  const [postedSuccessfully, setPostedSuccessfully] = useState(false);
  const {
    value: name,
    isValid: nameIsValid,
    inputIsInValid: nameInputIsInValid,
    onChange: onNameChange,
    onBlur: onNameBlur,
    reset: resetName,
  } = useInput((/**@type String*/ value) => value?.trim() !== "");

  const {
    sendRequest: getCategories,
    error: getCategoriesError,
    loading: gettingCategories,
  } = useAjaxHook({
    instance: axios,
    options: {
      url: `${process.env.API_DOMAIN}/api/categories`,
      method: "GET",
    },
  });

  const {
    value: category,
    isValid: categoryIsValid,
    inputIsInValid: categoryInputIsInValid,
    onChange: onCategoryChange,
    onBlur: onCategoryBlur,
    reset: resetCategory,
  } = useInput((/**@type String*/ value) => {
    return (
      value?.trim() !== "" &&
      (categories.find((each) => each?.value === value) ? true : false)
    );
  });

  const {
    value: description,
    isValid: descriptionIsValid,
    inputIsInValid: descriptionInputIsInValid,
    onChange: onDescriptionChange,
    onBlur: onDescriptionBlur,
    reset: resetDescription,
  } = useInput((/**@type String*/ value) => value?.trim() !== "");

  const {
    value: startingBid,
    isValid: startingBidIsValid,
    inputIsInValid: startingBidInputIsInValid,
    onChange: onStartingBidChange,
    onBlur: onStartingBidBlur,
    reset: resetStartingBid,
  } = useInput((/**@type String*/ value) => value?.trim() !== "" && +value > 0);

  const {
    value: expiry,
    isValid: expiryIsValid,
    inputIsInValid: expiryInputIsInValid,
    onChange: onExpiryChange,
    onBlur: onExpiryBlur,
    reset: resetExpiry,
  } = useInput(
    (/**@type String*/ value) =>
      value?.trim() !== "" && new Date(value)?.getTime() > new Date().getTime()
  );

  const {
    value: images,
    isValid: imageIsValid,
    inputIsInValid: imageInputIsInValid,
    onChange: onImageChange,
    onBlur: onImageBlur,
    reset: resetImage,
  } = useInput((/**@type FileList */ images) => {
    if (images.length < 1) return true;

    for (const /**@type File */ image of images) {
      if (validateExtension(image.name, allowedImgExtensions)) continue;
      else return false;
    }
    return true;
  });

  const { executeBlurHandlers, formIsValid, reset } = useForm({
    blurHandlers: [
      onNameBlur,
      onDescriptionBlur,
      onExpiryBlur,
      onStartingBidBlur,
      onCategoryBlur,
      onImageBlur,
    ],
    resetHandlers: [
      resetName,
      resetDescription,
      resetStartingBid,
      resetExpiry,
      resetImage,
      resetCategory,
      resetImage,
    ],
    validateOptions: () =>
      nameIsValid &&
      descriptionIsValid &&
      startingBidIsValid &&
      expiryIsValid &&
      categoryIsValid &&
      imageIsValid,
  });

  const data = new FormData();
  data.append("name", name);
  data.append("startingBid", startingBid);
  data.append("expiry", new Date(expiry));
  for (const image of images) {
    data.append("images", image);
  }
  data.append("category", category);
  data.append("description", description);

  const {
    sendRequest: updateBid,
    error: updateBidError,
    loading: updatingBid,
  } = useAjaxHook({
    instance: axios,
    options: {
      url: `${process.env.API_DOMAIN}/api/bids/${id}`,
      method: "PUT",
      data,
    },
  });

  const {
    sendRequest: getBid,
    error: getBidError,
    loading: gettingBid,
  } = useAjaxHook({
    instance: axios,
    options: {
      url: `${process.env.API_DOMAIN}/api/bids/${id}`,
      method: "GET",
      data,
    },
  });

  const onSubmit = () => {
    if (!formIsValid) {
      return executeBlurHandlers();
    }

    updateBid((res) => {
      setPostedSuccessfully(true);

      setTimeout(() => {
        setPostedSuccessfully(false);
      }, 1000 * 10);
    });

    console.log("SUBMITTED");
    reset();
  };

  const onCategorySuccess = (res) => {
    const { data } = res;
    setCategories(
      data?.map((eachCategory) => ({
        key: eachCategory?._id,
        value: eachCategory?.name,
        text: eachCategory?.name,
      }))
    );
  };

  const onGetBidSuccess = (res) => {
    const { data } = res;

    // console.log("BID DATA", data);
    if (!data) {
      return;
    }

    const date = {
      day: new Date(data?.expiry)?.getDate(),
      month: new Date(data?.expiry)?.getMonth() + 1,
      year: new Date(data?.expiry)?.getFullYear(),
    };

    const formattedDate = `${date.year}-${
      date.month?.toString()?.length === 1 ? "0" + date.month : date.month
    }-${date.day?.toString()?.length === 1 ? "0" + date.day : date.day}`;

    // console.log("FORMATTED DATE", formattedDate);

    onNameChange(data?.name);
    onDescriptionChange(data?.description);
    onStartingBidChange(data?.startingBid?.toString());
    onExpiryChange(formattedDate);
    onCategoryChange(data?.category);
  };

  const imageChangeValidation = (e) => {
    let sizeSum = 0;
    for (const file of e.target.files) {
      const size = Math.round(file?.size / 1024);
      if (size > 2048) {
        onImageBlur();
        return;
      }
      sizeSum += size;
    }
    if (sizeSum > 1024 * 10) {
      onImageBlur();
      return;
    }
    onImageChange(e.target.files);
  };

  useEffect(() => {
    getCategories(onCategorySuccess);
    getBid(onGetBidSuccess);
  }, []);

  return (
    <div className={css["create-bid"]}>
      <h1>Edit Bid</h1>
      <Divider />
      <Form onSubmit={onSubmit}>
        {postedSuccessfully && (
          <Message content="Bid updated successfully" color="green" />
        )}
        <Form.Input
          label="Name"
          placeholder="Enter product name..."
          className={css["form-input"]}
          value={name}
          onChange={(e) => {
            onNameChange(e.target.value);
          }}
          onBlur={onNameBlur}
          error={
            nameInputIsInValid && {
              content: "Input must not be empty",
              pointing: "above",
            }
          }
        />
        <Form.TextArea
          label="Description"
          placeholder="Enter bid description..."
          type="textarea"
          className={css["form-input"]}
          onChange={(e) => {
            onDescriptionChange(e.target.value);
          }}
          onBlur={onDescriptionBlur}
          value={description}
          error={
            descriptionInputIsInValid && {
              content: "Input must not be empty",
              pointing: "above",
            }
          }
        />
        <Form.Input
          label="Starting bid"
          placeholder="Enter starting bid..."
          type="number"
          className={css["form-input"]}
          value={startingBid}
          onChange={(e) => {
            onStartingBidChange(e.target.value);
          }}
          onBlur={onStartingBidBlur}
          error={
            startingBidInputIsInValid && {
              content: "Input must be greater than 0",
              pointing: "above",
            }
          }
        />
        <Form.Select
          label="Category"
          placeholder="Enter category"
          className={css["form-input"]}
          value={category}
          onChange={(e, other) => {
            onCategoryChange(other.value);
          }}
          onBlur={onCategoryBlur}
          error={
            categoryInputIsInValid && {
              content: "Input must be a valid category",
              pointing: "above",
            }
          }
          options={categories}
        />
        <Form.Input
          label="Expiry date"
          placeholder="Enter date at which bid will be closed..."
          type="date"
          className={css["form-input"]}
          value={expiry}
          onChange={(e) => {
            console.log("Expiry change", e?.target?.value);
            onExpiryChange(e.target.value);
          }}
          onBlur={onExpiryBlur}
          error={
            expiryInputIsInValid && {
              content: "Input must be greater than today",
              pointing: "above",
            }
          }
        />
        <Form.Input
          label="Image"
          placeholder="Enter bid image..."
          type="file"
          className={css["form-input"]}
          value={images[0]?.filename}
          multiple={true}
          onChange={imageChangeValidation}
          onBlur={onImageBlur}
          error={
            imageInputIsInValid && {
              content:
                "Files must be less than 2mb each, less than 10mb overall and must be in png or jpg format",
            }
          }
        />
        <Button className={css.submit} disabled={!formIsValid}>
          {updatingBid ? "Loading..." : "Update"}
        </Button>
        {updateBidError && (
          <ErrorMessage>{updateBidError?.response?.data?.message}</ErrorMessage>
        )}
      </Form>
    </div>
  );
};

const EditProfile = () => {
  const [postedSuccessfully, setPostedSuccessfully] = useState(false);

  const {
    value: name,
    isValid: nameIsValid,
    inputIsInValid: nameInputIsInValid,
    onChange: onNameChange,
    onBlur: onNameBlur,
    reset: resetName,
  } = useInput((/**@type String*/ value) => value?.trim() !== "");

  const {
    value: email,
    isValid: emailIsValid,
    inputIsInValid: emailInputIsInValid,
    onChange: onEmailChange,
    onBlur: onEmailBlur,
    reset: resetEmail,
  } = useInput(
    (/**@type String*/ value) => value?.trim() !== "" && value?.includes("@")
  );

  const {
    value: phoneNumber,
    isValid: phoneNumberIsValid,
    inputIsInValid: phoneNumberIsInValid,
    onChange: onPhoneNumberChange,
    onBlur: onPhoneNumberBlur,
    reset: resetPhoneNumber,
  } = useInput((/**@type String*/ value) => value?.trim() !== "" && +value > 0);

  const {
    value: image,
    onChange: onImageChange,
    onBlur: onImageBlur,
    reset: resetImage,
    inputIsInValid: imageInputIsInValid,
    isValid: imageIsValid,
  } = useInput((/**@type File */ image) => {
    if (!image) return true;
    if (!validateExtension(image.name, allowedImgExtensions)) return false;
    else return true;
  });

  const { executeBlurHandlers, formIsValid, reset } = useForm({
    blurHandlers: [onNameBlur, onEmailBlur, onPhoneNumberBlur, onImageBlur],
    resetHandlers: [resetName, resetEmail, resetPhoneNumber, resetImage],
    validateOptions: () =>
      nameIsValid && emailIsValid && phoneNumberIsValid && imageIsValid,
  });

  const data = new FormData();
  data.append("name", name);
  data.append("email", email);
  data.append("phoneNumber", phoneNumber);
  data.append("image", image);

  const {
    sendRequest: updateUserInfo,
    error: updateUserInfoError,
    loading: updatingUserInfo,
  } = useAjaxHook({
    instance: axios,
    options: {
      url: `${process.env.API_DOMAIN}/api/user`,
      method: "PUT",
      data,
    },
  });

  const {
    sendRequest: getUserInfo,
    error: getUserInfoError,
    loading: gettingUserInfo,
  } = useAjaxHook({
    instance: axios,
    options: {
      url: `${process.env.API_DOMAIN}/api/user`,
      method: "GET",
    },
  });

  const onSubmit = () => {
    if (!formIsValid) {
      executeBlurHandlers();
      return;
    }

    updateUserInfo(() => {
      setPostedSuccessfully(true);
      setTimeout((res) => {
        setPostedSuccessfully(false);
      }, 1000 * 10);
    });
  };

  const onGetUserInfoSuccess = (res) => {
    const { data } = res;

    onEmailChange(data?.email);
    onPhoneNumberChange(data?.phoneNumber?.toString());
    onNameChange(data?.name);
  };

  const imageChangeValidation = (/**@type Event */ e) => {
    const { files } = e.target;
    const size = Math.round(files[0].size / 1024);
    if (size > 2048) {
      onImageBlur();
      return false;
    }

    onImageChange(files[0]);
  };

  useEffect(() => {
    getUserInfo(onGetUserInfoSuccess);
  }, []);

  return (
    <div className={css["edit-profile"]}>
      <h1>Edit profile</h1>
      <Divider />
      <Form onSubmit={onSubmit}>
        {postedSuccessfully && (
          <Message content="User updated successfully" color="green" />
        )}
        <Form.Input
          label="Name"
          placeholder="Enter full name..."
          className={css["form-input"]}
          value={name}
          onChange={(e) => {
            onNameChange(e.target.value);
          }}
          onBlur={onNameBlur}
          error={
            nameInputIsInValid && {
              content: "Input must not be empty",
              pointing: "above",
            }
          }
        />
        <Form.Input
          label="Email address"
          placeholder="Enter email address..."
          type="email"
          className={css["form-input"]}
          value={email}
          onChange={(e) => {
            onEmailChange(e.target.value);
          }}
          onBlur={onEmailBlur}
          error={
            emailInputIsInValid && {
              content: "Input must be a valid email",
              pointing: "above",
            }
          }
        />
        <Form.Input
          label="Phone number"
          placeholder="Enter phone number..."
          type="number"
          className={css["form-input"]}
          value={phoneNumber}
          onChange={(e) => {
            onPhoneNumberChange(e.target.value);
          }}
          onBlur={onPhoneNumberBlur}
          error={
            phoneNumberIsInValid && {
              content: "Input must not be empty",
              pointing: "above",
            }
          }
        />
        <Form.Input
          label="Image"
          placeholder="Enter profile picture..."
          type="file"
          className={css["form-input"]}
          value={image?.filename}
          onChange={imageChangeValidation}
          onBlur={onImageBlur}
          error={
            imageInputIsInValid && {
              content:
                "File must be less than 2mb and must be in png or jpg format",
              pointer: "above",
            }
          }
        />
        <Button
          className={css.submit}
          disabled={!formIsValid || updatingUserInfo}
        >
          {updatingUserInfo ? "Loading..." : "Update"}
        </Button>
        {updateUserInfoError && (
          <ErrorMessage>{error?.response?.data?.message}</ErrorMessage>
        )}
      </Form>
    </div>
  );
};

const Tabs = [
  new Tab("user", <User />, "User"),
  new Tab("product", <Products />, "Products"),
  new Tab("bid", <Bids />, "Bids"),
  new Tab("edit", <EditProfile />, "Edit profile"),
  new Tab("new-bid", <CreateBid />, "New bid"),
  new Tab("edit-bid", <EditBid />, "Edit bid"),
];

const MenuComponent = () => {
  const router = useRouter();
  const { sendRequest: logout, loading: loggingOut } = useAjaxHook({
    instance: axios,
    options: {
      url: `${process.env.API_DOMAIN}/api/logout`,
      method: "POST",
    },
  });
  const callLogout = () => {
    const confirmLogout = window.confirm("Are you sure you want to logout");
    if (confirmLogout) {
      logout(() => {
        router.replace("/");
      });
    }
  };

  const onClick = (menu) => {
    if (menu?.tab === "/") {
      return callLogout();
    }
    router.push(`/dashboard/?tab=${menu.tab}`, undefined, {
      shallow: true,
    });
  };

  return (
    <Glassmorphism className={css.menu}>
      <div className={css.heading}>
        <h3>Dashboard</h3>
        <Divider />
      </div>
      <ul className={css.list}>
        {menus.map((menu, i) => (
          <li
            key={i}
            onClick={() => {
              onClick(menu);
            }}
          >
            <i className={menu.icon} />
            <em>
              {menu.tab === "/" && loggingOut ? "Logging out..." : menu.name}
            </em>
          </li>
        ))}
      </ul>
    </Glassmorphism>
  );
};

const Dashboard = () => {
  const router = useRouter();
  const slug = router.query?.tab;

  const getComponent = (slug) => {
    if (!slug || slug?.trim() === "") {
      return Tabs[0].component;
    }

    const tabObjectArray = Tabs.filter((eachTab) => eachTab.slug === slug);
    return tabObjectArray[0].component;
  };

  return (
    <>
      <HeadComponent></HeadComponent>
      <div className={css.dashboard}>
        <div className={css["pre-header"]}>
          <PreHeader />
        </div>
        <Header />
        <div className={css.body}>
          <div className={css.menu}>
            <MenuComponent />
          </div>
          <div className={css.tab}>
            <Glassmorphism>{getComponent(slug)}</Glassmorphism>
          </div>
        </div>
        <br />
        <Footer />
      </div>
    </>
  );
};

export default Dashboard;

export const getServerSideProps = async ({ req, res }) => {
  const auth = await authMiddleware({ req, res });
  if (auth?.code !== 200) {
    return {
      redirect: {
        destination: "/",
        permanent: true,
      },
    };
  }

  return {
    props: {},
  };
};
