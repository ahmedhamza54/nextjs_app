// app/api/fields/[id]/messages/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Prisma needs Node runtime (not edge)
export const runtime = "nodejs";
// If you see caching issues during dev, you can also add:
// export const dynamic = "force-dynamic";

// GET /api/fields/:id/messages
export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const fieldId = params.id;
  if (!fieldId) {
    return NextResponse.json({ error: "Invalid Field ID" }, { status: 400 });
  }
  try {
    const messages = await prisma.chatMessage.findMany({
      where: { fieldId },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json(messages, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
  }
}

// POST /api/fields/:id/messages
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const fieldId = params.id;
  if (!fieldId) {
    return NextResponse.json({ error: "Invalid Field ID" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const role = body?.role as "user" | "assistant" | "system";
    const content = body?.content as string;

    if (!role || !content) {
      return NextResponse.json(
        { error: "role and content are required" },
        { status: 400 }
      );
    }

    const newMessage = await prisma.chatMessage.create({
      data: { role, content, fieldId },
    });

    return NextResponse.json(newMessage, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to save message" }, { status: 500 });
  }
}
