import Anthropic from '@anthropic-ai/sdk';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(401).json({ error: 'Server API key not configured.' });
  }

  const { imageBase64 } = req.body;
  if (!imageBase64) {
    return res.status(400).json({ error: 'No image provided.' });
  }

  const client = new Anthropic({ apiKey });

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      system: [
        {
          type: 'text',
          text: 'You are a food safety expert. Read ingredients lists from food package images and assess each ingredient for safety.',
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: 'image/jpeg', data: imageBase64 },
            },
            {
              type: 'text',
              text: `Look at this image of a food package ingredients list. Read every ingredient visible, then classify each one as:
- "toxic": harmful, potentially carcinogenic, banned in some countries, or not suitable for human consumption
- "concerning": artificial additives, preservatives, or ingredients with known health risks at regular consumption
- "safe": natural or well-established ingredients with no significant health concerns

Return results sorted by severity: toxic first, then concerning, then safe.

Respond with ONLY valid JSON, no markdown or explanation:
{
  "product_name": "product name if visible, otherwise empty string",
  "ingredients": [
    {"name": "ingredient name", "status": "toxic|concerning|safe", "reason": "brief reason"}
  ],
  "summary": "1-2 sentence overall safety assessment",
  "toxic_count": 0,
  "concerning_count": 0
}

If the ingredients list is not clearly visible or readable, return:
{
  "product_name": "",
  "ingredients": [],
  "summary": "Could not read the ingredients list. Please point the camera directly at the ingredients text and ensure good lighting.",
  "toxic_count": 0,
  "concerning_count": 0
}`,
            },
          ],
        },
      ],
    });

    const text = response.content[0].text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return res.status(200).json(JSON.parse(jsonMatch[0]));
    }

    return res.status(200).json({
      product_name: '',
      ingredients: [],
      summary: 'Could not parse the response. Please try again.',
      toxic_count: 0,
      concerning_count: 0,
    });
  } catch (e) {
    console.error('Analysis error:', e.message);
    return res.status(500).json({ error: 'Analysis failed: ' + e.message });
  }
}
