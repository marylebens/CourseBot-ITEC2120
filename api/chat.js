import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

//  the assistant_id from the dashboard for ITEC1375
const ASSISTANT_ID = "asst_zsAC6t8WwRh34AFsFz5MZXVQ";

// Function to convert markdown to HTML
function convertMarkdownToHtml(text) {
  let html = text;

   // Convert headers - ADD THIS LINE
  html = html.replace(/^### (.*$)/gim, '<h3 style="font-size: 1.2em; font-weight: bold; margin: 15px 0 10px 0;">$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2 style="font-size: 1.4em; font-weight: bold; margin: 20px 0 10px 0;">$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1 style="font-size: 1.6em; font-weight: bold; margin: 20px 0 15px 0;">$1</h1>');
    
  // Convert code blocks with python syntax
  html = html.replace(/```python\n([\s\S]*?)\n```/g, '<pre style="background: #f4f4f4; padding: 15px; border-radius: 5px; overflow-x: auto; font-family: monospace;"><code>$1</code></pre>');
  
  // Convert bold text
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  
  // Convert inline code
  html = html.replace(/`([^`]+)`/g, '<code style="background: #f0f0f0; padding: 2px 4px; border-radius: 3px; font-family: monospace;">$1</code>');
  
  // Convert bullet points
  html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
  
  // Wrap consecutive list items in ul tags
  html = html.replace(/(<li>.*<\/li>(?:\s*<li>.*<\/li>)*)/gs, '<ul style="margin: 10px 0;">$1</ul>');
  
  // Convert line breaks to br tags
  html = html.replace(/\n/g, '<br>');
  
  return html;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  const { message } = req.body;
  if (!message) return res.status(400).json({ error: "No message provided" });

  try {
    // Create a thread
    const thread = await openai.beta.threads.create();
    
    // Add user message
    await openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: message,
    });
    
    // Run the assistant
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: ASSISTANT_ID,
    });
    
    // Poll until it's done
    let runStatus;
    do {
      runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    } while (runStatus.status !== "completed");
    
    // Get the answer
    const messages = await openai.beta.threads.messages.list(thread.id);
    let reply = messages.data[0].content[0].text.value;
    
    // Convert markdown to HTML before sending back
    reply = convertMarkdownToHtml(reply);
    
    return res.status(200).json({ reply });
  } catch (error) {
    console.error("OpenAI API error:", error);
    return res.status(500).json({ error: "Failed to get response from OpenAI." });
  }
}
