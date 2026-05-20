"use client";
import React, { useRef, useState } from "react";
import Image from "next/image";
import { cstDateTimeClient } from "@/backend/helpers";
import { addNewPost } from "@/app/_actions";
import { useRouter } from "next/navigation";
import { ValidationError } from "@/types";

const CreatePostComponent = () => {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const available_categories = [
    "Pokemon",
    "Memorabilia Deportiva",
    "Tarjeta Coleccionable",
    "Juguetes Coleccionable",
    "Coleccionable",
  ];
  const [category, setCategory] = useState("Coleccionable");
  // Main section
  const [mainTitle, setMainTitle] = useState("");
  const [mainImage, setMainImage] = useState("/images/blog_placeholder.jpeg");
  // section 2
  const [sectionTwoTitle, setSectionTwoTitle] = useState("");
  const [sectionTwoParagraphOne, setSectionTwoParagraphOne] = useState("");
  const [sectionTwoParagraphTwo, setSectionTwoParagraphTwo] = useState("");

  // section 3
  const [sectionThreeTitle, setSectionThreeTitle] = useState("");
  const [sectionThreeParagraphOne, setSectionThreeParagraphOne] = useState("");
  const [sectionThreeImage, setSectionThreeImage] = useState(
    "/images/blog_placeholder.jpeg"
  );
  const [sectionThreeParagraphFooter, setSectionThreeParagraphFooter] =
    useState("");

  // section 5
  const [sectionFourTitle, setSectionFourTitle] = useState("");
  const [sectionFourImage, setSectionFourImage] = useState(
    "/images/blog_placeholder.jpeg"
  );
  const [sectionFourParagraphOne, setSectionFourParagraphOne] = useState("");
  const [sectionFourParagraphTwo, setSectionFourParagraphTwo] = useState("");

  const [createdAt, setCreatedAt] = useState(
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
        retrieveNewURL(file, (file: any, url: string) => {
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
    formData.append("sectionFourImage", sectionFourImage);
    formData.append("sectionFourParagraphOne", sectionFourParagraphOne);
    formData.append("sectionFourParagraphTwo", sectionFourParagraphTwo);

    formData.append("createdAt", createdAt);
    // write to database using server actions
    const result: any = await addNewPost(formData);
    if (result?.error) {
      console.log(result?.error);
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
          <p className=" text-foreground line-clamp-1 flex flex-col w-full leading-loose">
            <input
              name="mainTitle"
              value={mainTitle}
              onChange={(e) => setMainTitle(e.target.value)}
              placeholder="NUEVO BLOG"
              className=" text-5xl  w-full"
            />
            {validationError?.mainTitle && (
              <p className="text-sm text-red-400">
                {validationError.mainTitle._errors.join(", ")}
              </p>
            )}
            {validationError?.title && (
              <p className="text-base text-red-400">
                {validationError.title._errors.join(", ")}
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
                      className=" text-2xl flex flex-row items-center gap-1 w-full"
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
                    rows={6}
                    name="sectionTwoParagraphOne"
                    value={sectionTwoParagraphOne}
                    onChange={(e) => setSectionTwoParagraphOne(e.target.value)}
                    placeholder="Lorem, ipsum dolor sit amet consectetur adipisicing elit. Eveniet atque ad totam ex velit, mollitia delectus expedita nisi magni, aliquam exercitationem assumenda est molestiae numquam? Animi minus in vel voluptates Lorem, ipsum dolor sit amet consectetur adipisicing elit. Eveniet atque ad totam ex velit, mollitia delectus expedita nisi magni, aliquam exercitationem assumenda est molestiae numquam? Animi minus in vel voluptates?"
                    className=" text-sm flex flex-row items-center gap-1 w-full mb-5"
                  />
                  <textarea
                    rows={6}
                    name="sectionTwoParagraphTwo"
                    value={sectionTwoParagraphTwo}
                    onChange={(e) => setSectionTwoParagraphTwo(e.target.value)}
                    placeholder="Lorem, ipsum dolor sit amet consectetur adipisicing elit. Eveniet atque ad totam ex velit, mollitia delectus expedita nisi magni, aliquam exercitationem assumenda est molestiae numquam? Animi minus in vel voluptates Lorem, ipsum dolor sit amet consectetur adipisicing elit. Eveniet atque ad totam ex velit, mollitia delectus expedita nisi magni, aliquam exercitationem assumenda est molestiae numquam? Animi minus in vel voluptates?"
                    className=" text-sm flex flex-row items-center gap-1 w-full"
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
                        className=" text-2xl flex flex-row items-center gap-1 w-full mb-3"
                      />
                      <textarea
                        rows={12}
                        name="sectionThreeParagraphOne"
                        value={sectionThreeParagraphOne}
                        onChange={(e) =>
                          setSectionThreeParagraphOne(e.target.value)
                        }
                        placeholder="Lorem, ipsum dolor sit amet consectetur adipisicing elit. Eveniet atque ad totam ex velit, mollitia delectus expedita nisi magni, aliquam exercitationem assumenda est molestiae numquam? Animi minus in vel voluptates Lorem, ipsum dolor sit amet consectetur. assumenda est molestiae numquam? Animi minus in vel voluptates Lorem, ipsum dolor sit amet consectetur.aliquam exercitationem assumenda est molestiae numquam? Animi minus in vel voluptates Lorem aliquam exercitationem assumenda est molestiae numquam? Animi minus in vel voluptates Lorem"
                        className=" text-sm flex flex-row items-center gap-1 w-full"
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
                      rows={6}
                      name="sectionThreeParagraphFooter"
                      value={sectionThreeParagraphFooter}
                      onChange={(e) =>
                        setSectionThreeParagraphFooter(e.target.value)
                      }
                      placeholder="Lorem, ipsum dolor sit amet consectetur adipisicing elit. Eveniet atque ad totam ex velit, mollitia delectus expedita nisi magni, aliquam exercitationem assumenda est molestiae numquam? Animi minus in vel voluptates Lorem, ipsum dolor sit amet consectetur adipisicing elit. Eveniet atque ad totam ex velit, mollitia delectus expedita nisi magni, aliquam exercitationem assumenda est molestiae numquam? Animi minus in vel voluptates?"
                      className=" text-sm flex flex-row items-center gap-1 w-full mb-5"
                    />
                  </div>
                </div>

                {/* Section 3 - Title, Image, 2 Paragraph */}
                <div className="w-full">
                  <div className="mb-4 w-full">
                    <input
                      name="sectionFourTitle"
                      value={sectionFourTitle}
                      onChange={(e) => setSectionFourTitle(e.target.value)}
                      placeholder="Add your Title here"
                      className=" text-2xl flex flex-row items-center gap-1 w-full"
                    />
                    <div className="items-center justify-center">
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
                            alt="imagen de blog"
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
                    rows={6}
                    name="sectionFourParagraphOne"
                    value={sectionFourParagraphOne}
                    onChange={(e) => setSectionFourParagraphOne(e.target.value)}
                    placeholder="Lorem, ipsum dolor sit amet consectetur adipisicing elit. Eveniet atque ad totam ex velit, mollitia delectus expedita nisi magni, aliquam exercitationem assumenda est molestiae numquam? Animi minus in vel voluptates Lorem, ipsum dolor sit amet consectetur adipisicing elit. Eveniet atque ad totam ex velit, mollitia delectus expedita nisi magni, aliquam exercitationem assumenda est molestiae numquam? Animi minus in vel voluptates?"
                    className=" text-sm flex flex-row items-center gap-1 w-full"
                  />
                  <textarea
                    rows={6}
                    name="sectionFourParagraphTwo"
                    value={sectionFourParagraphTwo}
                    onChange={(e) => setSectionFourParagraphTwo(e.target.value)}
                    placeholder="Lorem, ipsum dolor sit amet consectetur adipisicing elit. Eveniet atque ad totam ex velit, mollitia delectus expedita nisi magni, aliquam exercitationem assumenda est molestiae numquam? Animi minus in vel voluptates Lorem, ipsum dolor sit amet consectetur adipisicing elit. Eveniet atque ad totam ex velit, mollitia delectus expedita nisi magni, aliquam exercitationem assumenda est molestiae numquam? Animi minus in vel voluptates?"
                    className=" text-sm flex flex-row items-center gap-1 w-full my-5"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>
      </form>
    </div>
  );
};

export default CreatePostComponent;
