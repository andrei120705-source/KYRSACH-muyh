import React, { useState } from 'react';
import { Award, Calendar, Phone, Plus, ShieldAlert, Trash2, User, X } from 'lucide-react';
import { api } from '../api/client';
import { DRIVER_STATUS_META, type Driver, type DriverStatus } from '../types/logistics';
import { useToast } from './ToastProvider';

export function DriversView({ drivers, onDataChanged }: { drivers: Driver[]; onDataChanged: () => void }) {
  const { notify } = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const changeStatus = async (d: Driver, status: DriverStatus) => { await api.updateDriver(d.id, { status }); onDataChanged(); notify('Статус водителя обновлён'); };
  const handleDelete = async (d: Driver) => { await api.deleteDriver(d.id); onDataChanged(); notify('Водитель удалён', 'info'); };
  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div><h3 className="text-base font-bold text-slate-900">Штат водителей-экспедиторов</h3><p className="text-xs text-slate-500">Контроль категорий допуска (CE, ADR), медсправок и занятости</p></div>
        <button onClick={() => setShowAdd(true)} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"><Plus className="w-4 h-4" /> Добавить водителя</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {drivers.map((d) => {
          const meta = DRIVER_STATUS_META[d.status]; const medExpiring = d.medical_cert_until < '2026-12-31';
          return (
            <div key={d.id} className="rounded-2xl bg-white border border-slate-200 p-5 shadow-xs flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-sm">{d.full_name.split(' ').slice(0, 2).map((s) => s[0]).join('')}</div>
                    <div><h4 className="font-bold text-slate-900 text-sm">{d.full_name}</h4><p className="text-xs text-slate-500 flex items-center gap-1"><Phone className="w-3 h-3" /> {d.phone}</p></div>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${meta.badgeClass}`}>{meta.label}</span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2.5 text-xs bg-slate-50 rounded-xl p-3">
                  <div><span className="text-slate-400 block text-[10px] uppercase">ВУ / Категории</span><span className="font-mono font-semibold">{d.license_number}</span><div className="text-[11px] font-bold text-blue-700">{d.license_categories}</div></div>
                  <div><span className="text-slate-400 block text-[10px] uppercase">Стаж / Рейтинг</span><span className="font-semibold">{d.experience_years} лет</span><div className="text-[11px] font-bold text-amber-600 flex items-center gap-1"><Award className="w-3 h-3" /> {d.rating} · {d.completed_trips || 0}</div></div>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs"><span className="text-slate-500 flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Медсправка:</span><span className={`font-semibold tabular-nums flex items-center gap-1 ${medExpiring ? 'text-amber-600' : 'text-slate-800'}`}>{medExpiring && <ShieldAlert className="w-3.5 h-3.5" />}{d.medical_cert_until}</span></div>
              </div>
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <select value={d.status} onChange={(e) => changeStatus(d, e.target.value as DriverStatus)} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs bg-white"><option value="available">Свободен</option><option value="on_route">На маршруте</option><option value="vacation">Отпуск</option><option value="sick">Больничный</option></select>
                {d.active_order_number ? <span className="font-mono text-[11px] font-semibold text-blue-600">{d.active_order_number}</span> : <button onClick={() => handleDelete(d)} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button>}
              </div>
            </div>
          );
        })}
      </div>
      {showAdd && <AddDriverModal onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); onDataChanged(); notify('Водитель добавлен'); }} />}
    </div>
  );
}

function AddDriverModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { notify } = useToast();
  const [fullName, setFullName] = useState(''); const [phone, setPhone] = useState('+7 (916) '); const [license, setLicense] = useState(''); const [categories, setCategories] = useState('B, C, CE'); const [medUntil, setMedUntil] = useState('2027-10-01'); const [exp, setExp] = useState(7);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try { await api.createDriver({ full_name: fullName, phone, license_number: license, license_categories: categories, medical_cert_until: medUntil, experience_years: exp }); onSaved(); }
    catch (err: unknown) { notify(err instanceof Error ? err.message : 'Ошибка', 'error'); }
  };
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between"><h3 className="text-sm font-bold flex items-center gap-2"><User className="w-4 h-4" /> Новый водитель</h3><button onClick={onClose}><X className="w-4 h-4" /></button></div>
        <form onSubmit={handleSubmit} className="p-5 space-y-3 text-xs">
          <input required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="ФИО полностью *" className="w-full rounded-xl border border-slate-200 px-3 py-2" />
          <div className="grid grid-cols-2 gap-3"><input required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Телефон *" className="rounded-xl border border-slate-200 px-3 py-2" /><input required value={license} onChange={(e) => setLicense(e.target.value)} placeholder="Номер ВУ *" className="rounded-xl border border-slate-200 px-3 py-2" /></div>
          <div className="grid grid-cols-3 gap-2"><input value={categories} onChange={(e) => setCategories(e.target.value)} className="rounded-xl border border-slate-200 px-2 py-2" /><input type="number" value={exp} onChange={(e) => setExp(Number(e.target.value))} className="rounded-xl border border-slate-200 px-2 py-2" /><input type="date" value={medUntil} onChange={(e) => setMedUntil(e.target.value)} className="rounded-xl border border-slate-200 px-2 py-2" /></div>
          <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={onClose} className="px-4 py-2 rounded-xl border border-slate-200">Отмена</button><button type="submit" className="px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold">Сохранить</button></div>
        </form>
      </div>
    </div>
  );
}
