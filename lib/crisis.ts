export type CrisisResult = {
  detected: boolean;
  responseEn: string;
  responseHi: string;
};

const PATTERNS = [
  /\b(kill myself|suicide|suicidal|end my life|want to die|don't want to live|dont want to live)\b/i,
  /\b(self[- ]?harm|hurt myself|cutting myself)\b/i,
  /\b(no reason to live|better off dead)\b/i,
  /खुद को मार|आत्महत्या|जीना नहीं|मरना चाह|जीवन समाप्त/i,
];

const RESPONSE_EN = `I hear that you are going through something very heavy right now. Your life matters, and you deserve real support from someone who can be with you.

Please reach out now:
• iCall (India): 9152987821
• Vandrevala Foundation: 1860-2662-345 or 9999-666-555 (24/7)
• Emergency: 112

If you can, tell one trusted person how you feel today. I can still share what the Gita teaches about enduring pain — but please seek human help first.`;

const RESPONSE_HI = `मैं समझता हूँ कि आप बहुत भारी समय से गुज़र रहे हैं। आपका जीवन महत्वपूर्ण है, और आपको वास्तविक सहारे की ज़रूरत है।

कृपया अभी संपर्क करें:
• iCall (भारत): 9152987821
• वंद्रेवाला फाउंडेशन: 1860-2662-345 या 9999-666-555 (२४/७)
• आपातकाल: 112

यदि संभव हो, किसी भरोसेमंद व्यक्ति से अपनी बात कहें। मैं गीता की शिक्षा भी साझा कर सकता हूँ — पर पहले मानवीय सहायता लें।`;

export function detectCrisis(text: string): CrisisResult {
  const detected = PATTERNS.some((p) => p.test(text));
  return {
    detected,
    responseEn: RESPONSE_EN,
    responseHi: RESPONSE_HI,
  };
}

export function crisisResponse(lang: "en" | "hi"): string {
  return lang === "hi" ? RESPONSE_HI : RESPONSE_EN;
}
