import React from "react";
import Link from "next/link";
import MobileMenuComponent from "./MobileMenuComponent";
import { useSelector } from "react-redux";
import { ShoppingCart, MapPin, User } from "lucide-react";
import GlobalSearch from "../layouts/GlobalSearch";
import LocationConcent from "./LocationConcent";
import { FiLogOut } from "react-icons/fi";
import { signOut, useSession } from "next-auth/react";

// const CustomLink = ({
//   href,
//   title,
//   className = "",
// }: {
//   href: string;
//   title: string;
//   className: string;
// }) => {
//   return (
//     <Link href={href} className={`${className} relative group`}>
//       <span
//         className={`h-[1px] inline-block bg-gradient-to-r from-stone-900 to-red-500 group-hover:w-full transition-[width] ease duration-300 absolute left-0 top-0 w-0`}
//       >
//         &nbsp;
//       </span>
//       <span className="pb-5">{title}</span>
//       <span
//         className={`h-[1px] inline-block bg-gradient-to-r from-stone-900 to-red-500 group-hover:w-full transition-[width] ease duration-300 absolute left-0 bottom-0 w-0`}
//       >
//         &nbsp;
//       </span>
//     </Link>
//   );
// };

const MainMenuComponent = ({
  className,
  session,
}: {
  className: string;
  session: any;
}) => {
  const { productsData, favoritesData } = useSelector(
    (state: any) => state.compras
  );

  return (
    <nav
      className={`${className} relative self-stretch flex flex-row items-center maxsm:items-start justify-center p-3 mx-auto menu-class maxmd:flex maxmd:flex-col-reverse `}
    >
      <div className="relative flex items-center justify-between gap-3">
        {/*Mobile Navigation*/}
        <MobileMenuComponent />
        {/* Navigation*/}
        {/* <nav className="maxmd:hidden m-0 flex flex-row px-5 items-center justify-center gap-x-3 text-[13px] font-light tracking-wide text-white no-underline capitalize pr-8">
          <CustomLink href={`/tienda`} title={"Tienda"} className={""} />
          <CustomLink href={`/acerca`} title={"nosotros"} className={""} />
          <CustomLink href={`/contacto`} title={"contacto"} className={""} />
        </nav> */}
        <GlobalSearch className="" />
        {/* Cart Button */}
        <div className="flex items-center gap-x-3">
          {session ? (
            <div
              className=" text-white  cursor-pointer text-[13px] flex items-center gap-x-1"
              onClick={() => signOut()}
            >
              <FiLogOut size={20} />
            </div>
          ) : (
            <Link href={"/iniciar"} className="text-[13px] cursor-pointer">
              <User size={20} />
            </Link>
          )}

          {/* <span className="text-[13px] maxmd:hidden">Mis Compras</span> */}
          <Link href={"/carrito"}>
            <div className="rounded-full text-salte-100  flex items-center justify-center  cursor-pointer">
              <ShoppingCart size={20} />
              <span className=" text-white rounded-full text-[10px] relative right-1  -top-2 flex items-center justify-center w-4 h-4 shadow-xl p-0">
                {productsData ? productsData?.length : 0}
              </span>
            </div>
          </Link>
          <LocationConcent />
        </div>
      </div>
    </nav>
  );
};

export default MainMenuComponent;
