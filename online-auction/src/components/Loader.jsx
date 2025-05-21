import React from "react";
import { HelixLoader } from "react-loaders-kit";

const CustomLoader = (props) => {
  const loaderProps = {
    loading: true,
    size: 35,
    duration: 1,
    colors: ["gold", "black"],
  };

  return (
    <div className="loader">
      <HelixLoader {...loaderProps} />
      {props.label && <em>Loading</em>}
    </div>
  );
};

export default CustomLoader;
