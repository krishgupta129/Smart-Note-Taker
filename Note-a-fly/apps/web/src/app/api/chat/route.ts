import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { message, history } = await req.json();

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return NextResponse.json({ error: "Message required" }, { status: 400 });
    }

    if (message.trim().length > 500) {
      return NextResponse.json({ error: "Message too long" }, { status: 400 });
    }

    const aiServiceUrl = process.env.AI_SERVICE_URL ?? "http://localhost:8000";

    const res = await fetch(`${aiServiceUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: message.trim(),
        history: Array.isArray(history) ? history.slice(-6) : [],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("FastAPI chat error:", err);
      return NextResponse.json({ error: "AI service unavailable" }, { status: 502 });
    }

    const data = await res.json();
    return NextResponse.json({ reply: data.reply });

  } catch (err) {
    console.error("Chat route error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}