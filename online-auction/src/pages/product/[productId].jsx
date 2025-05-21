import React from "react";
import ProductComponent from "@/components/Product";
import { HeadComponent } from "..";

const Product = (props) => {
  return (
    <>
      <HeadComponent></HeadComponent>
      <ProductComponent productId={props.productId} />
    </>
  );
};

export default Product;

export const getServerSideProps = async ({ params }) => {
  return {
    props: {
      productId: params.productId,
    },
  };
};
