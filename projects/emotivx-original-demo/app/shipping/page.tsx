export default function ShippingPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-20">
      <h1 className="text-3xl font-bold text-white">Shipping &amp; Returns</h1>
      <div className="mt-8 space-y-6 text-sm text-[#9CA3AF]">
        <div>
          <h2 className="font-bold text-white">Shipping</h2>
          <p className="mt-1">All orders are printed on-demand via Printful and shipped worldwide. Typical delivery is 5–12 business days depending on your location.</p>
        </div>
        <div>
          <h2 className="font-bold text-white">Returns</h2>
          <p className="mt-1">Due to the custom nature of our products, we accept returns only for defective or damaged items. Please contact us within 14 days of receiving your order.</p>
        </div>
      </div>
    </div>
  );
}
