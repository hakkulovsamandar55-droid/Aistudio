import AuthLayout from '../components/AuthLayout';
import { Icon } from '../components/icons';
import { Button } from '../components/ui';

export default function BillingSuccess() {
  return (
    <AuthLayout title="To'lov muvaffaqiyatli">
      <div className="text-center">
        <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#e7f5ec] text-[#1f7a45]">
          <Icon name="check" size="xl" />
        </span>
        <p className="mt-4 text-sm text-[#6d655a]">Kreditlaringiz hisobingizga qo'shildi.</p>
        <Button to="/dashboard" className="mt-6 w-full">
          Ilovaga qaytish
        </Button>
      </div>
    </AuthLayout>
  );
}
