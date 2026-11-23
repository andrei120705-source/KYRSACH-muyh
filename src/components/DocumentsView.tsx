import React, { useEffect, useState } from 'react';
import { FileSpreadsheet, FileText, Printer } from 'lucide-react';
import { api, exportCsv } from '../api/client';
import { BODY_TYPE_LABELS, ORDER_STATUS_META, type Order, PAYMENT_STATUS_META, formatMoney } from '../types/logistics';
import { useToast } from './ToastProvider';

type DocType = 'ttn' | 'cmr' | 'contract' | 'act';

export function DocumentsView({ orders, preselectedOrderId }: { orders: Order[]; preselectedOrderId: number | null }) {
  const { notify } = useToast();
  const [selectedOrderId, setSelectedOrderId] = useState<number>(preselectedOrderId || orders[0]?.id || 0);
  const [docType, setDocType] = useState<DocType>('ttn');
  const [orderDetail, setOrderDetail] = useState<Order | null>(null);

  useEffect(() => { if (preselectedOrderId) setSelectedOrderId(preselectedOrderId); }, [preselectedOrderId]);
  useEffect(() => {
    if (!selectedOrderId && orders[0]) { setSelectedOrderId(orders[0].id); return; }
    if (selectedOrderId) api.getOrder(selectedOrderId).then(setOrderDetail).catch(() => setOrderDetail(null));
  }, [selectedOrderId, orders]);

  const handleExportFinanceCsv = () => {
    exportCsv(`finansovyy_otchet_${new Date().toISOString().slice(0, 10)}.csv`, ['№ Заявки', 'Заказчик', 'Маршрут', 'Пробег (км)', 'Итого (₽)', 'Маржа (₽)', 'Оплата', 'Статус'], orders.map((o) => [o.order_number, o.client_name || '', `${o.origin_city} — ${o.destination_city}`, o.distance_km, o.total_cost, o.margin_est, PAYMENT_STATUS_META[o.payment_status].label, ORDER_STATUS_META[o.status].label]));
    notify('Финансовый отчёт выгружен в CSV');
  };

  return (
    <div className="space-y-5">
      <div className="no-print rounded-2xl bg-white border border-slate-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <select value={selectedOrderId} onChange={(e) => setSelectedOrderId(Number(e.target.value))} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold min-w-[260px]">
            {orders.map((o) => <option key={o.id} value={o.id}>{o.order_number} · {o.origin_city} → {o.destination_city}</option>)}
          </select>
          <div className="inline-flex rounded-xl border border-slate-200 p-0.5 bg-slate-50">
            {([['ttn', 'ТТН'], ['cmr', 'Международная CMR'], ['contract', 'Договор-заявка'], ['act', 'Акт']] as const).map(([id, label]) => (
              <button key={id} onClick={() => setDocType(id)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${docType === id ? 'bg-slate-900 text-white' : 'text-slate-600'}`}>{label}</button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExportFinanceCsv} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700"><FileSpreadsheet className="w-4 h-4 text-emerald-600" /> CSV</button>
          <button onClick={() => window.print()} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold"><Printer className="w-4 h-4" /> Печать / PDF</button>
        </div>
      </div>
      {orderDetail ? (
        <div className="print-only-area rounded-2xl bg-white border border-slate-200 shadow-xs p-8 max-w-4xl mx-auto text-slate-900 text-sm">
          <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4">
            <div>
              <div className="text-xs font-bold uppercase text-slate-500">ООО «ТРАНСЛОГИСТ ЭКСПРЕСС»</div>
              <h2 className="text-xl font-bold mt-1">
                {docType === 'ttn' && `ТОВАРНО-ТРАНСПОРТНАЯ НАКЛАДНАЯ № ${orderDetail.order_number}`}
                {docType === 'cmr' && `МЕЖДУНАРОДНАЯ НАКЛАДНАЯ CMR № ${orderDetail.order_number}`}
                {docType === 'contract' && `ДОГОВОР-ЗАЯВКА № ${orderDetail.order_number}`}
                {docType === 'act' && `АКТ ВЫПОЛНЕННЫХ РАБОТ № А-${orderDetail.order_number}`}
              </h2>
              <p className="text-xs text-slate-500 mt-1">{docType === 'cmr' ? 'International Consignment Note (КДПГ / CMR)' : `Договор ${orderDetail.client_contract || 'б/н'}`} · {new Date().toLocaleDateString('ru-RU')}</p>
            </div>
            <div className="text-right text-xs"><div className="font-mono font-bold">ИНН 7709841205</div><div className="text-slate-500">г. Москва, ш. Энтузиастов, 56</div></div>
          </div>
          <div className="grid grid-cols-2 gap-6 mt-6 text-xs">
            <div className="rounded-xl border border-slate-200 p-4 space-y-1"><div className="font-bold uppercase text-slate-400 text-[10px]">Заказчик</div><div className="font-bold text-sm">{orderDetail.client_name}</div><div>ИНН: {orderDetail.client_inn || '—'}</div><div>{orderDetail.client_address || '—'}</div></div>
            <div className="rounded-xl border border-slate-200 p-4 space-y-1"><div className="font-bold uppercase text-slate-400 text-[10px]">Транспорт и водитель</div><div className="font-bold text-sm">{orderDetail.brand_model || 'Не назначено'} ({orderDetail.plate_number || '—'})</div><div>Кузов: {BODY_TYPE_LABELS[orderDetail.body_type_required]}</div><div>Водитель: {orderDetail.driver_name || '—'}</div></div>
          </div>
          <table className="w-full border-collapse border border-slate-300 text-xs mt-6">
            <thead><tr className="bg-slate-100"><th className="border border-slate-300 p-2 text-left">Груз</th><th className="border border-slate-300 p-2 text-left">Маршрут</th><th className="border border-slate-300 p-2 text-right">Вес / Объём</th><th className="border border-slate-300 p-2 text-right">Стоимость</th></tr></thead>
            <tbody><tr><td className="border border-slate-300 p-2 font-semibold">{orderDetail.cargo_name}</td><td className="border border-slate-300 p-2">{orderDetail.origin_city} → {orderDetail.destination_city} ({orderDetail.distance_km} км)</td><td className="border border-slate-300 p-2 text-right">{orderDetail.weight_tons} т / {orderDetail.volume_m3} м³</td><td className="border border-slate-300 p-2 text-right font-bold">{formatMoney(orderDetail.total_cost)}</td></tr></tbody>
          </table>
          <div className="mt-8 pt-6 border-t border-slate-200 grid grid-cols-2 gap-10 text-xs">
            <div><div className="font-bold mb-6">Перевозчик:</div><div className="border-b border-slate-400 pb-1">______________________ / Диспетчер /</div></div>
            <div>
              <div className="font-bold mb-2">Заказчик ({orderDetail.client_name}):</div>
              {orderDetail.pod_signature ? (<div><img src={orderDetail.pod_signature} alt="ePOD" className="h-12 object-contain" /><div className="border-b border-slate-400 pb-1">{orderDetail.pod_signer} (ePOD {orderDetail.pod_timestamp})</div></div>) : (<div className="border-b border-slate-400 pb-1 mt-6">______________________ / Подпись /</div>)}
            </div>
          </div>
        </div>
      ) : <div className="rounded-2xl bg-white border border-slate-200 p-12 text-center text-sm text-slate-500"><FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />Выберите заявку</div>}
    </div>
  );
}
