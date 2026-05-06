/* ============================================================
   BarOps — netlify/functions/ocr.js
   Serverless функція для Claude Vision OCR накладних
   Виклик: POST /api/ocr
   Body: { image: "base64string", mediaType: "image/jpeg" }
   ============================================================ */

exports.handler = async (event) => {
  // Тільки POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!API_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: 'API key not configured' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const { image, mediaType = 'image/jpeg' } = body;
  if (!image) {
    return { statusCode: 400, body: JSON.stringify({ error: 'No image provided' }) };
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-6',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: image },
            },
            {
              type: 'text',
              text: `Ти — система розпізнавання накладних для барного додатку BarOps.

Проаналізуй це фото накладної і витягни дані у форматі JSON.

Поверни ТІЛЬКИ валідний JSON без жодного тексту до або після, у такому форматі:
{
  "supplier": "назва постачальника",
  "invoiceNumber": "номер накладної",
  "date": "дата у форматі DD.MM.YYYY",
  "items": [
    {
      "name": "назва товару",
      "volume": "об'єм якщо є у назві наприклад 0.7л або 1л",
      "quantity": число,
      "unit": "одиниця виміру (пляш/л/кг/шт)",
      "unitPrice": число,
      "total": число
    }
  ],
  "totalAmount": загальна сума числом,
  "confidence": число від 0 до 1 (якість розпізнавання)
}

Якщо якесь поле не вдалось розпізнати — постав null.
Об'єм витягуй з назви товару (наприклад "Aperol 1л" → volume: "1л").`
            }
          ]
        }]
      })
    });

    if (!response.ok) {
      const err = await response.text();
      return { statusCode: 502, body: JSON.stringify({ error: 'Anthropic API error', details: err }) };
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || '';

    // Парсимо JSON з відповіді
    let parsed;
    try {
      // Видаляємо можливі markdown backticks
      const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsed = JSON.parse(clean);
    } catch {
      return {
        statusCode: 200,
        body: JSON.stringify({ success: false, rawText: text, error: 'Could not parse JSON from response' })
      };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ success: true, data: parsed })
    };

  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
