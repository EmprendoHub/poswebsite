"use client";
import React, { useRef, useState, useContext } from "react";
import { motion } from "framer-motion";
import { IoIosStar } from "react-icons/io";
import Image from "next/image";
import FormattedPrice from "@/backend/helpers/FormattedPrice";
import { calculatePercentage, cstDateTimeClient } from "@/backend/helpers";
import DateTimePicker from "react-datetime-picker";
import "react-datetime-picker/dist/DateTimePicker.css";
import "react-calendar/dist/Calendar.css";
import "react-clock/dist/Clock.css";
import { FaImage, FaExchangeAlt } from "react-icons/fa";
import MultiselectComponent from "@/components/layouts/MultiselectComponent";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { StaticImport } from "next/dist/shared/lib/get-img-props";
import { updateProduct } from "@/app/_actions";

const UpdateProductDetails = ({ product }: { product: any }) => {
  const imageRef = useRef(null);
  const router = useRouter();

  const starRating = (props: any) => {
    if (props) {
      let stars = props;
      if (stars == 0 || stars == 1 || stars == 1.5) {
        stars = 1;
      } else if (stars == 2 || stars == 2.5) {
        stars = 2;
      } else if (stars == 3 || stars == 3.5) {
        stars = 3;
      } else if (stars == 4 || stars == 4.5) {
        stars = 4;
      } else if (stars == 5) {
        stars = 5;
      }
    }

    const starArray = Array.from({ length: props }, (_, index) => (
      <span key={index} className="text-yellow-500">
        <IoIosStar />
      </span>
    ));
    return <>{starArray}</>;
  };

  const available_categories = [
    "Bolsas",
    "Calzado",
    "Accesorios",
    "Prendas",
    "Belleza",
    "Joyeria",
  ];
  const available_genders = ["Damas", "Caballeros"];
  const available_colores = [
    "Negro",
    "Rojo",
    "Cafe",
    "Beige",
    "Blanco",
    "Azul",
    "Verde",
    "Amarillo",
    "Multicolor",
    "Lila",
  ];
  const available_sizes_prendas = [
    { value: "XCH", label: "XCH" },
    { value: "CH", label: "CH" },
    { value: "M", label: "M" },
    { value: "G", label: "G" },
    { value: "XG", label: "XG" },
    { value: "XXG", label: "XXG" },
  ];
  const available_sizes_shoes_men = [
    { value: "26", label: "26" },
    { value: "26.5", label: "26.5" },
    { value: "27", label: "27" },
    { value: "27.5", label: "27.5" },
    { value: "28", label: "28" },
    { value: "28.5", label: "28.5" },
    { value: "29", label: "29" },
    { value: "29.5", label: "29.5" },
  ];

  const available_sizes_shoes_woman = [
    { value: "22", label: "22" },
    { value: "22.5", label: "22.5" },
    { value: "23", label: "23" },
    { value: "23.5", label: "23.5" },
    { value: "24", label: "24" },
    { value: "24.5", label: "24.5" },
    { value: "25", label: "25" },
    { value: "25.5", label: "25.5" },
    { value: "26", label: "26" },
    { value: "26.5", label: "26.5" },
    { value: "27", label: "27" },
    { value: "27.5", label: "27.5" },
    { value: "28", label: "28" },
    { value: "28.5", label: "28.5" },
  ];

  const [inputImageFields, setInputImageFields] = useState(product?.images);

  const [title, setTitle] = useState(product?.title);
  const [brand, setBrand] = useState(product?.brand);
  const [description, setDescription] = useState(product?.description);
  const [category, setCategory] = useState(product?.category);
  const [sizes, setSizes] = useState(product?.sizes);
  const [gender, setGender] = useState(product?.gender);
  const [featured, setFeatured] = useState(product?.featured);
  const [stock, setStock] = useState(product?.stock);
  const [cost, setCost] = useState(product?.cost);
  const [price, setPrice] = useState(product?.price);
  const [salePrice, setSalePrice] = useState(product?.sale_price);
  const [salePriceEndDate, setSalePriceEndDate] = useState(
    product?.sale_price_end_date,
  );
  const [weight, setWeight] = useState(product?.weight || 0.5);
  const [dimensions, setDimensions] = useState(
    product?.dimensions || {
      length: 15,
      width: 15,
      height: 10,
    },
  );

  const [sizeSelection, setSizeSelection] = useState<
    Array<{ value: string; label: string }>
  >([]);

  const handleSubmit = async (e: any) => {
    e.preventDefault();

    if (title === "") {
      toast("Por favor complete el nombre del producto para continuar.");
      return;
    }
    if (brand === "") {
      toast("Por favor complete la marca del producto para continuar.");
      return;
    }
    if (gender === "") {
      toast("Por favor agrega el genero del producto para continuar.");
      return;
    }
    if (description === "") {
      toast("Por favor agregue una description para continuar.");
      return;
    }
    if (sizes === "") {
      toast("Por favor agrega los tamaños del producto para continuar.");
      return;
    }

    if (category === "") {
      toast("Por favor agrega la categoría del producto para continuar.");
      return;
    }
    if (price <= 0) {
      toast("Por favor agrega el precio del producto para continuar.");
      return;
    }
    if (stock <= 0) {
      toast("Por favor agrega el costo por producto para continuar.");
      return;
    }
    if (cost <= 0) {
      toast("Por favor agrega el costo por producto para continuar.");
      return;
    }

    if (inputImageFields > 0) {
      inputImageFields.map((field: { i_color: string; i_file: string }) => {
        if (field.i_color === "") {
          toast("Por favor agrega nombre al bono(s) para continuar.");
          return;
        }

        if (field.i_file === "") {
          toast("Por favor agrega imágenes al bono(s) para continuar.");
          return;
        }
      });
    } else {
      if (inputImageFields[0].i_color === "") {
        toast("Por favor agrega nombre al bono(s) para continuar.");
        return;
      }

      if (inputImageFields[0].i_file === "") {
        toast("Por favor agrega imágenes al bono(s) para continuar.");
        return;
      }
    }

    try {
      const formData = new FormData();
      formData.set("title", title);
      formData.set("description", description);
      formData.set("stock", stock);
      formData.set("category", category);
      formData.set("price", price);
      formData.set("featured", featured);
      formData.set("brand", brand);
      formData.set("gender", gender);
      // Convert arrays to JSON strings
      const imagesJson = JSON.stringify(inputImageFields);
      const sizesJson = JSON.stringify(sizes);

      // Append JSON strings to FormData
      formData.set("cost", cost);
      formData.set("sizes", sizesJson);
      formData.set("images", imagesJson);
      formData.set("salePrice", salePrice);
      formData.set("salePriceEndDate", salePriceEndDate);
      formData.set("weight", weight.toString());
      formData.set("dimensions", JSON.stringify(dimensions));
      formData.set("_id", product?._id);

      try {
        const res: any = await updateProduct(formData);
        if (res.ok) {
          toast("El producto se actualizo exitosamente");
          router.refresh();
          return;
        }
      } catch (error) {
        toast("Error actualizando Producto. Por favor Intenta de nuevo.");
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handleCategoryChange = async (e: any) => {
    setCategory(e);
    if (e === "Calzado" && gender == "Damas") {
      setSizeSelection(available_sizes_shoes_woman);
    } else {
      setSizeSelection(available_sizes_shoes_men);
    }

    if (
      e === "Prendas" ||
      e === "Bolsas" ||
      e === "Accesorios" ||
      e === "Belleza" ||
      e === "Joyeria"
    ) {
      setSizeSelection(available_sizes_prendas);
    }
  };

  const handleGenderChange = async (e: any) => {
    setGender(e);
    if (category === "Calzado" && e == "Damas") {
      setSizeSelection(available_sizes_shoes_woman);
    } else {
      setSizeSelection(available_sizes_shoes_men);
    }

    if (
      category === "Prendas" ||
      category === "Bolsas" ||
      category === "Accesorios" ||
      category === "Belleza" ||
      category === "Joyeria"
    ) {
      setSizeSelection(available_sizes_prendas);
    }
  };

  function onChangeDate(date: any) {
    setSalePriceEndDate(date);
  }

  const handleAddSizeField = (selectedOption: any) => {
    setSizes(selectedOption);
  };

  const handleAddImageField = () => {
    setInputImageFields([
      ...inputImageFields,
      {
        i_color: "",
        i_file: "",
        i_filePreview: "/images/shopout_clothing_placeholder.webp",
      },
    ]);
  };

  const handleImageInputChange = (
    index: number,
    fieldName: string,
    event: any,
  ) => {
    const newInputImageFields = [...inputImageFields];
    if (fieldName === "i_file") {
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.readyState === 2) {
          newInputImageFields[index]["url"] = reader.result;
          setInputImageFields(newInputImageFields); // Update state after setting filePreview
        }
      };
      if (event.target.files?.[0]) {
        reader.readAsDataURL(event.target.files[0]);
        newInputImageFields[index][fieldName] = event.target.files[0];
        newInputImageFields[index]["i_file"] = event.target.files[0].name;
      }
    } else {
      newInputImageFields[index][fieldName] = event.target.value;
      setInputImageFields(newInputImageFields); // Update state for other fields
    }
  };

  const handleImageDeleteField = (index: number) => {
    const newInputFields = [...inputImageFields];
    newInputFields.splice(index, 1);
    setInputImageFields(newInputFields);
  };

  return (
    <div className="container-class maxsm:pb-8">
      <main className="bg-background flex  flex-col items-center justify-between">
        <div className="w-full mx-auto wrapper-class gap-5 bg-slate-100 text-foreground bg-opacity-80 rounded-xl">
          <div className="flex flex-row maxsm:flex-col-reverse items-start justify-start gap-x-5  maxmd:py-4 maxmd:px-5 maxsm:px-0">
            <div className="image-class w-1/2 maxsm:w-full flex flex-col items-end justify-end">
              <motion.div
                initial={{ x: -50, opacity: 0 }}
                whileInView={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.7 }}
                className="p-2 relative"
              >
                <Image
                  ref={imageRef}
                  src={
                    product?.images[0]
                      ? product?.images[0].url
                      : "/images/shopout_clothing_placeholder.webp"
                  }
                  alt="product image"
                  className="rounded-xl object-cover h-[500px] ease-in-out duration-500"
                  width={800}
                  height={800}
                />
              </motion.div>
            </div>
            <div className="description-class w-1/2 maxsm:w-full h-full ">
              <div className="flex flex-col items-start justify-start pt-10 maxsm:pt-2 gap-y-10 w-[90%] maxmd:w-full pb-10">
                <h1 className="text-xl maxmd:text-3xl font-semibold font-EB_Garamond text-foreground">
                  Actualizar Producto
                </h1>

                <motion.div
                  initial={{ x: 50, opacity: 0 }}
                  whileInView={{ x: 0, opacity: 1 }}
                  transition={{ duration: 0.5 }}
                >
                  <p className="text-7xl maxsm:text-5xl font-semibold font-EB_Garamond">
                    {product?.title}
                  </p>
                  <div className="text-xl font-semibold">
                    <div className="stars flex items-center gap-x-1">
                      {starRating(product?.rating)}
                      <span className="font-medium text-xl">
                        {product?.rating}
                      </span>
                    </div>
                  </div>
                  {product?.sale_price ? (
                    <div className="flex flex-row items-center justify-between">
                      <div className="border-[1px] border-yellow-600 w-fit py-1 px-4 rounded-full text-xs text-foreground">
                        <p>
                          {calculatePercentage(
                            product?.price,
                            product?.sale_price,
                          )}
                          % menos
                        </p>
                      </div>
                      <div className="flex items-center gap-x-2">
                        <p className="line-through text-sm text-muted font-bodyFont">
                          <FormattedPrice amount={product?.price} />
                        </p>
                      </div>
                    </div>
                  ) : (
                    ""
                  )}
                  <div>
                    <p className="font-semibold text-4xl text-foreground font-bodyFont">
                      {product?.sale_price > 0 ? (
                        <FormattedPrice amount={product?.sale_price} />
                      ) : product?.price > 0 ? (
                        <FormattedPrice amount={product?.price} />
                      ) : (
                        ""
                      )}
                    </p>
                    <p className="text-xs font-normal text-muted">
                      Apártalo con solo 30%:
                    </p>
                    <p className="text-xl text-foreground font-bodyFont">
                      <FormattedPrice amount={product?.price * 0.3} />
                    </p>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ y: 50, opacity: 0 }}
                  whileInView={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.6 }}
                  className=" font-bodyFont description-class"
                >
                  {product?.description ? product?.description : ""}
                </motion.div>
                <motion.div
                  initial={{ y: 50, opacity: 0 }}
                  whileInView={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.7 }}
                  className="text-sm text-lightText flex flex-col"
                >
                  <span>
                    SKU: <span className=" font-bodyFont">{product?._id}</span>
                  </span>
                  <span>
                    Existencias:{" "}
                    <span className=" font-bodyFont">{product?.stock}</span>
                  </span>
                  <span>
                    Categoría:{" "}
                    <span className="t font-bodyFont">{product?.category}</span>
                  </span>
                  <span>
                    Marca:{" "}
                    <span className="t font-bodyFont">{product?.brand}</span>
                  </span>
                  <span>
                    Colores:{" "}
                    {product?.colors.map(
                      (
                        color: {
                          value: string | number;
                        },
                        index: React.Key | null | undefined,
                      ) => (
                        <span key={index} className="t font-bodyFont">
                          {color?.value},
                        </span>
                      ),
                    )}
                  </span>
                  <span>
                    Tallas:{" "}
                    {product?.sizes.map(
                      (
                        size: {
                          value: string | number;
                        },
                        index: React.Key | null | undefined,
                      ) => (
                        <span key={index} className="t font-bodyFont">
                          {size?.value},
                        </span>
                      ),
                    )}
                  </span>
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <main className="w-full ">
        <section className=" p-6 maxsm:p-0 w-full ">
          <form
            onSubmit={handleSubmit}
            className="flex flex-row flex-wrap items-start gap-5 justify-start "
          >
            <div className="gap-y-5 flex-col flex px-2 w-1/2 maxsm:w-full">
              <div className="mb-4">
                <label className="block mb-1 text-slate-500">
                  {" "}
                  Titulo del Producto
                </label>
                <input
                  type="text"
                  className="appearance-none border bg-background rounded-xl py-2 px-3 border-gray-300 focus:outline-none focus:border-gray-400 w-full"
                  placeholder="Nombre de Producto"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  name="title"
                />
              </div>
              <div className="mb-4">
                <label className="block mb-1  text-slate-500">
                  {" "}
                  Description Corta
                </label>
                <textarea
                  rows={2}
                  className="appearance-none border  bg-background rounded-xl py-2 px-3 border-gray-300 focus:outline-none focus:border-gray-400 w-full"
                  placeholder="Descripción del Producto"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  name="description"
                ></textarea>
              </div>
              <div className="mb-4">
                <label className="block mb-1 text-slate-500">
                  {" "}
                  Marca del Producto
                </label>
                <input
                  type="text"
                  className="appearance-none border bg-background rounded-xl py-2 px-3 border-gray-300 focus:outline-none focus:border-gray-400 w-full"
                  placeholder="Marca del Producto"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  name="brand"
                />
              </div>
              <div className="flex flex-row maxsm:flex-col items-center gap-5">
                <div className="mb-4 w-full">
                  <label className="block mb-1  text-slate-500">
                    Precio de Venta{" "}
                  </label>
                  <div className="relative">
                    <div className="col-span-2">
                      <input
                        type="number"
                        className="appearance-none border border-gray-300 bg-background rounded-xl py-2 px-3focus:outline-none focus:border-gray-400 w-full"
                        placeholder="0.00"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        name="price"
                      />
                    </div>
                  </div>
                </div>
                <div className="mb-4 w-full">
                  <label className="block mb-1 text-slate-500"> Costo </label>
                  <div className="relative">
                    <div className="col-span-2">
                      <input
                        type="number"
                        className="appearance-none border border-gray-300 bg-background rounded-xl py-2 px-3focus:outline-none focus:border-gray-400 w-full"
                        placeholder="0.00"
                        value={cost}
                        onChange={(e) => setCost(e.target.value)}
                        name="cost"
                      />
                    </div>
                  </div>
                </div>
                <div className="mb-4 w-full">
                  <label className="block mb-1 text-slate-500">
                    {" "}
                    Existencias{" "}
                  </label>
                  <div className="relative">
                    <div className="col-span-2">
                      <input
                        type="number"
                        className="appearance-none border border-gray-300 bg-background rounded-xl py-2 px-3 focus:outline-none focus:border-gray-400 w-full"
                        placeholder="1"
                        value={stock}
                        onChange={(e) => setStock(e.target.value)}
                        name="stock"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Sección de Peso y Dimensiones */}
              <div className="mb-6 border-t pt-4">
                <h3 className="text-lg font-semibold text-slate-700 mb-2">
                  Información de Envío
                </h3>
                <p className="text-xs text-slate-500 mb-4">
                  Para cálculo automático de costos de envío
                </p>

                <div className="flex flex-row maxsm:flex-col items-center gap-5">
                  <div className="mb-4 w-full">
                    <label className="block mb-1 text-slate-500">
                      Peso (kg)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        className="appearance-none border border-gray-300 bg-background rounded-xl py-2 px-3 focus:outline-none focus:border-gray-400 w-full"
                        placeholder="0.5"
                        min="0.01"
                        value={weight}
                        onChange={(e) =>
                          setWeight(parseFloat(e.target.value) || 0.5)
                        }
                        name="weight"
                      />
                    </div>
                  </div>

                  <div className="mb-4 w-full">
                    <label className="block mb-1 text-slate-500">
                      Largo (cm)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        className="appearance-none border border-gray-300 bg-background rounded-xl py-2 px-3 focus:outline-none focus:border-gray-400 w-full"
                        placeholder="15"
                        min="0.1"
                        value={dimensions.length}
                        onChange={(e) =>
                          setDimensions({
                            ...dimensions,
                            length: parseFloat(e.target.value) || 15,
                          })
                        }
                        name="length"
                      />
                    </div>
                  </div>

                  <div className="mb-4 w-full">
                    <label className="block mb-1 text-slate-500">
                      Ancho (cm)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        className="appearance-none border border-gray-300 bg-background rounded-xl py-2 px-3 focus:outline-none focus:border-gray-400 w-full"
                        placeholder="15"
                        min="0.1"
                        value={dimensions.width}
                        onChange={(e) =>
                          setDimensions({
                            ...dimensions,
                            width: parseFloat(e.target.value) || 15,
                          })
                        }
                        name="width"
                      />
                    </div>
                  </div>

                  <div className="mb-4 w-full">
                    <label className="block mb-1 text-slate-500">
                      Alto (cm)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        className="appearance-none border border-gray-300 bg-background rounded-xl py-2 px-3 focus:outline-none focus:border-gray-400 w-full"
                        placeholder="10"
                        min="0.1"
                        value={dimensions.height}
                        onChange={(e) =>
                          setDimensions({
                            ...dimensions,
                            height: parseFloat(e.target.value) || 10,
                          })
                        }
                        name="height"
                      />
                    </div>
                  </div>
                </div>
                <p className="text-xs text-slate-400">
                  Valores por defecto: 0.5 kg, 15×15×10 cm
                </p>
              </div>

              <div className="flex flex-row maxsm:flex-col items-center gap-5">
                <div className="mb-4 w-full">
                  <label className="block mb-1 text-slate-500">
                    {" "}
                    Destacado{" "}
                  </label>
                  <div className="relative">
                    <select
                      className="block appearance-none border border-gray-300 bg-background rounded-xl py-2 px-3 focus:outline-none focus:border-gray-400 w-full"
                      name="featured"
                      onChange={(e) => setFeatured(e.target.value)}
                      value={featured}
                    >
                      {["No", "Si"].map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
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
              </div>
            </div>

            <div className="flex-col flex justify-start px-2 gap-y-5 w-1/3 maxsm:w-full">
              <div className="mb-4">
                <label className="block mb-1 text-slate-500"> Género </label>
                <div className="relative">
                  <select
                    className="block appearance-none border border-gray-300 bg-background rounded-xl py-2 px-3 focus:outline-none focus:border-gray-400 w-full"
                    name="gender"
                    value={gender}
                    onChange={(e) => handleGenderChange(e.target.value)}
                  >
                    {available_genders.map((gender) => (
                      <option key={gender} value={gender}>
                        {gender}
                      </option>
                    ))}
                  </select>
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
              <div className="mb-4">
                <label className="block mb-1 text-slate-500"> Categoría </label>
                <div className="relative">
                  <select
                    className="block appearance-none border border-gray-300 bg-background rounded-xl py-2 px-3 focus:outline-none focus:border-gray-400 w-full"
                    name="category"
                    value={category}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                  >
                    {available_categories.map((category) => {
                      return (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      );
                    })}
                  </select>
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
              <div className="mb-4">
                <label className="block mb-1 text-slate-500"> Tallas </label>
                <div className="relative">
                  <MultiselectComponent
                    values={sizes}
                    options={sizeSelection}
                    handleAddSizeField={handleAddSizeField}
                  />
                </div>
              </div>
              <div className="mb-4">
                <label className="block mb-1 text-slate-500">
                  {" "}
                  Precio de Oferta{" "}
                </label>
                <div className="relative">
                  <div className="col-span-2">
                    <input
                      type="number"
                      className="appearance-none border border-gray-300 bg-background rounded-xl py-2 px-3focus:outline-none focus:border-gray-400 w-full"
                      placeholder="0.00"
                      value={salePrice}
                      onChange={(e) => setSalePrice(e.target.value)}
                      name="salePrice"
                    />
                  </div>
                </div>
              </div>
              <div className="mb-4">
                <label className="block mb-1 text-slate-500">
                  {" "}
                  Finalización de Oferta{" "}
                </label>
                <div className="  cursor-pointer">
                  <DateTimePicker
                    onChange={onChangeDate}
                    value={salePriceEndDate}
                    locale={"es-MX"}
                    minDate={cstDateTimeClient()}
                  />
                </div>
              </div>
            </div>
            <div>
              <button
                type="button"
                className=" bg-black text-white rounded-xl p-4 mb-5 flex flex-row items-center w-[250px]"
                onClick={handleAddImageField}
              >
                Agregar Imagen <FaImage className="text-white ml-1" />
              </button>
              <div className="flex flex-row maxsm:flex-col items-center gap-x-2 mt-5 ">
                {inputImageFields.map(
                  (
                    inputImageField: { url: string | StaticImport },
                    index: number,
                  ) => (
                    <div
                      key={index}
                      className="mb-4 p-4 maxsm:p-0 border-gray-200 border w-full shadow-md"
                    >
                      <div className="flex flex-row items-center gap-4 mb-4">
                        {index > 0 && (
                          <button
                            type="button"
                            onClick={() => handleImageDeleteField(index)}
                            className="text-red-500"
                          >
                            X
                          </button>
                        )}

                        <p className="font-bold flex flex-row items-center gap-1">
                          Imagen <FaImage /> #{index + 1}
                        </p>
                      </div>
                      <div className="flex flex-col items-center">
                        <div className="mb-4 w-full">
                          <div className="items-center justify-center">
                            <div className="w-40 h-40 maxsm:w-full maxsm:h-80 relative space-x-3 my-2 ">
                              <FaExchangeAlt className="absolute z-20 text-3xl top-[50%] left-[50%] text-slate-200" />
                              <Image
                                className="rounded-xl object-cover"
                                src={inputImageField?.url}
                                fill={true}
                                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                alt="imagen de producto"
                              />
                              {/* overlay */}
                              <div className="min-h-[100%] absolute z-[1] min-w-[100%] top-0 left-0 bg-black bg-opacity-30" />

                              <input
                                className="form-control block w-40 overflow-hidden  text-base font-normal text-gray-700 bg-background bg-clip-padding border border-solid border-gray-300 rounded transition ease-in-out m-0 focus:text-gray-700 focus:bg-background focus:border-blue-600 focus:outline-none  cursor-pointer z-20 min-h-full top-0 absolute opacity-0"
                                type="file"
                                id="i_file"
                                name="i_file"
                                onChange={(e) =>
                                  handleImageInputChange(index, "i_file", e)
                                }
                              />
                            </div>
                          </div>
                          <label className="block mb-1 text-slate-500">
                            {" "}
                            Color{" "}
                          </label>
                          <div className="relative">
                            <select
                              className="block appearance-none border border-gray-300 bg-background rounded-xl py-2 px-3 focus:outline-none focus:border-gray-400 w-full cursor-pointer"
                              name="i_color-${index + 1}"
                              onChange={(e) =>
                                handleImageInputChange(index, "i_color", e)
                              }
                            >
                              {available_colores.map((color, index) => (
                                <option key={index} value={color}>
                                  {color}
                                </option>
                              ))}
                            </select>
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
                      </div>
                    </div>
                  ),
                )}
              </div>
            </div>

            <button
              type="submit"
              className="my-2 px-4 py-2 text-center inline-block text-white bg-blue-600 border border-transparent rounded-xl hover:bg-blue-700 w-full"
            >
              Actualizar Producto
            </button>
          </form>
        </section>
      </main>
    </div>
  );
};

export default UpdateProductDetails;
