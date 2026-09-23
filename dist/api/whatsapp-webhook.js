import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://xvwjghnfgfivpjhftypu.supabase.co'
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || ''

const supabase = SUPABASE_URL && SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY) : null

// Format markdown bold (**text**) to WhatsApp bold (*text*)
function formatWhatsAppText(text) {
  if (!text) return ''
  return text
    .replace(/\*\*(.*?)\*\*/g, '*$1*')
    .replace(/__(.*?)__/g, '_$1_')
}

// Call AI API based on provider
async function generateAiReply({ provider, apiKey, model, systemPrompt, userMessage, catalogContext = '', history = [] }) {
  const fullSystemPrompt = `${systemPrompt || 'أنت مساعد مبيعات احترافي للمتجر.'}

${catalogContext ? `--- قائمة المنتجات المتوفرة حالياً في المخزون ---\n${catalogContext}\n--- نهاية القائمة ---` : ''}

ملاحظة للذكاء الاصطناعي: اجعل إجابتك وسلسة ومناسبة لتطبيق واتساب. لا تضع جداول معقدة بل استخدم قوائم مبسطة ورموز تعبيرية (Emojis) مناسبة.`

  if (apiKey?.startsWith('AQ.') || apiKey?.startsWith('AIza')) {
    provider = 'gemini'
  } else if (apiKey?.startsWith('gsk_')) {
    provider = 'groq'
  } else if (apiKey?.startsWith('sk-')) {
    provider = 'openai'
  }

  // 1. OpenAI / ChatGPT
  if (provider === 'openai') {
    const messages = [
      { role: 'system', content: fullSystemPrompt },
      ...history.map(h => ({
        role: h.direction === 'inbound' ? 'user' : 'assistant',
        content: h.message_text
      })),
      { role: 'user', content: userMessage }
    ]

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model || 'gpt-4o-mini',
        messages,
        temperature: 0.7
      })
    })

    const data = await response.json()
    if (data.error) throw new Error(data.error.message || 'Error from OpenAI API')
    return data.choices?.[0]?.message?.content || 'مرحباً! كيف يمكنني مساعدتك اليوم؟'
  }

  // 2. Google Gemini
  if (provider === 'gemini') {
    const geminiModel = model || 'gemini-1.5-flash'
    const contents = [
      { role: 'user', parts: [{ text: `${fullSystemPrompt}\n\nالسؤال: ${userMessage}` }] }
    ]

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents })
    })

    const data = await response.json()
    if (data.error) throw new Error(data.error.message || 'Error from Gemini API')
    return data.candidates?.[0]?.content?.parts?.[0]?.text || 'مرحباً! كيف يمكنني مساعدتك اليوم؟'
  }

  // 3. Groq (Llama-3)
  if (provider === 'groq') {
    const messages = [
      { role: 'system', content: fullSystemPrompt },
      { role: 'user', content: userMessage }
    ]

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model || 'llama-3.3-70b-versatile',
        messages
      })
    })

    const data = await response.json()
    if (data.error) throw new Error(data.error.message || 'Error from Groq API')
    return data.choices?.[0]?.message?.content || 'مرحباً! كيف يمكنني مساعدتك اليوم؟'
  }

  // 4. Fallback Default Response generator if no API key is set
  return `Salam! 👋 شكراً لتواصلك معنا. مرحباً بك في متجرنا.
كيف يمكننا مساعدتك اليوم؟ يمكنك إرسال اسم المنتج أو الاستفسار وسنقوم بإجابتك فوراً.`
}

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  )

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  // Handle Meta Webhook Verification (GET request)
  if (req.method === 'GET') {
    const mode = req.query['hub.mode']
    const token = req.query['hub.verify_token']
    const challenge = req.query['hub.challenge']

    // Load verify_token from DB if needed
    let expectedToken = process.env.WHATSAPP_VERIFY_TOKEN || 'alphashop_whatsapp_verify_token_123'
    if (supabase) {
      const { data } = await supabase.from('whatsapp_settings').select('verify_token').limit(1).single()
      if (data?.verify_token) expectedToken = data.verify_token
    }

    if (mode === 'subscribe' && token === expectedToken) {
      console.log('✅ Meta WhatsApp Webhook Verified!')
      return res.status(200).send(challenge)
    } else {
      console.warn('❌ Webhook verification failed. Token mismatch.')
      return res.status(403).json({ error: 'Verification failed' })
    }
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const body = req.body || {}

    // Action: Test Simulator from Dashboard
    if (body.action === 'simulate') {
      const { message, settings, products } = body
      let catalogText = ''
      if (products && Array.isArray(products) && products.length > 0) {
        catalogText = products.map(p => `- ${p.name} | الثمن: ${p.price || 0} درهم | المتوفر: ${p.stock || 0}`).join('\n')
      }

      const reply = await generateAiReply({
        provider: settings?.ai_provider || 'openai',
        apiKey: settings?.ai_api_key || '',
        model: settings?.ai_model || 'gpt-4o-mini',
        systemPrompt: settings?.system_prompt || '',
        userMessage: message || 'السلام عليكم',
        catalogContext: catalogText
      })

      return res.status(200).json({ success: true, response: formatWhatsAppText(reply) })
    }

    // Action: Send Manual Message to Customer from Dashboard
    if (body.action === 'send_manual') {
      const { phoneNumber, message, settings } = body
      if (!phoneNumber || !message) {
        return res.status(400).json({ error: 'Phone number and message are required' })
      }

      let phoneId = settings?.phone_number_id || process.env.WHATSAPP_PHONE_NUMBER_ID
      let waToken = settings?.whatsapp_token || process.env.WHATSAPP_TOKEN

      if (!phoneId || !waToken) {
        return res.status(400).json({ error: 'إعدادات Meta WhatsApp (Phone Number ID / Access Token) غير مهيأة' })
      }

      const metaResponse = await fetch(`https://graph.facebook.com/v18.0/${phoneId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${waToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: phoneNumber,
          type: 'text',
          text: { body: formatWhatsAppText(message) }
        })
      })

      const metaData = await metaResponse.json()
      if (metaData.error) {
        return res.status(400).json({ error: metaData.error.message || 'Failed to send WhatsApp message via Meta API' })
      }

      // Save to Supabase
      if (supabase) {
        await supabase.from('whatsapp_chats').insert([{
          phone_number: phoneNumber,
          message_text: message,
          direction: 'outbound',
          is_ai: false,
          status: 'sent',
          raw_payload: metaData
        }]).catch(() => {})
      }

      return res.status(200).json({ success: true, data: metaData })
    }

    // Standard Meta WhatsApp Webhook Payload
    const entry = body.entry?.[0]
    const changes = entry?.changes?.[0]
    const value = changes?.value
    const messages = value?.messages

    // If no incoming message (e.g. status updates), acknowledge Meta with 200 OK
    if (!messages || messages.length === 0) {
      return res.status(200).json({ status: 'ignored_no_message' })
    }

    const incomingMsg = messages[0]
    const fromPhone = incomingMsg.from
    const customerName = value?.contacts?.[0]?.profile?.name || 'Customer'
    const msgText = incomingMsg.text?.body || incomingMsg.caption || ''

    if (!msgText) {
      return res.status(200).json({ status: 'ignored_non_text_message' })
    }

    // Load WhatsApp Settings from Supabase DB
    let settings = {
      phone_number_id: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
      whatsapp_token: process.env.WHATSAPP_TOKEN || '',
      ai_provider: 'openai',
      ai_api_key: process.env.OPENAI_API_KEY || '',
      ai_model: 'gpt-4o-mini',
      system_prompt: 'أنت مساعد مبيعات احترافي للمتجر. تجيب الزبائن بالدارجة المغربية أو الفرنسية.',
      auto_reply_enabled: true,
      include_products_context: true
    }

    if (supabase) {
      const { data: dbSettings } = await supabase.from('whatsapp_settings').select('*').limit(1).single()
      if (dbSettings) {
        settings = { ...settings, ...dbSettings }
      }

      // Log inbound message
      await supabase.from('whatsapp_chats').insert([{
        phone_number: fromPhone,
        customer_name: customerName,
        message_text: msgText,
        direction: 'inbound',
        is_ai: false,
        status: 'received',
        raw_payload: incomingMsg
      }]).catch(() => {})
    }

    // Check if auto reply is enabled
    if (!settings.auto_reply_enabled) {
      console.log('ℹ️ Auto reply is disabled. Message saved, no AI response sent.')
      return res.status(200).json({ status: 'auto_reply_disabled' })
    }

    // Fetch product catalog context if enabled
    let catalogText = ''
    if (settings.include_products_context && supabase) {
      const { data: prods } = await supabase.from('products').select('name, price, purchase_price, description').limit(30)
      if (prods && prods.length > 0) {
        catalogText = prods.map(p => `- ${p.name}: الثمن ${p.price || 0} درهم`).join('\n')
      }
    }

    // Fetch conversation history
    let history = []
    if (supabase) {
      const { data: pastChats } = await supabase
        .from('whatsapp_chats')
        .select('message_text, direction')
        .eq('phone_number', fromPhone)
        .order('created_at', { ascending: false })
        .limit(6)
      if (pastChats) {
        history = pastChats.reverse()
      }
    }

    // Generate AI response
    let aiResponseText = ''
    try {
      aiResponseText = await generateAiReply({
        provider: settings.ai_provider,
        apiKey: settings.ai_api_key,
        model: settings.ai_model,
        systemPrompt: settings.system_prompt,
        userMessage: msgText,
        catalogContext: catalogText,
        history
      })
    } catch (aiErr) {
      console.error('⚠️ AI Generation Error:', aiErr.message)
      aiResponseText = 'مرحباً! شكراً لتواصلك معنا. سأقوم بموافاتك بالتفاصيل فوراً.'
    }

    const formattedReply = formatWhatsAppText(aiResponseText)

    // Send reply via Meta WhatsApp Cloud API
    if (settings.phone_number_id && settings.whatsapp_token) {
      const metaRes = await fetch(`https://graph.facebook.com/v18.0/${settings.phone_number_id}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${settings.whatsapp_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: fromPhone,
          type: 'text',
          text: { body: formattedReply }
        })
      })

      const metaJson = await metaRes.json().catch(() => ({}))

      // Log outbound AI message
      if (supabase) {
        await supabase.from('whatsapp_chats').insert([{
          phone_number: fromPhone,
          customer_name: customerName,
          message_text: formattedReply,
          direction: 'outbound',
          is_ai: true,
          status: metaRes.ok ? 'sent' : 'failed',
          raw_payload: metaJson
        }]).catch(() => {})
      }
    } else {
      console.warn('⚠️ Meta WhatsApp Credentials missing in DB/Env. Response generated but not dispatched to Meta.')
    }

    return res.status(200).json({ status: 'success', reply: formattedReply })
  } catch (error) {
    console.error('❌ Webhook Handler Exception:', error)
    return res.status(500).json({ error: error.message || 'Internal Server Error' })
  }
}
