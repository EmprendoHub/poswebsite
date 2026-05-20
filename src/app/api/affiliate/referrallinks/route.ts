import Affiliate from "@/backend/models/Affiliate";
import ReferralEvent from "@/backend/models/ReferralEvent";
import ReferralLink from "@/backend/models/ReferralLink";
import dbConnect from "@/lib/db";
import { getToken } from "next-auth/jwt";

export async function GET(request: any) {
  const token = await getToken({ req: request });

  if (token) {
    try {
      await dbConnect();
      const affiliate = await Affiliate.findOne({
        user: token?._id,
      });
      const referralLinksCollection = await ReferralLink.find({
        affiliateId: affiliate?._id,
      });
      const referralLinksIds = referralLinksCollection.map((link) => link._id);
      const referralEventsCollection = await ReferralEvent.find({
        referralLinkId: { $in: referralLinksIds },
      });

      const linkedCollectionsArray: any[] = [];

      referralLinksCollection.forEach((link) => {
        const events = referralEventsCollection.filter((event) =>
          event.referralLinkId.equals(link._id)
        );
        linkedCollectionsArray.push({ link, events });
      });
      return new Response(JSON.stringify(linkedCollectionsArray), {
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
