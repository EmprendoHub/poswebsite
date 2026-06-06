"use client";
import React from "react";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import Image from "next/image";
import { testimonials } from "@/constants/testimoniolsdata";
import { Star } from "lucide-react";

const TestimonialComponent = () => {
  const settings = {
    className: "center mx-auto flex ",
    dots: true,
    centerMode: true,
    infinite: true,
    centerPadding: "1px",
    slidesToShow: 3,
    slidesToScroll: 1,
    autoplay: true,
    speed: 1000,
    autoplaySpeed: 5000,
    arrows: false,
    responsive: [
      {
        breakpoint: 1150,
        settings: {
          slidesToShow: 3,
          slidesToScroll: 1,
        },
      },
      {
        breakpoint: 768,
        settings: {
          slidesToShow: 1,
          slidesToScroll: 1,
        },
      },
      {
        breakpoint: 480,
        settings: {
          centerPadding: "10px",
          slidesToShow: 1,
          slidesToScroll: 1,
        },
      },
    ],
  };
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6">
      {/* Header */}
      <div className="text-center mb-10">
        <span className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
          Reseñas
        </span>
        <h2 className="mt-2 text-3xl font-bold text-white tracking-tight">
          Lo que dicen nuestros clientes
        </h2>
        <p className="mt-2 text-sm text-zinc-400">
          Nos enorgullece haber ayudado a cada uno de ellos a crecer su
          colección.
        </p>
      </div>

      <Slider {...settings}>
        {testimonials.map((testimonial, index) => (
          <div key={index} className="px-2 pb-8">
            <div className="relative flex flex-col gap-4 p-6 rounded-2xl bg-zinc-900 border border-white/10 h-[320px] overflow-hidden">
              {/* Quote mark */}
              <span className="absolute top-3 right-4 text-7xl font-serif text-white/8 leading-none select-none">
                ❞
              </span>

              {/* Stars */}
              <div className="flex items-center gap-1">
                {Array.from({ length: testimonial.rating }).map((_, i) => (
                  <Star
                    key={i}
                    size={14}
                    className="fill-yellow-400 text-yellow-400"
                  />
                ))}
                <span className="ml-1 text-xs font-semibold text-zinc-300">
                  {testimonial.rating}.0
                </span>
              </div>

              {/* Message */}
              <p className="text-xs text-zinc-400 leading-relaxed flex-1 line-clamp-6">
                {testimonial.message}
              </p>

              {/* Author */}
              <div className="flex items-center gap-3 pt-2 border-t border-white/10">
                <Image
                  width={36}
                  height={36}
                  quality={90}
                  className="rounded-full w-9 h-9 object-cover ring-2 ring-white/10"
                  alt="avatar"
                  src={testimonial.image}
                />
                <div>
                  <p className="text-xs font-semibold text-white">
                    {testimonial.name}
                  </p>
                  <p className="text-[11px] text-zinc-500">
                    {testimonial.position}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </Slider>
    </div>
  );
};

export default TestimonialComponent;
