export interface GeoPoint { lat: number; lng: number; label?: string; }
export interface RoadRouteResult { coordinates: Array<[number, number]>; distanceKm: number; durationHours: number; isRealRoad: boolean; }
const routeCache = new Map<string, RoadRouteResult>();
function haversineKm(a: GeoPoint, b: GeoPoint): number {
  const R = 6371, dLat = ((b.lat - a.lat) * Math.PI) / 180, dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
function buildFallbackRoute(waypoints: GeoPoint[]): RoadRouteResult {
  const coords: Array<[number, number]> = []; let totalKm = 0;
  for (let i = 0; i < waypoints.length - 1; i++) {
    const a = waypoints[i], b = waypoints[i + 1]; totalKm += haversineKm(a, b) * 1.18;
    for (let s = 0; s < 16; s++) { const t = s / 16; coords.push([a.lat + (b.lat - a.lat) * t, a.lng + (b.lng - a.lng) * t]); }
  }
  const last = waypoints[waypoints.length - 1]; if (last) coords.push([last.lat, last.lng]);
  const dist = Math.round(totalKm);
  return { coordinates: coords, distanceKm: dist, durationHours: Math.round((dist / 68) * 10) / 10, isRealRoad: false };
}
export async function fetchRoadRoute(waypoints: GeoPoint[]): Promise<RoadRouteResult> {
  if (waypoints.length < 2) return { coordinates: [], distanceKm: 0, durationHours: 0, isRealRoad: false };
  const key = waypoints.map((p) => `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`).join(';');
  const cached = routeCache.get(key); if (cached) return cached;
  try {
    const coordStr = waypoints.map((p) => `${p.lng.toFixed(5)},${p.lat.toFixed(5)}`).join(';');
    const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${coordStr}?overview=full&geometries=geojson`, { signal: controller.signal });
    clearTimeout(timer); if (!res.ok) throw new Error('OSRM error');
    const data = await res.json(); const route = data?.routes?.[0];
    if (!route?.geometry?.coordinates?.length) throw new Error('Empty route');
    const result: RoadRouteResult = {
      coordinates: route.geometry.coordinates.map(([lng, lat]: [number, number]) => [lat, lng]),
      distanceKm: Math.max(1, Math.round(route.distance / 1000)), durationHours: Math.round((route.duration / 3600) * 10) / 10, isRealRoad: true,
    };
    routeCache.set(key, result); return result;
  } catch { const fb = buildFallbackRoute(waypoints); routeCache.set(key, fb); return fb; }
}
export function interpolateAlongPolyline(coords: Array<[number, number]>, progressPercent: number): { point: [number, number]; completed: Array<[number, number]> } {
  if (coords.length === 0) return { point: [55.7558, 37.6173], completed: [] };
  if (coords.length === 1) return { point: coords[0], completed: [coords[0]] };
  const ratio = Math.max(0.02, Math.min(0.99, progressPercent / 100));
  const exactIdx = ratio * (coords.length - 1), idx = Math.floor(exactIdx), frac = exactIdx - idx;
  const a = coords[idx], b = coords[Math.min(coords.length - 1, idx + 1)];
  const point: [number, number] = [a[0] + (b[0] - a[0]) * frac, a[1] + (b[1] - a[1]) * frac];
  return { point, completed: [...coords.slice(0, idx + 1), point] };
}
export interface TruckRouteMetrics { distanceKm: number; drivingHoursTruck: number; mandatoryRestStops: number; totalEtaHours: number; fuelLiters: number; fuelCostRub: number; platonTollRub: number; recommendedRateRub: number; }
export function calcTruckTripMetrics(distanceKm: number, fuelPer100Km = 32, ratePerKm = 82): TruckRouteMetrics {
  const dist = Math.max(1, distanceKm), drivingHoursTruck = Math.round((dist / 66) * 10) / 10;
  const mandatoryRestStops = Math.floor(drivingHoursTruck / 4.5), overnightRests = Math.floor(drivingHoursTruck / 9);
  const totalEtaHours = Math.round((drivingHoursTruck + mandatoryRestStops * 0.75 + overnightRests * 10.25) * 10) / 10;
  const fuelLiters = Math.round((dist / 100) * fuelPer100Km), fuelCostRub = Math.round(fuelLiters * 67.5), platonTollRub = Math.round(dist * 3.05);
  return { distanceKm: dist, drivingHoursTruck, mandatoryRestStops, totalEtaHours, fuelLiters, fuelCostRub, platonTollRub, recommendedRateRub: Math.max(18000, Math.round(dist * ratePerKm + platonTollRub)) };
}
export function calcEtaWithRests(drivingHours: number): { mandatoryRestStops: number; totalEtaHours: number } {
  const mandatoryRestStops = Math.floor(drivingHours / 4.5), overnightRests = Math.floor(drivingHours / 9);
  return { mandatoryRestStops, totalEtaHours: Math.round((drivingHours + mandatoryRestStops * 0.75 + overnightRests * 10.25) * 10) / 10 };
}
