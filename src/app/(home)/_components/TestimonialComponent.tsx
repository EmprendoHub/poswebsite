"use client";
import React from "react";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import Image from "next/image";
import { testimonials } from "@/constants/testimoniolsdata";
import { Star } from "lucide-react";
import SectionTextColorComponent from "@/components/texts/SectionTextColorComponent";

const TestimonialComponent = () => {
  const starRating = (props: any) => {
    const starArray = Array.from({ length: props }, (_, index) => (
      <span key={index} className="text-yellow-500">
        <Star />
      </span>
    ));
    return <>{starArray}</>;
  };

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
    <div className="testimonial-class my-10 maxmd:my-10 px-5">
      <SectionTextColorComponent
        className="mb-10 text-center"
        pretitle={"Que dicen nuestros clientes"}
        title={"Testimonios"}
        subtitle={
          "Nos enorgullese saber que pudimos ayudar a cada uno nuestros clientes."
        }
        btnText={""}
        btnUrl={""}
      />
      <Slider {...settings} className="">
        {testimonials.map((testimonial, index) => {
          return (
            <div key={index} className="px-2">
              <div className="p-5 flex flex-col relative top-[30.34px] drop-shadow-md rounded-lgi bg-nackground text-gray-500 w-[90%] maxmd:w-[100%] h-[380px] maxsm:max-h-[380px] text-dimgray-200">
                <div className="rate flex-row">
                  <div className="stars flex items-center gap-x-1">
                    {starRating(testimonial.rating)}
                    <span className="font-medium text-2xl">
                      {testimonial.rating}
                    </span>
                  </div>
                </div>
                <div className="max-w-full">
                  <p className="m-0 p-3 text-xs maxsm:text-xs leading-[118%] font-normal   flex">
                    {testimonial.message}
                  </p>
                </div>

                <div className="author flex flex-row pl-3 ">
                  <Image
                    width={60}
                    height={60}
                    quality={100}
                    className="flex flex-row mr-4 rounded-full w-8 h-8"
                    alt="avatar"
                    src={testimonial.image}
                  />
                  <div className="flex flex-col">
                    <div className="leading-[146%] text-[12px] font-medium  inline-block">
                      {testimonial.position}
                    </div>
                    <div className="leading-[123%] maxsm:text-xs maxmd:text-xs font-medium text-foreground inline-block ">
                      {testimonial.name}
                    </div>
                  </div>
                </div>
                <h2 className="m-0 absolute bottom-10 right-5 text-53xl leading-[68.5%] font-medium text-center inline-block w-[95.09px] h-[85.03px]">
                  <span className="font-poppins text-9xl opacity-25 text-blueLight">
                    ❞
                  </span>
                </h2>
              </div>
            </div>
          );
        })}
      </Slider>
    </div>
  );
};

export default TestimonialComponent;
