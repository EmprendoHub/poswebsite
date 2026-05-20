"use client";
import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import PayOrderComp from "@/app/(manager)/admin/_components/PayOrderComp";

// Define variants without the duration property directly
const backdropVariants = {
  animate: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.2 }, // Add duration here
  },
  initial: {
    opacity: 0,
    scale: 0.5,
    transition: { duration: 0.2 }, // Add duration here
  },
};
const Modal = ({
  pathname,
  showModal,
  setShowModal,
  orderId,
  isPaid,
  pendingTotal,
}: {
  pathname: string;
  showModal: boolean;
  setShowModal: React.Dispatch<React.SetStateAction<boolean>>;
  orderId: string;
  isPaid: boolean;
  pendingTotal: number;
}) => {
  return (
    <AnimatePresence mode="wait">
      {showModal && (
        <motion.div
          className="backdrop fixed top-0 left-0 w-full h-full bg-black bg-opacity-40 z-[555]"
          variants={backdropVariants}
          initial="initial"
          animate="animate"
        >
          <PayOrderComp
            setShowModal={setShowModal}
            orderId={orderId}
            isPaid={isPaid}
            pathname={pathname}
            pendingTotal={pendingTotal}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Modal;
