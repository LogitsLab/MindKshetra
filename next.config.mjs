/**
 * Hosts that serve the production deployment but must not be indexed as a
 * second copy of the site. Page paths 308 to the brand domain; `/api/`,
 * `/auth/`, `/_next/` and `/.well-known/` are exempt because the mobile app's
 * API base and in-flight OAuth returns still use mind.logitslab.com, and a
 * cross-origin redirect drops the Authorization header.
 * Keep in sync with LEGACY_HOSTS in lib/site.ts.
 */
const LEGACY_HOSTS = ["mind\\.logitslab\\.com", "mindkshetra\\.vercel\\.app"];
const LEGACY_EXEMPT = "(?!api(?:/|$)|auth(?:/|$)|_next/|\\.well-known/)";

const SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  // Madhav's voice input needs the microphone; nothing uses the camera.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(self), geolocation=(self)",
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
  },
  async headers() {
    return [
      { source: "/:path*", headers: SECURITY_HEADERS },
      // public/ files are not content-hashed, so they shipped with
      // max-age=0 and were revalidated on every page view. A day of
      // freshness plus a week of stale-while-revalidate keeps edits visible
      // within a day without re-downloading the hero on every navigation.
      {
        source: "/:dir(images|brand|ornaments|icons)/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800",
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      // WS6 rename: the surface is /community now; shared /sangha links keep
      // working forever. (The sangha_attended event name is unchanged.)
      { source: "/sangha", destination: "/community", permanent: true },
      // Brand apex is mindkshetra.in; www is an alias, not a second origin.
      {
        source: "/",
        has: [{ type: "host", value: "www.mindkshetra.in" }],
        destination: "https://mindkshetra.in/",
        permanent: true,
      },
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.mindkshetra.in" }],
        destination: "https://mindkshetra.in/:path*",
        permanent: true,
      },
      // One canonical origin: legacy production hosts hand page traffic to
      // the brand domain (see LEGACY_HOSTS above for the exemptions).
      ...LEGACY_HOSTS.flatMap((host) => [
        {
          source: "/",
          has: [{ type: "host", value: host }],
          destination: "https://mindkshetra.in/",
          permanent: true,
        },
        {
          source: `/:path(${LEGACY_EXEMPT}.+)`,
          has: [{ type: "host", value: host }],
          destination: "https://mindkshetra.in/:path",
          permanent: true,
        },
      ]),
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
      // /panchang server-renders today's panchang (computeDailyPanchang).
      "/panchang": ["./ephemeris/**"],
      "/api/votd/**": ["./ephemeris/**"],
      "/api/cron/votd-email": ["./ephemeris/**"],
      "/api/cron/push-dispatch": ["./ephemeris/**"],
      "/api/panchang/**": ["./ephemeris/**"],
      // Madhav computes a chart inline when one is attached (app/api/chat
      // dynamically imports lib/astrology/engine). /api/astrology/** covers
      // the deprecated shim, not this route — so chart-linked replies were
      // computing under Moshier while the astrology pages used Swiss: two
      // different charts for one user, no error, and the health endpoint
      // cannot see it.
      "/api/chat": ["./ephemeris/**"],

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
