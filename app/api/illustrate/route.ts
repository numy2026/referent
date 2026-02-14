import { NextRequest, NextResponse } from 'next/server'

const OPENROUTER_PROMPT_SYSTEM = `You are an expert at writing short image generation prompts. Based on the article text, write a single English prompt for a text-to-image model (e.g. Stable Diffusion, FLUX). The prompt should describe one clear, visual scene that captures the main idea of the article. Use 10-15 words max. Output only the prompt, no quotes or explanation.`

// Модели из Inference Providers (Router): сначала hf-inference, затем те, что могут быть у других провайдеров
const HF_IMAGE_MODELS = [
  'ByteDance/SDXL-Lightning',
  'black-forest-labs/FLUX.1-schnell',
  'stabilityai/stable-diffusion-2-1',
]

const HF_BASE = 'https://router.huggingface.co'

async function generateWithHf(
  hfKey: string,
  prompt: string
): Promise<{ buffer: Buffer; contentType: string } | { error: string; status?: number }> {
  for (const model of HF_IMAGE_MODELS) {
    // Сначала пробуем hf-inference, при 404 — общий путь (auto-routing)
    const urls = [
      `${HF_BASE}/hf-inference/models/${model}`,
      `${HF_BASE}/models/${model}`,
    ]
    for (const url of urls) {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${hfKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ inputs: prompt }),
      })

      const contentType = res.headers.get('content-type') || ''
      const arrayBuffer = await res.arrayBuffer()
      const buf = Buffer.from(arrayBuffer)

      if (!res.ok) {
        const errMsg = (() => {
          let s = buf.toString('utf8').slice(0, 500)
          try {
            const j = JSON.parse(s) as { error?: string; message?: string }
            if (j?.error) return j.error
            if (j?.message) return j.message
          } catch {
            /* keep s */
          }
          return s
        })()
        console.error(`[illustrate] ${model} ${res.status} (${url}):`, errMsg)
        if (res.status === 404) continue
        return { error: errMsg, status: res.status }
      }

      const isImage =
        contentType.includes('image/') ||
        (buf.length > 200 && buf[0] !== 0x7b)

      if (isImage) {
        return {
          buffer: buf,
          contentType: contentType.includes('image/') ? contentType.split(';')[0].trim() : 'image/png',
        }
      }

      try {
        const j = JSON.parse(buf.toString('utf8')) as { error?: string }
        if (j?.error?.toLowerCase().includes('loading')) {
          await new Promise((r) => setTimeout(r, 8000))
          const retry = await fetch(url, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${hfKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ inputs: prompt }),
          })
          const retryBuf = Buffer.from(await retry.arrayBuffer())
          const retryCt = retry.headers.get('content-type') || ''
          if (retry.ok && (retryCt.includes('image/') || (retryBuf.length > 200 && retryBuf[0] !== 0x7b))) {
            return {
              buffer: retryBuf,
              contentType: retryCt.includes('image/') ? retryCt.split(';')[0].trim() : 'image/png',
            }
          }
        }
      } catch {
        /* ignore */
      }
    }
  }

  return { error: 'Ни одна модель не вернула изображение.' }
}

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

    if (!hfKey?.trim()) {
      return NextResponse.json(
        { error: 'В .env.local задайте HUGGINGFACE_API_KEY (токен: https://huggingface.co/settings/tokens, право: Inference).' },
        { status: 503 }
      )
    }

    // 1. Промпт через OpenRouter
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

    // 2. Изображение через Hugging Face Inference API
    const result = await generateWithHf(hfKey.trim(), imagePrompt)

    if ('error' in result) {
      const { error, status } = result
      let msg: string
      if (status === 401) {
        msg = 'Неверный HUGGINGFACE_API_KEY. Создайте токен на https://huggingface.co/settings/tokens с правом «Inference».'
      } else if (status === 403) {
        msg = 'Токен без доступа к Inference API. В настройках токена включите: Inference → Make calls to the serverless Inference API.'
      } else if (error?.toLowerCase().includes('loading')) {
        msg = 'Модель ещё загружается. Подождите 1–2 минуты и нажмите «Иллюстрация» снова.'
      } else {
        msg = error || 'Не удалось сгенерировать изображение. Попробуйте позже.'
      }
      return NextResponse.json({ error: msg }, { status: 503 })
    }

    const dataUrl = `data:${result.contentType};base64,${result.buffer.toString('base64')}`

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
