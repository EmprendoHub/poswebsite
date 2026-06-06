import Image from "next/image";
import Link from "next/link";
import React from "react";
import { MdPlace, MdPhone, MdEmail } from "react-icons/md";

const SectionFourComponent = () => {
  return (
    <div className="bg-zinc-950 border-y border-white/10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-16 grid grid-cols-2 maxmd:grid-cols-1 items-stretch gap-0">
        {/* Image side */}
        <div className="relative min-h-[320px] maxmd:min-h-[220px] overflow-hidden rounded-tl-2xl rounded-bl-2xl maxmd:rounded-t-2xl maxmd:rounded-bl-none">
          <Image
            src="/images/CentroMagno.webp"
            fill
            alt="Super Collectibles - Centro Magno"
            className="object-cover"
          />
          {/* play overlay */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/50 transition">
            <div className="rounded-full border-2 border-white/80 bg-white/20 backdrop-blur p-4">
              <Image
                src="/images/play_video_icon.png"
                width={32}
                height={32}
                alt="play"
              />
            </div>
          </div>
        </div>

        {/* Info side */}
        <div className="bg-zinc-900 rounded-tr-2xl rounded-br-2xl maxmd:rounded-b-2xl maxmd:rounded-tr-none p-10 maxmd:p-6 flex flex-col justify-center gap-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-1">
              Información de
            </p>
            <h2 className="text-3xl font-bold text-white">Contacto</h2>
          </div>

          <ul className="space-y-4">
            <li className="flex items-start gap-3">
              <MdPlace
                size={20}
                className="text-primary mt-0.5 flex-shrink-0"
              />
              <div>
                <p className="text-sm font-semibold text-white">Centro Magno</p>
                <p className="text-xs text-zinc-400">
                  Av. Ignacio L Vallarta 2425, Arcos Vallarta, 44130
                  Guadalajara, Jal.
                </p>
              </div>
            </li>
            <li className="flex items-center gap-3">
              <MdPhone size={18} className="text-primary flex-shrink-0" />
              <a
                href="tel:3328123760"
                className="text-sm text-zinc-300 hover:text-white transition"
              >
                332-812-3760
              </a>
            </li>
            <li className="flex items-center gap-3">
              <MdEmail size={18} className="text-primary flex-shrink-0" />
              <a
                href="mailto:supercollectiblesc12@gmail.com"
                className="text-sm text-zinc-300 hover:text-white transition"
              >
                supercollectiblesc12@gmail.com
              </a>
            </li>
          </ul>

          <Link
            href="/contacto"
            className="self-start rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90 transition"
          >
            Contactar
          </Link>
        </div>
      </div>
    </div>
  );
};

export default SectionFourComponent;
