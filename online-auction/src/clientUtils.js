export const clientToBase64 = (string) => {
  if (typeof window !== "undefined") {
    return window.btoa(string);
  }
};

export const clientFromBase64 = (string) => {
  if (typeof window !== "undefined") {
    return window.atob(string);
  }
};
