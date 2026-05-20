"use client";
import { resetAccountEmail } from "@/app/_actions";
import React, { useRef, useState } from "react";
import { useGoogleReCaptcha } from "react-google-recaptcha-v3";
import { ValidationError } from "@/types";

const EmailAccountReset = () => {
  const formRef = useRef<HTMLFormElement>(null);
  const [validationError, setValidationError] =
    useState<ValidationError | null>(null);
  const [notification, setNotification] = useState("");
  const { executeRecaptcha } = useGoogleReCaptcha();

  async function action(data: any) {
    if (!executeRecaptcha) {
      console.log("Execute recaptcha not available yet");
      setNotification(
        "Execute recaptcha not available yet likely meaning key not recaptcha key not set"
      );
      return;
    }
    executeRecaptcha("enquiryFormSubmit").then(async (gReCaptchaToken) => {
      data.append("gReCaptchaToken", gReCaptchaToken);
      const result: any = await resetAccountEmail(data);

      if (result?.error) {
        setValidationError(result.error);
        //reset the form
        formRef.current?.reset();
      } else {
        setValidationError(null);
        //reset the form
        formRef.current?.reset();
      }
    });
  }
  return (
    <div>
      <form
        ref={formRef}
        action={action}
        className="flex flex-col items-center gap-5"
      >
        {validationError?.success && (
          <p className="text-base tracking-wider text-green-700">
            {validationError.success._errors.join(", ")}
          </p>
        )}
        <input
          type="email"
          name="email"
          className="p-3 text-xl text-center border border-slate-400"
          placeholder="Ingresa tu email"
        />
        {validationError?.email && (
          <p className="text-sm text-red-400">
            {validationError.email._errors.join(", ")}
          </p>
        )}

        <button className="bg-black py-4 px-5 text-white tracking-wider">
          Enviar Correo
        </button>
      </form>
    </div>
  );
};

export default EmailAccountReset;
