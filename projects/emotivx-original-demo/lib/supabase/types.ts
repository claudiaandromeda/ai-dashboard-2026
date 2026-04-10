export interface Competition {
  id: string;
  name: string;
  short_name: string | null;
  country: string | null;
  season: string | null;
  data_format: "open" | "premium_360";
  active: boolean;
  created_at: string;
}

export interface Club {
  id: string;
  name: string;
  short_name: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  accent_color: string | null;
  logo_svg_url: string | null;
  stadium_name: string | null;
  stadium_image_url: string | null;
  league: string | null;
  statsbomb_team_id: number | null;
  created_at: string;
}

export interface ClubCompetition {
  club_id: string;
  competition_id: string;
}

export interface Player {
  id: string;
  club_id: string | null;
  name: string;
  position: string | null;
  jersey_number: number | null;
  avatar_url: string | null;
  photo_url: string | null;
  nationality: string | null;
  date_of_birth: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  preferred_foot: string | null;
  statsbomb_player_id: number | null;
  active: boolean;
  created_at: string;
}

export interface Pattern {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  preview_url: string | null;
  renderer: string | null;
  enabled: boolean;
  sort_order: number;
  created_at: string;
}

export interface Asset {
  id: string;
  club_id: string | null;
  name: string;
  type: "logo" | "crest" | "sponsor" | "kit" | "other";
  url: string;
  mime_type: string | null;
  immutable: boolean;
  version: number;
  uploaded_by: string | null;
  created_at: string;
}

export type OrderStatus =
  | "pending"
  | "processing"
  | "printing"
  | "shipped"
  | "delivered"
  | "cancelled";

export interface Order {
  id: string;
  user_id: string;
  status: OrderStatus;
  stripe_payment_id: string | null;
  printful_order_id: string | null;
  total_amount: number;
  currency: string;
  shipping_address: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export type ProductType = "hoodie" | "tshirt" | "zip_hoodie" | "poster" | "patch";

export interface OrderItem {
  id: string;
  order_id: string;
  moment_id: number | null;
  pattern_id: string | null;
  product_type: ProductType;
  size: string | null;
  quantity: number;
  customisation: Record<string, unknown> | null;
  unit_price: number;
  printful_product_id: string | null;
  created_at: string;
}
