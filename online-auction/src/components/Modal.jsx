import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import css from "@/styles/modal/Modal.module.scss";

const ModalComponent = (props) => {
  const closeModal = () => {
    if (typeof props.showModal === "function") {
      props.showModal(false);
    }
  };
  return (
    <section className={css.modal}>
      <div className={css.background} onClick={closeModal}></div>
      <div className={css.body}>{props.children}</div>
    </section>
  );
};

const Modal = ({ children, show }) => {
  const portal = useRef();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    portal.current = document.getElementById("modal");
    setMounted(true);
  }, []);

  return (
    portal.current && (
      <>
        {mounted &&
          createPortal(
            <ModalComponent showModal={show}>{children}</ModalComponent>,
            portal.current
          )}
      </>
    )
  );
};

export default Modal;
