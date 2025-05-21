import axios, {
  AxiosInstance,
  AxiosResponse,
  AxiosStatic,
  RawAxiosRequestConfig,
} from "axios";
import { useState, useCallback, useMemo } from "react";

const ReqObj = {
  instance: AxiosStatic || AxiosInstance,
  config: RawAxiosRequestConfig,
  options: {
    resetDataOnSend: false,
    resetDataAfterSeconds: 0,
    resetErrorAfterSeconds: 0,
  },
};

const useRequest = (/**@types ReqObj */ { instance, config = {}, options }) => {
  const [data, setData] = useState(undefined);
  const [loading, setLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState(undefined);
  // const config = useMemo(() => options, [options]);
  // const depInstance = useMemo(() => instance, [instance]);

  const displayAndResetDataAfterSeconds = (data) => {
    setData(data);

    setTimeout(
      () => setData(undefined),
      1000 * (options?.resetDataAfterSeconds || 1)
    );
  };
  const displayAndResetErrorAfterSeconds = (error) => {
    setError(error);
    setIsError(true);

    setTimeout(() => {
      setError(undefined);
      setIsError(false);
    }, 1000 * (options?.resetErrorAfterSeconds || 1));
  };

  /**
   * Function responsible for sending the request
   * @param onSuccess The function to be executed if the request was successfull
   * @param onError The function to be executed if the request was unsuccessfull or returned an error code
   * @param data The data to sent alongside the request. If left empty the data passed into the hook (in the config object) is used
   * @returns the response if it was successfull
   */
  const sendRequest = useCallback(
    async (onSuccess, onError, data) => {
      setLoading(true);
      setIsError(false);
      setError(undefined);
      options?.resetDataOnSend && setData(undefined);

      let response;

      const catchError = (e) => {
        if (options?.resetErrorAfterSeconds) {
          displayAndResetErrorAfterSeconds(e);
        } else {
          setError(e);
          setIsError(true);
        }
        setLoading(false);
        setData(undefined);
        if (typeof onError === "function") onError(e);
      };

      if (typeof instance === "function") {
        response = await instance({
          ...config,
          ...(data ? { data: data } : {}),
        }).catch(catchError);
      } else {
        throw new Error("Expected instance to be a function, but it's not");
      }

      if (response) {
        setLoading(false);
        setIsError(false);
        setError(undefined);
        if (options?.resetDataAfterSeconds)
          displayAndResetDataAfterSeconds(response.data);
        else setData(response?.data);
        if (typeof onSuccess === "function") onSuccess(response);
      }

      return response;
    },
    [/* depInstance */ config]
  );
  /**
   * Function responsible for reseting the response data object
   */
  const resetData = useCallback(() => {
    setData(undefined);
  }, []);
  /**
   * Function responsible for reseting the response error states
   */
  const resetError = useCallback(() => {
    setIsError(false);
    setError(undefined);
  }, []);

  return {
    data,
    loading,
    error,
    isError,
    sendRequest,
    resetData,
    resetError,
  };
};

export default useRequest;
