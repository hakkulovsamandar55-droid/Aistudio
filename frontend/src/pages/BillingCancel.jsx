import AuthLayout from '../components/AuthLayout';
import { Icon } from '../components/icons';
import { Button } from '../components/ui';

export default function BillingCancel() {
  return (
    <AuthLayout title="To'lov bekor qilindi">
      <div className="text-center">
        <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f4efe6] text-[#a1978a]">
          <Icon name="close" size="xl" />
        </span>
        <p className="mt-4 text-sm text-[#6d655a]">
          Hech qanday mablag' yechilmadi — istagan vaqtda qayta urinishingiz mumkin.
        </p>
        <Button to="/billing" className="mt-6 w-full" icon="card">
          Qaytadan urinish
        </Button>
        <Button to="/dashboard" variant="secondary" className="mt-2 w-full">
          Ilovaga qaytish
        </Button>
      </div>
    </AuthLayout>
  );
}
