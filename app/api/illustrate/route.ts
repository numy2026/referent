import { NextRequest, NextResponse } from 'next/server'

const OPENROUTER_PROMPT_SYSTEM = `You are an expert at writing short image generation prompts. Based on the article text, write a single English prompt for a text-to-image model (e.g. Stable Diffusion, FLUX). The prompt should describe one clear, visual scene that captures the main idea of the article. Use 10-15 words max. Output only the prompt, no quotes or explanation.`

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json()

    if (!text || typeof text !== 'string' || !text.trim()) {
      return NextResponse.json(
        { error: 'Нет текста для генерации иллюстрации.' },
        { status: 400 }
      )
    }

    const openRouterKey = process.env.OPENROUTER_API_KEY
    const hfKey = process.env.HUGGINGFACE_API_KEY

    if (!openRouterKey) {
      return NextResponse.json(
        { error: 'Сервис временно недоступен. Попробуйте позже.' },
        { status: 503 }
      )
    }

    if (!hfKey) {
      return NextResponse.json(
        { error: 'Добавьте HUGGINGFACE_API_KEY в .env.local для генерации изображений.' },
        { status: 503 }
      )
    }

    // 1. Генерируем промпт для изображения через OpenRouter
    const promptRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openRouterKey}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'Referent - AI Article Summarizer',
      },
      body: JSON.stringify({
        model: 'deepseek/deepseek-chat',
        messages: [
          { role: 'system', content: OPENROUTER_PROMPT_SYSTEM },
          { role: 'user', content: `Article excerpt:\n\n${text.slice(0, 3000)}` },
        ],
        temperature: 0.5,
        max_tokens: 100,
      }),
    })

    if (!promptRes.ok) {
      return NextResponse.json(
        { error: 'Не удалось создать промпт для иллюстрации. Попробуйте позже.' },
        { status: 502 }
      )
    }

    const promptData = await promptRes.json()
    const imagePrompt =
      (promptData.choices?.[0]?.message?.content as string)?.trim() ||
      'Abstract concept, digital art, vivid colors'

    // 2. Генерируем изображение через Hugging Face Inference API
    // Нужен токен с правом "Inference" (или "Inference Providers"): https://huggingface.co/settings/tokens
    const models: { id: string; params: Record<string, number> }[] = [
      { id: 'ByteDance/SDXL-Lightning', params: { num_inference_steps: 4, guidance_scale: 1 } },
      { id: 'stabilityai/stable-diffusion-2-1', params: { num_inference_steps: 20, guidance_scale: 7.5 } },
      { id: 'black-forest-labs/FLUX.1-schnell', params: { num_inference_steps: 4 } },
    ]

    let imageBuf: Buffer | null = null
    let imageContentType = 'image/png'
    let lastError = ''
    let lastStatus = 0

    for (const { id: model, params } of models) {
      const hfRes = await fetch(
        `https://api-inference.huggingface.co/models/${model}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${hfKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            inputs: imagePrompt,
            parameters: params,
          }),
        }
      )

      lastStatus = hfRes.status
      const ct = hfRes.headers.get('content-type') || ''
      const imageBytes = await hfRes.arrayBuffer()
      const buf = Buffer.from(imageBytes)

      if (!hfRes.ok) {
        lastError = buf.toString().slice(0, 500)
        console.error(`HF ${model}:`, hfRes.status, lastError)
        continue
      }

      // Ответ — изображение (бинарные данные, не JSON)
      if (ct.includes('image/') || (buf.length > 200 && buf[0] !== 0x7b)) {
        imageBuf = buf
        imageContentType = ct.includes('image/') ? ct.split(';')[0].trim() : 'image/png'
        break
      }

      // Ответ JSON — модель загружается или ошибка
      try {
        const json = JSON.parse(buf.toString()) as { error?: string }
        if (json?.error) lastError = json.error
      } catch {
        /* ignore */
      }
    }

    if (!imageBuf) {
      let msg: string
      if (lastStatus === 401) {
        msg = 'Неверный или просроченный HUGGINGFACE_API_KEY. Создайте новый токен на https://huggingface.co/settings/tokens с правом «Inference» (или «Inference API» / «Inference Providers»).'
      } else if (lastStatus === 403) {
        msg = 'Токен не имеет доступа к генерации изображений. Создайте fine-grained токен с правом inference.serverless.write: https://huggingface.co/settings/tokens/new?tokenType=fineGrained'
      } else if (lastError?.toLowerCase().includes('loading')) {
        msg = 'Сервис генерации изображений загружается. Подождите 1–2 минуты и попробуйте снова.'
      } else {
        msg = 'Не удалось сгенерировать изображение. Создайте токен на https://huggingface.co/settings/tokens: выберите тип «Fine-grained» и включите право «Inference» (Inference API) или «inference.serverless.write». Затем подставьте его в .env.local как HUGGINGFACE_API_KEY и перезапустите сервер.'
      }
      return NextResponse.json(
        { error: msg },
        { status: 503 }
      )
    }

    const base64 = imageBuf.toString('base64')
    const dataUrl = `data:${imageContentType};base64,${base64}`

    return NextResponse.json({
      image: dataUrl,
      prompt: imagePrompt,
    })
  } catch (error) {
    console.error('Illustrate error:', error)
    return NextResponse.json(
      { error: 'Не удалось сгенерировать иллюстрацию. Попробуйте позже.' },
      { status: 502 }
    )
  }
}
