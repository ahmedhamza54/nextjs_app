import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const { latLng, locationName, threadId } = await request.json();
    const dataToUpdate: any = { locationName, threadId };

    if (Array.isArray(latLng) && latLng.length === 2) {
      dataToUpdate.latitude = latLng[0];
      dataToUpdate.longitude = latLng[1];
    }

    const updated = await prisma.field.update({
      where: { id: params.id },
      data: dataToUpdate,
    });

    return NextResponse.json(updated, { status: 200 });
  } catch (e: any) {
    // Optional: map Prisma "record not found" to 404
    if (e.code === "P2025") {
      return NextResponse.json({ error: "Field not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Failed to update field" }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    await prisma.field.delete({ where: { id: params.id } });
    return new Response(null, { status: 204 });
  } catch (e: any) {
    if (e.code === "P2025") {
      return NextResponse.json({ error: "Field not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Failed to delete field" }, { status: 500 });
  }
}
