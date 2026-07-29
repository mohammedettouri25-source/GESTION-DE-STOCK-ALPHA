/**
 * OpenAI ChatGPT API Integration Service for WhatsApp Chatbot
 */
export async function generateOpenAiChatReply({ apiKey, systemPrompt, conversationHistory, shopContext }) {
  const validKey = apiKey || localStorage.getItem('openai-api-key')

  if (!validKey) {
    throw new Error('Clé API OpenAI manquante. Veuillez saisir votre clé API OpenAI dans la rubrique WhatsApp & Bot AI.')
  }

  const productsList = (shopContext.products || []).map(p => ({
    nom: p.name,
    prix: `${p.price} MAD`,
    categorie: p.category,
    variants: (p.variants || []).map(v => `${v.color} ${v.size} (Stock: ${v.stock})`).join(', ')
  }))

  const recentSales = (shopContext.sales || []).slice(0, 15).map(s => ({
    numero: s.number || s.id,
    total: `${s.total} MAD`,
    client: s.customer?.name,
    telephone: s.customer?.phone,
    statut: s.status || 'en attente'
  }))

  const contextMessage = `
[معلومات المتجر المباشرة ALPHA SHOP]:
- المنتجات والمخزون والأسعار: ${JSON.stringify(productsList)}
- الطلبيات الحالية للزبناء: ${JSON.stringify(recentSales)}
`

  const defaultPrompt = `أنت مساعد ذكي لمتجر Alpha Shop، تجيب الزبناء بلطف وبـ اللغة المغربية (الدارجة)، تؤكد الطلبيات، وتزودهم بـ تتبع الشحنات والأسعار فـ المخزون. إذا قام الزبون بتأكيد الطلب بعبارات مثل "تأكيد" أو "نأكد" أو برقم الطلبية، قم بالرد بالتأكيد فوراً.`

  const messages = [
    { role: 'system', content: `${systemPrompt || defaultPrompt}\n${contextMessage}` },
    ...conversationHistory.map(m => ({
      role: m.sender === 'user' ? 'user' : 'assistant',
      content: m.text
    }))
  ]

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${validKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.7,
      max_tokens: 350
    })
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.error?.message || `Erreur OpenAI (${response.status})`)
  }

  const data = await response.json()
  return data.choices?.[0]?.message?.content || 'عذراً، لم أستطع فهم الرسالة جيداً.'
}
