import React, { createContext } from "react";

const General = createContext({});

const GeneralContext = (props) => {
  const value = {};
  return <General.Provider value={value}>{props.children}</General.Provider>;
};

export default GeneralContext;
