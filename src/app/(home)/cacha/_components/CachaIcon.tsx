import React from "react";
import Image from "next/image";

interface CachaIconProps {
  name:
    | "music"
    | "tshirt"
    | "ticket"
    | "calendar"
    | "location"
    | "party"
    | "heart";
  size?: number;
  className?: string;
}

const CachaIcon: React.FC<CachaIconProps> = ({
  name,
  size = 24,
  className = "",
}) => {
  return (
    <div
      className={`inline-flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      <Image
        src={`/icons/${name}.svg`}
        alt={`${name} icon`}
        width={size}
        height={size}
        className="w-full h-full"
        style={{ filter: "brightness(0) invert(1)" }} // Makes SVG white
      />
    </div>
  );
};

export default CachaIcon;
