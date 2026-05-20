"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import { IoLogoGoogle } from "react-icons/io";
import WhiteLogoComponent from "./WhiteLogoComponent";
import { useSelector } from "react-redux";
import { useGoogleReCaptcha } from "react-google-recaptcha-v3";
import Image from "next/image";
import { toast } from "sonner";

const LoginComponent = ({ cookie }: { cookie: any }) => {
  const { executeRecaptcha } = useGoogleReCaptcha();
  const { loginAttempts } = useSelector((state: any) => state?.compras);
  const session = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const callback = searchParams.get("callbackUrl");
  const [honeypot, setHoneypot] = useState("");

  useEffect(() => {
    if (session?.status === "authenticated") {
      router.replace("/");
    }
  }, [session, router]);

  const handleSubmit = async (e: any) => {
    e.preventDefault();

    if (password === "" || email === "") {
      toast("Fill all fields!");
      return;
    }

    if (password.length < 8) {
      toast("Password must be at least 8 characters long");
      return;
    }
    if (!executeRecaptcha) {
      console.log("Execute recaptcha not available yet");
      return;
    }
    executeRecaptcha("enquiryFormSubmit").then(async (gReCaptchaToken) => {
      try {
        const res: any = await signIn("credentials", {
          email,
          password,
          recaptcha: gReCaptchaToken,
          honeypot,
          cookie,
        });

        if (res?.data?.success === true) {
          console.log(`Success with score: ${res?.data?.score}`);
        } else {
          console.log(`Failure with score: ${res?.data?.score}`);
        }

        if (res.status === 400) {
          toast("This email is already in use");
        }
        if (res.ok) {
          toast("Iniciar ");
          setTimeout(() => {
            router.push("/tienda");
          }, 200);
          return;
        }
      } catch (error) {
        toast("Error occured while loggin");
        console.log(error);
      }
    });
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center">
      {loginAttempts > 30 ? (
        <div>Excediste el limite de inicios de session</div>
      ) : (
        <div className="flex items-center justify-center bg-foreground h-screen w-full">
          <div className="w-1/2 h-screen relative overflow-hidden maxmdsm:hidden">
            <Image
              alt="Super Collectibles Mx"
              src="/covers/login_cover.jpeg"
              layout="fill"
              objectFit="cover"
              quality={100}
            />
          </div>
          <div className="w-1/2 maxmd:w-full bg-background h-screen p-20 maxsm:p-8 shadow-xl text-center text-primary mx-auto flex flex-col items-center justify-center z-[1]">
            <WhiteLogoComponent className="w-[150px]" />
            <h2 className="flex justify-center py-5 text-foreground">
              Iniciar Session
            </h2>

            <button
              className="w-full hover:text-black hover:bg-slate-300 duration-500 ease-in-out text-foreground text-xs bg-black mb-4 flex flex-row gap-4 items-center py-4 justify-center"
              onClick={() => {
                signIn("google");
              }}
            >
              <IoLogoGoogle />
              Iniciar con Google
            </button>
            <div className="text-center text-slate-900 my-4 ">- O -</div>
            <form
              className="flex flex-col justify-center items-center text-center gap-y-4"
              onSubmit={handleSubmit}
            >
              <input
                className="text-center py-2"
                type="email"
                placeholder="Correo Electrónico..."
                onChange={(e) => setEmail(e.target.value)}
              />
              <input
                hidden
                className="text-center py-2"
                type="text"
                placeholder="Honeypot"
                onChange={(e) => setHoneypot(e.target.value)}
              />
              <input
                className="text-center py-2"
                type="password"
                placeholder="contraseña..."
                onChange={(e) => setPassword(e.target.value)}
              />
              <button className="bg-primary text-white w-[150px] p-2 rounded-sm mt-5">
                Iniciar
              </button>
            </form>
            <Link
              className="text-[12px] text-center mt-3 text-foreground"
              href={`/registro`}
            >
              ¿Aun no tienes cuenta? <br /> Registrar aquí.
            </Link>
          </div>
        </div>
      )}
    </main>
  );
};

export default LoginComponent;
