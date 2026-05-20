"use client";
import { increaseLoginAttempts } from "@/redux/shoppingSlice";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CiWarning } from "react-icons/ci";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";

const ErrorComponent = ({
  ifEmailNotVerified,
  ifLoginError,
  ifExceededAttempts,
  ifBotLoginAttempt,
  ifNoCookieLoginError,
}: {
  ifEmailNotVerified: boolean;
  ifLoginError: boolean;
  ifExceededAttempts: boolean;
  ifBotLoginAttempt: boolean;
  ifNoCookieLoginError: boolean;
}) => {
  const { loginAttempts } = useSelector((state: any) => state?.compras);
  const router = useRouter();
  const dispatch = useDispatch();

  return (
    <main className="flex min-h-screen maxsm:min-h-[70vh] flex-col items-center justify-center ">
      <div className="h-screen flex flex-col items-center justify-center">
        <br />
        {ifEmailNotVerified && (
          <div>
            <div>Por favor verifica tu email</div>
            <div className="mt-3">
              <Link href={"/exito"} className="bg-black text-white p-3">
                Reenviar Correo de Verificación.
              </Link>
            </div>
          </div>
        )}
        {ifLoginError && (
          <div>
            <div>Hubo un error al iniciar sesión</div>
            <p>
              Si estas seguro que tu correo y contraseña son correcto por favor
              vuelve a intentarlo.
            </p>
            <div className="mt-3">
              <button
                onClick={() =>
                  toast(`${loginAttempts + 1}... de 5 intentes remanentes`) &&
                  dispatch(increaseLoginAttempts({ count: 1 })) &&
                  router.push("/iniciar")
                }
                className="bg-black text-white p-3"
              >
                Inicio de Session
              </button>
            </div>
          </div>
        )}
        {ifBotLoginAttempt && (
          <div>
            <div>Hubo un error al iniciar sesión</div>
            <p>Eres un bot malicioso y hemos bloqueado tu ip.</p>
            <div className="mt-3"></div>
          </div>
        )}
        {ifNoCookieLoginError && (
          <div>
            <div>Hubo un error al iniciar sesión</div>
            <p>Estas intentando un llamado desde un sitio no autorizado.</p>
            <div className="mt-3"></div>
          </div>
        )}
        {ifExceededAttempts && (
          <div className=" flex flex-col items-center justify-center gap-5">
            <CiWarning className="text-7xl text-red-500" />
            <div>Excediste el limite de intentos!</div>
            <p>Por seguridad bloqueamos tu cuenta</p>
            <p>Para desbloquear tu cuenta por favor verifica tu email.</p>
            <div className="mt-3">
              <Link href={"/reiniciar"} className="bg-black text-white p-3">
                Reactivar Cuenta
              </Link>
            </div>
          </div>
        )}
      </div>
    </main>
  );
};

export default ErrorComponent;
