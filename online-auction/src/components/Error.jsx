import React from "react";

const ErrorMessage = (props) => {
  return (
    <ul className={`error-container ${props.className}`}>
      <li style={props.textColor ? { color: props.textColor } : {}}>
        {props.children}
      </li>
    </ul>
  );
};

export default ErrorMessage;
