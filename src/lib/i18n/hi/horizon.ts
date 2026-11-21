/** The 24-hour horizon chart and the impact bar. (Hindi) */
import type { horizon as enHorizon } from "../en/horizon";

export const horizon: typeof enHorizon = {
  // ---- 24-hour horizon
  horizonTitle: "24 घंटे का वायुमंडलीय क्षितिज खिसकाएँ",
  jumpTo: (h) => `${h} की सुरक्षित अवधि पर जाएँ`,
  pause: "आसमान रोकें",
  play: "24 घंटे का आसमान चलाएँ",
  chartTitle: "24 घंटे में बाहर और भीतर का PM2.5",
  chartDesc: ({ start, end, mean, time, out, inn }) =>
    `ठोस रेखा: बाहर का PM2.5। टूटी रेखा: कमरे के भीतर का अनुमानित PM2.5। सबसे कम 90 मिनट की अवधि ${start} से ${end}, ${mean} माइक्रोग्राम प्रति घन मीटर। चुना गया समय ${time}: बाहर ${out}, भीतर ${inn}।`,
  hourOfDay: "दिन का घंटा",
  valueText: (time, out, inn) => `${time}, बाहर PM2.5 ${out} माइक्रोग्राम प्रति घन मीटर, भीतर ${inn}`,
  legendOutdoor: "बाहर का PM2.5",
  legendIndoor: "आपका कमरा (अनुमानित)",
  legendWindow: "कम-धुंध की अवधि",
  viewTable: "घंटे-वार मान तालिका में देखें",
  tableCaption: "घंटे-वार बाहरी PM2.5, AQI और कमरे का अनुमानित PM2.5",
  thHour: "घंटा",
  thOutdoor: "बाहर µg/m³",
  thAqi: "AQI",
  thIndoor: "भीतर µg/m³",

  // ---- impact bar
  impactAria: "आज का असर",
  impactLabel: "आपका असर",
  impactEmpty: "बचत देखने के लिए कोई दिनचर्या-बदलाव चालू करें या फ़िल्टर चुनें।",
  lungsProtected: "सुरक्षित फेफड़े",
  cigEqTitle: "सिगरेट-समतुल्य",
  cigEqPerDay: "सिगरेट-समतुल्य",
  perDay: "/दिन",
  skyProtected: "सुरक्षित आसमान",
  co2PerDay: "ग्राम CO₂/दिन",
  receiptShort: "रसीद",
};
