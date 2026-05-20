import React from "react";
import { FaCheck, FaInstagram, FaStar, FaStore } from "react-icons/fa6";
import { SiMercadopago } from "react-icons/si";
import { TbWorldWww } from "react-icons/tb";
import { TiCancel } from "react-icons/ti";
import { MdToggleOn } from "react-icons/md";

const ToggleSwitch = ({
  label,
  enabled,
  setEnabled,
}: {
  label: string;
  enabled: boolean;
  setEnabled: any;
}) => {
  return (
    <div className="flex items-center justify-start">
      <label className="flex flex-col items-center justify-center cursor-pointer">
        <span className=" text-xs">
          {label === "Destacado" ? (
            <div className="flex flex-col items-center justify-center">
              <FaStar />
              <p className="text-[10px]">{label}</p>
            </div>
          ) : label === "MercadoLibre" ? (
            <div className="flex flex-col items-center justify-center">
              <SiMercadopago />
              <p className="text-[10px]">{label}</p>
            </div>
          ) : label === "Sucursal" ? (
            <div className="flex flex-col items-center justify-center">
              <FaStore />
              <p className="text-[10px]">{label}</p>
            </div>
          ) : label === "WWW" ? (
            <div className="flex flex-col items-center justify-center">
              <TbWorldWww />
              <p className="text-[10px]">{label}</p>
            </div>
          ) : label === "Activo" ? (
            <div className="flex flex-col items-center justify-center">
              <MdToggleOn />
              <p className="text-[10px]">{label}</p>
            </div>
          ) : (
            ""
          )}
        </span>
        <div className="relative">
          <input
            type="checkbox"
            className="sr-only"
            checked={enabled}
            onChange={() => setEnabled(!enabled)}
          />
          <div
            className={`${
              enabled ? "bg-emerald-500" : "bg-gray-300"
            } block  w-14 h-8 rounded-full`}
          ></div>
          <div
            className={`dot absolute left-1 top-1  w-6 h-6 rounded-full transition ${
              enabled ? "translate-x-6 bg-emerald-700" : "bg-background"
            }`}
          >
            <div className="h-full w-full flex items-center justify-center">
              {enabled ? (
                <FaCheck className="text-white text-xs" />
              ) : (
                <TiCancel className="text-gray-400 text-xs" />
              )}
            </div>
          </div>
        </div>
      </label>
    </div>
  );
};

export default ToggleSwitch;
