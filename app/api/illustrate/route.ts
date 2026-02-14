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
    const model = 'stabilityai/stable-diffusion-xl-base-1.0'
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
          parameters: {
            num_inference_steps: 28,
            guidance_scale: 7.5,
          },
        }),
      }
    )

    const contentType = hfRes.headers.get('content-type') || ''

    if (!hfRes.ok) {
      const errText = await hfRes.text()
      console.error('Hugging Face image error:', hfRes.status, errText)
      return NextResponse.json(
        { error: 'Не удалось сгенерировать изображение. Попробуйте позже.' },
        { status: 502 }
      )
    }

    const imageBytes = await hfRes.arrayBuffer()
    const buf = Buffer.from(imageBytes)

    // Если ответ — JSON (например, "Model is loading"), а не изображение
    if (contentType.includes('application/json') || buf[0] === 0x7b) {
      try {
        const json = JSON.parse(buf.toString()) as { error?: string }
        if (json?.error) {
          console.error('Hugging Face:', json.error)
          return NextResponse.json(
            { error: 'Сервис генерации изображений занят. Попробуйте через минуту.' },
            { status: 503 }
          )
        }
      } catch {
        // не JSON — продолжаем как с изображением
      }
    }

    const base64 = buf.toString('base64')
    const imageContentType = contentType.includes('image/') ? contentType.split(';')[0].trim() : 'image/png'
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
