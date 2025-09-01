import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const apiKey = process.env.OPENAI_API_KEY;
const assistantId = "asst_tQqncDjbRoCeyhDr2pXdpGUH";

// Helper function to wait for a run to complete
// MODIFIED to use the older SDK syntax
const _wait_for_run = async (openai: OpenAI, threadId: string, runId: string): Promise<any> => {
  while (true) {
    console.log(`Polling status for run: ${runId}`);
    
    // --- THIS IS THE KEY CHANGE ---
    // Using the single-object parameter that older SDK versions expect.
    // This directly fixes the TypeScript error you previously encountered.
    const run = await openai.beta.threads.runs.retrieve(runId, { thread_id: threadId });

    if (['completed', 'failed', 'cancelled', 'expired'].includes(run.status)) {
      console.log(`Run finished with status: ${run.status}`);
      return run; // Return the entire run object
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
  }
}

// Helper function to get the latest message text
const _latest_assistant_message_text = async (openai: OpenAI, threadId: string): Promise<string> => {
    const messages = await openai.beta.threads.messages.list(threadId, { order: 'desc', limit: 10 });
    const assistantMessage = messages.data.find(msg => msg.role === 'assistant');

    if (assistantMessage?.content?.[0]?.type === 'text') {
        return (assistantMessage.content[0] as any).text.value;
    }
    return '';
}


export async function POST(req: Request) {
  if (!apiKey || !assistantId) {
    console.error("Missing OpenAI API Key or Assistant ID in .env.local");
    return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
  }

  const openai = new OpenAI({ apiKey });

  try {
    const { thread_id: threadId, message } = await req.json();

    if (!message) {
      return NextResponse.json({ error: 'message is required' }, { status: 400 });
    }

    let currentThreadId = threadId;
    if (!currentThreadId) {
      const thread = await openai.beta.threads.create();
      currentThreadId = thread.id;
    }

    await openai.beta.threads.messages.create(currentThreadId, {
      role: 'user',
      content: message,
    });

    const run = await openai.beta.threads.runs.create(currentThreadId, {
      assistant_id: assistantId,
    });

    // Wait for completion and get the final run object
    const finalRun = await _wait_for_run(openai, currentThreadId, run.id);

    if (finalRun.status !== 'completed') {
      console.error('Run failed with status:', finalRun.status, finalRun.last_error);
      return NextResponse.json({ 
        thread_id: currentThreadId, 
        status: finalRun.status, 
        answer: '',
        error: finalRun.last_error?.message || 'Run failed to complete.'
      }, { status: 502 });
    }

    const answer = await _latest_assistant_message_text(openai, currentThreadId);
    
    return NextResponse.json({ thread_id: currentThreadId, status: finalRun.status, answer });

  } catch (error: any) {
    console.error("An error occurred in the chat handler:", error);
    return NextResponse.json({ error: error.message || 'An internal server error occurred' }, { status: 500 });
  }
}