import { Link } from 'react-router-dom';

export default function BillingSuccess() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 text-center">
      <span className="text-5xl">✅</span>
      <h1 className="mt-4 text-2xl font-bold text-gray-900">To'lov muvaffaqiyatli!</h1>
      <p className="mt-2 text-gray-500">Kreditlaringiz hisobingizga qo'shildi.</p>
      <Link
        to="/dashboard"
        className="mt-6 rounded-lg bg-indigo-600 px-6 py-2.5 font-medium text-white hover:bg-indigo-700"
      >
        Dashboard'ga qaytish
      </Link>
    </div>
  );
}
