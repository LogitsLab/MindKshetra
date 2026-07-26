/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["sweph"],

    // lib/astrology/swe.ts resolves the .se1 files at runtime with
    // path.join(process.cwd(), "ephemeris"). That is a runtime string, so Next's
    // output file tracing cannot discover it statically and the files would not
    // be bundled into the Lambda. Without this the deployed app silently falls
    // back to Moshier — different numbers, no error — while every local check
    // passes, because locally the working directory happens to contain them.
    //
    // Verify after deploy by reading the mode from PRODUCTION, not from a build
    // step: GET /api/astrology/health must report ephemeris.mode === "swiss"
    // (the route returns 503 otherwise). A build-time file-presence check would
    // pass trivially here and prove nothing.
    outputFileTracingIncludes: {
      "/api/astrology/**": ["./ephemeris/**"],
      "/astrology/**": ["./ephemeris/**"],
    },
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = config.externals || [];
      if (Array.isArray(config.externals)) {
        config.externals.push("sweph");
      }
    }
    return config;
  },
};

export default nextConfig;
