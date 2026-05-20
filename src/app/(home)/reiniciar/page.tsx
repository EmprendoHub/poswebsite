import React from "react";
import Link from "next/link";
import { getCookiesName } from "@/backend/helpers";
import { cookies } from "next/headers";
import EmailAccountReset from "./_components/EmailAccountReset";
import GoogleCaptchaWrapper from "@/components/layouts/GoogleCaptchaWrapper";

const resetAccountAccess = async (token: any) => {
  const nextCookies = cookies();
  const cookieName = getCookiesName();
  const nextAuthSessionToken = nextCookies.get(cookieName);
  const URL = `${process.env.NEXTAUTH_URL}/api/reset`;
  try {
    const res = await fetch(URL, {
      method: "POST",
      headers: {
        Cookie: `${cookieName}=${nextAuthSessionToken?.value}`,
        Token: token,
      },
    });
    const data = res.json();
    return data;
  } catch (error) {
    console.log(error);
  }
};

const SuccessPage = async ({ searchParams }: { searchParams: any }) => {
  const token = searchParams?.token;
  const res = await resetAccountAccess(token);
  const isUnblocked = res?.message === "Cuenta desbloqueada";
  return (
    <>
      <div
        className={
          "bg-background h-[80vh] flex items-center justify-center text-center mx-auto"
        }
      >
        {isUnblocked ? (
          <div className="w-[90%]">
            <p className="font-raleway text-slate-500 text-lg mt-3">
              Tu cuenta de reactivo exitosamente
            </p>
            <h2 className="text-7xl font-EB_Garamond">Gracias</h2>
            <p className="text-base text-muted mt-5">
              Ya puedes iniciar tu session.
            </p>
            <div className="flex maxsm:flex-col gap-4 items-center gap-x-5 justify-center mt-10">
              <Link href={"/iniciar"}>
                <button className="bg-black text-slate-100 hover:text-foreground w-44 h-12 rounded-full text-base font-semibold hover:bg-gray-200 duration-500">
                  iniciar tu session.
                </button>
              </Link>
              <Link href={"/tienda"}>
                <button className="bg-black text-slate-100 hover:text-foreground w-44 h-12 rounded-full text-base font-semibold hover:bg-gray-200 duration-500">
                  Explorar Tienda
                </button>
              </Link>
            </div>
          </div>
        ) : (
          <GoogleCaptchaWrapper>
            <EmailAccountReset />
          </GoogleCaptchaWrapper>
        )}
      </div>
    </>
  );
};

export default SuccessPage;
