import dbConnect from "@/lib/db";
import Address from "@/backend/models/Address";
import { getToken } from "next-auth/jwt";

export async function POST(req: any) {
  const sessionData = req.headers.get("x-mysession-key");
  const session = JSON.parse(sessionData);
  if (session) {
    try {
      await dbConnect();
      const inAddress = await req.json();
      const { street, city, province, zipcode, country, phone, user } =
        await inAddress.address;
      let zip_code = zipcode;
      const newAddress = await Address.create({
        street,
        city,
        province,
        zip_code,
        country,
        phone,
        user,
      });
      //._doc is getting the values of the Address
      const { ...address } = newAddress._doc;

      return new Response(JSON.stringify(address), { status: 201 });
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

export async function PUT(req: any) {
  const sessionData = req.headers.get("x-mysession-key");
  const session = JSON.parse(sessionData);
  if (session) {
    try {
      await dbConnect();
      const inAddress = await req.json();

      const {
        address_id,
        street,
        city,
        province,
        zipcode,
        country,
        phone,
        user,
      } = await inAddress.address;

      const updateAddress = await Address.findByIdAndUpdate(address_id, {
        street: street,
        city: city,
        province: province,
        zip_code: zipcode,
        country: country,
        phone: phone,
        user: user,
      });
      //._doc is getting the values of the Address
      const { ...address } = updateAddress._doc;

      return new Response(JSON.stringify(address), { status: 201 });
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

export async function DELETE(req: any) {
  const sessionData = req.headers.get("x-mysession-key");
  const session = JSON.parse(sessionData);
  if (session) {
    try {
      await dbConnect();
      const urlData = await req.url.split("?");
      const id = urlData[1];
      const deleteAddress = await Address.findByIdAndDelete(id);
      return new Response(JSON.stringify(deleteAddress), { status: 201 });
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

export async function GET(request: any, params: any) {
  const token = await getToken({ req: request });
  if (token) {
    const address_id = request.url.split("?");
    const _id = address_id[1];

    try {
      await dbConnect();
      const address = await Address.findOne({ _id });

      return new Response(JSON.stringify(address), { status: 201 });
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
