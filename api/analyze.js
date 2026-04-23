import Anthropic from '@anthropic-ai/sdk';

async function lookupBarcode(barcode) {
  try {
    const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
    const data = await res.json();
    if (data.status === 1 && data.product) {
      const text = data.product.ingredients_text || '';
      const ingredients = text
        .split(/[,;()\n]/)
        .map(s => s.trim().replace(/^\*/, ''))
        .filter(s => s.length > 2);
      return {
        product_name: data.product.product_name || '',
        ingredients,
      };
    }
  } catch {}
  return { product_name: '', ingredients: [] };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Accept key from header (user-provided) or fall back to env var
  const apiKey = req.headers['x-api-key'] || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(401).json({
      error: 'No API key provided. Add your Anthropic API key in the Settings panel.',
    });
  }

  const client = new Anthropic({ apiKey });
  const { imageBase64, barcode } = req.body;

  let productName = '';
  let ingredients = [];
  let scanConfidence = 'low';

  // Step 1: Extract from label image using Claude Haiku vision
  if (imageBase64) {
    try {
      const response = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: [
          {
            type: 'text',
            text: 'You are a food safety expert. Extract information from food label images accurately.',
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
                text: `Look at this food label image and extract the product name and complete ingredients list.

Respond with ONLY valid JSON:
{
  "product_name": "name here",
  "ingredients": ["ingredient 1", "ingredient 2"],
  "confidence": "high|medium|low",
  "note": "optional note if label is unclear or ingredients not visible"
}

Set confidence to "high" if ingredients are clearly readable, "medium" if partially readable, "low" if the label is unclear or ingredients are not visible.`,
              },
            ],
          },
        ],
      });

      const text = response.content[0].text;
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        productName = parsed.product_name || '';
        ingredients = parsed.ingredients || [];
        scanConfidence = parsed.confidence || 'low';
      }
    } catch (e) {
      console.error('Image analysis error:', e.message);
    }
  }

  // Step 2: If confidence is low and barcode available, fall back to Open Food Facts
  if ((scanConfidence === 'low' || ingredients.length === 0) && barcode) {
    const barcodeData = await lookupBarcode(barcode);
    if (barcodeData.ingredients.length > 0) {
      ingredients = barcodeData.ingredients;
      productName = productName || barcodeData.product_name;
    }
  }

  if (ingredients.length === 0) {
    return res.status(200).json({
      product_name: productName || 'Unknown Product',
      ingredients: [],
      summary:
        'Could not extract ingredients. Try pointing the camera directly at the ingredients list, or scan the barcode.',
      toxic_count: 0,
      concerning_count: 0,
    });
  }

  // Step 3: Analyze toxicity with Claude Haiku
  try {
    const toxResponse = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      system: [
        {
          type: 'text',
          text: 'You are a food safety expert. Analyze food ingredients for safety, identifying toxic or harmful substances.',
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [
        {
          role: 'user',
          content: `Analyze these food ingredients for safety. Classify each as:
- "safe": common food ingredient with no significant health concerns
- "concerning": potential health risks at high consumption or for certain populations
- "toxic": harmful, banned, or not suitable for human consumption

Product: ${productName}
Ingredients: ${ingredients.join(', ')}

Respond with ONLY valid JSON:
{
  "ingredients": [
    {"name": "sugar", "status": "safe", "reason": "common sweetener"},
    {"name": "Red 40", "status": "concerning", "reason": "artificial dye linked to hyperactivity in children"}
  ],
  "summary": "overall safety assessment in 1-2 sentences",
  "toxic_count": 0,
  "concerning_count": 1
}`,
        },
      ],
    });

    const toxText = toxResponse.content[0].text;
    const toxMatch = toxText.match(/\{[\s\S]*\}/);
    if (toxMatch) {
      const toxData = JSON.parse(toxMatch[0]);
      return res.status(200).json({ product_name: productName, ...toxData });
    }
  } catch (e) {
    console.error('Toxicity analysis error:', e.message);
  }

  return res.status(200).json({
    product_name: productName,
    ingredients: ingredients.map(name => ({ name, status: 'unknown', reason: '' })),
    summary: 'Analysis incomplete. Please try again.',
    toxic_count: 0,
    concerning_count: 0,
  });
}
