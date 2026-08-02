import { Link } from 'react-router-dom';

export default function BillingCancel() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#08080c] px-4 text-center">
      <span className="text-5xl">❌</span>
      <h1 className="mt-4 text-2xl font-bold text-white">To'lov bekor qilindi</h1>
      <p className="mt-2 text-zinc-500">Hech qanday mablag' yechilmadi. Xohlasangiz qayta urinib ko'ring.</p>
      <Link
        to="/billing"
        className="mt-6 rounded-lg bg-violet-600 px-6 py-2.5 font-medium text-white hover:bg-violet-500"
      >
        Qaytadan urinish
      </Link>
    </div>
  );
}
