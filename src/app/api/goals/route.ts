import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getAssistantResponse } from '@/app/api/getAssistantResponse';

export async function POST(req: Request) {
  console.log('Received POST request to /api/goals');
  try {
    const body = await req.json();
    console.log('Request body:', body);
    const { title } = body;

    if (!title) {
      console.log('Missing title in request body');
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const assistantId = 'asst_YRXXdjlxWD9jxrBVIob5ESHV';
    const prompt = `Generate a checklist for the goal: "${title}" .`;

    console.log('Calling getAssistantResponse with prompt:', prompt, 'assistantId:', assistantId);
    const raw = await getAssistantResponse(prompt, assistantId);

    if (!raw) {
      console.log('No response from assistant');
      return NextResponse.json({ error: 'No response from assistant' }, { status: 500 });
    }

    console.log('Raw assistant response:', raw);
    
      const checklist = extractJsonFromRaw(raw);

       try {
      //const checklist = JSON.parse(raw);

      // Validate checklist format
      if (!Array.isArray(checklist) || !checklist.every(item => 
        typeof item.text === 'string' && 
        typeof item.priority === 'string' && 
        typeof item.completed === 'boolean'
      )) {
        console.log('Invalid checklist format:', checklist);
        return NextResponse.json({ error: 'Invalid checklist format' }, { status: 400 });
      }

      const goal = await prisma.goal.create({
        data: {
          title,
          isGenerating: false,
          isGenerated: true,
          color: 'blue',
          checklist: {
            create: checklist.map((item: any) => ({
              text: item.text,
              priority: item.priority,
              completed: item.completed ?? false,
            })),
          },
        },
        include: { checklist: true },
      });

      console.log('Goal created:', goal);
      return NextResponse.json(goal);
    } catch (err: any) {
      console.error('Error parsing or saving goal:', err.message || err);
      return NextResponse.json({ error: 'Invalid checklist format or database error' }, { status: 500 });
    }
  } catch (error: any) {
    console.error('API route error:', error.message || error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function extractJsonFromRaw(raw: string): any[] | null {
  try {
    const startIndex = raw.indexOf('[');
    const endIndex = raw.lastIndexOf(']') + 1;

    if (startIndex === -1 || endIndex === -1) return null;

    const jsonText = raw.slice(startIndex, endIndex);
    return JSON.parse(jsonText);
  } catch (error) {
    console.error('❌ Failed to parse JSON from raw string:', error);
    return null;
  }
}
export async function GET() {
   try {
    const goals = await prisma.goal.findMany({
      include: {
        checklist: true, // ⬅️ this will attach all tasks to each goal
      },
    });

    return NextResponse.json(goals);
  } catch (err) {
    console.error('Failed to fetch goals:', err);
    return NextResponse.json({ error: 'Failed to fetch goals' }, { status: 500 });
  }
}
