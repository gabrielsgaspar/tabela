import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Football-Data.org serves crest images from this hostname.
      { protocol: "https", hostname: "crests.football-data.org" },
    ],
  },
};

export default nextConfig;
