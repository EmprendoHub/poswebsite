import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import dbConnect from "@/lib/db"; // Adjust this import based on your project structure
import User from "@/backend/models/User";

export async function POST(request: NextRequest) {
  try {
    // Get IP address
    const forwardedFor = request.headers.get("x-forwarded-for");
    const ip = forwardedFor
      ? forwardedFor.split(",")[0].trim()
      : request.ip || "127.0.0.1";

    // Get user agent info
    const userAgent = request.headers.get("user-agent") || "Unknown";

    // Get device type
    const deviceType = /mobile/i.test(userAgent) ? "mobile" : "desktop";

    // Get approximate location based on IP (you'll need to use a geolocation service)
    const location = await getLocationFromIP(ip);

    // Get additional info from request body if needed
    const body = await request.json();
    const { userId } = body; // Assuming you're sending a userId in the request body

    // Connect to database
    await dbConnect();

    // Create new UserInfo document
    const userInfo = new User({
      userId,
      ip,
      userAgent,
      deviceType,
      location,
      timestamp: new Date(),
    });

    // Save to database
    await userInfo.save();

    return NextResponse.json(
      { message: "User info collected successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error collecting user info:", error);
    return NextResponse.json(
      { error: "Failed to collect user info" },
      { status: 500 }
    );
  }
}

async function getLocationFromIP(ip: string) {
  // This is a placeholder function. You should implement actual IP geolocation here.
  // You might use a service like ipapi.co, ipify.org, or a paid service for more accurate results
  try {
    const response = await fetch(`https://ipapi.co/${ip}/json/`);
    const data = await response.json();
    return {
      country: data.country_name,
      region: data.region,
      city: data.city,
      latitude: data.latitude,
      longitude: data.longitude,
    };
  } catch (error) {
    console.error("Error getting location from IP:", error);
    return null;
  }
}
