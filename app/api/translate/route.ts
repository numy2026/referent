import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json()

    if (!text || typeof text !== 'string' || !text.trim()) {
      return NextResponse.json(
        { error: 'Нет текста для перевода.' },
        { status: 400 }
      )
    }

    const apiKey = process.env.OPENROUTER_API_KEY

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Сервис перевода временно недоступен.' },
        { status: 503 }
      )
    }

    // Вызываем OpenRouter API
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'Referent - AI Article Summarizer',
      },
      body: JSON.stringify({
        model: 'deepseek/deepseek-chat',
        messages: [
          {
            role: 'system',
            content: 'Ты профессиональный переводчик. Переведи следующий текст с английского на русский язык, сохраняя структуру и стиль оригинала. Переведи только текст, без дополнительных комментариев.',
          },
          {
            role: 'user',
            content: `Переведи на русский язык:\n\n${text}`,
          },
        ],
        temperature: 0.3,
        max_tokens: 4000,
      }),
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Не удалось выполнить перевод. Попробуйте позже.' },
        { status: 502 }
      )
    }

    const data = await response.json()

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      return NextResponse.json(
        { error: 'Не удалось выполнить перевод. Попробуйте позже.' },
        { status: 502 }
      )
    }

    const translatedText = data.choices[0].message.content.trim()

    return NextResponse.json({
      translation: translatedText,
    })
  } catch (error) {
    console.error('Ошибка перевода:', error)
    return NextResponse.json(
      { error: 'Не удалось выполнить перевод. Попробуйте позже.' },
      { status: 502 }
    )
  }
}
