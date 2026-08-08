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
import { setUserId } from "@/lib/analytics";

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
      // Track user ID when authenticated
      if (session?.data?.user?._id) {
        setUserId(session.data.user._id);
      }
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
    <main className="flex min-h-screen">
      {loginAttempts > 30 ? (
        <div className="flex items-center justify-center w-full text-center p-8">
          <p className="text-lg font-semibold text-red-600">
            Excediste el límite de inicios de sesión.
          </p>
        </div>
      ) : (
        <div className="flex w-full min-h-screen">
          {/* ── Left panel: cover image ── */}
          <div className="hidden lg:block lg:w-1/2 relative overflow-hidden">
            <Image
              alt="Super Collectibles Mx"
              src="/covers/mobile_jordan_cover_image.webp"
              fill
              sizes="50vw"
              className="object-cover object-right"
              quality={100}
              priority
            />
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-tr from-black/70 via-black/30 to-transparent" />
            {/* Tagline */}
            <div className="absolute bottom-12 left-10 right-10">
              <p className="text-white/90 text-sm font-medium tracking-widest uppercase mb-2">
                Super Collectibles Mx
              </p>
              <p className="text-white text-3xl font-bold leading-tight">
                Tu tienda de
                <br />
                coleccionables.
              </p>
            </div>
          </div>

          {/* ── Right panel: form ── */}
          <div className="w-full lg:w-1/2 flex flex-col items-center justify-center min-h-screen bg-background px-8 sm:px-16 xl:px-24">
            <div className="w-full max-w-sm">
              {/* Logo */}
              <div className="flex justify-center mb-8">
                <WhiteLogoComponent className="w-[140px]" />
              </div>

              {/* Heading */}
              <h1 className="text-2xl font-bold text-foreground mb-1">
                Bienvenido de nuevo
              </h1>
              <p className="text-sm text-muted-foreground mb-8">
                Inicia sesión para continuar.
              </p>

              {/* Google button */}
              <button
                type="button"
                onClick={() => signIn("google")}
                className="w-full flex items-center justify-center gap-3 border border-border rounded-xl px-4 py-3 text-sm font-medium text-foreground hover:bg-muted transition-colors mb-6"
              >
                <IoLogoGoogle size={18} />
                Continuar con Google
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3 mb-6">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground">o</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                {/* Honeypot (hidden) */}
                <input
                  hidden
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  onChange={(e) => setHoneypot(e.target.value)}
                />

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Correo electrónico
                  </label>
                  <input
                    type="email"
                    autoComplete="email"
                    placeholder="nombre@correo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Contraseña
                    </label>
                    <Link
                      href="/reiniciar"
                      className="text-xs text-primary hover:underline"
                    >
                      ¿Olvidaste tu contraseña?
                    </Link>
                  </div>
                  <input
                    type="password"
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-primary hover:opacity-90 text-primary-foreground font-semibold rounded-xl py-3 text-sm transition-opacity mt-2"
                >
                  Iniciar sesión
                </button>
              </form>

              {/* Register link */}
              <p className="text-center text-sm text-muted-foreground mt-6">
                ¿Aún no tienes cuenta?{" "}
                <Link
                  href="/registro"
                  className="text-primary font-semibold hover:underline"
                >
                  Regístrate aquí
                </Link>
              </p>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default LoginComponent;
