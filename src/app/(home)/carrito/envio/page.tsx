import { options } from "@/app/api/auth/[...nextauth]/options";
import Shipping from "../_components/Shipping";
import { getServerSession } from "next-auth";

async function getAllAddresses() {
  try {
    const session = await getServerSession(options);
    const stringSession = JSON.stringify(session);
    const URL = `${process.env.NEXTAUTH_URL}/api/addresses`;
    const res = await fetch(URL, {
      headers: {
        Session: stringSession,
        "Content-Type": "application/json; charset=utf-8",
      },
    });
    const data = res.json();
    return data;
  } catch (error: any) {
    console.log(error?.response?.data?.message);
  }
}

const ShippingPage = async () => {
  const addresses = await getAllAddresses();

  return <Shipping addresses={addresses} />;
};

export default ShippingPage;
