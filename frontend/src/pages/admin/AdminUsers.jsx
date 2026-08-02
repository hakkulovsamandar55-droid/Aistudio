import { useEffect, useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { adminApi } from '../../api/admin.api';
import { Icon } from '../../components/icons';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [creditAmount, setCreditAmount] = useState('');
  const [creditReason, setCreditReason] = useState('');
  const [actionError, setActionError] = useState('');
  const [busy, setBusy] = useState(false);

  const loadUsers = async (pageToLoad = 1, searchTerm = search) => {
    setLoading(true);
    try {
      const res = await adminApi.getUsers(pageToLoad, 20, searchTerm);
      setUsers(res.data.data);
      setTotalPages(res.data.pagination.totalPages);
      setPage(pageToLoad);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers(1, '');
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    loadUsers(1, search);
  };

  const openUser = async (user) => {
    setSelected(user);
    setDetail(null);
    setActionError('');
    setCreditAmount('');
    setCreditReason('');
    const res = await adminApi.getUserDetail(user.id);
    setDetail(res.data.data);
  };

  const refreshSelected = async () => {
    const res = await adminApi.getUserDetail(selected.id);
    setDetail(res.data.data);
    loadUsers(page, search);
  };

  const handleAdjustCredits = async (e) => {
    e.preventDefault();
    const amount = parseInt(creditAmount, 10);
    if (!amount) return;

    setBusy(true);
    setActionError('');
    try {
      await adminApi.adjustCredits(selected.id, amount, creditReason || undefined);
      setCreditAmount('');
      setCreditReason('');
      await refreshSelected();
    } catch (err) {
      setActionError(err.response?.data?.error || 'Xatolik yuz berdi.');
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async () => {
    setBusy(true);
    try {
      await adminApi.setUserActive(selected.id, !detail.isActive);
      await refreshSelected();
    } finally {
      setBusy(false);
    }
  };

  const toggleRole = async () => {
    setBusy(true);
    try {
      await adminApi.setUserRole(selected.id, detail.role === 'ADMIN' ? 'USER' : 'ADMIN');
      await refreshSelected();
    } finally {
      setBusy(false);
    }
  };

  const togglePlan = async () => {
    setBusy(true);
    try {
      await adminApi.setUserPlan(selected.id, detail.plan === 'PRO' ? 'FREE' : 'PRO');
      await refreshSelected();
    } finally {
      setBusy(false);
    }
  };

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold text-[#1c1a17]">Foydalanuvchilar</h1>

      <form onSubmit={handleSearch} className="mt-4 flex gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Email yoki ism bo'yicha qidirish..."
          className="w-full max-w-sm rounded-lg border border-[#e8e0d3] bg-white px-3 py-2 text-[#1c1a17] placeholder-[#a1978a] focus:border-[#5b45e0] focus:outline-none"
        />
        <button type="submit" className="rounded-lg bg-[#5b45e0] px-4 py-2 font-medium text-[#1c1a17] hover:bg-[#4733c4]">
          Qidirish
        </button>
      </form>

      <div className="mt-6 overflow-x-auto rounded-xl border border-[#e8e0d3] bg-white">
        <table className="w-full text-left text-sm">
          <thead className="text-[#6d655a]">
            <tr className="border-b border-[#e8e0d3]">
              <th className="px-4 py-3">Ism</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Kredit</th>
              <th className="px-4 py-3">Rol</th>
              <th className="px-4 py-3">Holat</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr
                key={u.id}
                onClick={() => openUser(u)}
                className="cursor-pointer border-b border-[#e8e0d3] text-[#37322b] hover:bg-[#faf7f1]"
              >
                <td className="px-4 py-3">{u.name}</td>
                <td className="px-4 py-3">{u.email}</td>
                <td className="px-4 py-3">{u.credits}</td>
                <td className="px-4 py-3">
                  <span className={u.role === 'ADMIN' ? 'text-[#5b45e0]' : 'text-[#6d655a]'}>{u.role}</span>
                </td>
                <td className="px-4 py-3">
                  {u.isActive ? (
                    <span className="text-[#1f7a45]">Faol</span>
                  ) : (
                    <span className="text-[#a8352a]">Bloklangan</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {loading && <p className="p-4 text-[#a1978a]">Yuklanmoqda...</p>}
        {!loading && users.length === 0 && <p className="p-4 text-[#a1978a]">Foydalanuvchi topilmadi.</p>}
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center gap-3 text-sm text-[#6d655a]">
          <button
            disabled={page <= 1}
            onClick={() => loadUsers(page - 1, search)}
            className="rounded-lg border border-[#e8e0d3] px-3 py-1.5 disabled:opacity-40"
          >
            Oldingi
          </button>
          <span>
            {page} / {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => loadUsers(page + 1, search)}
            className="rounded-lg border border-[#e8e0d3] px-3 py-1.5 disabled:opacity-40"
          >
            Keyingi
          </button>
        </div>
      )}

      {selected && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-[#1c1a17]/50 px-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="max-h-[85vh] w-full max-w-lg overflow-auto rounded-2xl border border-[#e8e0d3] bg-white p-6 text-[#1c1a17]"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-[#1c1a17]">{selected.name}</h2>
            <p className="text-sm text-[#6d655a]">{selected.email}</p>

            {!detail && <p className="mt-4 text-[#a1978a]">Yuklanmoqda...</p>}

            {detail && (
              <>
                <div className="mt-4 flex flex-wrap gap-2 text-sm">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f4efe6] px-3 py-1">
                    <Icon name="credit" size="xs" />
                    {detail.credits} kredit
                  </span>
                  <span className="rounded-full bg-[#f4efe6] px-3 py-1">{detail.role}</span>
                  <span
                    className={`rounded-full px-3 py-1 ${
                      detail.plan === 'PRO' ? 'bg-[#efecff] text-[#4733c4]' : 'bg-[#f4efe6]'
                    }`}
                  >
                    {detail.plan === 'PRO' ? 'Pro' : 'Bepul'}
                  </span>
                  <span className="rounded-full bg-[#f4efe6] px-3 py-1">
                    {detail.isActive ? 'Faol' : 'Bloklangan'}
                  </span>
                </div>

                <div className="mt-4 flex gap-2">
                  <button
                    onClick={toggleActive}
                    disabled={busy}
                    className="flex-1 rounded-lg border border-[#e8e0d3] py-2 text-sm hover:bg-[#faf7f1] disabled:opacity-50"
                  >
                    {detail.isActive ? 'Bloklash' : 'Blokdan chiqarish'}
                  </button>
                  <button
                    onClick={toggleRole}
                    disabled={busy}
                    className="flex-1 rounded-lg border border-[#e8e0d3] py-2 text-sm hover:bg-[#faf7f1] disabled:opacity-50"
                  >
                    {detail.role === 'ADMIN' ? 'Admin huquqini olish' : 'Admin qilish'}
                  </button>
                </div>

                <button
                  onClick={togglePlan}
                  disabled={busy}
                  className="mt-2 w-full rounded-lg border border-[#e8e0d3] py-2 text-sm hover:bg-[#faf7f1] disabled:opacity-50"
                >
                  {detail.plan === 'PRO' ? "Pro'dan Bepulga o'tkazish" : "Pro tarifga o'tkazish"}
                </button>

                <form onSubmit={handleAdjustCredits} className="mt-5 space-y-2 border-t border-[#e8e0d3] pt-4">
                  <p className="text-sm font-medium text-[#37322b]">Kredit qo'shish / ayirish</p>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={creditAmount}
                      onChange={(e) => setCreditAmount(e.target.value)}
                      placeholder="masalan 50 yoki -20"
                      className="w-32 rounded-lg border border-[#e8e0d3] bg-[#faf7f1] px-3 py-2 text-sm"
                    />
                    <input
                      type="text"
                      value={creditReason}
                      onChange={(e) => setCreditReason(e.target.value)}
                      placeholder="Sabab (ixtiyoriy)"
                      className="flex-1 rounded-lg border border-[#e8e0d3] bg-[#faf7f1] px-3 py-2 text-sm"
                    />
                  </div>
                  {actionError && <p className="text-sm text-[#a8352a]">{actionError}</p>}
                  <button
                    type="submit"
                    disabled={busy || !creditAmount}
                    className="w-full rounded-lg bg-[#5b45e0] py-2 text-sm font-medium text-[#1c1a17] hover:bg-[#4733c4] disabled:opacity-50"
                  >
                    Qo'llash
                  </button>
                </form>

                <div className="mt-5 border-t border-[#e8e0d3] pt-4">
                  <p className="text-sm font-medium text-[#37322b]">So'nggi generatsiyalar</p>
                  {detail.recentGenerations.length === 0 && (
                    <p className="mt-2 text-sm text-[#a1978a]">Yo'q</p>
                  )}
                  {detail.recentGenerations.map((g) => (
                    <div key={g.id} className="mt-2 flex justify-between text-xs text-[#6d655a]">
                      <span className="truncate">{g.userPrompt}</span>
                      <span>{g.status}</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            <button
              onClick={() => setSelected(null)}
              className="mt-6 w-full rounded-lg border border-[#e8e0d3] py-2 text-sm hover:bg-[#faf7f1]"
            >
              Yopish
            </button>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
