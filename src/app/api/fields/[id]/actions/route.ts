import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET handler to fetch all actions for a specific field
export async function GET(
  request: Request,
  // Correctly type params to expect 'id' based on the folder name
  { params }: { params: { id: string } }
) {
  try {
    // Use 'id' from params
    const fieldId = params.id;
    const actions = await prisma.fieldAction.findMany({
      where: { fieldId }, // The database schema still expects 'fieldId'
      orderBy: {
        date: 'desc',
      },
    });
    return NextResponse.json(actions);
  } catch (error) {
    console.error('Failed to fetch actions:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

// POST handler to add a new action to a field
export async function POST(
  request: Request,
  // Correctly type params to expect 'id' based on the folder name
  { params }: { params: { id: string } }
) {
  try {
    // Use 'id' from params
    const fieldId = params.id;
    const { action, date } = await request.json();

    if (!action || !date) {
      return new NextResponse('Missing action or date', { status: 400 });
    }

    const newAction = await prisma.fieldAction.create({
      data: {
        // Here we pass the 'id' from the URL to the 'fieldId' property of our schema
        fieldId: fieldId,
        action,
        date: new Date(date),
      },
    });

    return NextResponse.json(newAction, { status: 201 });
  } catch (error) {
    console.error('Failed to create action:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}