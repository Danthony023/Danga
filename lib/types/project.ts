export type PlanItemType = "clip" | "audio" | "image" | "caption" | "transition";

export type PlanItem = {
  step: number;
  description: string;
  asset_id: string | null;
  type: PlanItemType;
};

export type UnachievableItem = {
  task: string;
  suggested_alternative: string;
};

export type EditPlan = {
  plan_items: PlanItem[];
  render_ready: boolean;
  unachievable: UnachievableItem[];
};

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  plan?: EditPlan;
};

export type Project = {
  id: string;
  user_id: string;
  title: string | null;
  status: "drafting" | "rendering" | "done";
  chat_history: ChatMessage[];
  edit_plan: EditPlan | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};
