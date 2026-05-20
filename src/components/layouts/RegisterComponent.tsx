"use client";
import React, { useEffect, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { IoLogoGoogle } from "react-icons/io";
import { useRouter } from "next/navigation";
import WhiteLogoComponent from "./WhiteLogoComponent";
import { useGoogleReCaptcha } from "react-google-recaptcha-v3";
import { isValidEmail, isValidPhone } from "@/backend/helpers";
import { toast } from "../ui/use-toast";
import { title } from "process";

const RegisterFormComponent = ({ cookie }: { cookie: any }) => {
  const [notification, setNotification] = useState("");
  const { executeRecaptcha } = useGoogleReCaptcha();
  const router = useRouter();
  const session = useSession();

  useEffect(() => {
    if (session?.status === "authenticated") {
      router.replace("/");
    }
  }, [session, router]);

  const [honeypot, setHoneypot] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: any) => {
    e.preventDefault();

    if (username === "") {
      toast({
        variant: "destructive",
        duration: 3000,
        title: "Por favor complete el nombre de usuario para registrarse.",
      });
      return;
    }

    if (email === "") {
      toast({
        variant: "destructive",
        duration: 3000,
        title: "Por favor agregue su correo electrónico para registrarse.",
      });
      return;
    }

    if (!isValidEmail(email)) {
      toast({
        variant: "destructive",
        duration: 3000,
        title: "Utilice un correo electrónico válido",
      });
      return;
    }

    if (!isValidPhone(phone)) {
      toast({
        variant: "destructive",
        duration: 3000,
        title: "Utilice un teléfono válido.",
      });
      return;
    }

    if (!password || password.length < 8) {
      toast({
        variant: "destructive",
        duration: 3000,
        title: "La contraseña debe tener al menos 8 caracteres",
      });
      return;
    }

    if (!executeRecaptcha) {
      setNotification(
        "Execute recaptcha not available yet likely meaning key not recaptcha key not set"
      );
      return;
    }

    executeRecaptcha("enquiryFormSubmit").then(async (gReCaptchaToken) => {
      try {
        const res: any = await fetch(`/api/register`, {
          headers: {
            "Content-Type": "application/json",
            Cookie: cookie,
          },
          method: "POST",
          body: JSON.stringify({
            username,
            phone,
            email,
            password,
            recaptcha: gReCaptchaToken,
            honeypot,
          }),
        });

        if (res?.data?.success === true) {
          setNotification(`Success with score: ${res?.data?.score}`);
        } else {
          setNotification(`Failure with score: ${res?.data?.score}`);
        }

        if (res.status === 400) {
          toast({
            variant: "destructive",
            duration: 3000,
            title: "Este correo electrónico y/o el teléfono ya esta en uso",
          });
          setError("Este correo electrónico y/o el teléfono ya esta en uso");
        }
        if (res.ok) {
          toast({
            duration: 3000,
            title: "Se registró exitosamente al usuario",
          });
          signIn();
          return;
        }
        if (!res.ok) {
          const error = await res.json();
          toast({
            variant: "destructive",
            duration: 3000,
            title: `${error.message}`,
          });
        }
      } catch (error) {
        console.log(error);
      }
    });
  };

  const handlePhoneChange = (e: any) => {
    const inputPhone = e.target.value.replace(/\D/g, ""); // Remove non-numeric characters
    let formattedPhone = "";

    if (inputPhone.length <= 10) {
      formattedPhone = inputPhone.replace(
        /(\d{3})(\d{0,3})(\d{0,4})/,
        "$1$2$3"
      );
    } else {
      // If the phone number exceeds 10 digits, truncate it
      formattedPhone = inputPhone
        .slice(0, 10)
        .replace(/(\d{3})(\d{0,3})(\d{0,4})/, "$1 $2 $3");
    }

    setPhone(formattedPhone);
  };

  return (
    <main className="flex min-h-screen maxsm:min-h-[70vh] flex-col items-center justify-center">
      <div className="w-fit flex flex-col items-center bg-card maxsm:p-8 p-20 shadow-xl text-center mx-auto">
        {/* <LogoComponent /> */}
        <WhiteLogoComponent className="w-[150px]" />
        <h2 className="my-4 text-foreground font-bold font-EB_Garamond text-2xl">
          Registro Nuevo
        </h2>
        <button
          className="w-full hover:text-foreground hover:bg-slate-300 duration-500 ease-in-out text-white bg-black mb-4 flex flex-row gap-4
            items-center py-4 justify-center"
          onClick={() => {
            signIn("google");
          }}
        >
          <IoLogoGoogle />
          Continua con Google
        </button>
        <form
          onSubmit={handleSubmit}
          className="flex flex-col justify-center items-center text-center gap-y-4 text-foreground"
        >
          <input
            className="text-center py-2"
            type="text"
            placeholder="Nombre y Apellidos..."
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            className="text-center py-2"
            type="text"
            placeholder="Teléfono"
            value={phone}
            onChange={handlePhoneChange}
          />
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
            placeholder="Contraseña..."
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            type="submit"
            className={`bg-black text-white py-2 px-8 text-xl hover:bg-slate-200 hover:text-foreground ease-in-out duration-700 rounded-xl`}
          >
            Registrarme
          </button>
        </form>
        <button className={`text-foreground mt-3`} onClick={() => signIn()}>
          ¿Ya tienes cuenta? <br /> Iniciar Session
        </button>
      </div>
    </main>
  );
};

export default RegisterFormComponent;
