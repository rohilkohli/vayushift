/**
 * Cities a visitor can pick when they do not want to share their location. Coordinates are city centres; the live
 * forecast for each is fetched from the same Google Air Quality API as "My location", so a Mumbai visitor never
 * sees Delhi's air. The list covers the large, smog-affected metros the problem statement names, plus other big cities.
 */
export interface City {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

export const CITIES: readonly City[] = [
  { id: "delhi", name: "Delhi", lat: 28.6139, lng: 77.209 },
  { id: "noida", name: "Noida", lat: 28.5355, lng: 77.391 },
  { id: "gurugram", name: "Gurugram", lat: 28.4595, lng: 77.0266 },
  { id: "mumbai", name: "Mumbai", lat: 19.076, lng: 72.8777 },
  { id: "kolkata", name: "Kolkata", lat: 22.5726, lng: 88.3639 },
  { id: "lucknow", name: "Lucknow", lat: 26.8467, lng: 80.9462 },
  { id: "patna", name: "Patna", lat: 25.5941, lng: 85.1376 },
  { id: "jaipur", name: "Jaipur", lat: 26.9124, lng: 75.7873 },
  { id: "ahmedabad", name: "Ahmedabad", lat: 23.0225, lng: 72.5714 },
  { id: "pune", name: "Pune", lat: 18.5204, lng: 73.8567 },
  { id: "hyderabad", name: "Hyderabad", lat: 17.385, lng: 78.4867 },
  { id: "bengaluru", name: "Bengaluru", lat: 12.9716, lng: 77.5946 },
  { id: "chennai", name: "Chennai", lat: 13.0827, lng: 80.2707 },
];

export const cityById = (id: string): City | undefined => CITIES.find((c) => c.id === id);
