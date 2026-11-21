/** The household form and the guidance for who is at home. (Hindi) */
import type { household as enHousehold } from "../en/household";

export const household: typeof enHousehold = {
  // ---- household form
  household: "आपका परिवार",
  people: "घर में लोग",
  commuteKm: "आना-जाना, कुल किमी",
  usualCommute: "सामान्य सफ़र का साधन",
  cooking: "खाना पकाना",
  whoLives: "घर में कौन रहता है",
  hasChildren: "बच्चे (12 वर्ष से कम)",
  hasSeniors: "बुज़ुर्ग (65+)",
  hasRespiratory: "दमा, हृदय या फेफड़ों की बीमारी",
  vulnerableNote: "संवेदनशील लोग अतिरिक्त सावधानी रखें। यह ऐप आपके डॉक्टर की सलाह का विकल्प नहीं है।",

  personalTitle: "आपके परिवार के लिए बाहर जाने की सलाह",
  personalIntro: (time) => `${time} के लिए। बच्चों, बुज़ुर्गों और फेफड़ों या हृदय के मरीज़ों के लिए सीमाएँ ज़्यादा सख़्त हैं।`,
  groupName: {
    children: "बच्चे",
    seniors: "बुज़ुर्ग",
    respiratory: "दमा, हृदय या फेफड़ों की बीमारी",
    adults: "स्वस्थ वयस्क",
  },
  personalLine: ({ nowLevel, bestLevel, nowAqi, best, bestAqi, minutes }) =>
    nowLevel === "ok"
      ? `अभी बाहर खेलना और टहलना ठीक है (AQI ${nowAqi})।`
      : nowLevel === "limit"
        ? `अभी बाहर सिर्फ़ ${minutes} मिनट हल्की गतिविधि करें (AQI ${nowAqi})। आज का सबसे अच्छा समय: ${best} (AQI ${bestAqi})।`
        : bestLevel === "indoors"
          ? `पूरे दिन घर के अंदर रहें: सबसे अच्छा घंटा ${best} भी AQI ${bestAqi} है।`
          : `अभी घर के अंदर रहें (AQI ${nowAqi})। बाहर जाना ही पड़े तो ${best} सबसे अच्छा है (AQI ${bestAqi})।`,
  personalMask: "बाहर जाएँ तो फिट बैठने वाला N95 मास्क पहनें।",
  airingShort: (minutes, aqi) =>
    `घर में कोई संवेदनशील सदस्य है, इसलिए कम-स्मॉग वाली खिड़की में भी (उसका औसत AQI ${aqi} है) घर को सिर्फ़ ${minutes} मिनट हवादार करें और तब तक उन्हें दूसरे कमरे में रखें।`,
  commuteMode: {
    private_petrol_car: "पेट्रोल कार",
    private_diesel_car: "डीज़ल कार",
    auto_rickshaw: "ऑटो-रिक्शा",
    two_wheeler: "दोपहिया",
  },
  fuel: {
    lpg_unvented: "एलपीजी, बिना चिमनी",
    lpg_chimney: "एलपीजी, चिमनी के साथ",
    electric_induction: "इंडक्शन",
  },
};
