"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

export default function UnderConstruction() {
  // Target date (YYYY-MM-DD HH:MM:SS format)
  const targetDate = new Date("2025-09-01T00:00:00").getTime();

  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const difference = targetDate - now;

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / (1000 * 60)) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-black via-gray-800 to-black text-white p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
        className="flex flex-col items-center"
      >
        <Image
          src="/logos/Super-Collectibles-Icono-Del-Sitio.png"
          alt="Under Construction"
          width={280}
          height={280}
          priority
        />

        <h1 className="mt-6 text-center text-4xl md:text-5xl font-bold">
          🚧 BAJO CONSTRUCCIÓN!
        </h1>
        <p className="mt-2 text-gray-300 max-w-md text-center">
          Nuestra nueva experiencia se lanza pronto.
        </p>

        {/* Countdown Timer */}
        <div className="mt-8 grid grid-cols-4 gap-4">
          {[
            { label: "Dias", value: timeLeft.days },
            { label: "Horas", value: timeLeft.hours },
            { label: "Minutos", value: timeLeft.minutes },
            { label: "Segundos", value: timeLeft.seconds },
          ].map((item, index) => (
            <motion.div
              key={index}
              whileHover={{ scale: 1.05 }}
              className="bg-gray-800 rounded-2xl p-4 w-20 sm:w-24 shadow-lg flex flex-col items-center"
            >
              <span className="text-3xl font-bold">{item.value}</span>
              <span className="text-sm text-gray-400">{item.label}</span>
            </motion.div>
          ))}
        </div>

        <div className="mt-8 animate-bounce">
          <span className="text-4xl">👷‍♂️</span>
        </div>
      </motion.div>
    </div>
  );
}
