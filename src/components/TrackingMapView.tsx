import React, { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import { Coins, ExternalLink, Layers, Maximize2, Minimize2, Navigation, PanelRightClose, PanelRightOpen, Pause, Play, Plus, RefreshCw, Route, Trash2, Truck } from 'lucide-react';
import { api } from '../api/client';
import { BODY_TYPE_LABELS, type BodyType, CITY_GEO, type Client, ORDER_STATUS_META, type Order, POPULAR_CITIES, formatMoney, formatNumber } from '../types/logistics';
import { type GeoPoint, type RoadRouteResult, calcTruckTripMetrics, fetchRoadRoute, interpolateAlongPolyline } from '../utils/routing';
import { DEFAULT_COST_PARAMS, type RoadType, type ScenarioPlan, calcScenarioCosts, compareScenarios, planScenario } from '../utils/tollRoads';
import { useToast } from './ToastProvider';

type MapLayerType = 'google_roads' | 'google_hybrid' | 'osm';
const TILE_LAYERS: Record<MapLayerType, { label: string; url: string; subdomains: string[]; attribution: string }> = {
  google_roads: { label: 'Google Карта', url: 'https://mt{s}.google.com/vt/lyrs=m&hl=ru&x={x}&y={y}&z={z}', subdomains: ['0', '1', '2', '3'], attribution: '© Google Maps' },
  google_hybrid: { label: 'Спутник', url: 'https://mt{s}.google.com/vt/lyrs=y&hl=ru&x={x}&y={y}&z={z}', subdomains: ['0', '1', '2', '3'], attribution: '© Google Satellite' },
  osm: { label: 'OSM', url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', subdomains: ['a', 'b', 'c'], attribution: '© OpenStreetMap' },
};

export function TrackingMapView({ orders, clients, onOpenOrder, onDataChanged }: { orders: Order[]; clients: Client[]; onOpenOrder: (id: number) => void; onDataChanged: () => void }) {
  const { notify } = useToast();
  const activeOrders = useMemo(() => orders.filter((o) => ['assigned', 'loading', 'in_transit', 'delivered'].includes(o.status)), [orders]);
  const [panelMode, setPanelMode] = useState<'trips' | 'planner'>('trips');
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(activeOrders[0]?.id ?? null);
  const [layerType, setLayerType] = useState<MapLayerType>('google_roads');
  const [orderRoutes, setOrderRoutes] = useState<Record<number, RoadRouteResult>>({});
  const [simRunning, setSimRunning] = useState(false);
  const [simProgress, setSimProgress] = useState<Record<number, number>>({});
  const [plannerStops, setPlannerStops] = useState<string[]>(['Минск', 'Москва']);
  const [plannerBody, setPlannerBody] = useState<BodyType>('tent');
  const [roadMode, setRoadMode] = useState<RoadType>('toll');
  const [scenarios, setScenarios] = useState<Partial<Record<RoadType, ScenarioPlan>>>({});
  const [routingBusy, setRoutingBusy] = useState(false);

  const selectedOrder = activeOrders.find((o) => o.id === selectedId) || activeOrders[0] || null;
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const overlayGroupRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    const map = L.map(mapContainerRef.current, { center: [55.0, 34.0], zoom: 5 });
    overlayGroupRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => { const t = setTimeout(() => mapRef.current?.invalidateSize(), 200); return () => clearTimeout(t); }, [rightCollapsed]);

  useEffect(() => {
    const map = mapRef.current; if (!map) return;
    if (tileLayerRef.current) map.removeLayer(tileLayerRef.current);
    const cfg = TILE_LAYERS[layerType];
    tileLayerRef.current = L.tileLayer(cfg.url, { maxZoom: 19, subdomains: cfg.subdomains, attribution: cfg.attribution }).addTo(map);
  }, [layerType]);

  useEffect(() => {
    let cancel = false;
    (async () => {
      for (const o of activeOrders) {
        if (orderRoutes[o.id]) continue;
        const from = CITY_GEO[o.origin_city], to = CITY_GEO[o.destination_city];
        if (!from || !to) continue;
        const r = await fetchRoadRoute([from, to]);
        if (!cancel) setOrderRoutes((p) => ({ ...p, [o.id]: r }));
      }
    })();
    return () => { cancel = true; };
  }, [activeOrders]);

  useEffect(() => {
    if (panelMode !== 'planner') return;
    const pts: GeoPoint[] = plannerStops.map((c) => CITY_GEO[c] ? { ...CITY_GEO[c], label: c } : null).filter((x): x is { lat: number; lng: number; region: string; label: string } => Boolean(x));
    if (pts.length < 2) return;
    setRoutingBusy(true);
    Promise.all([planScenario(pts, 'toll'), planScenario(pts, 'free')])
      .then(([toll, free]) => {
        setScenarios({ toll, free });
        const all = [...toll.coordinates, ...free.coordinates];
        if (mapRef.current && all.length > 1) mapRef.current.flyToBounds(all as L.LatLngBoundsExpression, { padding: [50, 50], duration: 0.6, maxZoom: 8 });
      })
      .finally(() => setRoutingBusy(false));
  }, [panelMode, plannerStops]);

  useEffect(() => {
    if (!simRunning) return;
    const id = setInterval(() => {
      setSimProgress((prev) => {
        const next = { ...prev };
        for (const o of activeOrders) { const cur = prev[o.id] ?? o.progress_percent; next[o.id] = cur >= 98 ? 10 : cur + 2; }
        return next;
      });
    }, 650);
    return () => clearInterval(id);
  }, [simRunning, activeOrders]);

  useEffect(() => {
    const group = overlayGroupRef.current; if (!group) return;
    group.clearLayers();
    Object.entries(CITY_GEO).forEach(([city, geo]) => {
      L.circleMarker([geo.lat, geo.lng], { radius: 4.5, color: '#0f172a', weight: 2, fillColor: '#fff', fillOpacity: 1 }).bindTooltip(city).addTo(group);
    });
    if (panelMode === 'planner' && scenarios[roadMode]) {
      const alt = scenarios[roadMode === 'toll' ? 'free' : 'toll'];
      alt?.legs.forEach((l) => l.coordinates.length > 1 && L.polyline(l.coordinates, { color: l.tolled ? '#f59e0b' : '#10b981', weight: 3, opacity: 0.4, dashArray: '6 8' }).addTo(group));
      scenarios[roadMode]?.legs.forEach((l) => {
        if (l.coordinates.length < 2) return;
        L.polyline(l.coordinates, { color: l.tolled ? '#f59e0b' : '#10b981', weight: 6, opacity: 0.92 }).bindTooltip(`${l.roadName}: ${l.distanceKm} км`).addTo(group);
      });
      return;
    }
    activeOrders.forEach((o) => {
      const from = CITY_GEO[o.origin_city], to = CITY_GEO[o.destination_city]; if (!from || !to) return;
      const route = orderRoutes[o.id], coords: Array<[number, number]> = route?.coordinates?.length ? route.coordinates : [[from.lat, from.lng], [to.lat, to.lng]];
      const prog = Math.round(simProgress[o.id] ?? o.progress_percent);
      const { point, completed } = interpolateAlongPolyline(coords, prog);
      const color = o.status === 'in_transit' ? '#2563eb' : '#d97706';
      L.polyline(coords, { color, weight: 3, opacity: 0.35, dashArray: '8 8' }).on('click', () => setSelectedId(o.id)).addTo(group);
      L.polyline(completed, { color, weight: 5, opacity: 0.9 }).on('click', () => setSelectedId(o.id)).addTo(group);
      const icon = L.divIcon({ className: 'custom-truck-div-icon', html: `<div class="truck-marker-wrap"><div class="truck-marker-dot" style="background:${color};color:${color};"></div><div class="truck-marker-label">${o.order_number.replace('ТР-2026-', '#')} · ${prog}%</div></div>`, iconSize: [120, 24], iconAnchor: [8, 12] });
      L.marker(point, { icon }).on('click', () => setSelectedId(o.id)).addTo(group);
    });
  }, [activeOrders, orderRoutes, simProgress, panelMode, scenarios, roadMode]);

  const costParams = { ...DEFAULT_COST_PARAMS, fuelPer100Km: plannerBody === 'ref' ? 36 : plannerBody === 'tank' ? 38 : 32 };
  const tollCosts = scenarios.toll ? calcScenarioCosts(scenarios.toll, costParams) : null;
  const freeCosts = scenarios.free ? calcScenarioCosts(scenarios.free, costParams) : null;
  const cmp = tollCosts && freeCosts ? compareScenarios(tollCosts, freeCosts) : null;
  const chosenCosts = roadMode === 'toll' ? tollCosts : freeCosts;
  const selectedMetrics = selectedOrder ? calcTruckTripMetrics(orderRoutes[selectedOrder.id]?.distanceKm || selectedOrder.distance_km) : null;

  return (
    <div className="flex flex-col xl:flex-row gap-4">
      <div className="flex-1 min-w-0 rounded-2xl bg-white border border-slate-200 p-4 shadow-sm flex flex-col">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h3 className="text-base font-bold flex items-center gap-2"><Navigation className="w-4 h-4 text-blue-600" /> Google Карта и маршруты</h3>
          <div className="flex flex-wrap items-center gap-1.5">
            {panelMode === 'trips' && <button onClick={() => setSimRunning((s) => !s)} className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold ${simRunning ? 'bg-amber-500 text-white' : 'bg-emerald-600 text-white'}`}>{simRunning ? <><Pause className="w-3.5 h-3.5" />Пауза</> : <><Play className="w-3.5 h-3.5" />Live</>}</button>}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl"><Layers className="w-3.5 h-3.5 text-slate-500 ml-1 hidden sm:block" />{(Object.keys(TILE_LAYERS) as MapLayerType[]).map((k) => (<button key={k} onClick={() => setLayerType(k)} className={`px-2 py-1 rounded-lg text-[11px] font-semibold ${layerType === k ? 'bg-slate-900 text-white' : 'text-slate-600'}`}>{TILE_LAYERS[k].label}</button>))}</div>
            <button onClick={() => setRightCollapsed((c) => !c)} className="p-1.5 rounded-xl border border-slate-200 text-slate-700">{rightCollapsed ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}</button>
          </div>
        </div>
        <div className="relative rounded-xl overflow-hidden border border-slate-200 flex-1 min-h-[460px]">
          <div ref={mapContainerRef} className="w-full h-full min-h-[460px]" />
          {routingBusy && <div className="absolute top-3 right-3 z-[400] px-3 py-1.5 rounded-xl bg-slate-900/90 text-white text-xs font-semibold">Прокладка маршрута...</div>}
        </div>
      </div>

      {rightCollapsed ? (
        <div className="xl:w-14 rounded-2xl bg-white border border-slate-200 p-2 flex xl:flex-col items-center gap-2">
          <button onClick={() => setRightCollapsed(false)} className="p-2 rounded-xl bg-slate-900 text-white"><PanelRightOpen className="w-4 h-4" /></button>
          <button onClick={() => { setPanelMode('trips'); setRightCollapsed(false); }} className="p-2 rounded-xl bg-blue-600 text-white"><Truck className="w-4 h-4" /></button>
          <button onClick={() => { setPanelMode('planner'); setRightCollapsed(false); }} className="p-2 rounded-xl bg-emerald-600 text-white"><Route className="w-4 h-4" /></button>
        </div>
      ) : (
        <div className="xl:w-96 shrink-0 space-y-4">
          <div className="rounded-2xl bg-white border border-slate-200 p-1.5 flex items-center gap-1">
            <button onClick={() => setPanelMode('trips')} className={`flex-1 py-2 rounded-xl text-xs font-bold inline-flex items-center justify-center gap-1 ${panelMode === 'trips' ? 'bg-slate-900 text-white' : 'text-slate-600'}`}><Truck className="w-4 h-4" />Рейсы ({activeOrders.length})</button>
            <button onClick={() => setPanelMode('planner')} className={`flex-1 py-2 rounded-xl text-xs font-bold inline-flex items-center justify-center gap-1 ${panelMode === 'planner' ? 'bg-emerald-600 text-white' : 'text-slate-600'}`}><Route className="w-4 h-4" />Маршрут</button>
            <button onClick={() => setRightCollapsed(true)} className="p-2 text-slate-400"><PanelRightClose className="w-4 h-4" /></button>
          </div>

          {panelMode === 'trips' ? (
            <div className="rounded-2xl bg-white border border-slate-200 p-4 space-y-3">
              {activeOrders.map((o) => (<div key={o.id} onClick={() => setSelectedId(o.id)} className={`cursor-pointer rounded-xl border p-3 text-xs ${selectedOrder?.id === o.id ? 'border-blue-500 bg-blue-50/50' : 'border-slate-200'}`}><div className="flex justify-between font-bold"><span>{o.order_number}</span><span>{ORDER_STATUS_META[o.status].label}</span></div><div className="mt-1">{o.origin_city} → {o.destination_city} ({o.distance_km} км)</div></div>))}
              {selectedOrder && selectedMetrics && (
                <div className="pt-2 border-t border-slate-100 space-y-2 text-xs">
                  <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2 rounded-xl text-center"><div><div className="text-slate-400">РТО</div><strong>~{selectedMetrics.totalEtaHours} ч</strong></div><div><div className="text-slate-400">ДТ</div><strong>{selectedMetrics.fuelLiters} л</strong></div><div><div className="text-slate-400">Платон</div><strong>{formatMoney(selectedMetrics.platonTollRub)}</strong></div></div>
                  <div className="flex gap-2">
                    <button onClick={async () => { const next = Math.min(100, (simProgress[selectedOrder.id] ?? selectedOrder.progress_percent) + 15); await api.updateOrderStatus(selectedOrder.id, { status: next >= 95 ? 'delivered' : 'in_transit', progress_percent: next }); setSimProgress((p) => ({ ...p, [selectedOrder.id]: next })); onDataChanged(); notify(`Прогресс: ${next}%`); }} className="flex-1 py-2 rounded-xl bg-blue-600 text-white font-semibold inline-flex items-center justify-center gap-1"><RefreshCw className="w-3.5 h-3.5" />+15%</button>
                    <button onClick={() => onOpenOrder(selectedOrder.id)} className="px-3 py-2 rounded-xl border border-slate-200 font-semibold">Карточка</button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-2xl bg-white border border-slate-200 p-4 space-y-3 text-xs">
              {plannerStops.map((city, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-slate-900 text-emerald-400 font-bold flex items-center justify-center shrink-0">{String.fromCharCode(65 + idx)}</span>
                  <select value={city} onChange={(e) => { const n = [...plannerStops]; n[idx] = e.target.value; setPlannerStops(n); }} className="flex-1 rounded-xl border border-slate-200 px-2.5 py-1.5">{POPULAR_CITIES.map((c) => <option key={c}>{c}</option>)}</select>
                  {plannerStops.length > 2 && <button onClick={() => setPlannerStops((p) => p.filter((_, i) => i !== idx))} className="text-rose-500"><Trash2 className="w-3.5 h-3.5" /></button>}
                </div>
              ))}
              <button onClick={() => setPlannerStops((p) => [...p, 'Казань'])} className="w-full py-1.5 rounded-xl border border-dashed border-slate-300 font-semibold text-slate-600 inline-flex items-center justify-center gap-1"><Plus className="w-3.5 h-3.5" /> Добавить точку</button>
              <select value={plannerBody} onChange={(e) => setPlannerBody(e.target.value as BodyType)} className="w-full rounded-xl border border-slate-200 px-2.5 py-1.5">{Object.entries(BODY_TYPE_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>

              <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-xl">
                <button onClick={() => setRoadMode('toll')} className={`py-1.5 rounded-lg font-bold ${roadMode === 'toll' ? 'bg-amber-500 text-white' : 'text-slate-600'}`}>₽ Платные</button>
                <button onClick={() => setRoadMode('free')} className={`py-1.5 rounded-lg font-bold ${roadMode === 'free' ? 'bg-emerald-600 text-white' : 'text-slate-600'}`}>✓ Бесплатные</button>
              </div>

              {tollCosts && freeCosts && cmp && (
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-2.5 text-[11px] text-emerald-900 flex items-start gap-1.5">
                  <Coins className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Выгоднее: <strong>{cmp.cheaper === 'toll' ? 'платная' : 'бесплатная'}</strong> (экономия {formatMoney(cmp.savings)}). Платная: {formatMoney(tollCosts.total)} ({tollCosts.totalEtaHours} ч), Бесплатная: {formatMoney(freeCosts.total)} ({freeCosts.totalEtaHours} ч).</span>
                </div>
              )}

              {chosenCosts && (
                <div className="rounded-xl bg-slate-900 text-white p-3.5 space-y-1.5">
                  <div className="flex justify-between"><span className="text-slate-400">Расстояние:</span><strong className="text-emerald-400">{formatNumber(chosenCosts.distanceKm)} км</strong></div>
                  <div className="flex justify-between"><span className="text-slate-400">Платные сборы:</span><span className="text-amber-300">{formatMoney(chosenCosts.tollCost)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">«Платон» + ДТ:</span><span>{formatMoney(chosenCosts.platonCost + chosenCosts.fuelCost)}</span></div>
                  <div className="flex justify-between pt-1.5 border-t border-slate-800 font-bold text-sm"><span>Итого затраты:</span><span className="text-sky-400">{formatMoney(chosenCosts.total)}</span></div>
                </div>
              )}

              <button onClick={async () => { if (!chosenCosts) return; const created = await api.createOrder({ client_id: clients[0]?.id || 1, cargo_name: `Рейс ${plannerStops.join(' → ')}`, weight_tons: 16, volume_m3: 68, body_type_required: plannerBody, origin_city: plannerStops[0], destination_city: plannerStops[plannerStops.length - 1], distance_km: chosenCosts.distanceKm, has_insurance: true, notes: `Вариант: ${roadMode === 'toll' ? 'по платным дорогам' : 'по бесплатным дорогам'}` }); onDataChanged(); notify(`Создана заявка ${created.order_number}`); onOpenOrder(created.id); }} className="w-full py-2.5 rounded-xl bg-emerald-600 text-white font-bold">Создать заявку по маршруту</button>
              <a href={`https://www.google.com/maps/dir/${plannerStops.map((c) => encodeURIComponent(c)).join('/')}`} target="_blank" rel="noreferrer" className="w-full py-2 rounded-xl bg-slate-100 text-slate-800 font-semibold inline-flex items-center justify-center gap-1"><ExternalLink className="w-3.5 h-3.5 text-blue-600" /> Google Карты</a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
