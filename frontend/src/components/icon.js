import L from "leaflet";

// 🏭 Warehouse icon
export const warehouseIcon = L.divIcon({
  html: "🏭",
  className: "text-2xl", // Tailwind for size
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

// 🏍️ Two-wheeler icon
export const bikeIcon = L.divIcon({
  html: "🏍️",
  className: "text-2xl",
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

// 🚗 Four-wheeler icon
export const carIcon = L.divIcon({
  html: "🚗",
  className: "text-2xl",
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});
