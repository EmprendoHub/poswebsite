"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { FaCalendar } from "react-icons/fa6";
import DateTimePicker from "react-datetime-picker";
import "react-datetime-picker/dist/DateTimePicker.css";
import "react-calendar/dist/Calendar.css";
import "react-clock/dist/Clock.css";

const AllOrdersFilters = () => {
  const allStores = ["Todas", "Instagram", "Sucursal", "WWW"];
  const fullyPaid = ["Todos", "Apartado", "Pagado", "Entregado"];
  const [store, setStore] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const router = useRouter();
  let queryParams: any;

  function onStartDateChangeDate(date: any) {
    setStartDate(date);
  }

  function onEndDateChangeDate(date: any) {
    setEndDate(date);
  }

  function handleClick() {
    if (typeof window !== "undefined") {
      queryParams = new URLSearchParams(window.location.search);
    }

    if (store === "" || store === "Todas") {
      //delete filter
      queryParams.delete("branch");
    } else {
      //set query filter
      if (queryParams.has("branch")) {
        queryParams.set("branch", store);
      } else {
        queryParams.append("branch", store);
      }
    }
    if (paymentMethod === "" || paymentMethod === "Todos") {
      //delete filter
      queryParams.delete("paid");
    } else {
      //set query filter
      if (queryParams.has("paid")) {
        queryParams.set("paid", paymentMethod);
      } else {
        queryParams.append("paid", paymentMethod);
      }
    }
    if (startDate === "") {
      //delete filter
      queryParams.delete("min");
    } else {
      if (queryParams.has("min")) {
        queryParams.set("min", startDate);
      } else {
        queryParams.append("min", startDate);
      }
    }
    if (endDate === "") {
      //delete filter
      queryParams.delete("max");
    } else {
      if (queryParams.has("max")) {
        queryParams.set("max", endDate);
      } else {
        queryParams.append("max", endDate);
      }
    }

    const path = window.location.pathname + "?" + queryParams.toString();
    router.push(path);
  }

  return (
    <div className="w-full print:hidden">
      <div className=" mb-2  w-full text-start h-full px-4 py-2 inline-block text-2xl  shadow-sm border border-gray-200 rounded-xl font-EB_Garamond ">
        Generar Reporte
      </div>
      <div className="min-w-full flex items-center justify-start h-full">
        {/* Date Filter */}
        <div className="flex flex-col w-2/3 py-4 border border-gray-200 bg-background rounded shadow-sm">
          <h3 className=" mb-2 text-foreground flex items-start justify-start">
            Fechas <FaCalendar />
          </h3>

          <div className="flex items-center justify-center gap-x-2 text-foreground">
            <div className="mb-4 flex flex-col gap-2 items-center w-full">
              <DateTimePicker
                className={"appearance-none rounded-xl"}
                onChange={onStartDateChangeDate}
                value={startDate}
                locale={"es-MX"}
                disableClock={true}
              />
              <DateTimePicker
                className={"appearance-none rounded-xl"}
                onChange={onEndDateChangeDate}
                value={endDate}
                locale={"es-MX"}
                disableClock={true}
              />
            </div>
          </div>
        </div>
        {/* Payment Type Filter */}
        <div className="p-5 pt-4 w-1/3 mb-2 sm:p-1 border border-gray-200 bg-background rounded shadow-sm">
          <h3 className="font-semibold mb-2 text-gray-700">Estado</h3>

          <div className="relative w-full">
            <select
              className="flex relative appearance-none border border-gray-300 bg-background rounded-xl py-2 px-3 focus:outline-none cursor-pointer focus:border-gray-400 w-full z-10 bg-opacity-0"
              name="paymentMethod"
              onChange={(e) => setPaymentMethod(e.target.value)}
              value={paymentMethod}
            >
              {fullyPaid?.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>

            <i className="absolute inset-y-0 right-0 p-2 text-gray-400 z-0">
              <svg
                width="22"
                height="22"
                className="fill-current"
                viewBox="0 0 20 20"
              >
                <path d="M7 10l5 5 5-5H7z"></path>
              </svg>
            </i>
          </div>
        </div>
        {/* Store Filter */}
        <div className="p-5 pt-4 w-1/3 sm:p-1 border border-gray-200 bg-background rounded shadow-sm">
          <h3 className="font-semibold mb-2 text-gray-700">Tienda</h3>

          <div className="relative w-full">
            <select
              className="relative flex appearance-none border border-gray-300 bg-background rounded-xl py-2 px-3 mb-2 focus:outline-none cursor-pointer focus:border-gray-400 w-full z-10 bg-opacity-0"
              name="store"
              onChange={(e) => setStore(e.target.value)}
              value={store}
            >
              {allStores.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>

            <i className="absolute inset-y-0 right-0 p-2 text-gray-400 z-0">
              <svg
                width="22"
                height="22"
                className="fill-current"
                viewBox="0 0 20 20"
              >
                <path d="M7 10l5 5 5-5H7z"></path>
              </svg>
            </i>
          </div>
        </div>

        <button
          type="button"
          className="px-4 py-2 mt-5 inline-block text-white border border-transparent  rounded-xl bg-black w-1/6"
          onClick={handleClick}
        >
          Reporte
        </button>
      </div>
    </div>
  );
};

export default AllOrdersFilters;
