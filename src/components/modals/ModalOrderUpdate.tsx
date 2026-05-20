"use client";
import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import UpdateOrderComp from "./UpdateOrderComp";

const backdropVariants = {
  animate: { opacity: 1, scale: 1 },
  initial: { opacity: 0, scale: 0.5 },
};

const ModalOrderUpdate = ({
  showModal,
  setShowModal,
  order,
}: {
  showModal: any;
  setShowModal: any;
  order: any;
}) => {
  return (
    <AnimatePresence mode="wait">
      {showModal && (
        <motion.div
          className="backdrop fixed top-0 left-0 w-full h-full bg-black bg-opacity-60 z-[1]"
          variants={backdropVariants}
          transition={{ duration: 0.35, ease: "easeInOut" }}
          initial="initial"
          animate="animate"
        >
          <UpdateOrderComp order={order} setShowModal={setShowModal} />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ModalOrderUpdate;
