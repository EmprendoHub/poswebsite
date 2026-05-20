import React from "react";
import MotionHeaderComponent from "./MotionHeaderComponent";
import { getServerSession } from "next-auth";
import { options } from "@/app/api/auth/[...nextauth]/options";

const HeaderComponent = async () => {
  const session = await getServerSession(options);

  return <MotionHeaderComponent session={session} />;
};

export default HeaderComponent;
