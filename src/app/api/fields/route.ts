import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/fields
export async function GET() {
  try {
    const fields = await prisma.field.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(fields);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch fields" }, { status: 500 });
  }
}

// POST /api/fields
export async function POST(request: Request) {
  try {
    const { name, crop } = await request.json();
    const newField = await prisma.field.create({
      data: { name, crop },
    });
    return NextResponse.json(newField, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create field" }, { status: 500 });
  }
}
