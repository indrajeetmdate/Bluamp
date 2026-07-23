import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI, Type } from '@google/genai';
import { waitUntil } from '@vercel/functions';

// IMPORTANT: VITE_* env vars are NOT available in Vercel serverless functions (they are build-time only).
// We must use the same hardcoded fallbacks as supabaseClient.ts to ensure database access always works.
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://ofnwuifgzqjmmnsqsoed.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9mbnd1aWZnenFqbW1uc3Fzb2VkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ4MDQwODQsImV4cCI6MjEwMDM4MDA4NH0.J-EU8aFvlj1o6sMoWWJUJKbp8buMo4V8AbAmT7KkTz8';

const supabase = createClient(supabaseUrl, supabaseKey);

const API_KEY = process.env.GEMINI_API_KEY || process.env.API_KEY || '';

const aiAssistantSchema = {
  type: Type.OBJECT,
  properties: {
    document_type: { type: Type.STRING, enum: ["invoice", "po", "quotation", "proforma"] },
    template_name: { type: Type.STRING, nullable: true },
    company_match: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING },
        is_new_company: { type: Type.BOOLEAN }
      }
    },
    items: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          description: { type: Type.STRING },
          quantity: { type: Type.NUMBER },
          unit_price: { type: Type.NUMBER },
          is_custom_product: { type: Type.BOOLEAN }
        }
      }
    },
    ui_options: {
      type: Type.OBJECT,
      properties: {
        showReceiverSign: { type: Type.BOOLEAN, nullable: true },
        showQRCode: { type: Type.BOOLEAN, nullable: true },
        showTotalsTable: { type: Type.BOOLEAN, nullable: true },
        showTaxTable: { type: Type.BOOLEAN, nullable: true },
        terms: { type: Type.STRING, nullable: true },
        visibleColumns: {
          type: Type.OBJECT,
          properties: {
            index: { type: Type.BOOLEAN, nullable: true },
            description: { type: Type.BOOLEAN, nullable: true },
            hsn: { type: Type.BOOLEAN, nullable: true },
            quantity: { type: Type.BOOLEAN, nullable: true },
            rate: { type: Type.BOOLEAN, nullable: true },
            discount: { type: Type.BOOLEAN, nullable: true },
            taxableValue: { type: Type.BOOLEAN, nullable: true },
            total: { type: Type.BOOLEAN, nullable: true }
          }
        }
      }
    }
  }
};

function cleanAndParseJSON(raw: string) {
    let text = raw.trim();
    text = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
    return JSON.parse(text);
}

function parseSlackPayload(req: any) {
  let body = req.body;

  if (Buffer.isBuffer(body)) {
    body = body.toString('utf-8');
  }

  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      try {
        const params = new URLSearchParams(body);
        body = Object.fromEntries(params.entries());
      } catch {
        body = {};
      }
    }
  }

  if (!body || typeof body !== 'object') {
    body = req.query || {};
  }

  const command = body.command || req.query?.command || '';
  const text = (body.text || body.event?.text || req.query?.text || '').trim();
  const responseUrl = body.response_url || body.event?.response_url || req.query?.response_url || '';

  return { body, command, text, responseUrl };
}

async function parseSlackPayloadAsync(req: any) {
  let body = req.body;

  if (!body && typeof req.on === 'function') {
    try {
      body = await new Promise<string>((resolve) => {
        let data = '';
        req.on('data', (chunk: any) => { data += chunk; });
        req.on('end', () => { resolve(data); });
        req.on('error', () => { resolve(''); });
      });
    } catch {
      body = '';
    }
  }

  return parseSlackPayload({ ...req, body });
}

async function sendToSlack(responseUrl: string, message: any) {
    if (!responseUrl) return;
    const body = typeof message === 'string' ? { text: message, response_type: "in_channel" } : message;
    await fetch(responseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
}

async function processInvoice(userText: string, responseUrl: string) {
    try {
        const [companyResult, priceResult, templateResult] = await Promise.all([
          supabase.from('company_profiles').select('name'),
          supabase.from('price_list').select('model_name, price_without_gst'),
          supabase.from('invoice_templates').select('name')
        ]);

        if (companyResult.error) console.error('[Slack] company_profiles query failed:', companyResult.error);
        if (priceResult.error) console.error('[Slack] price_list query failed:', priceResult.error);
        if (templateResult.error) console.error('[Slack] invoice_templates query failed:', templateResult.error);
    
        const context = {
          companies: (companyResult.data || []).map((c: any) => c.name).filter(Boolean),
          products: (priceResult.data || []).map((p: any) => ({ model_name: p.model_name, price_without_gst: p.price_without_gst })),
          templates: (templateResult.data || []).map((t: any) => t.name).filter(Boolean)
        };

        console.log(`[Slack] Context loaded — Companies: ${context.companies.length}, Products: ${context.products.length}, Templates: ${context.templates.length}`);
    
        const ai = new GoogleGenAI({ apiKey: API_KEY });
        
        const systemPrompt = `You are an AI Invoice Assistant for Bluamp Energies. Your job is to translate a user's natural language request into a strict JSON payload that will be used to automatically fill out an Invoice/Quotation form.
    
    System Context:
    [COMPANIES]: ${JSON.stringify(context.companies)}
    [PRODUCTS]: ${JSON.stringify(context.products)}
    [TEMPLATES]: ${JSON.stringify(context.templates)}
    
    Follow these strict rules:
    1. DOCUMENT TYPE: Extract document type ('invoice', 'po', 'quotation', 'proforma'). Default is 'invoice'.
    2. CUSTOMER/COMPANY: Attempt to match customer/supplier to closest in [COMPANIES].
    3. LINE ITEMS: Match items to closest in [PRODUCTS]. For new items set is_custom_product: true.
    4. TEMPLATE: Match requested template.
    5. UI OPTIONS: Extract visibility flags if requested.
    
    User Request: "${userText}"`;
    
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: systemPrompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: aiAssistantSchema,
                temperature: 0.1,
            },
        });
    
        const parsedData = cleanAndParseJSON(response.text || '{}');
        console.log('[Slack] AI Response:', JSON.stringify(parsedData));
    
        const draftPayload = {
          filename: 'AI_Assistant_Draft',
          document_type: parsedData.document_type || 'invoice',
          source_type: 'sales',
          requires_review: true,
          raw_text: `Generated via Slack (${userText})`,
          uploaded_by: 'slack_bot',
          invoice_metadata: {
            invoice_number: `SLACK-${Math.floor(Math.random() * 10000)}`,
            ui_config: {},
            slack_ai_payload: parsedData
          },
          items: [], 
          totals: { subtotal_taxable: 0, cgst_total: 0, sgst_total: 0, igst_total: 0, grand_total: 0 }
        };
    
        const { data: dbData, error } = await supabase.from('invoices').insert([draftPayload]).select().single();
    
        if (error) {
          console.error('Supabase insert error:', error);
          await sendToSlack(responseUrl, "❌ An error occurred while saving the draft invoice to the database.");
          return;
        }
    
        const appUrl = process.env.VITE_APP_URL || process.env.APP_URL || 'https://blueamp.cnergy.co.in';
        const invoiceUrl = `${appUrl}/?view=finance_maker&slack_draft=${dbData.id}`; 
    
        const slackResponse = {
          response_type: "in_channel",
          blocks: [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: `⚡ *Bluamp AI Invoice Draft Generated!*\n\n*Type:* ${parsedData.document_type || 'Invoice'}\n*Customer:* ${parsedData.company_match?.name || 'Not specified'}\n*Items:* ${parsedData.items?.length || 0} items identified.`
              }
            },
            {
              type: "actions",
              elements: [
                {
                  type: "button",
                  text: {
                    type: "plain_text",
                    text: "Open Invoice Maker",
                    emoji: true
                  },
                  value: "open_invoice",
                  url: invoiceUrl,
                  style: "primary"
                }
              ]
            }
          ]
        };
        
        await sendToSlack(responseUrl, slackResponse);

    } catch (err: any) {
        console.error('Slack Background Error:', err);
        await sendToSlack(responseUrl, `❌ Oops, something went wrong generating the invoice: ${err.message}`);
    }
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { body, command, text, responseUrl } = await parseSlackPayloadAsync(req);

    if (body?.type === 'url_verification') {
      return res.status(200).json({ challenge: body.challenge });
    }

    if (!text) {
      const helpMessage = {
        response_type: "ephemeral",
        text: "⚡ *Bluamp AI Invoice Assistant*\n\nUsage: `/make-invoice [invoice details]` or `/doc [invoice details]` or `/invoice [invoice details]`\n\n*Examples:*\n• `/make-invoice Create quotation for ACME Solar, 5x 48V 100Ah Batteries`\n• `/doc Invoice Tata Power for 10x 12V 200Ah cells at 12500 each`"
      };
      
      return res.status(200).json(helpMessage);
    }

    // Schedule processInvoice in background and respond instantly to Slack (< 50ms)
    const runTask = async () => {
      try {
        if (responseUrl) {
          await processInvoice(text, responseUrl);
        }
      } catch (err: any) {
        console.error('[Slack Invoice Background Error]', err);
      }
    };

    try {
      waitUntil(runTask());
    } catch {
      runTask();
    }

    return res.status(200).json({
      response_type: "ephemeral",
      text: `⚡ *Bluamp AI Assistant:* Processing request: "${text}"...`
    });

  } catch (err: any) {
    console.error('Slack Handler Error:', err);
    return res.status(200).json({
      response_type: "ephemeral",
      text: `❌ Error processing Slack command: ${err.message}`
    });
  }
}
