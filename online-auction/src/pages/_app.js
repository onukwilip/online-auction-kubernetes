import GeneralContext from "@/context/GeneralContext";
import "@/styles/globals.css";
import "semantic-ui-css/semantic.min.css";

export default function App({ Component, pageProps }) {
  return (
    <>
      <GeneralContext>
        <Component {...pageProps} />
      </GeneralContext>
    </>
  );
}
