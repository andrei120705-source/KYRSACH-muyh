import { type GeoPoint, calcEtaWithRests, fetchRoadRoute } from './routing';
export type RoadType = 'toll' | 'free';
export interface CorridorOption { type: RoadType; roadName: string; via: GeoPoint[]; typicalKm: number; tollKm: number; tollRatePerKm: number; note: string; }
interface CorridorEntry { a: string; b: string; toll: CorridorOption; free: CorridorOption; }
const P = (lat: number, lng: number, label: string): GeoPoint => ({ lat, lng, label });
export const CORRIDORS: CorridorEntry[] = [
  { a: 'Москва', b: 'Санкт-Петербург', toll: { type: 'toll', roadName: 'М-11 «Нева» (платная)', via: [P(57.9836, 33.2536, 'Валдай')], typicalKm: 684, tollKm: 650, tollRatePerKm: 6.5, note: 'Скоростная платная трасса' }, free: { type: 'free', roadName: 'М-10 «Россия» (бесплатная)', via: [P(57.5886, 34.5646, 'Вышний Волочёк'), P(58.5215, 31.2755, 'Великий Новгород')], typicalKm: 705, tollKm: 0, tollRatePerKm: 0, note: 'Федеральная трасса, действует «Платон»' } },
  { a: 'Москва', b: 'Нижний Новгород', toll: { type: 'toll', roadName: 'М-12 «Восток» (платная)', via: [P(56.129, 40.4066, 'Владимир')], typicalKm: 420, tollKm: 400, tollRatePerKm: 6.0, note: 'Платная трасса М-12' }, free: { type: 'free', roadName: 'М-7 «Волга» (бесплатная)', via: [P(56.3573, 41.3171, 'Ковров')], typicalKm: 435, tollKm: 0, tollRatePerKm: 0, note: 'Федеральная трасса М-7' } },
  { a: 'Нижний Новгород', b: 'Казань', toll: { type: 'toll', roadName: 'М-12 «Восток» (платная)', via: [P(56.1439, 47.2489, 'Чебоксары')], typicalKm: 395, tollKm: 330, tollRatePerKm: 6.0, note: 'Платный участок М-12' }, free: { type: 'free', roadName: 'М-7 «Волга» (бесплатная)', via: [P(56.1439, 47.2489, 'Чебоксары')], typicalKm: 415, tollKm: 0, tollRatePerKm: 0, note: 'Федеральная трасса М-7' } },
  { a: 'Москва', b: 'Казань', toll: { type: 'toll', roadName: 'М-12 «Восток» (платная)', via: [P(56.129, 40.4066, 'Владимир'), P(56.2965, 43.9361, 'Нижний Новгород')], typicalKm: 820, tollKm: 780, tollRatePerKm: 6.0, note: 'Платная М-12' }, free: { type: 'free', roadName: 'М-7 «Волга» (бесплатная)', via: [P(56.129, 40.4066, 'Владимир'), P(56.2965, 43.9361, 'Нижний Новгород'), P(56.1439, 47.2489, 'Чебоксары')], typicalKm: 830, tollKm: 0, tollRatePerKm: 0, note: 'Федеральная трасса М-7' } },
  { a: 'Москва', b: 'Воронеж', toll: { type: 'toll', roadName: 'М-4 «Дон» (платная, Автодор)', via: [P(54.1931, 37.6173, 'Тула'), P(52.6088, 39.5992, 'Липецк')], typicalKm: 515, tollKm: 430, tollRatePerKm: 5.4, note: 'Платные участки М-4 «Дон»' }, free: { type: 'free', roadName: 'Альтернатива М-4 (бесплатная)', via: [P(54.1931, 37.6173, 'Тула'), P(52.9685, 38.5624, 'Ефремов')], typicalKm: 548, tollKm: 0, tollRatePerKm: 0, note: 'Объезд ПВП, действует «Платон»' } },
  { a: 'Воронеж', b: 'Ростов-на-Дону', toll: { type: 'toll', roadName: 'М-4 «Дон» (платная)', via: [P(50.4222, 39.9311, 'Павловск'), P(48.3275, 40.2647, 'Каменск-Шахтинский')], typicalKm: 563, tollKm: 380, tollRatePerKm: 5.2, note: 'Платные обходы Лосево и Павловска' }, free: { type: 'free', roadName: 'Старый ход М-4 (бесплатная)', via: [P(50.6833, 39.8833, 'Лосево'), P(48.3275, 40.2647, 'Каменск-Шахтинский')], typicalKm: 590, tollKm: 0, tollRatePerKm: 0, note: 'Бесплатный объезд ПВП' } },
  { a: 'Ростов-на-Дону', b: 'Краснодар', toll: { type: 'toll', roadName: 'М-4 «Дон» (платная)', via: [P(46.2833, 39.6167, 'Кущёвская')], typicalKm: 275, tollKm: 230, tollRatePerKm: 5.5, note: 'Платный участок М-4' }, free: { type: 'free', roadName: 'Р-268 через Тимашёвск (бесплатная)', via: [P(47.1078, 39.4165, 'Азов'), P(45.6167, 38.95, 'Тимашёвск')], typicalKm: 312, tollKm: 0, tollRatePerKm: 0, note: 'Региональный бесплатный маршрут' } },
  { a: 'Воронеж', b: 'Краснодар', toll: { type: 'toll', roadName: 'М-4 «Дон» (платная)', via: [P(47.2357, 39.7015, 'Ростов-на-Дону')], typicalKm: 830, tollKm: 610, tollRatePerKm: 5.3, note: 'Платные участки М-4' }, free: { type: 'free', roadName: 'Альтернатива М-4 + Р-268 (бесплатная)', via: [P(47.2357, 39.7015, 'Ростов-на-Дону'), P(45.6167, 38.95, 'Тимашёвск')], typicalKm: 885, tollKm: 0, tollRatePerKm: 0, note: 'Бесплатные объезды ПВП' } },
  { a: 'Москва', b: 'Ростов-на-Дону', toll: { type: 'toll', roadName: 'М-4 «Дон» (платная)', via: [P(51.6608, 39.2003, 'Воронеж')], typicalKm: 1075, tollKm: 810, tollRatePerKm: 5.3, note: 'Платная трасса М-4' }, free: { type: 'free', roadName: 'Бесплатные объезды М-4', via: [P(51.6608, 39.2003, 'Воронеж')], typicalKm: 1140, tollKm: 0, tollRatePerKm: 0, note: 'Объезд ПВП' } },
  { a: 'Москва', b: 'Краснодар', toll: { type: 'toll', roadName: 'М-4 «Дон» (платная)', via: [P(51.6608, 39.2003, 'Воронеж'), P(47.2357, 39.7015, 'Ростов-на-Дону')], typicalKm: 1350, tollKm: 1040, tollRatePerKm: 5.4, note: 'Платный коридор М-4' }, free: { type: 'free', roadName: 'Альтернативный ход М-4 + Р-268', via: [P(51.6608, 39.2003, 'Воронеж'), P(47.2357, 39.7015, 'Ростов-на-Дону'), P(45.6167, 38.95, 'Тимашёвск')], typicalKm: 1435, tollKm: 0, tollRatePerKm: 0, note: 'Бесплатный маршрут' } },
  { a: 'Москва', b: 'Минск', toll: { type: 'toll', roadName: 'Обход Одинцово + М-1 (BelToll РБ)', via: [P(54.7818, 32.0401, 'Смоленск')], typicalKm: 718, tollKm: 285, tollRatePerKm: 5.8, note: 'Платный обход Одинцово и BelToll' }, free: { type: 'free', roadName: 'М-1 «Беларусь» (без обхода РФ)', via: [P(55.5667, 36.7, 'Кубинка'), P(54.7818, 32.0401, 'Смоленск')], typicalKm: 734, tollKm: 0, tollRatePerKm: 0, note: 'Бесплатный проезд по РФ' } },
  { a: 'Казань', b: 'Екатеринбург', toll: { type: 'toll', roadName: 'М-12 «Восток» (Дюртюли — Ачит)', via: [P(55.7378, 52.4063, 'Набережные Челны'), P(56.7944, 57.8953, 'Ачит')], typicalKm: 925, tollKm: 415, tollRatePerKm: 5.8, note: 'Продолжение М-12' }, free: { type: 'free', roadName: 'М-7 + Р-242 через Пермь (бесплатная)', via: [P(56.8527, 53.2115, 'Ижевск'), P(58.0105, 56.2502, 'Пермь')], typicalKm: 985, tollKm: 0, tollRatePerKm: 0, note: 'Бесплатный маршрут' } },
  { a: 'Минск', b: 'Брест', toll: { type: 'toll', roadName: 'М-1 / E30 (BelToll РБ, платная)', via: [P(53.1327, 26.0139, 'Барановичи')], typicalKm: 350, tollKm: 335, tollRatePerKm: 4.9, note: 'BelToll для ТС > 3,5 т' }, free: { type: 'free', roadName: 'Р-2 / Р-43 (бесплатная)', via: [P(53.0333, 27.55, 'Слуцк'), P(52.1229, 26.0951, 'Пинск')], typicalKm: 412, tollKm: 0, tollRatePerKm: 0, note: 'Объезд BelToll' } },
  { a: 'Минск', b: 'Гомель', toll: { type: 'toll', roadName: 'М-5 (BelToll РБ, платная)', via: [P(53.1384, 29.2214, 'Бобруйск'), P(52.8926, 30.024, 'Жлобин')], typicalKm: 312, tollKm: 285, tollRatePerKm: 4.9, note: 'Трасса М-5 BelToll' }, free: { type: 'free', roadName: 'Р-43 / Р-31 (бесплатная)', via: [P(53.0333, 27.55, 'Слуцк'), P(52.1286, 29.3258, 'Калинковичи')], typicalKm: 368, tollKm: 0, tollRatePerKm: 0, note: 'Бесплатная альтернатива' } },
  { a: 'Минск', b: 'Гродно', toll: { type: 'toll', roadName: 'М-6 / E28 (BelToll РБ, платная)', via: [P(53.8879, 25.2997, 'Лида')], typicalKm: 278, tollKm: 255, tollRatePerKm: 4.9, note: 'Трасса М-6 BelToll' }, free: { type: 'free', roadName: 'Р-11 / Р-5 (бесплатная)', via: [P(53.596, 25.8256, 'Новогрудок')], typicalKm: 316, tollKm: 0, tollRatePerKm: 0, note: 'Бесплатный объезд' } },
  { a: 'Минск', b: 'Могилёв', toll: { type: 'toll', roadName: 'М-4 (BelToll РБ, платная)', via: [P(53.7058, 28.4318, 'Червень'), P(53.8333, 29.0, 'Березино')], typicalKm: 198, tollKm: 175, tollRatePerKm: 4.9, note: 'Трасса М-4 BelToll' }, free: { type: 'free', roadName: 'Р-53 / Р-19 (бесплатная)', via: [P(54.2279, 28.505, 'Борисов')], typicalKm: 232, tollKm: 0, tollRatePerKm: 0, note: 'Бесплатный объезд' } },
];
export const AVG_SPEED = { toll: 76, free: 62, generic: 66 } as const;
export interface CostParams { fuelPer100Km: number; fuelPrice: number; platonRate: number; federalShare: number; hourlyCost: number; tollRateOverride: number | null; }
export const DEFAULT_COST_PARAMS: CostParams = { fuelPer100Km: 32, fuelPrice: 67.5, platonRate: 3.05, federalShare: 0.9, hourlyCost: 450, tollRateOverride: null };
export interface LegPlan { from: string; to: string; tolled: boolean; hasCorridor: boolean; roadName: string; note: string; distanceKm: number; tollKm: number; tollRatePerKm: number; coordinates: Array<[number, number]>; viaLabels: string[]; }
export interface ScenarioPlan { mode: RoadType; legs: LegPlan[]; coordinates: Array<[number, number]>; distanceKm: number; tollKm: number; freeKm: number; isRealRoad: boolean; hasToll: boolean; }
function findCorridor(from: string | undefined, to: string | undefined): { entry: CorridorEntry; reversed: boolean } | null {
  if (!from || !to) return null;
  for (const entry of CORRIDORS) {
    if (entry.a === from && entry.b === to) return { entry, reversed: false };
    if (entry.a === to && entry.b === from) return { entry, reversed: true };
  }
  return null;
}
export async function planScenario(waypoints: GeoPoint[], mode: RoadType): Promise<ScenarioPlan> {
  const legs: LegPlan[] = []; let allReal = true;
  for (let i = 0; i < waypoints.length - 1; i++) {
    const from = waypoints[i], to = waypoints[i + 1], found = findCorridor(from.label, to.label);
    if (found) {
      const option = mode === 'toll' ? found.entry.toll : found.entry.free;
      const via = found.reversed ? [...option.via].reverse() : option.via;
      const route = await fetchRoadRoute([from, ...via, to]);
      const distanceKm = route.isRealRoad ? route.distanceKm : option.typicalKm;
      if (!route.isRealRoad) allReal = false;
      const tollKm = Math.min(distanceKm, Math.round(option.tollKm * (distanceKm / option.typicalKm)));
      legs.push({ from: from.label || '', to: to.label || '', tolled: option.type === 'toll', hasCorridor: true, roadName: option.roadName, note: option.note, distanceKm, tollKm, tollRatePerKm: option.tollRatePerKm, coordinates: route.coordinates, viaLabels: via.map((v) => v.label || '') });
    } else {
      const route = await fetchRoadRoute([from, to]); if (!route.isRealRoad) allReal = false;
      legs.push({ from: from.label || 'Точка', to: to.label || 'Точка', tolled: false, hasCorridor: false, roadName: 'Федеральные и региональные трассы', note: 'Нет платной в справочнике', distanceKm: route.distanceKm, tollKm: 0, tollRatePerKm: 0, coordinates: route.coordinates, viaLabels: [] });
    }
  }
  const distanceKm = legs.reduce((s, l) => s + l.distanceKm, 0), tollKm = legs.reduce((s, l) => s + l.tollKm, 0);
  return { mode, legs, coordinates: legs.flatMap((l) => l.coordinates), distanceKm, tollKm, freeKm: Math.max(0, distanceKm - tollKm), isRealRoad: allReal, hasToll: legs.some((l) => l.tolled) };
}
export interface ScenarioCosts { distanceKm: number; tollKm: number; freeKm: number; drivingHours: number; totalEtaHours: number; restStops: number; fuelLiters: number; fuelCost: number; tollCost: number; platonCost: number; roadCosts: number; timeCost: number; total: number; perKm: number; }
export function calcScenarioCosts(plan: ScenarioPlan, p: CostParams): ScenarioCosts {
  const distanceKm = plan.distanceKm, fuelLiters = Math.round((distanceKm / 100) * p.fuelPer100Km), fuelCost = Math.round(fuelLiters * p.fuelPrice);
  let tollCost = 0, platonKm = 0, drivingHours = 0;
  for (const leg of plan.legs) {
    const rate = p.tollRateOverride ?? leg.tollRatePerKm; tollCost += leg.tollKm * rate;
    const nonToll = Math.max(0, leg.distanceKm - leg.tollKm); platonKm += nonToll * p.federalShare;
    drivingHours += leg.tollKm / AVG_SPEED.toll + nonToll / (leg.hasCorridor ? AVG_SPEED.free : AVG_SPEED.generic);
  }
  tollCost = Math.round(tollCost); const platonCost = Math.round(platonKm * p.platonRate); drivingHours = Math.round(drivingHours * 10) / 10;
  const { mandatoryRestStops, totalEtaHours } = calcEtaWithRests(drivingHours);
  const timeCost = Math.round(drivingHours * p.hourlyCost), roadCosts = tollCost + platonCost, total = fuelCost + roadCosts + timeCost;
  return { distanceKm, tollKm: plan.tollKm, freeKm: plan.freeKm, drivingHours, totalEtaHours, restStops: mandatoryRestStops, fuelLiters, fuelCost, tollCost, platonCost, roadCosts, timeCost, total, perKm: distanceKm > 0 ? Math.round((total / distanceKm) * 10) / 10 : 0 };
}
export interface ScenarioComparison { cheaper: RoadType; savings: number; faster: RoadType; timeDiffHours: number; kmDiff: number; }
export function compareScenarios(toll: ScenarioCosts, free: ScenarioCosts): ScenarioComparison {
  return { cheaper: toll.total <= free.total ? 'toll' : 'free', savings: Math.abs(toll.total - free.total), faster: toll.totalEtaHours <= free.totalEtaHours ? 'toll' : 'free', timeDiffHours: Math.round(Math.abs(toll.totalEtaHours - free.totalEtaHours) * 10) / 10, kmDiff: Math.abs(toll.distanceKm - free.distanceKm) };
}
export function quickCompareCityPair(originCity: string, destinationCity: string, fallbackDistanceKm: number, fuelPer100Km = 32) {
  const found = findCorridor(originCity, destinationCity), params: CostParams = { ...DEFAULT_COST_PARAMS, fuelPer100Km };
  const mkPlan = (mode: RoadType, roadName: string, km: number, tollKm: number, rate: number, hasCorridor: boolean): ScenarioPlan => ({
    mode, legs: [{ from: originCity, to: destinationCity, tolled: mode === 'toll', hasCorridor, roadName, note: '', distanceKm: km, tollKm, tollRatePerKm: rate, coordinates: [], viaLabels: [] }],
    coordinates: [], distanceKm: km, tollKm, freeKm: Math.max(0, km - tollKm), isRealRoad: hasCorridor, hasToll: mode === 'toll',
  });
  if (found) {
    const t = found.entry.toll, f = found.entry.free;
    const tc = calcScenarioCosts(mkPlan('toll', t.roadName, t.typicalKm, t.tollKm, t.tollRatePerKm, true), params);
    const fc = calcScenarioCosts(mkPlan('free', f.roadName, f.typicalKm, 0, 0, true), params);
    return { hasTollCorridor: true, tollRoadName: t.roadName, freeRoadName: f.roadName, toll: tc, free: fc, comparison: compareScenarios(tc, fc) };
  }
  const dist = Math.max(50, fallbackDistanceKm), estTollKm = Math.round(dist * 0.65), freeDist = Math.round(dist * 1.05);
  const tc = calcScenarioCosts(mkPlan('toll', 'Платные участки (расчёт)', dist, estTollKm, 5.5, false), params);
  const fc = calcScenarioCosts(mkPlan('free', 'Бесплатная трасса («Платон»)', freeDist, 0, 0, false), params);
  return { hasTollCorridor: false, tollRoadName: 'Платные участки (расчёт)', freeRoadName: 'Бесплатная трасса («Платон»)', toll: tc, free: fc, comparison: compareScenarios(tc, fc) };
}
