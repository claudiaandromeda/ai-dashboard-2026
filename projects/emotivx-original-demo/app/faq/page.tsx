export default function FAQPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-20">
      <h1 className="text-3xl font-bold text-white">FAQ</h1>
      <div className="mt-8 space-y-6">
        {[
          { q: "What is EmotivX?", a: "EmotivX turns real sporting moments into premium merchandise using data-driven generative art." },
          { q: "How does the artwork work?", a: "We use real match event data from StatsBomb to generate unique tessellation artwork for every goal." },
          { q: "How long does shipping take?", a: "Orders are printed on-demand and typically ship within 5–7 business days." },
          { q: "Can I return my order?", a: "Since every item is custom-printed, we accept returns only for defective items. Contact support for help." },
        ].map((faq) => (
          <div key={faq.q}>
            <h2 className="text-sm font-bold text-white">{faq.q}</h2>
            <p className="mt-1 text-sm text-[#9CA3AF]">{faq.a}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
