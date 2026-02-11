import { NextRequest, NextResponse } from 'next/server'

const ACTION_VALUES = ['about', 'theses', 'telegram'] as const
type Action = (typeof ACTION_VALUES)[number]

function isAction(value: unknown): value is Action {
  return typeof value === 'string' && ACTION_VALUES.includes(value as Action)
}

const PROMPTS: Record<Action, { system: string; userPrefix: string }> = {
  about: {
    system:
      'Ты эксперт по реферированию. Дай краткое описание статьи на русском языке: 1–2 абзаца, без списков и без формата поста. Только суть и основные идеи.',
    userPrefix: 'О чем эта статья? Кратко опиши:\n\n',
  },
  theses: {
    system:
      'Ты эксперт по реферированию. Выдели ключевые тезисы статьи и выдай их в виде нумерованного или маркированного списка на русском языке. Без вступления, только тезисы.',
    userPrefix: 'Выдели ключевые тезисы статьи:\n\n',
  },
  telegram: {
    system:
      'Ты редактор. Напиши короткий пост для Telegram на русском языке по материалам статьи: 1–3 абзаца, готовый к публикации. Без хештегов и лишних пометок, живой язык.',
    userPrefix: 'Напиши пост для Telegram по этой статье:\n\n',
  },
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { text, action } = body as { text?: unknown; action?: unknown }

    if (!text || typeof text !== 'string' || !text.trim()) {
      return NextResponse.json(
        { error: 'Нет текста для обработки.' },
        { status: 400 }
      )
    }

    if (!isAction(action)) {
      return NextResponse.json(
        { error: 'Выберите действие: описание, тезисы или пост для Telegram.' },
        { status: 400 }
      )
    }

    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Сервис временно недоступен. Попробуйте позже.' },
        { status: 503 }
      )
    }

    const { system, userPrefix } = PROMPTS[action]
    const userContent = userPrefix + text.trim()

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer':
          process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'Referent - AI Article Summarizer',
      },
      body: JSON.stringify({
        model: 'deepseek/deepseek-chat',
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: userContent },
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Не удалось сгенерировать ответ. Попробуйте позже.' },
        { status: 502 }
      )
    }

    const data = await response.json()

    if (
      !data.choices ||
      !data.choices[0] ||
      !data.choices[0].message
    ) {
      return NextResponse.json(
        { error: 'Не удалось сгенерировать ответ. Попробуйте позже.' },
        { status: 502 }
      )
    }

    const result = data.choices[0].message.content.trim()

    return NextResponse.json({ result })
  } catch (error) {
    console.error('Ошибка summarize:', error)
    return NextResponse.json(
      { error: 'Не удалось сгенерировать ответ. Попробуйте позже.' },
      { status: 502 }
    )
  }
}
