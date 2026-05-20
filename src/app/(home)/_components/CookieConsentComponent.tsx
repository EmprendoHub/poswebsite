"use client";
import Link from "next/link";
import Cookies from "js-cookie";
import React, { useEffect, useState } from "react";

export default function CookieConsentComponent() {
  const [showConsent, setShowConsent] = useState(true);
  const [ipAddress, setIpAddress] = useState("");

  // Get user IP address
  useEffect(() => {
    const fetchIp = async () => {
      try {
        const response = await fetch("https://api.ipify.org?format=json");
        const data = await response.json();
        setIpAddress(data.ip);
        // console.log(data.ip);
      } catch (error) {
        console.error(error);
      }
    };
    fetchIp();
  }, []);

  useEffect(() => {
    // Check if the cookie exists
    setShowConsent(Cookies.get("localConsent") !== "true");
  }, []);

  const giveCookieConsent = () => {
    setShowConsent(false);
    Cookies.set("localConsent", "true", { expires: 365 }); // Set cookie to expire in 1 year
  };

  if (!showConsent) {
    return null;
  }

  return (
    <div className="fixed bottom inset-0 bg-black bg-opacity-70 z-[5000]">
      <div className="absolute z-[99] left-0 bottom-0 w-full bg-background p-10 maxsm:p-5 flex flex-row maxmd:flex-col justify-between items-center h-[150px]">
        <p className="text-xs">
          Utilizamos cookies para mejorar su experiencia de usuario. Al utilizar
          nuestro sitio web, acepta nuestro uso de cookies.{" "}
          <Link href={"/politica-privacidad"} className="text-slate-500">
            Más información...
          </Link>
        </p>
        <button
          className="w-[200px] maxsm:w-[100px] py-2 bg-primary text-white flex justify-center items-center cursor-pointer"
          onClick={giveCookieConsent}
        >
          Aceptar
        </button>
      </div>
    </div>
  );
}
