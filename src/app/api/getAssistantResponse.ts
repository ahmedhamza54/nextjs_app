import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function getAssistantResponse(prompt: string, assistantId: string): Promise<string | null> {
  try {
    // Step 1: Create thread
    const thread = await openai.beta.threads.create();
    const threadId = thread.id;


    if (!thread || !thread.id) {
      console.error('❌ Failed to create thread or missing ID:', thread);
      return null;
    }

    console.log('✅ Thread created:', thread.id);

    // Step 2: Add prompt message
    await openai.beta.threads.messages.create(thread.id, {
      role: 'user',
      content: prompt,
    });

    console.log('✅ Message added to thread');

    // Step 3: Run assistant
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: assistantId,
    });

    if (!run || !run.id) {
      console.error('❌ Failed to create run or missing ID:', run);
      return null;
    }

    console.log('✅ Run started:', run.id);

    // Step 4: Poll for completion
    let runStatus = run;
    while (runStatus.status !== 'completed' && runStatus.status !== 'failed') {
      console.log(`⏳ Waiting for run to complete... Status: ${runStatus.status}`);
      await new Promise(resolve => setTimeout(resolve, 1000));
runStatus = await openai.beta.threads.runs.retrieve(run.id, { thread_id: thread.id });

    }

    if (runStatus.status === 'failed') {
      console.error('❌ Assistant run failed:', runStatus.last_error);
      return null;
    }

    // Step 5: Fetch messages
    const messages = await openai.beta.threads.messages.list(thread.id);
    const lastMessage = messages.data.reverse().find(msg => msg.role === 'assistant');

    const reply = lastMessage?.content?.[0]?.type === 'text'
      ? (lastMessage.content[0] as { type: 'text'; text: { value: string } }).text.value
      : null;

    console.log('✅ Assistant replied:', reply);

    return reply;
  } catch (error) {
    console.error('❌ Error in getAssistantResponse:', error);
    return null;
  }
}
