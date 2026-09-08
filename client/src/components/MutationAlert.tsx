export function MutationAlert({ message }: { message?: string | null }) {
  if (!message) return null;
  return <p role="alert" aria-live="assertive" className="mt-4 rounded-xl bg-rose-50 px-3 py-2 text-xs leading-5 text-rose-700">{message}</p>;
}
