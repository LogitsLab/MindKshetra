export const ENGINE_VERSION = "2.0.0";

export type Relationship =
  | "self"
  | "spouse"
  | "child"
  | "friend"
  | "other";

export type Gender = "male" | "female" | "other" | "unspecified";

export type PlanetId =
  | "sun"
  | "moon"
  | "mars"
  | "mercury"
  | "jupiter"
  | "venus"
  | "saturn"
  | "rahu"
  | "ketu"
  | "ascendant";

export type SignId =
  | "aries"
  | "taurus"
  | "gemini"
  | "cancer"
  | "leo"
  | "virgo"
  | "libra"
  | "scorpio"
  | "sagittarius"
  | "capricorn"
  | "aquarius"
  | "pisces";

export type BirthInput = {
  name?: string;
  dob: string;
  tob: string | null;
  tobUnknown: boolean;
  placeLabel: string;
  lat: number;
  lng: number;
  ianaTz: string;
  utcOffsetMinutes: number;
  gender?: Gender | null;
};

export type PlanetPosition = {
  id: PlanetId;
  longitude: number;
  sign: SignId;
  signIndex: number;
  degreeInSign: number;
  nakshatra: string;
  nakshatraIndex: number;
  pada: number;
  house?: number;
  retrograde?: boolean;
};

export type HouseCusp = {
  house: number;
  longitude: number;
  sign: SignId;
  signIndex: number;
};

export type DashaPeriod = {
  lord: PlanetId;
  start: string;
  end: string;
  level: "maha" | "antar" | "pratyantar";
  children?: DashaPeriod[];
};

export type YogaFlag = {
  id: string;
  name: string;
  present: boolean;
  severity?: "info" | "caution" | "positive";
  detail: string;
};

export type KpSubLord = {
  starLord: PlanetId;
  subLord: PlanetId;
  subSubLord: PlanetId;
};

export type KpCusp = HouseCusp & KpSubLord;
export type KpPlanet = PlanetPosition & KpSubLord;

export type LifeArea =
  | "career"
  | "marriage"
  | "health"
  | "finance"
  | "education"
  | "travel";

export type AreaFact = {
  house: number;
  sign: SignId | null;
  lord: PlanetId | null;
  lordHouse: number | null;
  lordSign: SignId | null;
  occupants: PlanetId[];
  cuspStarLord?: PlanetId;
  cuspSubLord?: PlanetId;
};

export type EngineVerdict = {
  lifeArea: LifeArea;
  theme: string;
  timing: string;
  signals: string[];
  facts: {
    focusHouses: number[];
    houseDetails: AreaFact[];
    dashaSupports: boolean;
    mahaLord: PlanetId | null;
    antarLord: PlanetId | null;
    mahaWindow: string | null;
    antarWindow: string | null;
    significators: PlanetId[];
    strengths: string[];
    tensions: string[];
    narrativeBullets: string[];
  };
};

export type BlendedVerdict = {
  lifeArea: LifeArea;
  theme: string;
  timing: string;
  confidence: "high" | "medium" | "low";
  notes: string[];
  strengths: string[];
  tensions: string[];
  narrativeBullets: string[];
  dashaSupports: boolean;
  mahaLord: PlanetId | null;
  antarLord: PlanetId | null;
  mahaWindow: string | null;
  antarWindow: string | null;
};

export type AreaPrediction = {
  headline: string;
  overview: string;
  strengths: string[];
  watchouts: string[];
  now: string;
  nearTerm: string;
  guidance: string;
};

export type BirthPanchang = {
  tithi: string;
  tithiIndex: number;
  nakshatra: string;
  pada: number;
  yoga: string;
  yogaIndex: number;
  karana: string;
  vaar: string;
  vaarIndex: number;
};

export type DignityKind =
  | "exalted"
  | "debilitated"
  | "own"
  | "mooltrikona"
  | "neutral";

export type PlanetDignity = {
  planet: PlanetId;
  kind: DignityKind;
  label: { en: string; hi: string };
};

export type VargaChart = {
  ascendant: PlanetPosition | null;
  planets: PlanetPosition[];
};

export type TransitHit = {
  transitPlanet: PlanetId;
  natalPlanet: PlanetId;
  orb: number;
  aspect: "conjunction";
};

export type TransitSnapshot = {
  asOfDate: string;
  planets: Array<{
    id: PlanetId;
    longitude: number;
    sign: SignId;
    degreeInSign: number;
    retrograde: boolean;
  }>;
  hits: TransitHit[];
};

export type LalKitabDebt = {
  house: number;
  title: { en: string; hi: string };
  note: { en: string; hi: string };
  remedy: { en: string; hi: string };
  severity: "info" | "caution";
};

export type LalKitabReport = {
  fixedHouses: Array<{
    house: number;
    sign: SignId;
    occupants: PlanetId[];
  }>;
  debts: LalKitabDebt[];
  remedies: Array<{ en: string; hi: string; sourceHouse: number }>;
};

export type ChartPayload = {
  engineVersion: string;
  computedAt: string;
  /** Calendar date (UTC YYYY-MM-DD) used to resolve "current" dasha for this payload. */
  asOfDate: string;
  /** swiss | moshier — which ephemeris actually ran */
  ephemerisMode: "swiss" | "moshier";
  birth: BirthInput;
  jdUt: number;
  /** Lahiri ayanamsa (Vedic display path) */
  ayanamsa: number;
  /** Krishnamurti ayanamsa used for KP module (null if tob unknown) */
  ayanamsaKp: number | null;
  tobUnknown: boolean;
  planets: PlanetPosition[];
  ascendant: PlanetPosition | null;
  wholeSignHouses: HouseCusp[] | null;
  placidusCusps: HouseCusp[] | null;
  overview: {
    ascendantSign: SignId | null;
    moonSign: SignId;
    sunSign: SignId;
    currentMaha: DashaPeriod | null;
    currentAntar: DashaPeriod | null;
    currentPratyantar: DashaPeriod | null;
  };
  dasha: {
    balanceAtBirthDays: number;
    tree: DashaPeriod[];
  };
  yogas: YogaFlag[];
  kp: {
    cusps: KpCusp[];
    planets: KpPlanet[];
    significators: Array<{ house: number; significators: PlanetId[] }>;
  } | null;
  panchang: BirthPanchang | null;
  dignities: PlanetDignity[];
  vargas: {
    d9: VargaChart | null;
  };
  transits: TransitSnapshot | null;
  lalKitab: LalKitabReport | null;
  verdicts: {
    vedic: EngineVerdict[];
    kp: EngineVerdict[];
    blended: BlendedVerdict[];
  };
  predictionsText?: {
    language: "en" | "hi";
    portrait: string;
    areas: Record<LifeArea, AreaPrediction>;
    generatedAt: string;
  };
};

export type AstrologyMember = {
  id: string;
  userId: string;
  name: string;
  relationship: Relationship;
  dob: string;
  tob: string | null;
  tobUnknown: boolean;
  gender: Gender | null;
  placeLabel: string;
  lat: number;
  lng: number;
  ianaTz: string;
  utcOffsetMinutes: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type GeocodeResult = {
  label: string;
  lat: number;
  lng: number;
  ianaTz: string;
};
