"use client";
import React, { useRef, useState } from "react";
import AnimationWrapper from "@/components/motions/AnimationWrapper";
import Image from "next/image";
import { cstDateTimeClient } from "@/backend/helpers";
import { updatePost } from "@/app/_actions";
import { useRouter } from "next/navigation";
import { ValidationError } from "@/types";

const BlogPublishedComponent = ({ post }: { post: any }) => {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const available_categories = [
    "Moda",
    "Estilo",
    "Tendencias",
    "Esenciales",
    "Salud",
  ];
  const [category, setCategory] = useState(post?.category);
  // Main section
  const [mainTitle, setMainTitle] = useState(post?.mainTitle);
  const [mainImage, setMainImage] = useState(post?.mainImage);
  // section 2
  const [sectionTwoTitle, setSectionTwoTitle] = useState(post?.sectionTwoTitle);
  const [sectionTwoParagraphOne, setSectionTwoParagraphOne] = useState(
    post?.sectionTwoParagraphOne
  );
  const [sectionTwoParagraphTwo, setSectionTwoParagraphTwo] = useState(
    post?.sectionTwoParagraphTwo
  );

  // section 3
  const [sectionThreeTitle, setSectionThreeTitle] = useState(
    post?.sectionThreeTitle
  );
  const [sectionThreeParagraphOne, setSectionThreeParagraphOne] = useState(
    post?.sectionThreeParagraphOne
  );
  const [sectionThreeImage, setSectionThreeImage] = useState(
    post?.sectionThreeImage
  );
  const [sectionThreeParagraphFooter, setSectionThreeParagraphFooter] =
    useState(post?.sectionThreeParagraphFooter);
  // section 4
  const [sectionFourTitle, setSectionFourTitle] = useState(
    post?.sectionFourTitle
  );
  const [sectionFourOptionOne, setSectionFourOptionOne] = useState(
    post?.sectionFourOptionOne
  );
  const [sectionFourOptionTwo, setSectionFourOptionTwo] = useState(
    post?.sectionFourOptionTwo
  );
  const [sectionFourOptionThree, setSectionFourOptionThree] = useState(
    post?.sectionFourOptionThree
  );
  const [sectionFourParagraphOne, setSectionFourParagraphOne] = useState(
    post?.sectionFourParagraphOne
  );
  const [sectionFourImage, setSectionFourImage] = useState(
    post?.sectionFourImage
  );
  const [sectionFourParagraphFooter, setSectionFourParagraphFooter] = useState(
    post?.sectionFourParagraphFooter
  );
  // section 5
  const [sectionFiveTitle, setSectionFiveTitle] = useState(
    post?.sectionFiveTitle
  );
  const [sectionFiveImage, setSectionFiveImage] = useState(
    post?.sectionFiveImage
  );
  const [sectionFiveParagraphOne, setSectionFiveParagraphOne] = useState(
    post?.sectionFiveParagraphOne
  );
  const [sectionFiveParagraphTwo, setSectionFiveParagraphTwo] = useState(
    post?.sectionFiveParagraphTwo
  );

  // section 6
  //col 1
  const [sectionSixColOneTitle, setSectionSixColOneTitle] = useState(
    post?.sectionSixColOneTitle
  );
  const [sectionSixColOneParagraph, setSectionSixColOneParagraph] = useState(
    post?.sectionSixColOneParagraph
  );
  const [sectionSixColOneImage, setSectionSixColOneImage] = useState(
    post?.sectionSixColOneImage
  );
  //col 2
  const [sectionSixColTwoTitle, setSectionSixColTwoTitle] = useState(
    post?.sectionSixColTwoTitle
  );
  const [sectionSixColTwoParagraph, setSectionSixColTwoParagraph] = useState(
    post?.sectionSixColTwoParagraph
  );
  const [sectionSixColTwoImage, setSectionSixColTwoImage] = useState(
    post?.sectionSixColTwoImage
  );
  //col 3
  const [sectionSixColThreeTitle, setSectionSixColThreeTitle] = useState(
    post?.sectionSixColThreeTitle
  );
  const [sectionSixColThreeParagraph, setSectionSixColThreeParagraph] =
    useState(post?.sectionSixColThreeParagraph);
  const [sectionSixColThreeImage, setSectionSixColThreeImage] = useState(
    post?.sectionSixColThreeImage
  );
  // footer
  const [sectionSixColOneParagraphFooter, setSectionSixColOneParagraphFooter] =
    useState(post?.sectionSixColOneParagraphFooter);

  // section 7
  const [sectionSevenTitle, setSectionSevenTitle] = useState(
    post?.sectionSevenTitle
  );
  const [sectionSevenImage, setSectionSevenImage] = useState(
    post?.sectionSevenImage
  );
  const [sectionSevenParagraph, setSectionSevenParagraph] = useState(
    post?.sectionSevenParagraph
  );

  const [updatedAt, setUpdatedAt] = useState(
    cstDateTimeClient().toLocaleString()
  );
  const [validationError, setValidationError] =
    useState<ValidationError | null>(null);

  // functions
  const upload = async (e: any) => {
    // Get selected files from the input element.
    let files = e?.target.files;
    let section = e?.target.id;
    if (files) {
      for (var i = 0; i < files?.length; i++) {
        var file = files[i];
        // Retrieve a URL from our server.
        retrieveNewURL(file, (file: any, url: any) => {
          const parsed = JSON.parse(url);
          url = parsed.url;
          // Upload the file to the server.
          uploadFile(file, url, section);
        });
      }
    }
  };

  // generate a pre-signed URL for use in uploading that file:
  async function retrieveNewURL(file: any, cb: any) {
    const endpoint = `/api/minio`;
    fetch(endpoint, {
      method: "PUT",
      headers: {
        Name: file.name,
      },
    })
      .then((response) => {
        response.text().then((url) => {
          cb(file, url);
        });
      })
      .catch((e) => {
        console.error(e);
      });
  }

  // to upload this file to S3 at `https://minio.salvawebpro.com:9000` using the URL:
  async function uploadFile(file: any, url: any, section: any) {
    fetch(url, {
      method: "PUT",
      body: file,
    })
      .then(() => {
        // If multiple files are uploaded, append upload status on the next line.
        // document.querySelector(
        //   '#status'
        // ).innerHTML += `<br>Uploaded ${file.name}.`;
        const newUrl = url.split("?");
        if (section === "selector") {
          setMainImage(newUrl[0]);
        }
        if (section === "sectionThreeSelector") {
          setSectionThreeImage(newUrl[0]);
        }
        if (section === "sectionFourSelector") {
          setSectionFourImage(newUrl[0]);
        }
        if (section === "sectionFiveSelector") {
          setSectionFiveImage(newUrl[0]);
        }
        if (section === "sectionSixSelectorOne") {
          setSectionSixColOneImage(newUrl[0]);
        }
        if (section === "sectionSixSelectorTwo") {
          setSectionSixColTwoImage(newUrl[0]);
        }
        if (section === "sectionSixSelectorThree") {
          setSectionSixColThreeImage(newUrl[0]);
        }
        if (section === "sectionSevenSelector") {
          setSectionSevenImage(newUrl[0]);
        }
      })
      .catch((e) => {
        console.error(e);
      });
  }

  // send form
  async function action() {
    if (mainImage === "/images/blog_placeholder.jpeg") {
      const noFileError = {
        mainImage: { _errors: ["Se requiere una imagen Principal"] },
      };
      setValidationError(noFileError);
      return;
    }
    if (!mainTitle) {
      const noTitleError = {
        mainTitle: { _errors: ["Se requiere un titulo para el Blog"] },
      };
      setValidationError(noTitleError);
      return;
    }
    if (!category) {
      const noCategory = {
        category: {
          _errors: ["Se requiere un titulo para La section 1 el Blog"],
        },
      };
      setValidationError(noCategory);
      return;
    }

    const formData = new FormData();
    formData.append("category", category);
    formData.append("mainTitle", mainTitle);
    formData.append("mainImage", mainImage);
    formData.append("sectionTwoTitle", sectionTwoTitle);
    formData.append("sectionTwoParagraphOne", sectionTwoParagraphOne);
    formData.append("sectionTwoParagraphTwo", sectionTwoParagraphTwo);
    formData.append("sectionThreeTitle", sectionThreeTitle);
    formData.append("sectionThreeParagraphOne", sectionThreeParagraphOne);
    formData.append("sectionThreeImage", sectionThreeImage);
    formData.append("sectionThreeParagraphFooter", sectionThreeParagraphFooter);
    formData.append("sectionFourTitle", sectionFourTitle);
    formData.append("sectionFourOptionOne", sectionFourOptionOne);
    formData.append("sectionFourOptionTwo", sectionFourOptionTwo);
    formData.append("sectionFourOptionThree", sectionFourOptionThree);
    formData.append("sectionFourParagraphOne", sectionFourParagraphOne);
    formData.append("sectionFourImage", sectionFourImage);
    formData.append("sectionFourParagraphFooter", sectionFourParagraphFooter);
    formData.append("sectionFiveTitle", sectionFiveTitle);
    formData.append("sectionFiveImage", sectionFiveImage);
    formData.append("sectionFiveParagraphOne", sectionFiveParagraphOne);
    formData.append("sectionFiveParagraphTwo", sectionFiveParagraphTwo);
    formData.append("sectionSixColOneTitle", sectionSixColOneTitle);
    formData.append("sectionSixColOneParagraph", sectionSixColOneParagraph);
    formData.append("sectionSixColOneImage", sectionSixColOneImage);
    formData.append("sectionSixColTwoTitle", sectionSixColTwoTitle);
    formData.append("sectionSixColTwoParagraph", sectionSixColTwoParagraph);
    formData.append("sectionSixColTwoImage", sectionSixColTwoImage);
    formData.append("sectionSixColThreeTitle", sectionSixColThreeTitle);
    formData.append("sectionSixColThreeParagraph", sectionSixColThreeParagraph);
    formData.append("sectionSixColThreeImage", sectionSixColThreeImage);
    formData.append(
      "sectionSixColOneParagraphFooter",
      sectionSixColOneParagraphFooter
    );
    formData.append("sectionSevenTitle", sectionSevenTitle);
    formData.append("sectionSevenImage", sectionSevenImage);
    formData.append("sectionSevenParagraph", sectionSevenParagraph);
    formData.append("updatedAt", updatedAt);
    formData.append("_id", post?._id);
    // write to database using server actions
    const result: any = await updatePost(formData);
    if (result?.error) {
      setValidationError(result.error);
    } else {
      setValidationError(null);
      //reset the form
      formRef.current?.reset();
      router.push("/admin/blog");
    }
  }

  const handleCategoryChange = async (e: any) => {
    setCategory(e);
  };

  return (
    <div className="flex flex-col items-center ">
      <form action={action} ref={formRef} className="w-full">
        <div className="mx-auto max-w-[900px] w-full flex flex-row items-start justify-start mb-10 ">
          <div className="relative w-96">
            <select
              className="block appearance-none border border-gray-300 bg-background  py-2 px-3 focus:outline-none focus:border-gray-400 w-full"
              name="category"
              onChange={(e) => handleCategoryChange(e.target.value)}
            >
              {available_categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            {validationError?.category && (
              <p className="text-sm text-red-400">
                {validationError.category._errors.join(", ")}
              </p>
            )}
            <i className="absolute inset-y-0 right-0 p-2 text-gray-400">
              <svg
                width="22"
                height="22"
                className="fill-current"
                viewBox="0 0 20 20"
              >
                <path d="M7 10l5 5 5-5H7z"></path>
              </svg>
            </i>
          </div>
        </div>
        <nav className="mx-auto max-w-[900px] w-full flex flex-row items-center justify-between mb-10">
          <p className="max-md:hidden text-foreground line-clamp-1 flex w-full  font-EB_Garamond leading-loose">
            <input
              name="mainTitle"
              value={mainTitle}
              onChange={(e) => setMainTitle(e.target.value)}
              placeholder="NUEVO BLOG"
              className="font-bold font-EB_Garamond text-5xl flex flex-row items-center gap-1 w-full"
            />
            {validationError?.mainTitle && (
              <p className="text-sm text-red-400">
                {validationError.mainTitle._errors.join(", ")}
              </p>
            )}
          </p>
          <div className="flex items-center justify-end gap-4 ml-auto w-full">
            <button
              type="submit"
              className="bg-black rounded-full text-white px-6 py-2"
            >
              Publicar
            </button>
            <button
              type="submit"
              className="btn-dark rounded-full px-6 py-2 border border-gray-400"
            >
              Guardar Borrador
            </button>
          </div>
        </nav>

        <AnimationWrapper>
          <section>
            <div className="mx-auto max-w-[900px] w-full">
              {/* Section 1 - Title, Image */}
              <div className="relative aspect-video hover:opacity-80 bg-background border-4 border-gray-300">
                <label htmlFor="selector" className="cursor-pointer">
                  <Image
                    id="blogImage"
                    alt="blogBanner"
                    src={mainImage}
                    width={1280}
                    height={1280}
                    className="w-full h-full object-cover z-20"
                  />
                  <input
                    id="selector"
                    type="file"
                    accept=".png, .jpg, .jpeg, .webp"
                    hidden
                    onChange={upload}
                  />

                  {validationError?.mainImage && (
                    <p className="text-sm text-red-400">
                      {validationError.mainImage._errors.join(", ")}
                    </p>
                  )}
                </label>
              </div>
              <div id="textEditor">
                <div className="flex flex-col maxsm:flex-col items-center gap-x-2 mt-5 ">
                  {/* Section 2 - Title, 2 Paragraphs */}
                  <div className="my-5 w-full">
                    <div className="mb-4 w-full">
                      <input
                        name="sectionTwoTitle"
                        value={sectionTwoTitle}
                        onChange={(e) => setSectionTwoTitle(e.target.value)}
                        placeholder="Add your Title here"
                        className="font-bold font-EB_Garamond text-4xl flex flex-row items-center gap-1 w-full"
                      />

                      <div className="relative">
                        <i className="absolute inset-y-0 right-0 p-2 text-gray-400">
                          <svg
                            width="22"
                            height="22"
                            className="fill-current"
                            viewBox="0 0 20 20"
                          >
                            <path d="M7 10l5 5 5-5H7z"></path>
                          </svg>
                        </i>
                      </div>
                    </div>

                    <textarea
                      rows={4}
                      name="sectionTwoParagraphOne"
                      value={sectionTwoParagraphOne}
                      onChange={(e) =>
                        setSectionTwoParagraphOne(e.target.value)
                      }
                      placeholder="Lorem, ipsum dolor sit amet consectetur adipisicing elit. Eveniet atque ad totam ex velit, mollitia delectus expedita nisi magni, aliquam exercitationem assumenda est molestiae numquam? Animi minus in vel voluptates Lorem, ipsum dolor sit amet consectetur adipisicing elit. Eveniet atque ad totam ex velit, mollitia delectus expedita nisi magni, aliquam exercitationem assumenda est molestiae numquam? Animi minus in vel voluptates?"
                      className="font-bold font-EB_Garamond text-xl flex flex-row items-center gap-1 w-full mb-5"
                    />
                    <textarea
                      rows={4}
                      name="sectionTwoParagraphTwo"
                      value={sectionTwoParagraphTwo}
                      onChange={(e) =>
                        setSectionTwoParagraphTwo(e.target.value)
                      }
                      placeholder="Lorem, ipsum dolor sit amet consectetur adipisicing elit. Eveniet atque ad totam ex velit, mollitia delectus expedita nisi magni, aliquam exercitationem assumenda est molestiae numquam? Animi minus in vel voluptates Lorem, ipsum dolor sit amet consectetur adipisicing elit. Eveniet atque ad totam ex velit, mollitia delectus expedita nisi magni, aliquam exercitationem assumenda est molestiae numquam? Animi minus in vel voluptates?"
                      className="font-bold font-EB_Garamond text-xl flex flex-row items-center gap-1 w-full"
                    />
                  </div>
                  {/* Section 3 - Image | Title, Description / 1 Paragraph */}
                  <div className="w-full">
                    <div className="my-5 w-full flex flex-row items-center gap-5">
                      <div className=" w-full h-80 relative  my-2 ">
                        <label
                          htmlFor="sectionThreeSelector"
                          className="cursor-pointer"
                        >
                          <Image
                            className=" object-cover"
                            src={sectionThreeImage}
                            fill={true}
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                            id="sectionThreeImage"
                            alt="section Two Image"
                          />
                          <input
                            id="sectionThreeSelector"
                            type="file"
                            accept=".png, .jpg, .jpeg, .webp"
                            hidden
                            onChange={upload}
                          />
                        </label>
                      </div>
                      <div className="w-full">
                        <input
                          name="sectionThreeTitle"
                          value={sectionThreeTitle}
                          onChange={(e) => setSectionThreeTitle(e.target.value)}
                          placeholder="Add your Title here"
                          className="font-bold font-EB_Garamond text-4xl flex flex-row items-center gap-1 w-full mb-3"
                        />
                        <textarea
                          rows={8}
                          name="sectionThreeParagraphOne"
                          value={sectionThreeParagraphOne}
                          onChange={(e) =>
                            setSectionThreeParagraphOne(e.target.value)
                          }
                          placeholder="Lorem, ipsum dolor sit amet consectetur adipisicing elit. Eveniet atque ad totam ex velit, mollitia delectus expedita nisi magni, aliquam exercitationem assumenda est molestiae numquam? Animi minus in vel voluptates Lorem, ipsum dolor sit amet consectetur. assumenda est molestiae numquam? Animi minus in vel voluptates Lorem, ipsum dolor sit amet consectetur."
                          className="font-bold font-EB_Garamond text-xl flex flex-row items-center gap-1 w-full"
                        />
                      </div>
                    </div>
                    <div className="mb-5 w-full">
                      <div className="mb-4 w-full">
                        <div className="relative">
                          <i className="absolute inset-y-0 right-0 p-2 text-gray-400">
                            <svg
                              width="22"
                              height="22"
                              className="fill-current"
                              viewBox="0 0 20 20"
                            >
                              <path d="M7 10l5 5 5-5H7z"></path>
                            </svg>
                          </i>
                        </div>
                      </div>
                      <textarea
                        rows={4}
                        name="sectionThreeParagraphFooter"
                        value={sectionThreeParagraphFooter}
                        onChange={(e) =>
                          setSectionThreeParagraphFooter(e.target.value)
                        }
                        placeholder="Lorem, ipsum dolor sit amet consectetur adipisicing elit. Eveniet atque ad totam ex velit, mollitia delectus expedita nisi magni, aliquam exercitationem assumenda est molestiae numquam? Animi minus in vel voluptates Lorem, ipsum dolor sit amet consectetur adipisicing elit. Eveniet atque ad totam ex velit, mollitia delectus expedita nisi magni, aliquam exercitationem assumenda est molestiae numquam? Animi minus in vel voluptates?"
                        className="font-bold font-EB_Garamond text-xl flex flex-row items-center gap-1 w-full mb-5"
                      />
                    </div>
                  </div>

                  {/* Section 4 - Title, 3 options, paragraph | Image / 1 Paragraph */}
                  <div className="w-full">
                    <div className="w-full flex flex-row items-center gap-5">
                      <div className="w-full">
                        <input
                          name="sectionFourTitle"
                          value={sectionFourTitle}
                          onChange={(e) => setSectionFourTitle(e.target.value)}
                          placeholder="Add your Title here"
                          className="font-bold font-EB_Garamond text-4xl flex flex-row items-center gap-1 w-full mb-3"
                        />
                        <ol className="mb-3">
                          <li className="flex flex-row items-center mb-3">
                            <p className="w-2/12">1.-</p>
                            <input
                              name="sectionFourOptionOne"
                              value={sectionFourOptionOne}
                              onChange={(e) =>
                                setSectionFourOptionOne(e.target.value)
                              }
                              className="w-full"
                              type="text"
                              placeholder="Lorem ipsum dolor sit amet consectetur, adipisicing."
                            />
                          </li>
                          <li className="flex flex-row items-center mb-3">
                            <p className="w-2/12">2.-</p>
                            <input
                              name="sectionFourOptionTwo"
                              value={sectionFourOptionTwo}
                              onChange={(e) =>
                                setSectionFourOptionTwo(e.target.value)
                              }
                              className="w-full"
                              type="text"
                              placeholder="Lorem ipsum dolor sit amet consectetur, adipisicing."
                            />
                          </li>
                          <li className="flex flex-row items-center mb-3">
                            <p className="w-2/12">3.-</p>
                            <input
                              name="sectionFourOptionThree"
                              value={sectionFourOptionThree}
                              onChange={(e) =>
                                setSectionFourOptionThree(e.target.value)
                              }
                              className="w-full"
                              type="text"
                              placeholder="Lorem ipsum dolor sit amet consectetur, adipisicing."
                            />
                          </li>
                        </ol>
                        <textarea
                          rows={3}
                          name="sectionFourParagraphOne"
                          value={sectionFourParagraphOne}
                          onChange={(e) =>
                            setSectionFourParagraphOne(e.target.value)
                          }
                          placeholder="Lorem, ipsum dolor sit amet consectetur adipisicing elit. Eveniet atque ad totam ex velit, mollitia delectus expedita nisi magni, aliquam exercitationem assumenda. "
                          className="font-bold font-EB_Garamond text-xl flex flex-row items-center gap-1 w-full"
                        />
                      </div>
                      <div className=" w-full h-80 relative  my-2 ">
                        <label
                          htmlFor="sectionFourSelector"
                          className="cursor-pointer"
                        >
                          <Image
                            id="sectionFourImage"
                            className=" object-cover"
                            src={sectionFourImage}
                            fill={true}
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                            alt="imagen de producto"
                          />
                          <input
                            id="sectionFourSelector"
                            type="file"
                            accept=".png, .jpg, .jpeg, .webp"
                            hidden
                            onChange={upload}
                          />
                        </label>
                      </div>
                    </div>
                    <div className="mb-5 w-full">
                      <div className="mb-4 w-full">
                        <div className="relative">
                          <i className="absolute inset-y-0 right-0 p-2 text-gray-400">
                            <svg
                              width="22"
                              height="22"
                              className="fill-current"
                              viewBox="0 0 20 20"
                            >
                              <path d="M7 10l5 5 5-5H7z"></path>
                            </svg>
                          </i>
                        </div>
                      </div>
                      <textarea
                        rows={4}
                        name="sectionFourParagraphFooter"
                        value={sectionFourParagraphFooter}
                        onChange={(e) =>
                          setSectionFourParagraphFooter(e.target.value)
                        }
                        placeholder="Lorem, ipsum dolor sit amet consectetur adipisicing elit. Eveniet atque ad totam ex velit, mollitia delectus expedita nisi magni, aliquam exercitationem assumenda est molestiae numquam? Animi minus in vel voluptates Lorem, ipsum dolor sit amet consectetur adipisicing elit. Eveniet atque ad totam ex velit, mollitia delectus expedita nisi magni, aliquam exercitationem assumenda est molestiae numquam? Animi minus in vel voluptates?"
                        className="font-bold font-EB_Garamond text-xl flex flex-row items-center gap-1 w-full mb-5"
                      />
                    </div>
                  </div>
                  {/* Section 5 - Title, Image, 2 Paragraph */}
                  <div className="w-full">
                    <div className="mb-4 w-full">
                      <input
                        name="sectionFiveTitle"
                        value={sectionFiveTitle}
                        onChange={(e) => setSectionFiveTitle(e.target.value)}
                        placeholder="Add your Title here"
                        className="font-bold font-EB_Garamond text-4xl flex flex-row items-center gap-1 w-full"
                      />
                      <div className="items-center justify-center">
                        <div className=" w-full h-80 relative  my-2 ">
                          <label
                            htmlFor="sectionFiveSelector"
                            className="cursor-pointer"
                          >
                            <Image
                              id="sectionFiveImage"
                              className=" object-cover"
                              src={sectionFiveImage}
                              fill={true}
                              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                              alt="imagen de blog"
                            />
                            <input
                              id="sectionFiveSelector"
                              type="file"
                              accept=".png, .jpg, .jpeg, .webp"
                              hidden
                              onChange={upload}
                            />
                          </label>
                        </div>
                      </div>

                      <div className="relative">
                        <i className="absolute inset-y-0 right-0 p-2 text-gray-400">
                          <svg
                            width="22"
                            height="22"
                            className="fill-current"
                            viewBox="0 0 20 20"
                          >
                            <path d="M7 10l5 5 5-5H7z"></path>
                          </svg>
                        </i>
                      </div>
                    </div>

                    <textarea
                      rows={4}
                      name="sectionFiveParagraphOne"
                      value={sectionFiveParagraphOne}
                      onChange={(e) =>
                        setSectionFiveParagraphOne(e.target.value)
                      }
                      placeholder="Lorem, ipsum dolor sit amet consectetur adipisicing elit. Eveniet atque ad totam ex velit, mollitia delectus expedita nisi magni, aliquam exercitationem assumenda est molestiae numquam? Animi minus in vel voluptates Lorem, ipsum dolor sit amet consectetur adipisicing elit. Eveniet atque ad totam ex velit, mollitia delectus expedita nisi magni, aliquam exercitationem assumenda est molestiae numquam? Animi minus in vel voluptates?"
                      className="font-bold font-EB_Garamond text-xl flex flex-row items-center gap-1 w-full"
                    />
                    <textarea
                      rows={4}
                      name="sectionFiveParagraphTwo"
                      value={sectionFiveParagraphTwo}
                      onChange={(e) =>
                        setSectionFiveParagraphTwo(e.target.value)
                      }
                      placeholder="Lorem, ipsum dolor sit amet consectetur adipisicing elit. Eveniet atque ad totam ex velit, mollitia delectus expedita nisi magni, aliquam exercitationem assumenda est molestiae numquam? Animi minus in vel voluptates Lorem, ipsum dolor sit amet consectetur adipisicing elit. Eveniet atque ad totam ex velit, mollitia delectus expedita nisi magni, aliquam exercitationem assumenda est molestiae numquam? Animi minus in vel voluptates?"
                      className="font-bold font-EB_Garamond text-xl flex flex-row items-center gap-1 w-full my-5"
                    />
                  </div>
                  {/* Section 6 - 3 Columns with title, image, paragraph / 1 Paragraph  */}
                  <div className="w-full">
                    <div className="w-full flex flex-row maxsm:flex-col items-center gap-7">
                      {/* Col 1 */}
                      <div className="flex flex-col gap-3 items-center justify-center w-full my-2 ">
                        <input
                          name="sectionSixColOneTitle"
                          value={sectionSixColOneTitle}
                          onChange={(e) =>
                            setSectionSixColOneTitle(e.target.value)
                          }
                          placeholder="Add your Title here"
                          className="font-bold font-EB_Garamond text-2xl flex flex-row items-center gap-1 w-full mb-3 text-center"
                        />

                        <label
                          htmlFor="sectionSixSelectorOne"
                          className="cursor-pointer"
                        >
                          <Image
                            id="sectionSixColOneImage"
                            className=" object-cover h-40"
                            src={sectionSixColOneImage}
                            width={500}
                            height={500}
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                            alt="imagen de producto"
                          />
                          <input
                            id="sectionSixSelectorOne"
                            type="file"
                            accept=".png, .jpg, .jpeg, .webp"
                            hidden
                            onChange={upload}
                          />
                        </label>

                        <textarea
                          rows={5}
                          name="sectionSixColOneParagraph"
                          value={sectionSixColOneParagraph}
                          onChange={(e) =>
                            setSectionSixColOneParagraph(e.target.value)
                          }
                          placeholder="Lorem, ipsum dolor sit amet consectetur adipisicing elit. Eveniet atque ad totam ex velit, mollitia delectus expedita nisi magni, aliquam exercitationem."
                          className="font-bold font-EB_Garamond text-xl flex flex-row items-center gap-1 w-full"
                        />
                      </div>
                      {/* Col 2 */}
                      <div className="flex flex-col gap-3 items-center justify-center w-full my-2 ">
                        <input
                          name="sectionSixColTwoTitle"
                          value={sectionSixColTwoTitle}
                          onChange={(e) =>
                            setSectionSixColTwoTitle(e.target.value)
                          }
                          placeholder="Add your Title here"
                          className="font-bold font-EB_Garamond text-2xl flex flex-row items-center gap-1 w-full mb-3 text-center"
                        />

                        <label
                          htmlFor="sectionSixSelectorTwo"
                          className="cursor-pointer"
                        >
                          <Image
                            id="sectionSixColTwoImage"
                            className=" object-cover h-40"
                            src={sectionSixColTwoImage}
                            width={500}
                            height={500}
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                            alt="imagen de blog"
                          />
                          <input
                            id="sectionSixSelectorTwo"
                            type="file"
                            accept=".png, .jpg, .jpeg, .webp"
                            hidden
                            onChange={upload}
                          />
                        </label>

                        <textarea
                          rows={5}
                          name="sectionSixColTwoParagraph"
                          value={sectionSixColTwoParagraph}
                          onChange={(e) =>
                            setSectionSixColTwoParagraph(e.target.value)
                          }
                          placeholder="Lorem, ipsum dolor sit amet consectetur adipisicing elit. Eveniet atque ad totam ex velit, mollitia delectus expedita nisi magni, aliquam exercitationem."
                          className="font-bold font-EB_Garamond text-xl flex flex-row items-center gap-1 w-full"
                        />
                      </div>
                      {/* Col 3 */}
                      <div className="flex flex-col gap-3 items-center justify-center w-full my-2 ">
                        <input
                          name="sectionSixColThreeTitle"
                          value={sectionSixColThreeTitle}
                          onChange={(e) =>
                            setSectionSixColThreeTitle(e.target.value)
                          }
                          placeholder="Add your Title here"
                          className="font-bold font-EB_Garamond text-2xl flex flex-row items-center gap-1 w-full mb-3 text-center"
                        />
                        <label
                          htmlFor="sectionSixSelectorThree"
                          className="cursor-pointer"
                        >
                          <Image
                            id="sectionSixColThreeImage"
                            className=" object-cover h-40"
                            src={sectionSixColThreeImage}
                            width={500}
                            height={500}
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                            alt="imagen de blog"
                          />

                          <input
                            id="sectionSixSelectorThree"
                            type="file"
                            accept=".png, .jpg, .jpeg, .webp"
                            hidden
                            onChange={upload}
                          />
                        </label>

                        <textarea
                          rows={5}
                          name="sectionSixColThreeParagraph"
                          value={sectionSixColThreeParagraph}
                          onChange={(e) =>
                            setSectionSixColThreeParagraph(e.target.value)
                          }
                          placeholder="Lorem, ipsum dolor sit amet consectetur adipisicing elit. Eveniet atque ad totam ex velit, mollitia delectus expedita nisi magni, aliquam exercitationem. "
                          className="font-bold font-EB_Garamond text-xl flex flex-row items-center gap-1 w-full"
                        />
                      </div>
                    </div>
                    <div className="mb-5 w-full">
                      <div className="mb-4 w-full">
                        <div className="relative">
                          <i className="absolute inset-y-0 right-0 p-2 text-gray-400">
                            <svg
                              width="22"
                              height="22"
                              className="fill-current"
                              viewBox="0 0 20 20"
                            >
                              <path d="M7 10l5 5 5-5H7z"></path>
                            </svg>
                          </i>
                        </div>
                      </div>
                      <textarea
                        rows={4}
                        name="sectionSixColOneParagraphFooter"
                        value={sectionSixColOneParagraphFooter}
                        onChange={(e) =>
                          setSectionSixColOneParagraphFooter(e.target.value)
                        }
                        placeholder="Lorem, ipsum dolor sit amet consectetur adipisicing elit. Eveniet atque ad totam ex velit, mollitia delectus expedita nisi magni, aliquam exercitationem assumenda est molestiae numquam? Animi minus in vel voluptates Lorem, ipsum dolor sit amet consectetur adipisicing elit. Eveniet atque ad totam ex velit, mollitia delectus expedita nisi magni, aliquam exercitationem assumenda est molestiae numquam? Animi minus in vel voluptates?"
                        className="font-bold font-EB_Garamond text-xl flex flex-row items-center gap-1 w-full mb-5"
                      />
                    </div>
                  </div>
                  {/* Section 7 - Overlay image title, 1 Paragraph */}
                  <div className="w-full">
                    <div className=" w-full h-80 relative  my-2 ">
                      <input
                        name="sectionSevenTitle"
                        value={sectionSevenTitle}
                        onChange={(e) => setSectionSevenTitle(e.target.value)}
                        placeholder="Add your Title here"
                        className="font-bold font-EB_Garamond text-6xl flex flex-row items-center gap-1 w-full mb-3 absolute z-20 top-[40%] left-0 text-white text-center bg-transparent"
                      />

                      <label
                        htmlFor="sectionSevenSelector"
                        className="cursor-pointer"
                      >
                        <Image
                          id="sectionSevenImage"
                          className=" object-cover"
                          src={sectionSevenImage}
                          fill={true}
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          alt="imagen de producto"
                        />
                        <input
                          id="sectionSevenSelector"
                          type="file"
                          accept=".png, .jpg, .jpeg, .webp"
                          hidden
                          onChange={upload}
                        />
                      </label>
                    </div>
                    <textarea
                      rows={4}
                      name="sectionSevenParagraph"
                      value={sectionSevenParagraph}
                      onChange={(e) => setSectionSevenParagraph(e.target.value)}
                      placeholder="Lorem, ipsum dolor sit amet consectetur adipisicing elit. Eveniet atque ad totam ex velit, mollitia delectus expedita nisi magni, aliquam exercitationem assumenda est molestiae numquam? Animi minus in vel voluptates Lorem, ipsum dolor sit amet consectetur adipisicing elit. Eveniet atque ad totam ex velit, mollitia delectus expedita nisi magni, aliquam exercitationem assumenda est molestiae numquam? Animi minus in vel voluptates?"
                      className="font-bold font-EB_Garamond text-xl flex flex-row items-center gap-1 w-full mb-5"
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>
        </AnimationWrapper>
      </form>
    </div>
  );
};

export default BlogPublishedComponent;
