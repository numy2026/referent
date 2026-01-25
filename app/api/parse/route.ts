import { NextRequest, NextResponse } from 'next/server'
import * as cheerio from 'cheerio'

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json()

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'URL обязателен' },
        { status: 400 }
      )
    }

    // Загружаем HTML страницы с полным набором заголовков браузера
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language': 'en-US,en;q=0.9,ru;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Cache-Control': 'max-age=0',
      },
      // Добавляем redirect для следования редиректам
      redirect: 'follow',
    })

    if (!response.ok) {
      const statusText = response.statusText || 'Unknown error'
      let errorMessage = `Не удалось загрузить страницу: ${statusText}`
      
      // Более информативные сообщения для разных статусов
      if (response.status === 403) {
        errorMessage = 'Доступ запрещен (403). Сервер блокирует запрос. Возможно, требуется авторизация или сайт защищен от парсинга.'
      } else if (response.status === 404) {
        errorMessage = 'Страница не найдена (404). Проверьте правильность URL.'
      } else if (response.status === 429) {
        errorMessage = 'Слишком много запросов (429). Попробуйте позже.'
      }
      
      return NextResponse.json(
        { error: errorMessage },
        { status: response.status }
      )
    }

    const html = await response.text()
    const $ = cheerio.load(html)

    // Извлекаем заголовок
    let title = ''
    // Пробуем разные селекторы для заголовка
    const titleSelectors = [
      'h1',
      'article h1',
      '.post-title',
      '.article-title',
      '[class*="title"]',
      'title',
    ]
    for (const selector of titleSelectors) {
      const found = $(selector).first().text().trim()
      if (found) {
        title = found
        break
      }
    }
    // Если не нашли, берем из <title>
    if (!title) {
      title = $('title').text().trim()
    }

    // Извлекаем дату
    let date = ''
    const dateSelectors = [
      'time[datetime]',
      'time',
      '[class*="date"]',
      '[class*="published"]',
      '[class*="time"]',
      'meta[property="article:published_time"]',
      'meta[name="publish-date"]',
      'meta[name="date"]',
    ]
    for (const selector of dateSelectors) {
      const element = $(selector).first()
      if (element.length) {
        // Пробуем атрибут datetime
        const datetime = element.attr('datetime') || element.attr('content')
        if (datetime) {
          date = datetime
          break
        }
        // Или текст элемента
        const text = element.text().trim()
        if (text) {
          date = text
          break
        }
      }
    }

    // Извлекаем основной контент
    let content = ''
    const contentSelectors = [
      'article',
      '.post',
      '.content',
      '.article-content',
      '[class*="article"]',
      '[class*="post-content"]',
      '[class*="entry-content"]',
      'main',
    ]
    for (const selector of contentSelectors) {
      const found = $(selector).first()
      if (found.length) {
        // Удаляем скрипты, стили и другие ненужные элементы
        found.find('script, style, nav, aside, .ad, .advertisement').remove()
        content = found.text().trim()
        if (content.length > 100) {
          // Если контент достаточно длинный, считаем что нашли
          break
        }
      }
    }
    // Если не нашли, берем body
    if (!content || content.length < 100) {
      $('body').find('script, style, nav, aside, .ad, .advertisement').remove()
      content = $('body').text().trim()
    }

    // Очищаем контент от лишних пробелов и переносов
    content = content.replace(/\s+/g, ' ').trim()

    return NextResponse.json({
      date: date || null,
      title: title || null,
      content: content || null,
    })
  } catch (error) {
    console.error('Ошибка парсинга:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Неизвестная ошибка' },
      { status: 500 }
    )
  }
}
