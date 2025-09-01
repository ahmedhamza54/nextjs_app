import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// PUT /api/fields/:id
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const { latLng, locationName, threadId } = await request.json();
    const dataToUpdate: any = { locationName, threadId };

    if (latLng) {
      dataToUpdate.latitude = latLng[0];
      dataToUpdate.longitude = latLng[1];
    }

    const updatedField = await prisma.field.update({
      where: { id: params.id },
      data: dataToUpdate,
    });

    return NextResponse.json(updatedField);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update field" }, { status: 500 });
  }
}

// DELETE /api/fields/:id
export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    await prisma.field.delete({
      where: { id: params.id },
    });
    return new Response(null, { status: 204 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete field" }, { status: 500 });
  }
}
