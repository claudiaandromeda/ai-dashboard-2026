import MomentsBrowser from "@/components/admin/MomentsBrowser";

export default function MomentLedgerPage() {
  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-amber-300">Moment Ledger</h1>
        <p className="text-white/70">
          Canonical Moment IDs with their Data Line metadata.
        </p>
      </header>

      <MomentsBrowser />
    </section>
  );
}
