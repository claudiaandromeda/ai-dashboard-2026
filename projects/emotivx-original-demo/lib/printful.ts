/**
 * Printful API v2 client
 * Docs: https://developers.printful.com/docs/
 *
 * Set PRINTFUL_API_KEY in .env.local
 */

const BASE_URL = "https://api.printful.com";

function getHeaders() {
  const key = process.env.PRINTFUL_API_KEY;
  if (!key) throw new Error("PRINTFUL_API_KEY not set in environment");
  return {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    "X-PF-Store-Id": process.env.PRINTFUL_STORE_ID ?? "",
  };
}

/* ── Types ────────────────────────────────────────────────────────────── */

export interface PrintfulProduct {
  id: number;
  name: string;
  type: string;
  image: string;
  variants: PrintfulVariant[];
}

export interface PrintfulVariant {
  id: number;
  name: string;
  size: string;
  color: string;
  color_code: string;
  image: string;
  price: string;
  in_stock: boolean;
}

export interface MockupTask {
  task_key: string;
  status: "pending" | "completed" | "failed";
  mockups?: MockupResult[];
  error?: string;
}

export interface MockupResult {
  placement: string;
  variant_ids: number[];
  mockup_url: string;
  extra: { title: string; url: string }[];
}

export interface MockupFile {
  placement: "default" | "front" | "back" | "label_inside";
  image_url: string;
  position?: {
    area_width: number;
    area_height: number;
    width: number;
    height: number;
    top: number;
    left: number;
  };
}

/* ── Product Catalogue ────────────────────────────────────────────────── */

/**
 * Get all AOP-capable products from Printful's catalogue
 */
export async function getAOPProducts(): Promise<PrintfulProduct[]> {
  const res = await fetch(`${BASE_URL}/v2/catalog-products?limit=100`, {
    headers: getHeaders(),
    next: { revalidate: 3600 }, // cache 1 hour
  });
  if (!res.ok) throw new Error(`Printful API error: ${res.status}`);
  const data = await res.json();
  return data.data ?? [];
}

/**
 * Get variants for a specific product
 */
export async function getProductVariants(productId: number): Promise<PrintfulVariant[]> {
  const res = await fetch(`${BASE_URL}/v2/catalog-products/${productId}/catalog-variants?limit=100`, {
    headers: getHeaders(),
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error(`Printful API error: ${res.status}`);
  const data = await res.json();
  return data.data ?? [];
}

/* ── Mockup Generator ─────────────────────────────────────────────────── */

/**
 * Get valid placements and printfile specs for a product.
 * Use this to know which placements are accepted before submitting.
 */
export async function getProductPrintfiles(productId: number) {
  const res = await fetch(`${BASE_URL}/mockup-generator/printfiles/${productId}`, {
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error(`Printfiles error: ${res.status}`);
  const data = await res.json();
  return data.result;
}

/**
 * Submit a mockup generation task.
 * Uses v1 mockup-generator (v2 endpoint does not exist for mockups).
 *
 * For AOP hoodies (product 388), valid placements: front, back, sleeve_right,
 * sleeve_left, pocket, hood. Printfile 200 = 6000x6000px at 150dpi.
 *
 * @param productId  Printful catalog product ID
 * @param variantIds Array of variant IDs to render
 * @param files      Artwork file(s) with placement info
 */
export async function createMockupTask(
  productId: number,
  variantIds: number[],
  files: MockupFile[]
): Promise<string> {
  const res = await fetch(`${BASE_URL}/mockup-generator/create-task/${productId}`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ variant_ids: variantIds, format: "png", files }),
  });
  const data = await res.json();
  if (data.code !== 200) {
    throw new Error(`Mockup task creation failed: ${JSON.stringify(data.error ?? data)}`);
  }
  return data.result.task_key;
}

/**
 * Poll for mockup task result.
 * Printful renders asynchronously — poll every 2s until status is "completed".
 */
export async function getMockupResult(taskKey: string): Promise<MockupTask> {
  const res = await fetch(
    `${BASE_URL}/mockup-generator/task?task_key=${taskKey}`,
    { headers: getHeaders() }
  );
  if (!res.ok) throw new Error(`Mockup poll error: ${res.status}`);
  const data = await res.json();
  return data.result as MockupTask;
}

/**
 * Generate mockups and wait for completion.
 * Polls until done or timeout (default 30s).
 */
export async function generateMockups(
  productId: number,
  variantIds: number[],
  artworkUrl: string,
  placement: MockupFile["placement"] = "default",
  timeoutMs = 30000
): Promise<MockupResult[]> {
  const files: MockupFile[] = [{ placement, image_url: artworkUrl }];
  const taskKey = await createMockupTask(productId, variantIds, files);

  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    await new Promise((r) => setTimeout(r, 2000));
    const result = await getMockupResult(taskKey);
    if (result.status === "completed") return result.mockups ?? [];
    if (result.status === "failed") throw new Error(`Mockup failed: ${result.error}`);
  }
  throw new Error("Mockup generation timed out");
}

/* ── Order Creation ───────────────────────────────────────────────────── */

export interface OrderRecipient {
  name: string;
  email: string;
  address1: string;
  address2?: string;
  city: string;
  state_code?: string;
  country_code: string;
  zip: string;
  phone?: string;
}

export interface OrderItem {
  catalog_variant_id: number;
  quantity: number;
  files: { type: string; url: string }[];
  retail_price?: string;
  name?: string;
}

export interface PrintfulOrder {
  id: number;
  status: string;
  shipping: string;
  recipient: OrderRecipient;
  items: OrderItem[];
  retail_costs: { total: string; currency: string };
  created: number;
}

/**
 * Create a Printful order. Use confirm=false to create a draft first.
 */
export async function createOrder(
  recipient: OrderRecipient,
  items: OrderItem[],
  confirm = false
): Promise<PrintfulOrder> {
  const res = await fetch(`${BASE_URL}/v2/orders${confirm ? "?confirm=true" : ""}`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ recipient, items }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Order creation failed: ${JSON.stringify(err)}`);
  }
  const data = await res.json();
  return data.data as PrintfulOrder;
}

/**
 * Confirm a draft order (moves it to production).
 */
export async function confirmOrder(orderId: number): Promise<PrintfulOrder> {
  const res = await fetch(`${BASE_URL}/v2/orders/${orderId}/confirm`, {
    method: "POST",
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error(`Order confirm error: ${res.status}`);
  const data = await res.json();
  return data.data as PrintfulOrder;
}

/**
 * Get order status.
 */
export async function getOrder(orderId: number): Promise<PrintfulOrder> {
  const res = await fetch(`${BASE_URL}/v2/orders/${orderId}`, {
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error(`Get order error: ${res.status}`);
  const data = await res.json();
  return data.data as PrintfulOrder;
}

/* ── Pricing ──────────────────────────────────────────────────────────── */

export interface ShippingRate {
  id: string;
  name: string;
  rate: string;
  currency: string;
  minDeliveryDays: number;
  maxDeliveryDays: number;
}

/**
 * Get shipping rates for an order.
 */
export async function getShippingRates(
  recipient: Pick<OrderRecipient, "address1" | "city" | "country_code" | "zip">,
  items: { quantity: number; variant_id: number }[]
): Promise<ShippingRate[]> {
  const res = await fetch(`${BASE_URL}/v2/shipping/rates`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ recipient, items }),
  });
  if (!res.ok) throw new Error(`Shipping rates error: ${res.status}`);
  const data = await res.json();
  return data.data ?? [];
}
