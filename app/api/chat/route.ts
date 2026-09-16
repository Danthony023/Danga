import { chatWithAI, type Message } from "@/lib/ai";
import { buildChatSystemPrompt } from "@/lib/ai/prompt";
import { parseEditPlan, summarizeEditPlan } from "@/lib/ai/plan";
import { PRODUCE_EDIT_PLAN_TOOL } from "@/lib/ai/tools";
import { requireUser } from "@/lib/auth/session";
import { parseChatHistory } from "@/lib/projects/chat-history";
import { appendUnachievableToNotes } from "@/lib/projects/notes";
import type { ChatMessage } from "@/lib/types/project";
import {
  assertMessageQuota,
  getUsageSummary,
  incrementMessagesUsed,
} from "@/lib/usage";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const auth = await requireUser();
  if ("error" in auth) {
    return auth.error;
  }

  const { user, supabase } = auth;

  let body: { project_id?: string; message?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const projectId = body.project_id;
  const message = body.message?.trim();

  if (!projectId || !message) {
    return NextResponse.json(
      { error: "project_id and message are required." },
      { status: 400 }
    );
  }

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .single();

  if (projectError || !project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  const [{ data: profile }, { data: assets }] = await Promise.all([
    supabase.from("profiles").select("plan, style_traits").eq("id", user.id).single(),
    supabase
      .from("assets")
      .select("id, name, type, duration_seconds")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  if (!profile) {
    return NextResponse.json({ error: "Profile not found." }, { status: 400 });
  }

  const quota = await assertMessageQuota(supabase, user.id, profile.plan);
  if (!quota.ok) {
    return NextResponse.json({ error: quota.message }, { status: 429 });
  }

  const styleTraits = Array.isArray(profile.style_traits)
    ? profile.style_traits.filter((trait: unknown): trait is string => typeof trait === "string")
    : [];

  const chatHistory = parseChatHistory(project.chat_history);
  const systemPrompt = buildChatSystemPrompt({
    styleTraits,
    assets: assets ?? [],
    chatHistory,
    notes: project.notes,
  });

  const aiMessages: Message[] = [
    { role: "system", content: systemPrompt },
    ...chatHistory.map((entry) => ({
      role: entry.role,
      content: entry.content,
    })),
    { role: "user", content: message },
  ];

  let aiResponse;
  try {
    aiResponse = await chatWithAI(aiMessages, [PRODUCE_EDIT_PLAN_TOOL]);
  } catch (error) {
    const text = error instanceof Error ? error.message : "Chat failed.";
    return NextResponse.json({ error: text }, { status: 502 });
  }

  try {
    await incrementMessagesUsed(supabase, user.id);
  } catch {
    return NextResponse.json({ error: "Could not update usage." }, { status: 500 });
  }

  const usage = await getUsageSummary(supabase, user.id, profile.plan);
  const userMessage: ChatMessage = { role: "user", content: message };
  let assistantMessage: ChatMessage;

  if (aiResponse.type === "tool_call" && aiResponse.name === "produce_edit_plan") {
    const plan = parseEditPlan(aiResponse.input);
    if (!plan) {
      assistantMessage = {
        role: "assistant",
        content:
          "I had trouble formatting that edit plan. Could you clarify what you'd like changed?",
      };
    } else {
      const summary = summarizeEditPlan(plan);
      assistantMessage = {
        role: "assistant",
        content: summary,
        plan,
      };

      const updatedNotes = appendUnachievableToNotes(project.notes, plan.unachievable);

      const { error: updateError } = await supabase
        .from("projects")
        .update({
          edit_plan: plan,
          notes: updatedNotes,
          chat_history: [...chatHistory, userMessage, assistantMessage],
          updated_at: new Date().toISOString(),
        })
        .eq("id", projectId)
        .eq("user_id", user.id);

      if (updateError) {
        return NextResponse.json({ error: "Could not save project." }, { status: 500 });
      }

      return NextResponse.json({
        type: "plan",
        text: summary,
        plan,
        usage,
        notes: updatedNotes,
      });
    }
  } else if (aiResponse.type === "text") {
    assistantMessage = {
      role: "assistant",
      content: aiResponse.text,
    };
  } else {
    assistantMessage = {
      role: "assistant",
      content: "I couldn't finish that response. Try rephrasing your request.",
    };
  }

  const { error: updateError } = await supabase
    .from("projects")
    .update({
      chat_history: [...chatHistory, userMessage, assistantMessage],
      updated_at: new Date().toISOString(),
    })
    .eq("id", projectId)
    .eq("user_id", user.id);

  if (updateError) {
    return NextResponse.json({ error: "Could not save project." }, { status: 500 });
  }

  return NextResponse.json({
    type: "text",
    text: assistantMessage.content,
    usage,
  });
}
