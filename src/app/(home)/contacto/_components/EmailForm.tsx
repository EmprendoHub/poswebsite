"use client";
import React from "react";
import { useState } from "react";
import { useGoogleReCaptcha } from "react-google-recaptcha-v3";
import { isValidEmail, isValidPhone } from "@/backend/helpers";
import { toast } from "@/components/ui/use-toast";

const EmailForm = ({ cookie }: { cookie: any }) => {
  const [notification, setNotification] = useState("");
  const { executeRecaptcha } = useGoogleReCaptcha();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [activeButton, setActiveButton] = useState(false);
  const [formStatus, setFormStatus] = useState(false);

  const [honeypot, setHoneypot] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: any) => {
    e.preventDefault();

    if (name === "") {
      toast({
        variant: "destructive",
        title: "Por favor agregar tu nombre para enviar el mensaje. ",
      });
      return;
    }

    if (email === "") {
      toast({
        variant: "destructive",
        title: "Por favor agregue su correo para enviar el mensaje. ",
      });
      return;
    }
    if (!isValidEmail(email)) {
      toast({
        variant: "destructive",
        title: "Utilice un correo electrónico válido.",
      });
      return;
    }
    if (message === "") {
      toast({
        variant: "destructive",
        title: "Por favor agregue su mensaje para continuar.",
      });
      return;
    }

    if (!isValidPhone(phone)) {
      toast({
        variant: "destructive",
        title: "Utilice un teléfono válido.",
      });
      return;
    }

    if (!executeRecaptcha) {
      console.log("Execute recaptcha not available yet");
      setNotification(
        "Execute recaptcha not available yet likely meaning key not recaptcha key not set"
      );
      return;
    }
    setActiveButton(true);

    executeRecaptcha("enquiryFormSubmit").then(async (gReCaptchaToken) => {
      try {
        const res: any = await fetch(`/api/email`, {
          headers: {
            "Content-Type": "application/json",
            Cookie: cookie,
          },
          method: "POST",
          body: JSON.stringify({
            name,
            phone,
            email,
            message,
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
            title: "Error al enviar tu mensaje intenta nuevamente",
          });
          setActiveButton(true);

          setError("Error al enviar tu mensaje intenta nuevamente");
        }
        if (res.ok) {
          setFormStatus(true);
          toast({
            title: "Su mensaje se envió exitosamente",
          });

          return;
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
    <div className="relative flex fle-col py-7  pr-7 m-auto w-full rounded-xl z-10">
      {!formStatus ? (
        <form
          onSubmit={handleSubmit}
          className="flex text-xs flex-col w-full gap-y-4"
        >
          <input
            type="text"
            placeholder={"Tu nombre aquí"}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="p-2 border-black border-b font-playfair-display bg-white bg-opacity-0"
          />
          <input
            type="email"
            placeholder={"Correo Electrónico"}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="p-2 border-black border-b font-playfair-display appearance-none bg-white bg-opacity-0 "
          />
          <input
            className="p-2 border-black border-b font-playfair-display appearance-none bg-white bg-opacity-0 "
            type="text"
            placeholder="Teléfono"
            value={phone}
            onChange={handlePhoneChange}
          />
          <input
            hidden
            type="text"
            placeholder="Honeypot"
            onChange={(e) => setHoneypot(e.target.value)}
          />
          <textarea
            cols={30}
            rows={5}
            placeholder="Mensaje"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="p-2 border-black border-b font-playfair-display bg-white bg-opacity-0 "
          ></textarea>
          <button type="submit" className="mt-5" disabled={activeButton}>
            <p className=" bg-primary  text-white py-3">{"Enviar Mensaje"}</p>
          </button>
        </form>
      ) : (
        <div className="text-green-700">El mensaje se envió exitosamente</div>
      )}
    </div>
  );
};

export default EmailForm;
