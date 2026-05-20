"use client";
import React, { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import { addLocation } from "@/redux/shoppingSlice";
import { motion } from "framer-motion";
import Link from "next/link";
import axios from "axios";
import { BsFacebook, BsInstagram } from "react-icons/bs";
import { AiFillPhone } from "react-icons/ai";
import { MdEmail } from "react-icons/md";
import LogoComponent from "../layouts/LogoComponent";
import { ModeToggle } from "../ui/mode-toggle";

export default function LocationConcent() {
  const APIkey = "Enter-your-api-key";

  const [userLocation, setUserLocation] = useState<string | any>(null);
  const [ipAddress, setIpAddress] = useState("");
  // console.log(userLocation);
  const getLocation = async () => {
    const location = await axios.get("https://ipapi.co/json");
    setUserLocation(location.data);
    addLocation(location.data);
  };

  // get user IP address
  async function getIpAddress() {
    try {
      const response = await fetch("https://api.ipify.org?format=json");
      const data = await response.json();
      setIpAddress(data.ip);
      // console.log(data.ip);
    } catch (error) {
      console.error(error);
    }
  }

  var options = {
    enableHighAccuracy: true,
    timeout: 5000,
    maximumAge: 0,
  };

  function success(pos: any) {
    var crd = pos.coords;
    // console.log("Your current position is:");
    // console.log(`Latitude : ${crd.latitude}`);
    // console.log(`Longitude: ${crd.longitude}`);
    // console.log(`More or less ${crd.accuracy} meters.`);

    getIpAddress();
    getLocation();
  }

  function errors(err: any) {
    console.warn(`ERROR(${err.code}): ${err.message}`);
  }

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.permissions
        .query({ name: "geolocation" })
        .then(function (result) {
          // console.log(result);
          if (result.state === "granted") {
            //If granted then you can directly call your function here
            navigator.geolocation.getCurrentPosition(success, errors, options);
          } else if (result.state === "prompt") {
            //If prompt then the user will be asked to give permission
            navigator.geolocation.getCurrentPosition(success, errors, options);
          } else if (result.state === "denied") {
            //If denied then you have to show instructions to enable location
          }
        });
    } else {
      console.log("Geolocation is not supported by this browser.");
    }
    //eslint-disable-next-line
  }, []);

  return (
    <div className="flex items-center maxmd:justify-between  maxmd:w-full ">
      {/* <span className="w-full maxsm:w-fit flex flex-row gap-x-1 items-center cursor-pointer text-[13px] font-bold">
        {userLocation ? userLocation.postal : <MapPin size={18} />}
      </span> */}
      {/* Contact Links */}
      <div className="maxsm:hidden flex fle-row items-center justify-center gap-x-4 mx-3 mt-1">
        <div className="flex items-center justify-center gap-x-4">
          <motion.a
            whileHover={{ scale: 1.3 }}
            whileTap={{ scale: 0.9 }}
            href="https://www.instagram.com/supercollectibles_mx"
            target="_blank"
          >
            <span className="socialLink">
              <BsInstagram className="text-base" />
            </span>
          </motion.a>
          <motion.a
            whileHover={{ scale: 1.3 }}
            whileTap={{ scale: 0.9 }}
            href="https://www.facebook.com/profile.php?id=61564208924734"
            target="_blank"
          >
            <span className="socialLink">
              <BsFacebook className="text-base" />
            </span>
          </motion.a>
          <motion.a
            whileHover={{ scale: 1.3 }}
            whileTap={{ scale: 0.9 }}
            href="mailto:supercollectiblesc12@gmail.com"
            target="_blank"
          >
            <span className="socialLink">
              <MdEmail className="text-base" />
            </span>
          </motion.a>
        </div>
      </div>
      {/* Logo  */}
      <div className=" object-contain justify-center">
        <LogoComponent className="w-[70px] " />
      </div>
      {/* <ModeToggle /> */}
    </div>
  );
}
