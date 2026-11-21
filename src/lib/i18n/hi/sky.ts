/** Sky phases, the hero copy, the daily delta card and the routine switches. (Hindi) */
import type { sky as enSky } from "../en/sky";

export const sky: typeof enSky = {
  // ---- phases and hero copy
  phase: {
    window: "सौर मिश्रण का समय खुला है",
    morning: "सुबह का इनवर्ज़न शिखर",
    night: "रात में धुंध का जमाव",
    transition: "वायुमंडलीय बदलाव",
  },
  adviceSentence: (mode, minutes) =>
    mode === "sealed"
      ? `बाहर की हवा पूरे दिन 300 µg/m³ से ऊपर रहती है। खिड़कियाँ बंद रखें; कमरा घुटन भरा लगे तभी ${minutes} मिनट के लिए एक खिड़की खोलें, फिर फ़िल्टर को तेज़ चलाएँ।`
      : mode === "brief"
        ? `दोपहर का सबसे कम स्तर भी 250 µg/m³ से ऊपर है। ताज़ी हवा ${minutes} मिनट तक सीमित रखें, फिर फ़िल्टर को तेज़ चलाएँ।`
        : `दोपहर की अवधि के भीतर ${minutes} मिनट के लिए खिड़कियाँ खोलें, फिर बंद कर दें।`,
  heroWindow: (mode, minutes) =>
    mode === "normal"
      ? `दोपहर की रोशनी में ${minutes} मिनट के लिए खिड़कियाँ खोलें।`
      : mode === "brief"
        ? `खिड़कियाँ बंद रखें। ज़रूरी हो तो ${minutes} मिनट के लिए खोलें।`
        : "आज खिड़कियाँ बंद रखें। हवा साफ़ करने का काम फ़िल्टर को करने दें।",
  heroMorning: "सुबह के इनवर्ज़न में खिड़कियाँ बंद रखें।",
  heroNight: "रात की हवा को अपने बेडरूम के फ़िल्टर से साफ़ होने दें।",
  heroTransition: "आसमान बदलते समय भी घर के भीतर फ़िल्टर स्थिर चलाएँ।",
  subWindow: ({ advice, mean, pct, peak, aqi, cigs }) =>
    `${advice} उस अवधि में बाहर PM2.5 औसतन ${mean} µg/m³ रहता है, जो सुबह 07:00 से 10:00 के शिखर (${peak} µg/m³, AQI ${aqi}, लगभग ${cigs} सिगरेट प्रतिदिन) से क़रीब ${pct}% कम है।`,
  subMorning: (out, start, inn) =>
    `ठंडी ज़मीनी हवा धुआँ रोक लेती है; बाहर स्तर ${out} µg/m³ है। ${start} तक खिड़कियाँ न खोलें और फ़िल्टर चलता रखें; कमरे का अनुमान ${inn} µg/m³ है।`,
  subNight: (out, inn) => `रात भर बाहर हवा ${out} µg/m³ पर टिकी रहती है, जबकि आपके बंद कमरे का अनुमान ${inn} µg/m³ है।`,
  subTransition: (out, name, inn, span) =>
    `${name} में बाहर PM2.5 ${out} µg/m³ है। आपकी दिनचर्या घर के भीतर के स्तर को ${inn} µg/m³ के आसपास रखती है। अगली कम-धुंध अवधि ${span} है।`,
  outsideBasin: (hour) => `बाहर, ${hour}`,
  sanctuaryModelled: "आपका कमरा (अनुमानित)",
  hazeBadge: (pct) => `−${pct}% धुंध`,

  // ---- delta card
  deltaTitle: "दैनिक सुरक्षित-कमरा लाभ",
  cigEquivalent: "सिगरेट-समतुल्य",
  neverInhaled: "आज आपके परिवार ने जो साँस में नहीं ली",
  co2Shielded: "आपके सामान्य सफ़र की जगह दिल्ली मेट्रो से बचत",
  co2Hint: "इसे देखने के लिए सफ़र मेट्रो से करने का विकल्प चुनें",
  viewReceipt: "पूरी रसीद देखें",
  fullReceipt: "पूरी रसीद",
  stepEarly: "सुबह-सवेरे",
  stepBoundary: "परत ऊपर उठती है",
  stepOptimal: "सबसे अच्छा समय",
  stepEvening: "शाम में बढ़ता प्रदूषण",
  stepNight: "रात में फँसी धुंध",

  // ---- routine switches
  shiftsTitle: "दिनचर्या में बदलाव · असर देखने के लिए चालू करें",
  purgeTitle: "दोपहर में हवा बदलें",
  purgeActive: (h) => `सक्रिय अवधि ${h}`,
  purgeIdle: (h) => `${h} पर घर में हवा आने दें`,
  walkTitle: "सबसे कम प्रदूषण पर सैर",
  walkSub: (h) => `${h} पर 45 मिनट, N95 के साथ`,
  cookTitle: "इंडक्शन पर खाना",
  cookSub: (ug) => `खाना पकाने से बढ़ने वाले ${ug} µg/m³ को घटाता है`,
  commuteTitle: "मेट्रो + N95 मार्ग",
  commuteSub: (km, mode) => `${km} किमी, बनाम ${mode}`,
  switchOn: "✓ चालू",
  switchOff: "बंद",
  cigShort: "सिगरेट",
};
