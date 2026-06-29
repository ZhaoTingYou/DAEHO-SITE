import {readAdminActionErrorMessage} from '@/lib/cms/admin-action-error';

type AdminActionAlertProps = {
  searchParams: Record<string, unknown> | null | undefined;
  title: string;
  fallbackMessage: string;
};

export function AdminActionAlert({
  searchParams,
  title,
  fallbackMessage
}: AdminActionAlertProps) {
  const message = readAdminActionErrorMessage(searchParams, fallbackMessage);

  if (!message) {
    return null;
  }

  return (
    <div role="alert" className="mb-5 rounded-md border border-[#f2b8b5] bg-[#fff5f5] px-4 py-3 text-sm text-[#b42318] shadow-sm">
      <p className="font-semibold">{title}</p>
      <p className="mt-1 leading-6">{message}</p>
    </div>
  );
}
