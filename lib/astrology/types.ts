export const ENGINE_VERSION = "1.2.0";

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

export type ChartPayload = {
  engineVersion: string;
  computedAt: string;
  /** Calendar date (UTC YYYY-MM-DD) used to resolve "current" dasha for this payload. */
  asOfDate: string;
  birth: BirthInput;
  jdUt: number;
  ayanamsa: number;
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
  } | null;
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
