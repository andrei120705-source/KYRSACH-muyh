import React, { useState } from 'react';
import { Building2, Mail, MapPin, Phone, Plus, Search, Trash2, X } from 'lucide-react';
import { api } from '../api/client';
import { type Client, formatMoney } from '../types/logistics';
import { useToast } from './ToastProvider';

export function ClientsView({ clients, onDataChanged }: { clients: Client[]; onDataChanged: () => void }) {
  const { notify } = useToast();
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const filtered = clients.filter((c) => {
    const q = search.trim().toLowerCase();
    return !q || c.name.toLowerCase().includes(q) || c.inn.toLowerCase().includes(q) || c.contact_person.toLowerCase().includes(q) || c.contract_number.toLowerCase().includes(q);
  });
  const handleDelete = async (c: Client) => {
    try { await api.deleteClient(c.id); onDataChanged(); notify('Контрагент удалён', 'info'); }
    catch (err: unknown) { notify(err instanceof Error ? err.message : 'Не удалось удалить', 'error'); }
  };
  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Поиск по названию, ИНН, договору..." className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200" />
        </div>
        <button onClick={() => setShowAdd(true)} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"><Plus className="w-4 h-4" /> Добавить клиента</button>
      </div>
      <div className="rounded-2xl bg-white border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead><tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold uppercase text-slate-500"><th className="py-3 px-4">Контрагент / ИНН</th><th className="py-3 px-4">Контакт</th><th className="py-3 px-4">Договор / скидка</th><th className="py-3 px-4 text-right">Заказов</th><th className="py-3 px-4 text-right">Выручка</th><th className="py-3 px-4 text-right"></th></tr></thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="py-3.5 px-4"><div className="font-bold text-slate-900 flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5 text-blue-600" />{c.name}</div><div className="text-slate-500 font-mono">ИНН {c.inn}</div><div className="text-slate-400 flex items-center gap-1"><MapPin className="w-3 h-3" /> {c.address}</div></td>
                  <td className="py-3.5 px-4"><div className="font-semibold text-slate-800">{c.contact_person}</div><div className="text-slate-500 flex items-center gap-1"><Phone className="w-3 h-3" /> {c.phone}</div><div className="text-slate-400 flex items-center gap-1"><Mail className="w-3 h-3" /> {c.email}</div></td>
                  <td className="py-3.5 px-4"><div className="font-mono font-semibold">{c.contract_number}</div>{c.discount_percent > 0 ? <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">Скидка {c.discount_percent}%</span> : <span className="text-slate-400">Базовый тариф</span>}</td>
                  <td className="py-3.5 px-4 text-right font-semibold tabular-nums">{c.orders_count || 0}</td>
                  <td className="py-3.5 px-4 text-right font-bold tabular-nums">{formatMoney(c.total_revenue || 0)}</td>
                  <td className="py-3.5 px-4 text-right"><button onClick={() => handleDelete(c)} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {showAdd && <AddClientModal onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); onDataChanged(); notify('Клиент добавлен'); }} />}
    </div>
  );
}

function AddClientModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { notify } = useToast();
  const [name, setName] = useState(''); const [inn, setInn] = useState(''); const [contact, setContact] = useState(''); const [phone, setPhone] = useState(''); const [email, setEmail] = useState(''); const [address, setAddress] = useState(''); const [contract, setContract] = useState(`ДГ-2026/${Math.floor(100 + Math.random() * 899)}`); const [discount, setDiscount] = useState(0);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try { await api.createClient({ name, inn, contact_person: contact, phone, email, address, contract_number: contract, discount_percent: discount }); onSaved(); }
    catch (err: unknown) { notify(err instanceof Error ? err.message : 'Ошибка', 'error'); }
  };
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between"><h3 className="text-sm font-bold">Новый контрагент</h3><button onClick={onClose}><X className="w-4 h-4" /></button></div>
        <form onSubmit={handleSubmit} className="p-5 space-y-3 text-xs">
          <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Наименование *" className="w-full rounded-xl border border-slate-200 px-3 py-2" />
          <div className="grid grid-cols-2 gap-3"><input required value={inn} onChange={(e) => setInn(e.target.value)} placeholder="ИНН / УНП *" className="rounded-xl border border-slate-200 px-3 py-2" /><input required value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Контактное лицо *" className="rounded-xl border border-slate-200 px-3 py-2" /></div>
          <div className="grid grid-cols-2 gap-3"><input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Телефон" className="rounded-xl border border-slate-200 px-3 py-2" /><input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="rounded-xl border border-slate-200 px-3 py-2" /></div>
          <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Адрес" className="w-full rounded-xl border border-slate-200 px-3 py-2" />
          <div className="grid grid-cols-2 gap-3"><input value={contract} onChange={(e) => setContract(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2" /><input type="number" min="0" max="30" value={discount} onChange={(e) => setDiscount(Number(e.target.value))} placeholder="Скидка %" className="rounded-xl border border-slate-200 px-3 py-2" /></div>
          <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={onClose} className="px-4 py-2 rounded-xl border border-slate-200">Отмена</button><button type="submit" className="px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold">Сохранить</button></div>
        </form>
      </div>
    </div>
  );
}
