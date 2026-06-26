"use client";
import React, { useEffect, useState } from "react";
import { ShoppingCart } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface CartBadgeAnimationProps {
  cartCount: number;
}

const CartBadgeAnimation: React.FC<CartBadgeAnimationProps> = ({
  cartCount,
}) => {
  const [prevCount, setPrevCount] = useState(cartCount);
  const [showPulse, setShowPulse] = useState(false);
  const [floatingItems, setFloatingItems] = useState<
    { id: number; key: string }[]
  >([]);

  useEffect(() => {
    if (cartCount > prevCount) {
      // Trigger pulse animation
      setShowPulse(true);
      setTimeout(() => setShowPulse(false), 600);

      // Create floating items for visual effect
      const newItemsCount = cartCount - prevCount;
      const newItems = Array.from({ length: newItemsCount }, (_, i) => ({
        id: Math.random(),
        key: `${Date.now()}-${i}`,
      }));

      setFloatingItems((prev) => [...prev, ...newItems]);

      // Clear floating items after animation
      setTimeout(() => {
        setFloatingItems([]);
      }, 1000);
    }

    setPrevCount(cartCount);
  }, [cartCount, prevCount]);

  return (
    <div className="relative inline-block">
      {/* Cart Icon Container */}
      <motion.div
        className={`rounded-full text-white flex items-center justify-center cursor-pointer relative ${
          showPulse ? "animate-pulse" : ""
        }`}
        animate={showPulse ? { scale: [1, 1.2, 1] } : {}}
        transition={{ duration: 0.6 }}
      >
        <ShoppingCart size={20} />

        {/* Badge */}
        <motion.span
          key={`badge-${cartCount}`}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0 }}
          className="text-white rounded-full text-[10px] absolute right-1 -top-2 flex items-center justify-center w-4 h-4 shadow-xl p-0 bg-primary font-bold"
        >
          {cartCount}
        </motion.span>
      </motion.div>

      {/* Floating Items Animation */}
      <AnimatePresence>
        {floatingItems.map((item) => (
          <motion.div
            key={item.key}
            initial={{
              x: 0,
              y: 0,
              opacity: 1,
              scale: 1,
            }}
            animate={{
              x: Math.random() * 100 - 50,
              y: -150,
              opacity: 0,
              scale: 0.5,
            }}
            transition={{
              duration: 1,
              ease: "easeInOut",
            }}
            exit={{ opacity: 0 }}
            className="absolute right-1 -top-2 pointer-events-none"
          >
            <div className="text-primary text-xs">
              <ShoppingCart size={14} />
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default CartBadgeAnimation;
