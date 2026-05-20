"use client";
import React from "react";
import Image from "next/image";
import { formatDate, formatTime } from "@/backend/helpers";
import { useSession } from "next-auth/react";

const Profile = () => {
  const session: any = useSession();
  const user = session?.data?.user;

  return (
    <div className="p-5 flex flex-col items-start">
      <figure className="flex maxsm:flex-col items-start sm:items-center text-foreground">
        <div className="relative flex ">
          {user?.image ? (
            <Image
              className="w-16 h-16 maxsm:w-10 maxsm:h-10  rounded-full mr-4"
              src={user?.image ? user?.image : "/next.svg"}
              alt={user?.name ? user?.name : "avatar"}
              width={50}
              height={50}
            />
          ) : (
            <div className="w-16 h-16 rounded-full mr-4 bg-black text-white flex items-center justify-center uppercase text-2xl font-EB_Garamond">
              {user?.email.substring(0, 1)}
            </div>
          )}
        </div>
        <figcaption>
          <h5 className="font-semibold text-lg flex items-center maxsm:text-base">
            <span>{user?.name.substring(0, 13)}...</span>
            <span className="text-red-400 text-sm maxsm:text-xs pl-2">
              ( {user?.role} )
            </span>
          </h5>
          <p className="flex items-center maxsm:text-sm">
            {" "}
            <b className="pr-1">Email: </b> <span>{user?.email}</span>
          </p>
          <p className="flex items-center maxsm:text-sm">
            <b className="pr-1">Fecha: </b>
            <span>
              {user?.createdAt &&
                ` ${formatDate(
                  user?.createdAt.substring(0, 24)
                )} a las ${formatTime(user?.createdAt.substring(0, 24))}`}
            </span>
          </p>
        </figcaption>
        <hr className="my-4" />
      </figure>
    </div>
  );
};

export default Profile;
