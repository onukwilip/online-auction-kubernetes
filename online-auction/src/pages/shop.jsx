import React, { useEffect, useState } from "react";
import css from "@/styles/shop/Shop.module.scss";
import { HeadComponent } from ".";
import Header from "@/components/Header";
import PreHeader from "@/components/PreHeader";
import {
  Button,
  Card,
  Checkbox,
  Divider,
  Form,
  Icon,
  Image,
  Input,
} from "semantic-ui-react";
import { useTimer } from "react-timer-hook";
import Footer from "@/components/Footer";
import { useRouter } from "next/router";
import useAjaxHook from "use-ajax-request";
import axios from "axios";
import CustomLoader from "@/components/Loader";
import ResponseError from "@/components/ResponseError";
import Bid from "@/components/Bid";

class Category {
  constructor(name) {
    this.name = name;
  }
}

const categoryObj = {
  Stationeries: "Stationeries",
  Electronics: "Electronics",
  Phones: "Phones",
  Fashion: "Fashion",
  PC: "PC",
  Pets: "Pets",
};

class Product {
  constructor(name, start, current, expiry, image, category) {
    this.name = name;
    this.startingBid = start;
    this.currentBid = current;
    this.expiry = expiry;
    this.image = image;
    this.category = category;
  }
}

export const Products = [
  new Product(
    "Apple MacBook Pro 13'' 2.3GHz 128GB Space Gray",
    100,
    816,
    1674567258459,
    "https://images.unsplash.com/photo-1504707748692-419802cf939d?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=847&q=80",
    categoryObj.PC
  ),
  new Product(
    "Apple iPad Pro 11” Wi-Fi 64GB Silver",
    70,
    209,
    1674599658459,
    "https://images.unsplash.com/photo-1605556448160-4cfb9aca921a?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=774&q=80",
    categoryObj.Phones
  ),
  new Product(
    "Ray-Ban High Street 54mm Sunglasses",
    5,
    9,
    1674614058459,
    "https://images.unsplash.com/photo-1511499767150-a48a237f0083?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=580&q=80",
    categoryObj.Fashion
  ),
  new Product(
    "Pier One Classic Dark Blue Ankle Boots",
    25,
    49,
    1674605058459,
    "https://images.unsplash.com/photo-1608256246200-53e635b5b65f?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=387&q=80",
    categoryObj.Fashion
  ),
  new Product(
    "Alphaedge 4d reflective shoes R",
    15,
    29,
    1674605058459,
    "https://demo.evershop.io/assets/catalog/1347/5456/plv1726-Black-list.png",
    categoryObj.Fashion
  ),
  //
  new Product(
    "Quake Overload",
    2,
    10,
    1674567259089,
    "https://firebasestorage.googleapis.com/v0/b/salinaka-ecommerce.appspot.com/o/products%2FcLGc3mcbZrK3Tl3yJ3xW?alt=media&token=44f74e92-f2ca-4af3-82f6-7a3bcace7f7a",
    categoryObj.Fashion
  ),
  new Product(
    "Apple iPad Pro 11” Wi-Fi 64GB Silver",
    70,
    209,
    1674599658459,
    "https://images.unsplash.com/photo-1605556448160-4cfb9aca921a?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=774&q=80",
    categoryObj.Phones
  ),
  new Product(
    "Ray-Ban High Street 54mm Sunglasses",
    5,
    9,
    1674614058459,
    "https://images.unsplash.com/photo-1511499767150-a48a237f0083?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=580&q=80",
    categoryObj.Fashion
  ),
  new Product(
    "Pier One Classic Dark Blue Ankle Boots",
    25,
    49,
    1674605058459,
    "https://images.unsplash.com/photo-1608256246200-53e635b5b65f?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=387&q=80",
    categoryObj.Fashion
  ),
  new Product(
    "Alphaedge 4d reflective shoes R",
    15,
    29,
    1674605058459,
    "https://demo.evershop.io/assets/catalog/1347/5456/plv1726-Black-list.png",
    categoryObj.Fashion
  ),
];

const Categories = [
  new Category("Stationeries"),
  new Category("Electronics"),
  new Category("Phones"),
  new Category("Fashion"),
  new Category("PC"),
  new Category("Pets"),
  new Category("Buildings"),
  new Category("Vehicles"),
];

const Filter = ({ onFilter, setFilterLoading, getAll }) => {
  const submitData = [];
  const [categoriesToSubmit, setCategoriesToSubmit] = useState({});

  const {
    sendRequest: filter,
    data,
    loading,
    error,
  } = useAjaxHook({
    instance: axios,
    options: {
      url: `${process.env.API_DOMAIN}/api/bids/category`,
      method: "POST",
      data: submitData,
    },
  });

  setFilterLoading(loading);

  const addOrRemoveCategory = (/**@type Event */ e, other) => {
    if (other?.checked === true) {
      setCategoriesToSubmit((prev) => ({
        ...prev,
        [other.value]: { category: other.value },
      }));
    } else {
      const newCategories = categoriesToSubmit;
      delete newCategories[other?.value];
      setCategoriesToSubmit(newCategories);
    }

    console.log("categories", categoriesToSubmit);
    console.log("other", other);
  };

  const onSuccess = (res) => {
    onFilter(res.data);
  };

  const onError = (err) => {
    if (err?.response?.status === 404) {
      onFilter([]);
    }
  };

  const submitHandler = (e) => {
    e?.preventDefault();
    for (const category in categoriesToSubmit) {
      submitData.push(categoriesToSubmit[category]);
    }

    if (submitData?.length < 1) {
      return getAll();
    }

    console.log("During submission", categoriesToSubmit);

    filter(onSuccess, onError);
  };

  return (
    <div className={css.filter}>
      <h2>Filter</h2>
      <Divider />
      <h3>Categories</h3>
      <Form onSubmit={submitHandler}>
        {Categories?.map((category, i) => (
          <Checkbox
            slider
            label={category.name}
            className={css.category}
            key={i}
            value={category.name}
            onChange={addOrRemoveCategory}
          />
        ))}
        <br />
        <Button className={css.submit}>Filter</Button>
      </Form>
    </div>
  );
};

const Shop = () => {
  const [showMobileFilter, setShowMobileFilter] = useState(false);
  const [filterLoading, setFilterLoading] = useState(false);
  const [bids, setBids] = useState([]);
  const [allBids, setAllBids] = useState([]);
  const { sendRequest, loading, error } = useAjaxHook({
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
      ],
    },
  });

  const onFilter = (value) => {
    setBids(value);
    setAllBids(value);
  };

  const setLoadingState = (value) => {
    setFilterLoading(value);
  };

  const onSearch = (/**@type String */ value) => {
    const foundBids = allBids.filter((bids) =>
      bids?.name?.toLowerCase()?.includes(value.toLowerCase())
    );
    setBids(foundBids);
  };

  const getBids = () => {
    sendRequest((res) => {
      setBids(res.data);
      setAllBids(res.data);
    });
  };

  useEffect(() => {
    getBids();
  }, []);

  return (
    <div className={css.shop}>
      <HeadComponent />
      <div className={css["pre-header"]}>
        <PreHeader />
      </div>
      <Header />
      <div className={css.body}>
        <div className={css.heading}>
          <h1>Shop</h1>
        </div>
        <div className={css["sub-body"]}>
          <div className={css["filter-container"]}>
            <Filter
              onFilter={onFilter}
              setFilterLoading={setLoadingState}
              getAll={getBids}
            />
          </div>

          <div className={css["items-container"]}>
            <div className={css["search-container"]}>
              <Form>
                <Input
                  icon="search"
                  iconPosition="left"
                  placeholder="Search items..."
                  className={css.search}
                  onChange={(e) => {
                    onSearch(e?.target?.value);
                  }}
                />
              </Form>
              <Icon
                name="bars"
                className={css.hamburger}
                onClick={() => {
                  setShowMobileFilter((prev) => !prev);
                }}
              />
            </div>
            <Divider />
            <div className={css.items}>
              {loading || filterLoading ? (
                <CustomLoader />
              ) : (
                <>
                  {!bids || bids?.length < 1 ? (
                    <ResponseError>No bids available</ResponseError>
                  ) : (
                    bids?.map((finished, i) => <Bid item={finished} key={i} />)
                  )}
                </>
              )}
            </div>
          </div>
        </div>
        {showMobileFilter && (
          <div className={css["mobile-filter"]} _>
            <Filter
              onFilter={onFilter}
              setFilterLoading={setLoadingState}
              getAll={getBids}
            />
          </div>
        )}
      </div>
      <br />
      <Footer />
    </div>
  );
};

export default Shop;
