export type AssetType = "video" | "audio" | "image";

export type Asset = {
  id: string;
  user_id: string;
  name: string;
  type: AssetType;
  storage_path: string;
  size_bytes: number;
  duration_seconds: number | null;
  pinned: boolean;
  created_at: string;
};

export type Profile = {
  id: string;
  display_name: string | null;
  plan: string;
  style_traits: string[];
  created_at: string;
};
