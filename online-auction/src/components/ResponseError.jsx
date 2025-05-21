import React from "react";

const ResponseError = (props) => {
  return (
    <div className="response-error">
      <h2>{props.children}</h2>
    </div>
  );
};

export default ResponseError;
