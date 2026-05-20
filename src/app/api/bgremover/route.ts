import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import axios from "axios";
import FormData from "form-data";

export async function POST(request: any) {
  const token: any = await getToken({ req: request });
  if (token && ["manager", "super_admin"].includes(token.user.role)) {
    try {
      const reqFormData = await request.formData();
      const image = reqFormData.get("image");

      if (!image) {
        return NextResponse.json(
          { error: "No image uploaded." },
          { status: 400 },
        );
      }

      // Convert the image to a Buffer
      const imageBuffer = await image.arrayBuffer();
      const buffer = Buffer.from(imageBuffer);

      const data = new FormData();
      data.append("image", buffer, image.name);
      const url = "https://ai-image-background-remover1.p.rapidapi.com/";
      const urlHost = "ai-image-background-remover1.p.rapidapi.com";
      const urlPro =
        "https://ai-background-remover.p.rapidapi.com/image/matte/v1";

      const urlProHost = "ai-background-remover.p.rapidapi.com";

      const options = {
        method: "POST",
        url: url,
        headers: {
          "x-rapidapi-key": process.env.RAPID_API_IMAGE_REMOVER_API_KEY!,
          "x-rapidapi-host": urlHost,
          ...data.getHeaders(),
        },
        data: data,
      };

      try {
        const response = await axios.request(options);
        console.log(response.data);

        return NextResponse.json({
          message: "Image background removed successfully.",
          success: true,
          images: response.data,
        });
      } catch (error: any) {
        console.error(error);
        return NextResponse.json(
          {
            error: "Error occurred while connecting to the API.",
            details: error.response?.data || error.message,
          },
          { status: 500 },
        );
      }
    } catch (error) {
      console.log("error", error);

      return NextResponse.json(
        {
          error: "Error occurred while processing the image.",
        },
        { status: 500 },
      );
    }
  } else {
    return new Response("You are not authorized", { status: 401 });
  }
}

function extractImageName(url: string) {
  const imageName = url.substring(url.lastIndexOf("/") + 1);
  return imageName;
}

export async function GET(request: any) {
  const token: any = await getToken({ req: request });

  if (token && ["manager", "super_admin"].includes(token.user.role)) {
    try {
      const noBgImageUrl = await request.headers.get("noBgImageUrl");
      console.log("noBgImageUrl GET", noBgImageUrl);
      const fileName = extractImageName(noBgImageUrl);

      const response = await fetch(noBgImageUrl);
      const blob = await response.blob();

      // Return the blob directly
      return new Response(blob, {
        headers: {
          "Content-Type": blob.type,
          "Content-Disposition": `attachment; filename="nobg_${fileName}"`,
        },
      });
    } catch (error) {
      console.error("Error in GET route:", error);
      return NextResponse.json(
        {
          error: "Error occurred while processing the image.",
        },
        { status: 500 },
      );
    }
  } else {
    return new Response("You are not authorized", { status: 401 });
  }
}
