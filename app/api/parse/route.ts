import { NextRequest, NextResponse } from 'next/server'
import * as cheerio from 'cheerio'

const FETCH_ARTICLE_ERROR = 'Не удалось загрузить статью по этой ссылке.'

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json()

    if (!url || typeof url !== 'string' || !url.trim()) {
      return NextResponse.json(
        { error: 'Введите URL статьи.' },
        { status: 400 }
      )
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000)

    let response: Response
    try {
      response = await fetch(url, {
        signal: controller.signal,
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
        redirect: 'follow',
      })
    } catch {
      clearTimeout(timeoutId)
      return NextResponse.json(
        { error: FETCH_ARTICLE_ERROR },
        { status: 502 }
      )
    }
    clearTimeout(timeoutId)

    if (!response.ok) {
      return NextResponse.json(
        { error: FETCH_ARTICLE_ERROR },
        { status: 502 }
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
      { error: FETCH_ARTICLE_ERROR },
      { status: 502 }
    )
  }
}
