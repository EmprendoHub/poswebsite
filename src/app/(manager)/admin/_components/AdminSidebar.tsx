"use client";
import Image from "next/image";
import Link from "next/link";
import React, { createContext, useContext, useState } from "react";
import { BsChevronBarLeft, BsChevronBarRight } from "react-icons/bs";
import { FiLogOut } from "react-icons/fi";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";

export interface SidebarContextType {
  expandSidebar: boolean;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

const backdropVariants = {
  animate: { opacity: 1, scale: 1 },
  initial: { opacity: 0, scale: 0.5 },
  duration: { duration: 1.5 },
};

const AdminSidebar = ({ children }: { children: any }) => {
  const [expandSidebar, setExpandSidebar] = useState(false);
  let user: any;
  const { data: session } = useSession();
  const isLoggedIn = Boolean(session?.user);
  if (isLoggedIn) {
    user = session?.user;
  }
  return (
    <aside className="h-screen print:hidden ">
      <nav className="min-h-full flex justify-between flex-col bg-background border-r border-b border-r-muted shadow-sm">
        <div>
          <div
            className={`ml-2 py-2 flex  items-center ${
              expandSidebar ? "justify-between" : "justify-center"
            }`}
          >
            <Image
              alt="image"
              src={"/logos/Super-Collectibles-Menu-logo.png"}
              width={250}
              height={250}
              className={`overflow-hidden transition-all ease-in-out ${
                expandSidebar ? "w-16 h-auto maxmd:ml-1" : "w-0 h-0"
              }`}
            />
            <button
              onClick={() => setExpandSidebar((currentState) => !currentState)}
              className="p-1.5  text-foreground"
            >
              {expandSidebar ? (
                <BsChevronBarLeft size={20} />
              ) : (
                <BsChevronBarRight size={20} />
              )}
            </button>
          </div>

          <SidebarContext.Provider value={{ expandSidebar }}>
            <ul className="flex flex-col justify-center gap-4 px-2">
              {children}
            </ul>
          </SidebarContext.Provider>
        </div>
        <div>
          {/* user avatar */}
          <div
            onClick={() => setExpandSidebar((currentState) => !currentState)}
            className="border-t flex justify-center items-center p-1 "
          >
            <Image
              alt={user?.name ? user?.name : "avatar"}
              src={user?.image ? user?.image : "/images/avatar_placeholder.jpg"}
              width={150}
              height={150}
              className="w-6 h-6 rounded-full cursor-pointer"
            />

            <div
              className={`flex items-center overflow-hidden transition-all ease-in-out  ${
                expandSidebar ? "w-full ml-3 maxmd:ml-1" : "w-0"
              }`}
            >
              <div className="leading-4 w-full">
                <div className="flex items-center justify-between">
                  <h4 className=" text-[12px] leading-4 text-wrap w-2/3 ">
                    {user?.name.substring(0, 12)}
                  </h4>
                  <div
                    className=" text-red-800 hover:bg-foreground hover:text-white-500  cursor-pointer"
                    onClick={() => signOut()}
                  >
                    <div
                      className={`${
                        expandSidebar
                          ? "group flex items-center w-6 p-1"
                          : "w-0"
                      }`}
                    >
                      <FiLogOut />
                      <span className="absolute -top-10 scale-0 transition-all rounded bg-black text-xs text-white group-hover:scale-100 z-50">
                        Cerrar Session!
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>
    </aside>
  );
};

export default AdminSidebar;

export function SideBarItem({
  icon,
  text,
  active,
  alert,
  url,
  dropdownItems,
}: {
  icon: any;
  text: string;
  active: any;
  alert?: any;
  url: string;
  dropdownItems?: any;
}) {
  const { expandSidebar }: any = useContext(SidebarContext);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState(""); // Track the hovered item by its index
  const router = useRouter();

  const handleDropdownToggle = () => {
    if (dropdownItems) {
      setDropdownOpen(!dropdownOpen);
    } else {
      router.push(url);
    }
  };

  return (
    <li
      className={`relative flex flex-col items-center font-medium  cursor-pointer py-2 px-2 text-[14px] ${
        active === "true"
          ? " text-primary bg-foreground"
          : "hover:text-primary hover:bg-foreground text-muted"
      }`}
      onClick={handleDropdownToggle}
      onMouseEnter={() => setHoveredIndex("main")} // Set hoveredIndex to 'main' for the main item
      onMouseLeave={() => setHoveredIndex("")} // Reset on mouse leave
    >
      <div className="flex items-center justify-center">
        {icon}
        <span
          className={`flex justify-between items-center overflow-hidden transition-all ease-in-out ${
            expandSidebar ? " w-36 ml-2  maxmd:w-36 maxmd:ml-1" : "w-0"
          }`}
        >
          {text}
        </span>
      </div>

      {/* Conditional rendering for main item hover text */}
      {!expandSidebar && hoveredIndex === "main" && (
        <div className="absolute z-50 left-full  px-2 py-1 ml-0 bg-indigo-100 text-primary text-xs opacity-100 min-w-[250px]">
          {text}
        </div>
      )}

      {dropdownOpen && dropdownItems && (
        <AnimatePresence>
          <motion.ul
            variants={{
              animate: { opacity: 1, scale: 1 },
              initial: { opacity: 0, scale: 0.5 },
            }}
            transition={{ duration: 0.2 }}
            initial="initial"
            animate="animate"
            className="absolute z-50 top-6 flex flex-col gap-1 mt-1  bg-foreground"
          >
            {dropdownItems.map(
              (
                item: {
                  url: string;
                  active: string;
                  icon: any;
                  text: string;
                },
                index: number
              ) => (
                <Link href={item.url} key={index} className="min-w-full">
                  <li
                    className={`p-2 cursor-pointer flex items-center justify-center  ${
                      item.active === "true"
                        ? "bg-foreground text-primary"
                        : "hover:bg-indigo-50 hover:text-primary text-muted"
                    }`}
                    onMouseEnter={() => setHoveredIndex(index.toString())} // Set hoveredIndex to the current item's index
                    onMouseLeave={() => setHoveredIndex("")} // Reset on mouse leave
                  >
                    {item.icon && item.icon}
                    <span
                      className={`flex justify-between items-center overflow-hidden transition-all ease-in-out ${
                        expandSidebar
                          ? " w-36 ml-2  maxmd:w-36 maxmd:ml-1"
                          : "w-0"
                      }`}
                    >
                      {item.text}
                    </span>
                    {/* Conditional rendering for dropdown item hover text */}
                    {!expandSidebar && hoveredIndex === index.toString() && (
                      <div className="absolute z-50 left-full  px-2 py-1 ml-0 bg-indigo-100 text-primary text-xs opacity-100 min-w-[250px]">
                        {item.text}
                      </div>
                    )}
                  </li>
                </Link>
              )
            )}
          </motion.ul>
        </AnimatePresence>
      )}
    </li>
  );
}
