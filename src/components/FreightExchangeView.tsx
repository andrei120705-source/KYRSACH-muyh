import React, { useMemo, useState } from 'react';
import { ArrowRight, BadgeCheck, Calendar, CheckCircle2, Gavel, Globe, Package, Phone, Plus, RotateCcw, Search, Star, TrendingUp, Truck, X, Zap } from 'lucide-react';
import { api } from '../api/client';
import { BODY_TYPE_LABELS, type BodyType, type Client, POPULAR_CITIES } from '../types/logistics';
import { useToast } from './ToastProvider';

type CurrencyCode = 'BYN' | 'RUB' | 'EUR' | 'USD';
type LoadingType = 'any' | 'rear' | 'side' | 'top' | 'full';
const CURRENCY_META: Record<CurrencyCode, { symbol: string; perRub: number }> = { RUB: { symbol: '₽', perRub: 1 }, BYN: { symbol: 'BYN', perRub: 0.034 }, EUR: { symbol: '€', perRub: 0.0096 }, USD: { symbol: '$', perRub: 0.0104 } };
const LOADING_LABELS: Record<LoadingType, string> = { any: 'Любая погрузка', rear: 'Задняя', side: 'Боковая', top: 'Верхняя', full: 'Полная растентовка' };
interface CmrCargoItem { id: string; code: string; fromCountry: 'BY' | 'RU'; toCountry: 'BY' | 'RU'; origin_city: string; origin_region: string; destination_city: string; destination_region: string; distance_km: number; load_date: string; cargo_name: string; weight_tons: number; volume_m3: number; body_type_required: BodyType; loading_type: Exclude<LoadingType, 'any'>; is_partial: boolean; is_urgent: boolean; is_adr: boolean; payment_terms: string; price_rub: number; company: string; unp: string; rating: number; phone: string; contact_name: string; taken?: boolean; }
interface CmrTransportItem { id: string; code: string; fromCountry: 'BY' | 'RU'; toCountry: 'BY' | 'RU'; location_city: string; preferred_direction: string; ready_date: string; truck_model: string; body_type: BodyType; loading_type: Exclude<LoadingType, 'any'>; capacity_tons: number; volume_m3: number; accepts_partial: boolean; has_adr: boolean; carrier_company: string; unp: string; rating: number; phone: string; rate_rub_km: number; booked?: boolean; }

const INITIAL_CARGO: CmrCargoItem[] = [
  { id: 'cmr-1', code: 'CMR-40918', fromCountry: 'BY', toCountry: 'RU', origin_city: 'Минск', origin_region: 'Минская обл.', destination_city: 'Москва', destination_region: 'Московская обл.', distance_km: 718, load_date: '24.11–25.11', cargo_name: 'Молочная продукция и сыры (+2..+6 °C)', weight_tons: 19.5, volume_m3: 82, body_type_required: 'ref', loading_type: 'rear', is_partial: false, is_urgent: true, is_adr: false, payment_terms: 'б/н с НДС, 5 б.д. по CMR', price_rub: 84000, company: 'АО «БелАгроМаркет»', unp: 'УНП 192847561', rating: 4.95, phone: '+375 (29) 612-88-40', contact_name: 'Ирина' },
  { id: 'cmr-2', code: 'CMR-40932', fromCountry: 'BY', toCountry: 'BY', origin_city: 'Гомель', origin_region: 'Гомельская обл.', destination_city: 'Минск', destination_region: 'Минская обл.', distance_km: 312, load_date: '24.11', cargo_name: 'Упаковочная плёнка (догруз 8 паллет)', weight_tons: 5.4, volume_m3: 24, body_type_required: 'tent', loading_type: 'side', is_partial: true, is_urgent: false, is_adr: false, payment_terms: 'б/н с НДС, предоплата 50%', price_rub: 26500, company: 'ОДО «ГомельПакСервис»', unp: 'УНП 490812345', rating: 4.88, phone: '+375 (29) 345-19-02', contact_name: 'Дмитрий' },
  { id: 'cmr-3', code: 'CMR-40945', fromCountry: 'BY', toCountry: 'RU', origin_city: 'Брест', origin_region: 'Брестская обл.', destination_city: 'Санкт-Петербург', destination_region: 'Ленинградская обл.', distance_km: 1120, load_date: '25.11', cargo_name: 'Мебельная фурнитура и плиты МДФ', weight_tons: 20.0, volume_m3: 90, body_type_required: 'tent', loading_type: 'full', is_partial: false, is_urgent: true, is_adr: false, payment_terms: 'б/н с НДС, 7 б.д. по CMR', price_rub: 124000, company: 'СП ООО «БрестМебельТрейд»', unp: 'УНП 291048512', rating: 4.92, phone: '+375 (33) 608-44-19', contact_name: 'Александр' },
  { id: 'cmr-4', code: 'CMR-40961', fromCountry: 'RU', toCountry: 'BY', origin_city: 'Москва', origin_region: 'Московская обл.', destination_city: 'Гродно', destination_region: 'Гродненская обл.', distance_km: 996, load_date: '24.11', cargo_name: 'Промышленное электрооборудование', weight_tons: 16.0, volume_m3: 70, body_type_required: 'tent', loading_type: 'top', is_partial: false, is_urgent: false, is_adr: false, payment_terms: 'б/н РФ/РБ, 5 б.д.', price_rub: 109000, company: 'ООО «ТехноПромСнаб»', unp: 'ИНН 7704829104', rating: 5.0, phone: '+7 (495) 741-22-18', contact_name: 'Андрей' },
  { id: 'cmr-5', code: 'CMR-40978', fromCountry: 'RU', toCountry: 'BY', origin_city: 'Казань', origin_region: 'Татарстан', destination_city: 'Могилёв', destination_region: 'Могилёвская обл.', distance_km: 1380, load_date: '25.11', cargo_name: 'Полимерные смолы (ADR 3)', weight_tons: 19.0, volume_m3: 32, body_type_required: 'tank', loading_type: 'top', is_partial: false, is_urgent: true, is_adr: true, payment_terms: 'б/н с НДС, предоплата 30%', price_rub: 178000, company: 'ПАО «ВолгаХимПродукт»', unp: 'ИНН 1655290184', rating: 4.9, phone: '+7 (843) 225-60-77', contact_name: 'Рустам' },
];
const INITIAL_TRANSPORT: CmrTransportItem[] = [
  { id: 'tr-1', code: 'TR-8120', fromCountry: 'BY', toCountry: 'RU', location_city: 'Минск', preferred_direction: 'РФ (Москва, СПб), Казахстан', ready_date: 'Готов сегодня', truck_model: 'Volvo FH 460 + Schmitz', body_type: 'tent', loading_type: 'full', capacity_tons: 20, volume_m3: 92, accepts_partial: true, has_adr: true, carrier_company: 'ООО «БелТрансВектор»', unp: 'УНП 193045811', rating: 4.96, phone: '+375 (29) 650-11-34', rate_rub_km: 82 },
  { id: 'tr-2', code: 'TR-8134', fromCountry: 'BY', toCountry: 'RU', location_city: 'Брест', preferred_direction: 'Минск, Гомель, Москва', ready_date: '24.11 с 08:00', truck_model: 'Scania R450 + Krone Cool', body_type: 'ref', loading_type: 'rear', capacity_tons: 20, volume_m3: 86, accepts_partial: false, has_adr: false, carrier_company: 'ЧТУП «ЗападХолодАвто»', unp: 'УНП 291408722', rating: 4.91, phone: '+375 (29) 722-90-18', rate_rub_km: 98 },
  { id: 'tr-3', code: 'TR-8149', fromCountry: 'BY', toCountry: 'BY', location_city: 'Гомель', preferred_direction: 'По всей Беларуси (догрузы)', ready_date: 'Готов сегодня', truck_model: 'Mercedes-Benz Atego 1224', body_type: 'isotherm', loading_type: 'side', capacity_tons: 6.5, volume_m3: 38, accepts_partial: true, has_adr: false, carrier_company: 'ИП Савченко Д.А.', unp: 'УНП 491203948', rating: 4.89, phone: '+375 (44) 519-73-20', rate_rub_km: 58 },
];

const fmtCur = (rub: number, c: CurrencyCode) => `${new Intl.NumberFormat('ru-RU').format(Math.round(rub * CURRENCY_META[c].perRub))} ${CURRENCY_META[c].symbol}`;

export function FreightExchangeView({ clients, onLotTaken }: { clients: Client[]; onLotTaken: (orderId: number) => void }) {
  const { notify } = useToast();
  const [tab, setTab] = useState<'cargo' | 'transport'>('cargo');
  const [currency, setCurrency] = useState<CurrencyCode>('BYN');
  const [cargoList, setCargoList] = useState(INITIAL_CARGO);
  const [transportList, setTransportList] = useState(INITIAL_TRANSPORT);
  const [fromQ, setFromQ] = useState(''); const [toQ, setToQ] = useState(''); const [bodyFilter, setBodyFilter] = useState('all'); const [loadingFilter, setLoadingFilter] = useState<LoadingType>('any'); const [onlyPartial, setOnlyPartial] = useState(false);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [showPublish, setShowPublish] = useState(false);

  const filteredCargo = useMemo(() => cargoList.filter((i) => (bodyFilter === 'all' || i.body_type_required === bodyFilter) && (loadingFilter === 'any' || i.loading_type === loadingFilter) && (!onlyPartial || i.is_partial) && (!fromQ || i.origin_city.toLowerCase().includes(fromQ.toLowerCase())) && (!toQ || i.destination_city.toLowerCase().includes(toQ.toLowerCase()) || i.cargo_name.toLowerCase().includes(toQ.toLowerCase()))), [cargoList, bodyFilter, loadingFilter, onlyPartial, fromQ, toQ]);
  const filteredTransport = useMemo(() => transportList.filter((t) => (bodyFilter === 'all' || t.body_type === bodyFilter) && (!onlyPartial || t.accepts_partial) && (!fromQ || t.location_city.toLowerCase().includes(fromQ.toLowerCase()))), [transportList, bodyFilter, onlyPartial, fromQ]);

  const handleTake = async (item: CmrCargoItem) => {
    const client = clients.find((c) => c.name === item.company) || clients[0];
    const created = await api.createOrder({ client_id: client?.id || 1, cargo_name: `[${item.code}] ${item.cargo_name}`, weight_tons: item.weight_tons, volume_m3: item.volume_m3, body_type_required: item.body_type_required, origin_city: item.origin_city, destination_city: item.destination_city, distance_km: item.distance_km, is_urgent: item.is_urgent, is_adr: item.is_adr, has_insurance: true, notes: `Биржа CMR24 (${item.code}). ${item.payment_terms}` });
    setCargoList((p) => p.map((c) => (c.id === item.id ? { ...c, taken: true } : c)));
    notify(`Груз ${item.code} взят в работу (${created.order_number})`); onLotTaken(created.id);
  };

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-bold uppercase"><Globe className="w-3.5 h-3.5" /> Биржа CMR24 · РБ · РФ · СНГ</div>
          <h2 className="text-lg font-bold mt-1.5">Поиск грузов, догрузов и свободного транспорта</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex bg-white/10 p-1 rounded-xl">{(['BYN', 'RUB', 'EUR', 'USD'] as CurrencyCode[]).map((c) => (<button key={c} onClick={() => setCurrency(c)} className={`px-2.5 py-1 rounded-lg text-xs font-bold ${currency === c ? 'bg-white text-slate-900' : 'text-slate-300'}`}>{c}</button>))}</div>
          <button onClick={() => setShowPublish(true)} className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl bg-emerald-500 text-slate-950 text-xs font-bold"><Plus className="w-4 h-4" /> Разместить</button>
        </div>
      </div>

      <div className="rounded-2xl bg-white border border-slate-200 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex rounded-xl bg-slate-100 p-1">
            <button onClick={() => setTab('cargo')} className={`px-3.5 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 ${tab === 'cargo' ? 'bg-slate-900 text-white' : 'text-slate-600'}`}><Package className="w-4 h-4" /> Грузы ({filteredCargo.length})</button>
            <button onClick={() => setTab('transport')} className={`px-3.5 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 ${tab === 'transport' ? 'bg-slate-900 text-white' : 'text-slate-600'}`}><Truck className="w-4 h-4" /> Транспорт ({filteredTransport.length})</button>
          </div>
          <button onClick={() => { setFromQ(''); setToQ(''); setBodyFilter('all'); setLoadingFilter('any'); setOnlyPartial(false); }} className="text-xs text-slate-500 inline-flex items-center gap-1"><RotateCcw className="w-3.5 h-3.5" /> Сброс</button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 text-xs">
          <div className="relative"><Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" /><input value={fromQ} onChange={(e) => setFromQ(e.target.value)} placeholder="Откуда (Минск, Гомель...)" className="w-full pl-8 pr-2 py-2 rounded-xl border border-slate-200" /></div>
          <div className="relative"><Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" /><input value={toQ} onChange={(e) => setToQ(e.target.value)} placeholder="Куда / груз..." className="w-full pl-8 pr-2 py-2 rounded-xl border border-slate-200" /></div>
          <select value={bodyFilter} onChange={(e) => setBodyFilter(e.target.value)} className="rounded-xl border border-slate-200 px-2 py-2"><option value="all">Все кузова</option>{Object.entries(BODY_TYPE_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
          <select value={loadingFilter} onChange={(e) => setLoadingFilter(e.target.value as LoadingType)} className="rounded-xl border border-slate-200 px-2 py-2">{Object.entries(LOADING_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
          <label className="inline-flex items-center gap-2 px-2 font-semibold text-slate-700"><input type="checkbox" checked={onlyPartial} onChange={(e) => setOnlyPartial(e.target.checked)} /> Только догруз</label>
        </div>
      </div>

      {tab === 'cargo' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredCargo.map((item) => (
            <div key={item.id} className="rounded-2xl bg-white border border-slate-200 p-5 shadow-xs flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between text-xs"><div className="flex gap-1.5"><span className="font-mono font-bold px-2 py-0.5 rounded bg-slate-900 text-white">{item.code}</span><span className="px-2 py-0.5 rounded-full bg-slate-100 font-bold">{item.fromCountry}→{item.toCountry}</span>{item.is_partial && <span className="px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 font-semibold">Догруз</span>}{item.is_urgent && <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 font-semibold inline-flex items-center gap-0.5"><Zap className="w-3 h-3" />Срочно</span>}</div><span className="text-slate-500 inline-flex items-center gap-1"><Calendar className="w-3 h-3" />{item.load_date}</span></div>
                <div className="mt-2.5 flex items-center gap-2 font-bold text-base"><span>{item.origin_city}</span><ArrowRight className="w-4 h-4 text-blue-600" /><span>{item.destination_city}</span><span className="ml-auto text-xs text-slate-500">{item.distance_km} км</span></div>
                <div className="mt-1.5 text-xs text-slate-700">{item.cargo_name} · {item.weight_tons} т · {item.volume_m3} м³ · {LOADING_LABELS[item.loading_type]}</div>
                <div className="mt-2.5 rounded-xl bg-slate-50 p-2.5 text-xs flex items-center justify-between">
                  <div><div className="font-bold flex items-center gap-1">{item.company}<BadgeCheck className="w-3.5 h-3.5 text-blue-600" /></div><div className="text-[11px] text-slate-500">{item.unp} · {item.payment_terms}</div></div>
                  <div className="text-right"><div className="text-amber-600 font-bold inline-flex items-center gap-0.5"><Star className="w-3 h-3 fill-amber-400" />{item.rating}</div>{revealed[item.id] ? <div className="font-bold text-emerald-700">{item.phone}</div> : <button onClick={() => setRevealed((p) => ({ ...p, [item.id]: true }))} className="block text-[11px] text-emerald-700 font-semibold"><Phone className="w-3 h-3 inline" /> Контакты</button>}</div>
                </div>
              </div>
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <div><div className="text-xl font-bold tabular-nums">{fmtCur(item.price_rub, currency)}</div><div className="text-xs text-emerald-600 font-semibold inline-flex items-center gap-0.5"><TrendingUp className="w-3 h-3" />{fmtCur(item.price_rub / item.distance_km, currency)}/км</div></div>
                {item.taken ? <span className="px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-bold inline-flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> В работе</span> : <div className="flex gap-2"><button onClick={() => { setCargoList((p) => p.map((c) => c.id === item.id ? { ...c, price_rub: Math.max(12000, c.price_rub - 2000) } : c)); notify('Ставка −2 000 ₽ отправлена', 'info'); }} className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold inline-flex items-center gap-1"><Gavel className="w-3.5 h-3.5" />Торг</button><button onClick={() => handleTake(item)} className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold">Забрать</button></div>}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredTransport.map((tr) => (
            <div key={tr.id} className="rounded-2xl bg-white border border-slate-200 p-5 shadow-xs space-y-3">
              <div className="flex justify-between text-xs"><span className="font-mono font-bold px-2 py-0.5 rounded bg-indigo-900 text-white">{tr.code}</span><span className="text-emerald-600 font-semibold">{tr.ready_date}</span></div>
              <div className="font-bold text-base">{tr.location_city} → {tr.preferred_direction}</div>
              <div className="text-xs text-slate-700">{tr.truck_model} · до {tr.capacity_tons} т · {tr.volume_m3} м³ · от {fmtCur(tr.rate_rub_km, currency)}/км</div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs"><span className="font-bold">{tr.carrier_company} ({tr.phone})</span>{tr.booked ? <span className="text-emerald-700 font-bold">Запрос отправлен</span> : <button onClick={() => { setTransportList((p) => p.map((x) => x.id === tr.id ? { ...x, booked: true } : x)); notify(`Запрос отправлен ${tr.carrier_company}`); }} className="px-3.5 py-1.5 rounded-xl bg-indigo-600 text-white font-semibold">Предложить груз</button>}</div>
            </div>
          ))}
        </div>
      )}

      {showPublish && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="px-5 py-4 bg-slate-900 text-white flex justify-between"><h3 className="text-sm font-bold">Разместить груз на CMR24</h3><button onClick={() => setShowPublish(false)}><X className="w-4 h-4" /></button></div>
            <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); setCargoList((p) => [{ id: `cmr-${Date.now()}`, code: `CMR-${Math.floor(41000 + Math.random() * 8999)}`, fromCountry: 'BY', toCountry: 'RU', origin_city: String(fd.get('from')), origin_region: 'РБ', destination_city: String(fd.get('to')), destination_region: 'РФ', distance_km: 700, load_date: '24.11', cargo_name: String(fd.get('cargo')), weight_tons: Number(fd.get('weight') || 15), volume_m3: 60, body_type_required: 'tent', loading_type: 'side', is_partial: false, is_urgent: false, is_adr: false, payment_terms: 'б/н с НДС', price_rub: Number(fd.get('price') || 75000), company: 'ООО «ТрансЛогист Экспресс»', unp: 'ИНН 7709841205', rating: 5.0, phone: '+7 (495) 800-55-20', contact_name: 'Диспетчер' }, ...p]); setShowPublish(false); notify('Груз опубликован на бирже CMR24'); }} className="p-5 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2"><select name="from" defaultValue="Минск" className="rounded-xl border border-slate-200 px-2 py-2">{POPULAR_CITIES.map((c) => <option key={c}>{c}</option>)}</select><select name="to" defaultValue="Москва" className="rounded-xl border border-slate-200 px-2 py-2">{POPULAR_CITIES.map((c) => <option key={c}>{c}</option>)}</select></div>
              <input required name="cargo" placeholder="Описание груза *" className="w-full rounded-xl border border-slate-200 px-3 py-2" />
              <div className="grid grid-cols-2 gap-2"><input name="weight" type="number" defaultValue={15} placeholder="Вес, т" className="rounded-xl border border-slate-200 px-3 py-2" /><input name="price" type="number" defaultValue={75000} placeholder="Ставка, ₽" className="rounded-xl border border-slate-200 px-3 py-2" /></div>
              <div className="flex justify-end gap-2"><button type="button" onClick={() => setShowPublish(false)} className="px-4 py-2 rounded-xl border border-slate-200">Отмена</button><button type="submit" className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold">Опубликовать</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
