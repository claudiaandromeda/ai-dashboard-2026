export default function TermsPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-20">
      <h1 className="text-3xl font-bold text-white">Terms of Service</h1>
      <div className="mt-8 space-y-4 text-sm leading-relaxed text-[#9CA3AF]">
        <p>
          By using EmotivX you agree to these terms. All artwork is generated
          from publicly available StatsBomb open data and is subject to their
          licence.
        </p>
        <p>
          Merchandise is printed on-demand. Orders are non-refundable except for
          defective items. For full terms, contact{" "}
          <span className="text-[#DA291C]">legal@emotivx.com</span>.
        </p>
      </div>
    </div>
  );
}
