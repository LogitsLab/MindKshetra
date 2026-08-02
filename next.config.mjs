/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      // WS6 rename: the surface is /community now; shared /sangha links keep
      // working forever. (The sangha_attended event name is unchanged.)
      { source: "/sangha", destination: "/community", permanent: true },
    ];
  },
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
      // Nakshatra-driven VOTD (lib/day-seed.ts) reads the moon on every VOTD
      // surface; without these entries those lambdas silently fall back to
      // Moshier and can disagree with the astrology routes at a nakshatra
      // boundary. Same trap as documented in CLAUDE.md — keep them in sync.
      "/": ["./ephemeris/**"],
      "/verse-of-the-day": ["./ephemeris/**"],
      "/api/votd/**": ["./ephemeris/**"],
      "/api/cron/votd-email": ["./ephemeris/**"],
      "/api/cron/push-dispatch": ["./ephemeris/**"],
      "/api/panchang/**": ["./ephemeris/**"],

      // Same trap, different directory: lib/journeys/content.ts, lib/paths.ts
      // and lib/meditation.ts read data/ at REQUEST time with
      // process.cwd() + readdirSync. A directory scan cannot be traced even in
      // principle, and every read is wrapped in a swallow-and-return-empty
      // catch — so without these entries the journeys, paths and meditation
      // surfaces come up blank in production with nothing logged, while every
      // local build passes because the build container has the files.
      "/paths/**": ["./data/**"],
      "/meditation/**": ["./data/**"],
      "/sadhana": ["./data/**"],
      "/api/journeys/**": ["./data/**"],
      "/api/paths/**": ["./data/**"],
      "/api/meditation/**": ["./data/**"],
      "/api/account/milestones": ["./data/**"],
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
