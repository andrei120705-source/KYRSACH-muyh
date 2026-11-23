import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Fuel, Plus, Trash2, Truck, Wrench, X } from 'lucide-react';
import { api } from '../api/client';
import { BODY_TYPE_LABELS, type BodyType, type FuelExpense, type MaintenanceLog, VEHICLE_STATUS_META, type Vehicle, type VehicleStatus, formatMoney, formatNumber } from '../types/logistics';
import { useToast } from './ToastProvider';

export function FleetView({ vehicles, onDataChanged }: { vehicles: Vehicle[]; onDataChanged: () => void }) {
  const { notify } = useToast();
  const [subTab, setSubTab] = useState<'vehicles' | 'maintenance' | 'fuel'>('vehicles');
  const [maintenance, setMaintenance] = useState<MaintenanceLog[]>([]);
  const [fuelLogs, setFuelLogs] = useState<FuelExpense[]>([]);
  const [showAddVehicle, setShowAddVehicle] = useState(false);

  const loadAux = async () => {
    try { const [m, f] = await Promise.all([api.getMaintenance(), api.getFuel()]); setMaintenance(m); setFuelLogs(f); } catch {}
  };
  useEffect(() => { loadAux(); }, [vehicles]);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-white border border-slate-200 p-3 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <button onClick={() => setSubTab('vehicles')} className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold ${subTab === 'vehicles' ? 'bg-slate-900 text-white' : 'text-slate-600'}`}><Truck className="w-4 h-4" /> Подвижной состав ({vehicles.length})</button>
          <button onClick={() => setSubTab('maintenance')} className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold ${subTab === 'maintenance' ? 'bg-slate-900 text-white' : 'text-slate-600'}`}><Wrench className="w-4 h-4" /> ТО ({maintenance.length})</button>
          <button onClick={() => setSubTab('fuel')} className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold ${subTab === 'fuel' ? 'bg-slate-900 text-white' : 'text-slate-600'}`}><Fuel className="w-4 h-4" /> ГСМ ({fuelLogs.length})</button>
        </div>
        {subTab === 'vehicles' && <button onClick={() => setShowAddVehicle(true)} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold"><Plus className="w-4 h-4" /> Добавить ТС</button>}
      </div>

      {subTab === 'vehicles' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {vehicles.map((v) => {
            const st = VEHICLE_STATUS_META[v.status], kmLeft = v.next_service_km - v.mileage_km, warn = kmLeft <= 8000;
            return (
              <div key={v.id} className="rounded-2xl bg-white border border-slate-200 p-5 shadow-xs space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div><span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 border border-slate-200">{v.plate_number}</span><h4 className="mt-2 font-bold text-sm">{v.brand_model}</h4><p className="text-xs text-slate-500">{BODY_TYPE_LABELS[v.body_type]} · {v.year} г.</p></div>
                  <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${st.badgeClass}`}>{st.label}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-3 text-center text-xs">
                  <div><div className="text-[10px] text-slate-400">Тоннаж</div><div className="font-bold">{v.capacity_tons} т</div></div>
                  <div><div className="text-[10px] text-slate-400">Объём</div><div className="font-bold">{v.volume_m3} м³</div></div>
                  <div><div className="text-[10px] text-slate-400">Расход</div><div className="font-bold">{v.fuel_consumption} л</div></div>
                </div>
                <div className="flex justify-between text-xs"><span className="text-slate-500">Пробег: {formatNumber(v.mileage_km)} км</span><span className={`font-semibold flex items-center gap-1 ${warn ? 'text-amber-600' : 'text-slate-600'}`}>{warn && <AlertTriangle className="w-3.5 h-3.5" />}{kmLeft <= 0 ? 'ТО просрочено' : `До ТО: ${formatNumber(kmLeft)} км`}</span></div>
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <select value={v.status} onChange={async (e) => { await api.updateVehicle(v.id, { status: e.target.value as VehicleStatus }); onDataChanged(); notify('Статус ТС обновлён'); }} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs bg-white"><option value="free">Свободен</option><option value="in_transit">В рейсе</option><option value="maintenance">На ТО</option></select>
                  {!v.active_order_number && <button onClick={async () => { await api.deleteVehicle(v.id); onDataChanged(); notify('ТС удалено', 'info'); }} className="p-1.5 text-slate-400 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {subTab === 'maintenance' && (
        <div className="rounded-2xl bg-white border border-slate-200 shadow-xs overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead><tr className="bg-slate-50 border-b border-slate-200 uppercase text-[11px] text-slate-500"><th className="py-3 px-4">Дата</th><th className="py-3 px-4">ТС</th><th className="py-3 px-4">Работы</th><th className="py-3 px-4 text-right">Сумма</th><th className="py-3 px-4 text-right">Статус</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {maintenance.map((m) => (
                <tr key={m.id}><td className="py-3 px-4">{m.service_date}</td><td className="py-3 px-4 font-semibold">{m.brand_model} ({m.plate_number})</td><td className="py-3 px-4">{m.service_type}</td><td className="py-3 px-4 text-right font-semibold">{formatMoney(m.cost)}</td><td className="py-3 px-4 text-right">{m.status === 'done' ? <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold"><CheckCircle2 className="w-3.5 h-3.5" /> Готово</span> : <button onClick={async () => { await api.updateMaintenanceStatus(m.id, 'done'); await loadAux(); onDataChanged(); notify('ТО завершено'); }} className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 font-semibold">Завершить</button>}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {subTab === 'fuel' && (
        <div className="rounded-2xl bg-white border border-slate-200 shadow-xs overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead><tr className="bg-slate-50 border-b border-slate-200 uppercase text-[11px] text-slate-500"><th className="py-3 px-4">Дата</th><th className="py-3 px-4">ТС</th><th className="py-3 px-4">АЗС</th><th className="py-3 px-4 text-right">Сумма</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {fuelLogs.map((f) => (<tr key={f.id}><td className="py-3 px-4">{f.recorded_at.slice(0, 16)}</td><td className="py-3 px-4 font-semibold">{f.brand_model}</td><td className="py-3 px-4">{f.station}</td><td className="py-3 px-4 text-right font-bold">{f.liters} л · {formatMoney(f.total_amount)}</td></tr>))}
            </tbody>
          </table>
        </div>
      )}

      {showAddVehicle && <AddVehicleModal onClose={() => setShowAddVehicle(false)} onSaved={() => { setShowAddVehicle(false); onDataChanged(); notify('ТС добавлено'); }} />}
    </div>
  );
}

function AddVehicleModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [plateNumber, setPlateNumber] = useState(''); const [brandModel, setBrandModel] = useState(''); const [bodyType, setBodyType] = useState<BodyType>('tent'); const [capacity, setCapacity] = useState(20); const [volume, setVolume] = useState(90);
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between"><h3 className="text-sm font-bold">Новое ТС</h3><button onClick={onClose}><X className="w-4 h-4" /></button></div>
        <form onSubmit={async (e) => { e.preventDefault(); await api.createVehicle({ plate_number: plateNumber, brand_model: brandModel, body_type: bodyType, capacity_tons: capacity, volume_m3: volume }); onSaved(); }} className="p-5 space-y-3 text-xs">
          <input required value={plateNumber} onChange={(e) => setPlateNumber(e.target.value)} placeholder="Гос. номер *" className="w-full rounded-xl border border-slate-200 px-3 py-2" />
          <input required value={brandModel} onChange={(e) => setBrandModel(e.target.value)} placeholder="Марка и модель *" className="w-full rounded-xl border border-slate-200 px-3 py-2" />
          <select value={bodyType} onChange={(e) => setBodyType(e.target.value as BodyType)} className="w-full rounded-xl border border-slate-200 px-3 py-2">{Object.entries(BODY_TYPE_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
          <div className="grid grid-cols-2 gap-3"><input type="number" value={capacity} onChange={(e) => setCapacity(Number(e.target.value))} placeholder="Тоннаж" className="rounded-xl border border-slate-200 px-3 py-2" /><input type="number" value={volume} onChange={(e) => setVolume(Number(e.target.value))} placeholder="Объём" className="rounded-xl border border-slate-200 px-3 py-2" /></div>
          <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={onClose} className="px-4 py-2 rounded-xl border border-slate-200">Отмена</button><button type="submit" className="px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold">Сохранить</button></div>
        </form>
      </div>
    </div>
  );
}
