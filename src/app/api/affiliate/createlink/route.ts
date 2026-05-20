import { cstDateTime } from "@/backend/helpers";
import Affiliate from "@/backend/models/Affiliate";
import ReferralLink from "@/backend/models/ReferralLink";
import dbConnect from "@/lib/db";
import Address from "@/backend/models/Address";

async function generateUniqueCode() {
  const timestamp = Date.now().toString(36);
  const randomString = Math.random().toString(36).substring(2, 8);

  const uniqueCode = `${timestamp}${randomString}`;

  return uniqueCode;
}

export async function POST(req: any) {
  const sessionData = req.headers.get("x-mysession-key");
  const session = JSON.parse(sessionData);
  if (session) {
    try {
      await dbConnect();
      const data = await req.json();

      const { newLink, user } = await data;

      // Generate a unique code for the referral link (you can implement your own logic here)
      const uniqueCode = await generateUniqueCode();
      const affiliate = await Affiliate.findOne({ user: user._id });
      const newReferralLink = await ReferralLink.create({
        affiliateId: affiliate._id,
        uniqueCode,
        clickCount: 0,
        targetUrl: newLink.targetUrl,
        metadata: newLink.metadata,
        createdAt: cstDateTime(),
      });

      await newReferralLink.save();
      return new Response(JSON.stringify(newReferralLink), { status: 201 });
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
