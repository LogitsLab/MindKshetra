import type { GoalId, GuidanceStyleId } from "@/lib/personalization";

export type MadhavTodayFacts = {
  lang: "en" | "hi";
  displayName: string;
  votdRef: string | null;
  doneToday: string[];
  festivalLabel: string | null;
  isEkadashi: boolean;
  goals: GoalId[];
  guidanceStyle: GuidanceStyleId | null;
};

export type MadhavTodayCopy = {
  greeting: string;
  starters: string[];
  addressName: string;
};

export function addressName(
  displayName: string | null | undefined,
  lang: "en" | "hi"
): string {
  const n = (displayName ?? "").replace(/\s+/g, " ").trim().slice(0, 80);
  if (n) return n;
  return lang === "hi" ? "पार्थ" : "Parth";
}

export function fillName(template: string, name: string): string {
  return template.replaceAll("{name}", name);
}

function satToday(done: string[]): boolean {
  return done.some(
    (p) => p === "sit" || p === "flow" || p === "meditation" || p === "pranayama"
  );
}

function japadToday(done: string[]): boolean {
  return done.includes("japa");
}

function opening(facts: MadhavTodayFacts, name: string): string {
  const { lang } = facts;
  if (facts.festivalLabel) {
    return lang === "hi"
      ? `आज ${facts.festivalLabel} है, ${name}। मैं यहीं हूँ।`
      : `Today is ${facts.festivalLabel}, ${name}. I am here.`;
  }
  if (facts.isEkadashi) {
    return lang === "hi"
      ? `आज एकादशी है, ${name}। मैं यहीं हूँ।`
      : `It is Ekadashi, ${name}. I am here.`;
  }
  const japad = japadToday(facts.doneToday);
  const sat = satToday(facts.doneToday);
  if (japad && sat) {
    return lang === "hi"
      ? `आज बैठक और जप हो चुके, ${name}।`
      : `You already sat and japad today, ${name}.`;
  }
  if (japad) {
    return lang === "hi"
      ? `आज जप हो चुका, ${name}।`
      : `You already japad today, ${name}.`;
  }
  if (sat) {
    return lang === "hi"
      ? `आज बैठक हो चुकी, ${name}।`
      : `You already sat today, ${name}.`;
  }
  if (facts.votdRef) {
    return lang === "hi"
      ? `आज का श्लोक ${facts.votdRef} है, ${name}।`
      : `Today's verse is ${facts.votdRef}, ${name}.`;
  }
  return lang === "hi" ? `${name}, मैं माधव हूँ।` : `${name}, I am Madhav.`;
}

function question(facts: MadhavTodayFacts): string {
  const { lang } = facts;
  const practiced = facts.doneToday.length > 0;
  if (practiced) {
    return lang === "hi"
      ? "क्या वह बैठ गया, या अभी भी कुछ बोझ है?"
      : "Did that land, or is something still weighing?";
  }
  if (facts.isEkadashi || facts.festivalLabel) {
    return lang === "hi" ? "आज मैदान पर क्या है?" : "What is on the field today?";
  }
  if (facts.votdRef) {
    return lang === "hi"
      ? "इसके साथ बैठें, या जो बोझ है वह कहें?"
      : "Shall we sit with it, or tell me what weighs?";
  }
  return lang === "hi"
    ? "जो बोझ मन पर है, कहें। मैं वहीं मिलूँगा, गीता साथ लेकर।"
    : "Tell me what weighs on you. I will meet you there, with the Gita beside us.";
}

const GOAL_STARTER: Record<GoalId, { en: string; hi: string }> = {
  inner_peace: { en: "I want a quieter mind", hi: "मन शांत चाहिए" },
  stress_relief: { en: "Work is loud in my head", hi: "काम सिर में शोर मचा रहा है" },
  self_realization: { en: "I want to know who I am", hi: "जानना है मैं कौन हूँ" },
  devotion: { en: "Help me stay with Krishna today", hi: "आज कृष्ण के साथ रहना है" },
  purpose: { en: "I don't know what I'm for", hi: "समझ नहीं आता मैं किस लिए हूँ" },
  healing: { en: "I need to come back to myself", hi: "खुद के पास लौटना है" },
  knowledge: { en: "Help me sit with a verse", hi: "एक श्लोक के साथ बैठना है" },
  relationships: {
    en: "Something between us is stuck",
    hi: "हमारे बीच कुछ अटका है",
  },
  other: { en: "Something is on my mind", hi: "मन में कुछ है" },
};

function pickStarters(facts: MadhavTodayFacts): string[] {
  const { lang } = facts;
  const out: string[] = [];
  const add = (s: string) => {
    if (s && !out.includes(s) && out.length < 3) out.push(s);
  };

  if (facts.votdRef) {
    add(
      lang === "hi"
        ? `आज का श्लोक — ${facts.votdRef}`
        : `Today's verse — ${facts.votdRef}`
    );
  }

  if (facts.doneToday.length > 0) {
    add(
      lang === "hi" ? "बैठा पर मन नहीं बैठा" : "I sat but my mind didn't"
    );
  } else {
    add(lang === "hi" ? "आज अभी नहीं बैठा" : "I haven't sat yet");
  }

  if (facts.guidanceStyle === "practice_first") {
    add(
      lang === "hi"
        ? "एक छोटा अभ्यास बताएँ"
        : "Guide me through a short practice"
    );
  }

  const goal = facts.goals.find((id) => id !== "other") ?? facts.goals[0];
  if (goal) {
    const copy = GOAL_STARTER[goal];
    add(lang === "hi" ? copy.hi : copy.en);
  }

  add(lang === "hi" ? "एक बड़े निर्णय पर अटका हूँ" : "I'm stuck on a big decision");
  add(
    lang === "hi" ? "काम को लेकर चिंता हो रही है" : "I feel anxious about work"
  );

  return out.slice(0, 3);
}

export function composeMadhavToday(facts: MadhavTodayFacts): MadhavTodayCopy {
  const name = addressName(facts.displayName, facts.lang);
  return {
    addressName: name,
    greeting: `${opening(facts, name)}\n\n${question(facts)}`,
    starters: pickStarters(facts),
  };
}
