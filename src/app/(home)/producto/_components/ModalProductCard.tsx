"use client";
import Image from "next/image";
import FormattedPrice from "@/backend/helpers/FormattedPrice";
import { calculatePercentage } from "@/backend/helpers";
import { AnimatePresence, motion } from "framer-motion";
import { FaCircleExclamation } from "react-icons/fa6";
import { usePathname, useRouter } from "next/navigation";

const ModalProductCard = ({
  item,
  setShowModal,
  orderId,
  isPaid,
}: {
  item: any;
  setShowModal: any;
  orderId?: any;
  isPaid?: any;
}) => {
  const pathname = usePathname();
  const router = useRouter();

  function closeModal() {
    if (pathname.includes("admin")) {
      router.push(`/admin/pos/qr/idscanner`);
    } else if (pathname.includes("puntodeventa")) {
      router.push("/puntodeventa/qr/idscanner");
    } else if (pathname.includes("instagram")) {
      router.push("/instagram/qr/idscanner");
    }
  }
  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        whileInView={{ y: 0, opacity: 1 }}
        transition={{ duration: 1.0 }}
        className="border-[1px] rounded-sm max-w-[350px] maxmd:max-w-[100%] overflow-hidden relative p-5 bg-background"
      >
        <div
          onClick={() => closeModal()}
          className="my-2 px-4 py-2 text-center text-white bg-red-700 border border-transparent rounded-xl hover:bg-red-800 w-full flex flex-row items-center justify-center gap-1 cursor-pointer"
        >
          <FaCircleExclamation className="text-xl" />
          Cerrar
        </div>
        <div className="w-full h-[300px] group overflow-hidden relative">
          <Image
            src={item?.images[0].url}
            alt="product image"
            className=" ease-in-out duration-500 w-full h-full object-cover group-hover:scale-110 rounded-t-sm"
            width={350}
            height={350}
          />

          {item?.sale_price && (
            <span className="absolute top-2 right-2  border-[1px] border-black font-medium text-xs py-1 px-3 rounded-sm bg-black text-slate-100 group-hover:bg-slate-100 group-hover:text-foreground duration-200">
              Oferta
            </span>
          )}
          {item?.stock <= 0 && (
            <span className="absolute rotate-12 top-1/2 right-1/4  border-[1px] border-black font-medium text-xl py-1 px-3 rounded-sm bg-black text-slate-100 group-hover:bg-slate-100 group-hover:text-foreground duration-200">
              SOLD OUT
            </span>
          )}
          {item?.sale_price ? (
            <div>
              <div className="absolute top-2 left-2  border-[1px] border-black w-fit py-1 px-4 rounded-sm text-xs bg-black text-slate-100 group-hover:bg-slate-100 group-hover:text-foreground duration-200">
                <p>
                  {calculatePercentage(item?.price, item?.sale_price)}% menos
                </p>
              </div>
            </div>
          ) : (
            ""
          )}
        </div>
        <div className=" px-4 py-4 flex flex-col bg-background rounded-b-sm">
          <div className="flex items-center justify-between gap-x-1">
            <p className="text-foreground tracking-widest font-EB_Garamond text-xl">
              {item?.title}
            </p>
          </div>

          <div className="pricing-class flex fle-row items-center gap-x-2">
            <div className="flex flex-col gap-y-1">
              <p className="font-semibold text-foreground tracking-wider text-xl">
                {item?.sale_price > 0 ? (
                  <FormattedPrice amount={item?.sale_price} />
                ) : item?.price > 0 ? (
                  <FormattedPrice amount={item?.price} />
                ) : (
                  ""
                )}
              </p>
            </div>
            {item?.sale_price ? (
              <div>
                <div className="flex items-center gap-x-2">
                  <p className="line-through text-sm text-foreground font-bodyFont">
                    <FormattedPrice amount={item?.price} />
                  </p>
                </div>
              </div>
            ) : (
              ""
            )}
          </div>
          <div className="">
            <p className="font-semibold text-foreground tracking-wider text-3xl">
              <FormattedPrice
                amount={
                  item?.variations[0].price > 0
                    ? item?.variations[0].price
                    : item?.sale_price ?? item?.sale_price
                }
              />
            </p>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ModalProductCard;
