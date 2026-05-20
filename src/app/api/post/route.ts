import Post from "@/backend/models/Post";
import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { getToken } from "next-auth/jwt";
import { join } from "path";
import { writeFile } from "fs/promises";
import { mc } from "@/lib/minio";
import Product from "@/backend/models/Product";
import { ItemBucketMetadata } from "minio";

// Put a file in bucket my-bucketname.
const uploadToBucket = async (
  folder: string,
  filename: string,
  file: string,
): Promise<{ _id: string; url: string }> => {
  return new Promise((resolve, reject) => {
    mc.fPutObject(folder, filename, file, {} as ItemBucketMetadata)
      .then((etag: any) => {
        resolve({
          _id: etag, // Using etag as _id
          url: `${process.env.MINIO_URL}/${folder}/${filename}`, // Constructing URL
        });
      })
      .catch((err: Error) => {
        console.log("Error from minio", err);
        reject(err);
      });
  });
};

export const GET = async (request: any) => {
  const cookie = await request.headers.get("cookie");
  if (!cookie) {
    // Not Signed in
    const notAuthorized = "You are not authorized no no no";
    return new Response(JSON.stringify(notAuthorized), {
      status: 400,
    });
  }

  try {
    await dbConnect();
    const id = await request.headers.get("id");
    //const _id = await request.url.split('?')[1];
    const post = await Post?.findOne({ _id: id });
    // Find products matching any of the tag values
    const trendingProducts = await Product.find({
      "tags.value": post.category,
    }).limit(4);

    const response = NextResponse.json({
      message: "One Post fetched successfully",
      success: true,
      post,
      trendingProducts,
    });
    return response;
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      {
        error: "Post loading error",
      },
      { status: 500 },
    );
  }
};

export async function POST(req: any, res: any) {
  const token: any = await getToken({ req: req });
  if (token && ["manager", "super_admin"].includes(token.user.role)) {
    try {
      await dbConnect();
      const { payload } = await req.json();
      let { title, category, images, summary, content, createdAt } = payload;

      // Parse images as JSON
      images = JSON.parse(images);
      let mainImage;
      const authorId = { _id: token?._id };
      const updatedAt = createdAt;
      const published = true;

      // set image urls
      const savedPostImages: any[] = [];
      const savedPostMinioBucketImages: any[] = [];
      images?.map(async (image: any, index: number) => {
        let image_url = image.i_file;
        let p_images = {
          url: `https://minio.salvawebpro.com:9000/supercollectibles/posts/${image_url}`,
        };
        if (index === 0) {
          mainImage = p_images;
        }
        let minio_image = {
          i_filePreview: image.i_filePreview,
          i_file: image.i_file,
        };
        savedPostMinioBucketImages.push(minio_image);
        savedPostImages.push(p_images);

        // upload images to bucket
      });
      images = savedPostImages;

      const newPost = new Post({
        title,
        category,
        mainImage,
        images,
        summary,
        content,
        published,
        authorId,
        createdAt,
        updatedAt,
      });

      // Save the Post to the database
      const savedPost = await newPost.save();

      // upload images to bucket
      savedPostMinioBucketImages?.map(async (image) => {
        // Remove the data URI prefix (e.g., "data:image/jpeg;base64,")
        const base64Image = image.i_filePreview?.split(";base64,").pop();
        // Create a buffer from the base64 string
        const buffer = Buffer.from(base64Image, "base64");
        const path = join("/", "tmp", image.i_file);
        await writeFile(path, buffer);
        const fileName = "/posts/" + String(image.i_file);

        await uploadToBucket("supercollectibles", fileName, path);
      });
      const response = NextResponse.json({
        message: "Publicación creada exitosamente",
        success: true,
        post: savedPost,
      });

      return response;
    } catch (error) {
      return NextResponse.json(
        {
          error: "Error al crear Publicación",
        },
        { status: 500 },
      );
    }
  } else {
    // Not Signed in
    return new Response("You are not authorized, eh eh eh, no no no", {
      status: 400,
    });
  }
}

export async function PUT(req: any, res: any) {
  const token: any = await getToken({ req: req });

  if (token && ["manager", "super_admin"].includes(token.user.role)) {
    try {
      await dbConnect();
      const { payload } = await req.json();
      let { title, category, summary, content, images, _id } = payload;

      // Parse images as JSON
      images = JSON.parse(images);
      let mainImage;

      const authorId = { _id: token?._id };
      const oid = _id;

      // set image urls
      const savedPostImages: any[] = [];
      const savedPostMinioBucketImages: any[] = [];
      images?.map(async (image: any, index: number) => {
        let image_url;
        let p_images;
        if (image.i_filePreview) {
          image_url = image.i_file;
          p_images = {
            url: `https://minio.salvawebpro.com:9000/supercollectibles/posts/${image_url}`,
          };
          if (index === 0) {
            mainImage = p_images;
          }
          let minio_image = {
            i_filePreview: image.i_filePreview,
            i_file: image.i_file,
          };
          savedPostMinioBucketImages.push(minio_image);
          savedPostImages.push(p_images);
        } else {
          p_images = {
            url: image.url,
          };
          savedPostImages.push(p_images);
        }
      });

      images = savedPostImages;

      const updatePost = await Post.findOne({ _id: oid });
      updatePost.title = title;
      updatePost.mainImage = mainImage;
      updatePost.category = category;
      updatePost.summary = summary;
      updatePost.content = content;
      updatePost.images = images;
      updatePost.published = true;
      updatePost.authorId = authorId;

      // Save the Post to the database
      const savedPost = await updatePost.save();
      // upload images to bucket
      savedPostMinioBucketImages?.map(async (image) => {
        // Remove the data URI prefix (e.g., "data:image/jpeg;base64,")
        const base64Image = image.i_filePreview?.split(";base64,").pop();
        // Create a buffer from the base64 string
        const buffer = Buffer.from(base64Image, "base64");
        const path = join("/", "tmp", image.i_file);
        await writeFile(path, buffer);
        const fileName = "/posts/" + String(image.i_file);

        await uploadToBucket("supercollectibles", fileName, path);
      });
      const response = NextResponse.json({
        message: "Publicación actualizado exitosamente",
        success: true,
        post: savedPost,
      });

      return response;
    } catch (error) {
      console.log(error);
      return NextResponse.json(
        {
          error: "Error al crear Publicación",
        },
        { status: 500 },
      );
    }
  } else {
    // Not Signed in
    return new Response("You are not authorized, eh eh eh, no no no", {
      status: 400,
    });
  }
}

export async function DELETE(req: any) {
  const token: any = await getToken({ req: req });
  if (token && ["manager", "super_admin"].includes(token.user.role)) {
    try {
      await dbConnect();
      const urlData = await req.url.split("?");
      const id = urlData[1];
      const deletePost = await Post.findByIdAndDelete(id);
      return new Response(JSON.stringify(deletePost), { status: 201 });
    } catch (error: any) {
      return new Response(JSON.stringify(error.message), { status: 500 });
    }
  } else {
    // Not Signed in
    return new Response("You are not authorized, eh eh eh, no no no", {
      status: 400,
    });
  }
}
