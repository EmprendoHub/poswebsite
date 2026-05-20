"use client";
import React from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import AnimationWrapper from "@/components/motions/AnimationWrapper";
import ProductCard from "@/app/(home)/producto/_components/ProductCard";
import { formatDate } from "@/backend/helpers";

const ViewPostDetails = ({
  post,
  trendingProducts,
}: {
  post: any;
  trendingProducts: any;
}) => {
  return (
    <div className="flex flex-row maxmd:flex-col-reverse items-start justify-center w-full gap-x-10 p-5 mt-10">
      <aside className="sticky top-20 z-[50] min-h-full w-[450px] flex flex-col items-center justify-center">
        <div className="w-full mx-auto ">
          <p className="text-xl py-1 mb-2">{"Productos destacados"}</p>
          <div className="w-full relative ">
            {trendingProducts?.map((product: any, index: number) => (
              <ProductCard key={product._id} item={product} index={index} />
            ))}
          </div>
        </div>
      </aside>
      <main className="flex flex-col items-center w-full">
        <div className="w-full">
          {/* Blog Header */}
          <span className="mx-auto max-w-[1200px] w-full flex flex-row items-center justify-between mb-10">
            <div className="max-md:hidden text-foreground line-clamp-1 flex w-full  font-EB_Garamond leading-loose">
              <div className=" text-5xl flex flex-row items-center gap-1 w-full">
                {post?.mainTitle}
              </div>
            </div>
          </span>

          <AnimationWrapper>
            <section>
              <div className="mx-auto max-w-[1200px] w-full">
                {/* Section 1 - Title, Image */}
                <div className="relative aspect-video bg-background border-2 border-muted ">
                  <Image
                    alt={post?.sectionTwoTitle}
                    src={post?.mainImage}
                    width={1280}
                    height={1280}
                    className="w-full h-full object-cover z-20"
                  />
                  <div className="flex flex-row items-center justify-between text-muted text-[12px] py-1 px-1">
                    <p>Publicada el {formatDate(post?.createdAt)}</p>
                    <p>Categoría: {post?.category}</p>
                  </div>
                </div>
                <div className="content">
                  <div className="flex flex-col maxsm:flex-col items-center gap-x-2 mt-5 ">
                    {/* Section 2 - Title, 2 Paragraphs */}
                    <div className="my-5 w-full">
                      <div className="mb-4 w-full">
                        <div className=" text-4xl flex flex-row items-center gap-1 w-full">
                          {post?.sectionTwoTitle}
                        </div>
                      </div>

                      <div className=" text-base flex flex-row items-center gap-1 w-full mb-5">
                        {post?.sectionTwoParagraphOne}
                      </div>
                      <div className=" text-base flex flex-row items-center gap-1 w-full mb-5">
                        {post?.sectionTwoParagraphTwo}
                      </div>
                    </div>
                    {/* Section 3 - Image | Title, Description / 1 Paragraph */}
                    {post?.sectionThreeTitle && (
                      <div className="w-full">
                        <div className="my-5 w-full flex flex-row items-center gap-5">
                          <div className=" w-full h-80 relative  my-2 ">
                            <Image
                              className=" object-cover"
                              src={post?.sectionThreeImage}
                              fill={true}
                              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                              alt="section Two Image"
                            />
                          </div>
                          <div className="w-full">
                            <div className=" text-4xl flex flex-row items-center gap-1 w-full mb-3">
                              {post?.sectionThreeTitle}
                            </div>
                            <div className=" text-base flex flex-row items-center gap-1 w-full">
                              {post?.sectionThreeParagraphOne}
                            </div>
                          </div>
                        </div>
                        <div className="mb-5 w-full">
                          <div className=" text-base flex flex-row items-center gap-1 w-full mb-5">
                            {post?.sectionThreeParagraphFooter}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Section 4 - Title, 3 options, paragraph | Image / 1 Paragraph */}
                    {post?.sectionFourTitle && (
                      <div className="w-full">
                        <div className="w-full flex flex-row items-center gap-5">
                          <div className="w-full">
                            <div className=" text-4xl flex flex-row items-center gap-1 w-full mb-3">
                              {post?.sectionFourTitle}
                            </div>
                            <ol className="mb-3">
                              <li className="flex flex-row items-center justify-start mb-3">
                                <p className="w-[25px]">1.-</p>
                                <div>{post?.sectionFourOptionOne}</div>
                              </li>
                              <li className="flex flex-row items-center justify-start mb-3">
                                <p className="w-[25px]">2.-</p>
                                <div>{post?.sectionFourOptionTwo}</div>
                              </li>
                              <li className="flex flex-row items-center justify-start mb-3">
                                <p className="w-[25px]">3.-</p>
                                <div>{post?.sectionFourOptionThree}</div>
                              </li>
                            </ol>
                            <div className=" text-base flex flex-row items-center gap-1 w-full">
                              {post?.sectionFourParagraphOne}
                            </div>
                          </div>
                          <div className=" w-full h-80 relative  my-2 ">
                            <Image
                              className=" object-cover"
                              src={post?.sectionFourImage}
                              fill={true}
                              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                              alt="imagen de producto"
                            />
                          </div>
                        </div>
                        <div className="mb-5 w-full">
                          <div className=" text-base flex flex-row items-center gap-1 w-full mb-5">
                            {post?.sectionFourParagraphFooter}
                          </div>
                        </div>
                      </div>
                    )}
                    {/* Section 5 - Title, Image, 2 Paragraph */}
                    {post?.sectionFiveTitle && (
                      <div className="w-full my-10">
                        <div className="mb-4 w-full">
                          <div className=" text-4xl flex flex-row items-center gap-1 w-full">
                            {post?.sectionFiveTitle}
                          </div>
                          <div className="items-center justify-center">
                            <div className=" w-full h-80 relative  my-2 ">
                              <Image
                                className=" object-cover"
                                src={post?.sectionFiveImage}
                                fill={true}
                                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                alt="imagen de blog"
                              />
                            </div>
                          </div>
                        </div>

                        <div className=" text-base flex flex-row items-center gap-1 w-full">
                          {post?.sectionFiveParagraphOne}
                        </div>
                        <div className=" text-base flex flex-row items-center gap-1 w-full my-5">
                          {post?.sectionFiveParagraphTwo}
                        </div>
                      </div>
                    )}
                    {/* Section 6 - 3 Columns with title, image, paragraph / 1 Paragraph  */}
                    {post?.sectionSixTitle && (
                      <div className="w-full my-10">
                        <div className="w-full mb-5 flex flex-row maxsm:flex-col items-center gap-7">
                          {/* Col 1 */}
                          <div className="flex flex-col gap-3 items-center justify-center w-full my-2 ">
                            <div className=" text-2xl w-full mb-3 text-center">
                              {post?.sectionSixColOneTitle}
                            </div>

                            <Image
                              className=" object-cover h-40"
                              src={post?.sectionSixColOneImage}
                              width={500}
                              height={500}
                              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                              alt="imagen de producto"
                            />
                            <div className=" text-base text-center w-full">
                              {post?.sectionSixColOneParagraph}
                            </div>
                          </div>
                          {/* Col 2 */}
                          <div className="flex flex-col gap-3 items-center justify-center w-full my-2 ">
                            <div className=" text-2xl w-full mb-3 text-center">
                              {post?.sectionSixColTwoTitle}
                            </div>

                            <Image
                              className=" object-cover h-40"
                              src={post?.sectionSixColTwoImage}
                              width={500}
                              height={500}
                              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                              alt="imagen de blog"
                            />
                            <div className=" text-base text-center w-full">
                              {post?.sectionSixColTwoParagraph}
                            </div>
                          </div>
                          {/* Col 3 */}
                          <div className="flex flex-col gap-3 items-center justify-center w-full my-2 ">
                            <div className=" text-2xl w-full mb-3 text-center">
                              {post?.sectionSixColThreeTitle}
                            </div>

                            <Image
                              className=" object-cover h-40"
                              src={post?.sectionSixColThreeImage}
                              width={500}
                              height={500}
                              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                              alt="imagen de blog"
                            />

                            <div className=" text-base text-center w-full">
                              {post?.sectionSixColThreeParagraph}
                            </div>
                          </div>
                        </div>
                        <div className="mb-5 w-full">
                          <div className=" text-base flex flex-row items-center gap-1 w-full mb-5">
                            {post?.sectionSixColOneParagraphFooter}
                          </div>
                        </div>
                      </div>
                    )}
                    {/* Section 7 - Overlay image title, 1 Paragraph */}
                    {post?.sectionSevenTitle && (
                      <div className="w-full">
                        <div className=" w-full h-80 relative  my-5 ">
                          <div className=" text-6xl flex flex-row items-center gap-1 w-full mb-3 absolute z-20 top-[40%] left-1/3 text-white text-center bg-transparent">
                            {post?.sectionSevenTitle}
                          </div>

                          <Image
                            className=" object-cover"
                            src={post?.sectionSevenImage}
                            fill={true}
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                            alt="imagen de producto"
                          />
                          {/* overlay */}
                          <div className="min-h-[100%] absolute z-[1] min-w-[100%] top-0 left-0 bg-black bg-opacity-30" />
                        </div>
                        <div className=" text-base flex flex-row items-center gap-1 w-full mb-5">
                          {post?.sectionSevenParagraph}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>
          </AnimationWrapper>
        </div>
      </main>
    </div>
  );
};

export default ViewPostDetails;
