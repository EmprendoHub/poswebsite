"use client";
import React, { useState } from "react";
import { updateClientPassword } from "@/app/_actions";
import { cstDateTimeClient } from "@/backend/helpers";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { ValidationError } from "@/types";

const UpdatePassword = () => {
  const session: any = useSession();
  const user = session?.data?.user;
  const [loading, setLoading] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [updatedAt, setUpdatedAt] = useState(cstDateTimeClient());
  const [validationError, setValidationError] =
    useState<ValidationError | null>(null);

  const submitHandler = async (e: any) => {
    setLoading(true);
    e.preventDefault();

    if (currentPassword === "") {
      toast("Por favor tu contraseña actual.");
      return;
    }
    if (newPassword === "") {
      toast("Por favor una contraseña nueva.");
      return;
    }

    const formData = new FormData();
    formData.set("_id", user?._id);
    formData.set("newPassword", newPassword);
    formData.set("currentPassword", currentPassword);
    formData.set("updatedAt", updatedAt.toDateString());

    const result: any = await updateClientPassword(formData);
    if (result?.error) {
      setValidationError(result.error);
      setLoading(false);
    } else {
      setValidationError(null);
      setLoading(false);
      toast.success("La contraseña se actualizo exitosamente");
    }
  };

  return (
    <>
      <div className="mt-1 mb-20 p-4 md:p-7 mx-auto rounded bg-background max-w-[580px]">
        <form onSubmit={submitHandler}>
          <h2 className="mb-5 text-2xl font-semibold font-EB_Garamond">
            Actualizar contraseña
          </h2>

          <div className="mb-4">
            <label className="block mb-1  font-EB_Garamond">
              Contraseña Actual
            </label>
            <input
              className="appearance-none border border-gray-200 bg-background rounded-xl py-2 px-3 hover:border-gray-400 focus:outline-none focus:border-gray-400 w-full"
              type="password"
              placeholder="Ingresa tu contraseña"
              required
              name="currentPass"
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
            {validationError?.currentPassword && (
              <p className="text-sm text-red-400">
                {validationError.currentPassword._errors.join(", ")}
              </p>
            )}
          </div>
          <div className="mb-4">
            <label className="block mb-1  font-EB_Garamond">
              Nueva contraseña
            </label>
            <input
              className="appearance-none border border-gray-200 bg-background rounded-xl py-2 px-3 hover:border-gray-400 focus:outline-none focus:border-gray-400 w-full"
              type="password"
              placeholder="Ingresa tu nueva contraseña"
              minLength={8}
              required
              name="newPass"
              onChange={(e) => setNewPassword(e.target.value)}
            />
            {validationError?.newPassword && (
              <p className="text-sm text-red-400">
                {validationError.newPassword._errors.join(", ")}
              </p>
            )}
          </div>

          <button
            type="submit"
            className="my-2 px-4 py-2 text-center w-full inline-block text-white bg-blue-600 border border-transparent rounded-xl hover:bg-blue-700"
            disabled={loading ? true : false}
          >
            {loading ? "Actualizando..." : "Actualizar"}
          </button>
        </form>
      </div>
    </>
  );
};

export default UpdatePassword;
