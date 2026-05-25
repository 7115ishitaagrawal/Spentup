export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const { transcript, categories } = await req.json();

    const prompt = `You are an expense parser for an Indian college student expense tracking app called Spentup.

Parse this voice input into a JSON expense object: "${transcript}"

Available categories: ${categories}

Rules:
- amount: extract the number (required, must be positive)
- category: pick the best matching category id from the list
- note: a clean short description (2-4 words max)
- Understand Indian context: chai, auto/cab/ola/uber, mess/canteen, recharge/jio/airtel
- Understand Hinglish naturally: "khaana" = food, "safar/auto liya" = auto, "chai pi" = chai
- If amount is unclear, set amount to 0
- Return ONLY valid JSON, no explanation, no markdown

Examples:
"320 on starbucks" → {"amount": 320, "category": "chai", "note": "Starbucks"}
"auto liya 80 rupaye" → {"amount": 80, "category": "auto", "note": "Auto ride"}
"zomato order 240" → {"amount": 240, "category": "food", "note": "Zomato order"}
"mess ka khana 60" → {"amount": 60, "category": "canteen", "note": "Mess food"}
"jio recharge 239" → {"amount": 239, "category": "recharge", "note": "Jio recharge"}

Now parse: "${transcript}"`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama3-8b-8192',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 150,
        temperature: 0.1
      })
    });

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '';
    const clean = text.replace(/```json|```/g, '').trim();

    return new Response(JSON.stringify({ text: clean }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
