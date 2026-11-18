/** Citations surfaced in the UI "How is this calculated?" drawer. */
export interface Source {
  id: string;
  label: string;
  url: string;
  supports: string;
}

export const SOURCES: Record<string, Source> = {
  berkeley: {
    id: "berkeley",
    label: "Berkeley Earth cigarette equivalence",
    url: "https://www.aqitocigarettescalculator.org/blog/aqi-cigarettes-science",
    supports: "22 µg/m³ PM2.5 for 24 h ≈ 1 cigarette (a communication heuristic, not a clinical measure).",
  },
  diurnal: {
    id: "diurnal",
    label: "Five-city diurnal PM2.5 study (PMC)",
    url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC7417276/",
    supports: "Winter PM2.5 peaks 07:00-10:00 and bottoms out 15:00-16:00 as the boundary layer deepens.",
  },
  crbox: {
    id: "crbox",
    label: "Classroom filtration study (ChemRxiv)",
    url: "https://chemrxiv.org/doi/10.26434/chemrxiv-2022-77x33",
    supports: "Four-filter Corsi-Rosenthal boxes cut indoor PM2.5 mass by more than 70%.",
  },
  asu: {
    id: "asu",
    label: "ASU 2024 DIY filter study",
    url: "https://news.asu.edu/20240607-health-and-medicine-new-research-diy-air-filters-work-better-commercial-hepa-filters",
    supports: "Single-filter MERV-13 box fan reduced PM2.5 by 43.3%.",
  },
  brown: {
    id: "brown",
    label: "Brown SPH Corsi-Rosenthal study",
    url: "https://sph.brown.edu/news/2023-01-09/corsi-rosenthal-boxes",
    supports: "Box-fan filters add about +5 dB by day and +10 dB at night.",
  },
  cooking: {
    id: "cooking",
    label: "LPG vs induction cooking trial (medRxiv)",
    url: "https://www.medrxiv.org/content/10.1101/2023.04.10.23288249v1.full",
    supports: "LPG cooking raised personal PM2.5 and NO2 exposure versus induction.",
  },
  metro: {
    id: "metro",
    label: "TERI / DMRC metro CO2 study (Times of India)",
    url: "https://timesofindia.indiatimes.com/city/delhi/travel-by-delhi-metro-cuts-32gm-of-co2-per-km/articleshow/102588932.cms",
    supports: "Delhi Metro saves about 32.4 g CO2 per passenger-km versus private transport.",
  },
  grap: {
    id: "grap",
    label: "CAQM GRAP schedule",
    url: "https://caqm.nic.in/",
    supports: "GRAP stage thresholds (AQI 201 / 301 / 401 / 450). Always confirm current orders with CAQM.",
  },
};
