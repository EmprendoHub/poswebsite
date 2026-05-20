"use client";
import React, { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FaCheckCircle, FaTimes } from "react-icons/fa";

const backdropVariants = {
  animate: {
    opacity: 1,
    transition: { duration: 0.2 },
  },
  initial: {
    opacity: 0,
    transition: { duration: 0.2 },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.2 },
  },
};

const modalVariants = {
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.3, ease: "easeOut" },
  },
  initial: {
    opacity: 0,
    scale: 0.8,
    y: -50,
    transition: { duration: 0.3 },
  },
  exit: {
    opacity: 0,
    scale: 0.8,
    y: 50,
    transition: { duration: 0.2 },
  },
};

interface SuccessModalProps {
  showModal: boolean;
  setShowModal: React.Dispatch<React.SetStateAction<boolean>>;
  title: string;
  message: string;
  buttonText?: string;
  autoClose?: boolean;
  autoCloseDelay?: number;
}

const SuccessModal: React.FC<SuccessModalProps> = ({
  showModal,
  setShowModal,
  title,
  message,
  buttonText = "Cerrar",
  autoClose = false,
  autoCloseDelay = 3000,
}) => {
  useEffect(() => {
    if (showModal && autoClose) {
      const timer = setTimeout(() => {
        setShowModal(false);
      }, autoCloseDelay);

      return () => clearTimeout(timer);
    }
  }, [showModal, autoClose, autoCloseDelay, setShowModal]);

  const handleClose = () => {
    setShowModal(false);
  };

  return (
    <AnimatePresence mode="wait">
      {showModal && (
        <motion.div
          className="fixed inset-0 w-full h-full bg-black bg-opacity-50 z-[999] flex items-center justify-center p-4"
          variants={backdropVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          onClick={handleClose}
        >
          <motion.div
            className="bg-card rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
            variants={modalVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-green-600 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-white bg-opacity-20 p-2 rounded-lg">
                  <FaCheckCircle className="text-white text-xl" />
                </div>
                <h3 className="text-xl font-bold text-white">{title}</h3>
              </div>
              <button
                onClick={handleClose}
                className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition-colors"
              >
                <FaTimes className="text-xl" />
              </button>
            </div>

            {/* Content */}
            <div className="px-6 py-6">
              <p className="text-muted-foreground text-base leading-relaxed">
                {message}
              </p>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-muted bg-opacity-30 flex gap-3 justify-end">
              <button
                onClick={handleClose}
                className="px-5 py-2.5 rounded-lg bg-green-600 hover:bg-green-700 text-white font-medium transition-all flex items-center gap-2"
              >
                <FaCheckCircle />
                {buttonText}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SuccessModal;
