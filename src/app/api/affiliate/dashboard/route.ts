import Affiliate from "@/backend/models/Affiliate";
import Commission from "@/backend/models/Commission";
import ReferralEvent from "@/backend/models/ReferralEvent";
import ReferralLink from "@/backend/models/ReferralLink";
import dbConnect from "@/lib/db";

export async function GET(request: any) {
  const token = await request.headers.get("cookie");
  if (token) {
    try {
      await dbConnect();
      const affiliateEmail = await request.headers.get("userEmail");
      const affiliate = await Affiliate.findOne({ email: affiliateEmail });
      const commissionsCollection = await Commission.find({
        affiliateId: affiliate?._id,
      });
      const referralEventsCollection = await ReferralEvent.find({
        affiliateId: affiliate?._id,
      });
      const referralLinksCollection = await ReferralLink.find({
        affiliateId: affiliate?._id,
      });

      const affiliateData = {
        referralLinksCollection,
        referralEventsCollection,
        commissionsCollection,
      };

      return new Response(JSON.stringify(affiliateData), {
        status: 201,
      });
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
