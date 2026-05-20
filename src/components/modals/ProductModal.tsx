"use client";
import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import ModalProductCard from "@/app/(home)/producto/_components/ModalProductCard";

const backdropVariants = {
  animate: { opacity: 1, scale: 1 },
  initial: { opacity: 0, scale: 0.5 },
};

const ProductModal = ({
  product,
  orderId,
  isPaid,
}: {
  product: any;
  orderId: any;
  isPaid: any;
}) => {
  const [showModal, setShowModal] = useState(false);
  const updateOrderStatus = async () => {
    setShowModal(true);
  };
  return (
    <AnimatePresence mode="wait">
      {showModal && (
        <motion.div
          className="backdrop fixed top-0 left-0 w-full h-full bg-black bg-opacity-40 z-[555]"
          variants={backdropVariants}
          transition={{ duration: 0.35, ease: "easeInOut" }}
          initial="initial"
          animate="animate"
        >
          <ModalProductCard
            item={product}
            setShowModal={setShowModal}
            orderId={orderId}
            isPaid={isPaid}
          />
        </motion.div>
      )}
      <button onClick={updateOrderStatus}>Click here</button>
    </AnimatePresence>
  );
};

export default ProductModal;
