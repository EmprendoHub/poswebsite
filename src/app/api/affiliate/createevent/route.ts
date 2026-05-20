import { cstDateTime } from "@/backend/helpers";
import Address from "@/backend/models/Address";
import ReferralEvent from "@/backend/models/ReferralEvent";
import ReferralLink from "@/backend/models/ReferralLink";
import dbConnect from "@/lib/db";

export async function POST(req: any) {
  try {
    await dbConnect();

    const data = await req.json();
    const referralLink = await ReferralLink.findOne({ _id: data.affParam });
    const affiliateId = referralLink?.affiliateId.toString();
    const timestamp = cstDateTime(); // Current timestamp

    // Create a ReferralEvent object
    const newReferralEvent = await ReferralEvent.create({
      referralLinkId: { _id: data.affParam },
      eventType: "AffiliateVisit",
      affiliateId: { _id: affiliateId },
      ipAddress: "155.465.45.465",
      userAgent: data.userAgent,
      date: timestamp,
    });

    await newReferralEvent.save();
    referralLink.clickCount = referralLink.clickCount + 1;
    await referralLink.save();
    return new Response(JSON.stringify(newReferralEvent), { status: 201 });
  } catch (error: any) {
    return new Response(JSON.stringify(error.message), { status: 500 });
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
