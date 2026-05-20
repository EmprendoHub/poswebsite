import ProfileAddressesRender from "../_components/ProfileAddressesRender";
import { options } from "@/app/api/auth/[...nextauth]/options";
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

const DireccionesPage = async () => {
  const addresses = await getAllAddresses();
  return <ProfileAddressesRender addresses={addresses} />;
};

export default DireccionesPage;
