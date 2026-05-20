"use client";
import React, { useContext, useEffect, useState } from "react";
import Image from "next/image";
import { addToCart, deleteFavorite } from "@/redux/shoppingSlice";
import { useDispatch, useSelector } from "react-redux";
import { AiOutlineClose } from "react-icons/ai";
import { useRouter } from "next/navigation";
import { IoMdCart } from "react-icons/io";
import { getUserFavorites } from "@/app/_actions";
import { toast } from "sonner";

const FavoritesComp = ({ session }: { session: any }) => {
  //import CartContext and assign to addItemToCart
  const { favoritesData } = useSelector((state: any) => state?.compras);
  const router = useRouter();
  const dispatch = useDispatch();
  const [favorites, setFavorites] = useState([]);

  useEffect(() => {
    async function getFavorites() {
      const data = await getUserFavorites(favoritesData, session);
      setFavorites(data);
    }
    getFavorites();
    //eslint-disable-next-line
  }, [favoritesData]);

  function handleAddToCart(item: any) {
    // Add shipping info to item
    const itemWithShipping = {
      ...item,
      weight: item.weight || 0.5,
      length: item.dimensions?.length || 15,
      width: item.dimensions?.width || 15,
      height: item.dimensions?.height || 10,
    };
    dispatch(addToCart(itemWithShipping)) &&
      dispatch(deleteFavorite(item?._id)) &&
      toast(`${item?.title.substring(0, 15)}... se agrego al carrito`) &&
      router.push("/carrito");
  }

  return (
    <>
      <section className="py-5 sm:py-7 bg-background">
        <div className="container max-w-screen-xl mx-auto px-4">
          <h2 className="text-3xl font-semibold mb-2 font-EB_Garamond">
            {favorites?.length || 0} Artículos(s) en Favoritos
          </h2>
        </div>
      </section>

      {favorites?.length > 0 && (
        <section className="pb-10 bg-background">
          <div className="container max-w-screen-xl mx-auto bg-background p-5">
            <div className="flex flex-col md:flex-row gap-4">
              <main className="md:w-3/4">
                <article className="border border-gray-200  shadow-sm rounded mb-5 p-3 lg:p-5">
                  {favorites?.map((item: any, index: number) => (
                    <div key={index}>
                      <div className="flex flex-wrap lg:flex-row gap-5  mb-4 items-center">
                        <div className="w-full lg:w-2/5 xl:w-2/4">
                          <figure className="flex leading-5">
                            <div>
                              <div className="block w-16 h-16 rounded border border-gray-200 overflow-hidden">
                                <Image
                                  src={item?.images[0].url}
                                  alt="Title"
                                  width={100}
                                  height={100}
                                />
                              </div>
                            </div>
                            <figcaption className="ml-3">
                              <p>
                                <a
                                  href={`/producto/${item?._id}`}
                                  className="hover:text-blue-600"
                                >
                                  {item?.title}
                                </a>
                              </p>
                              <p className="mt-1 text-gray-400">
                                {" "}
                                Marca: {item?.brand}
                              </p>
                            </figcaption>
                          </figure>
                        </div>
                        <div>
                          <div className="leading-5">
                            <p className="font-semibold not-italic">
                              ${item?.price}
                            </p>
                            <p className="font-normal not-italic">
                              existencias: {item?.stock}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center group">
                          {/* add to cart button */}
                          {item?.stock <= 0 ? (
                            <span className="  border-[1px] border-black font-medium text-xl py-1 px-3 rounded-sm bg-black text-slate-100 font-EB_Garamond">
                              SOLD OUT
                            </span>
                          ) : (
                            <button
                              className="bg-gold-gradient border border-black drop-shadow-md flex flex-row items-center justify-between pl-2 text-sm gap-x-4 rounded-sm  bg-black text-white ease-in-out  duration-300  uppercase tracking-wider px-3  cursor-pointer "
                              onClick={() => handleAddToCart(item)}
                            >
                              <span className="text-xl text-slate-100 flex items-center justify-center group-hover:bg-black duration-200  rounded-full py-2">
                                + <IoMdCart />
                              </span>
                            </button>
                          )}
                        </div>
                        <div className="flex-auto">
                          <div className="float-right">
                            <span
                              onClick={() =>
                                dispatch(deleteFavorite(item?._id))
                              }
                              className="text.lg hover:text-red-600 cursor-pointer duration-300"
                            >
                              <AiOutlineClose />
                            </span>
                          </div>
                        </div>
                      </div>

                      <hr className="my-4" />
                    </div>
                  ))}
                </article>
              </main>
            </div>
          </div>
        </section>
      )}
    </>
  );
};

export default FavoritesComp;
