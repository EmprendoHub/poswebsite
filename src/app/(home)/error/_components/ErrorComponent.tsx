"use client";
import { increaseLoginAttempts } from "@/redux/shoppingSlice";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  MdErrorOutline,
  MdMarkEmailUnread,
  MdBlock,
  MdLockClock,
} from "react-icons/md";
import { FaRobot } from "react-icons/fa6";
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
    <main className="min-h-screen flex items-center justify-center bg-background px-4 py-16">
      <div className="w-full max-w-md rounded-2xl border border-muted bg-card shadow-lg p-8 text-center flex flex-col items-center">
        {ifEmailNotVerified && (
          <>
            <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mb-5">
              <MdMarkEmailUnread className="text-4xl text-amber-500" />
            </div>
            <h1 className="font-EB_Garamond text-3xl font-bold mb-2">
              Verifica tu email
            </h1>
            <p className="text-sm text-muted-foreground mb-6">
              Por favor verifica tu correo electrónico para continuar.
            </p>
            <Link
              href={"/exito"}
              className="bg-primary text-primary-foreground rounded-full px-8 py-3 text-sm font-semibold hover:opacity-90 transition"
            >
              Reenviar Correo de Verificación
            </Link>
          </>
        )}

        {ifLoginError && (
          <>
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-5">
              <MdErrorOutline className="text-4xl text-destructive" />
            </div>
            <h1 className="font-EB_Garamond text-3xl font-bold mb-2">
              Error al iniciar sesión
            </h1>
            <p className="text-sm text-muted-foreground mb-6">
              Si estás seguro que tu correo y contraseña son correctos, por
              favor vuelve a intentarlo.
            </p>
            <button
              onClick={() => {
                toast(`${loginAttempts + 1}... de 5 intentos remanentes`);
                dispatch(increaseLoginAttempts({ count: 1 }));
                router.push("/iniciar");
              }}
              className="bg-primary text-primary-foreground rounded-full px-8 py-3 text-sm font-semibold hover:opacity-90 transition"
            >
              Iniciar Sesión
            </button>
          </>
        )}

        {ifBotLoginAttempt && (
          <>
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-5">
              <FaRobot className="text-4xl text-destructive" />
            </div>
            <h1 className="font-EB_Garamond text-3xl font-bold mb-2">
              Error al iniciar sesión
            </h1>
            <p className="text-sm text-muted-foreground">
              Detectamos actividad sospechosa y hemos bloqueado tu IP.
            </p>
          </>
        )}

        {ifNoCookieLoginError && (
          <>
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-5">
              <MdBlock className="text-4xl text-destructive" />
            </div>
            <h1 className="font-EB_Garamond text-3xl font-bold mb-2">
              Error al iniciar sesión
            </h1>
            <p className="text-sm text-muted-foreground">
              Estás intentando un llamado desde un sitio no autorizado.
            </p>
          </>
        )}

        {ifExceededAttempts && (
          <>
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-5">
              <MdLockClock className="text-4xl text-destructive" />
            </div>
            <h1 className="font-EB_Garamond text-3xl font-bold mb-2">
              Excediste el límite de intentos
            </h1>
            <p className="text-sm text-muted-foreground mb-1">
              Por seguridad bloqueamos tu cuenta.
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              Para desbloquear tu cuenta por favor verifica tu email.
            </p>
            <Link
              href={"/reiniciar"}
              className="bg-primary text-primary-foreground rounded-full px-8 py-3 text-sm font-semibold hover:opacity-90 transition"
            >
              Reactivar Cuenta
            </Link>
          </>
        )}
      </div>
    </main>
  );
};

export default ErrorComponent;
