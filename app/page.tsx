'use client'

import { useState, useRef, useEffect } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

type Mode = 'about' | 'theses' | 'telegram' | 'illustration'

interface ParsedData {
  date: string | null
  title: string | null
  content: string | null
}

export default function Home() {
  const [url, setUrl] = useState('')
  const [mode, setMode] = useState<Mode | null>(null)
  const [result, setResult] = useState<string | null>(null)
  const [parsedData, setParsedData] = useState<ParsedData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isParsing, setIsParsing] = useState(false)
  const [isTranslating, setIsTranslating] = useState(false)
  const [isIllustrating, setIsIllustrating] = useState(false)
  const [imageResult, setImageResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const resultBlockRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if ((result || imageResult) && !isLoading && !isParsing && !isTranslating && !isIllustrating) {
      resultBlockRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [result, imageResult, isLoading, isParsing, isTranslating, isIllustrating])

  const handleClear = () => {
    setUrl('')
    setMode(null)
    setResult(null)
    setImageResult(null)
    setParsedData(null)
    setError(null)
  }

  const handleCopyResult = async () => {
    if (!result) return
    try {
      await navigator.clipboard.writeText(result)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setError('Не удалось скопировать в буфер обмена.')
    }
  }

  const handleParse = async () => {
    setError(null)
    setParsedData(null)
    setResult(null)

    if (!url.trim()) {
      setError('Введите URL англоязычной статьи.')
      return
    }

    try {
      // Простая валидация URL
      new URL(url)
    } catch {
      setError('Некорректный URL. Проверьте адрес статьи.')
      return
    }

    setIsParsing(true)

    try {
      const response = await fetch('/api/parse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error ?? 'Не удалось загрузить статью по этой ссылке.')
        setIsParsing(false)
        return
      }

      setParsedData(data)
      setResult(JSON.stringify(data, null, 2))
      setIsParsing(false)
    } catch {
      setError('Не удалось загрузить статью по этой ссылке.')
      setIsParsing(false)
    }
  }

  const handleTranslate = async () => {
    setError(null)
    setResult(null)
    setImageResult(null)
    setMode(null)

    // Используем распарсенный контент, если он есть, иначе просим сначала распарсить
    if (!parsedData || !parsedData.content) {
      setError('Сначала распарсите статью, нажав кнопку "Парсить статью".')
      return
    }

    const textToTranslate = parsedData.content

    if (!textToTranslate || textToTranslate.trim().length === 0) {
      setError('Нет контента для перевода.')
      return
    }

    setIsTranslating(true)

    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: textToTranslate }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error ?? 'Не удалось выполнить перевод. Попробуйте позже.')
        setIsTranslating(false)
        return
      }

      setResult(data.translation || 'Перевод не получен')
      setIsTranslating(false)
    } catch {
      setError('Не удалось выполнить перевод. Попробуйте позже.')
      setIsTranslating(false)
    }
  }

  const handleIllustrate = async () => {
    setMode('illustration')
    setError(null)
    setResult(null)
    setImageResult(null)

    if (!parsedData?.content) {
      setError('Сначала распарсите статью, нажав кнопку «Парсить статью».')
      return
    }

    const text = parsedData.content.trim()
    if (!text) {
      setError('Нет контента для генерации иллюстрации.')
      return
    }

    setIsIllustrating(true)

    try {
      const response = await fetch('/api/illustrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error ?? 'Не удалось сгенерировать иллюстрацию. Попробуйте позже.')
        setIsIllustrating(false)
        return
      }

      setResult(data.prompt ?? '')
      setImageResult(data.image ?? null)
      setIsIllustrating(false)
    } catch {
      setError('Не удалось сгенерировать иллюстрацию. Попробуйте позже.')
      setIsIllustrating(false)
    }
  }

  const handleRun = async (nextMode: Mode) => {
    setMode(nextMode)
    setError(null)
    setResult(null)
    setImageResult(null)

    if (!parsedData?.content) {
      setError('Сначала распарсите статью, нажав кнопку «Парсить статью».')
      return
    }

    const text = parsedData.content.trim()
    if (!text) {
      setError('Нет контента для обработки.')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, action: nextMode }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error ?? 'Не удалось сгенерировать ответ. Попробуйте позже.')
        setIsLoading(false)
        return
      }

      setResult(data.result ?? '')
      setIsLoading(false)
    } catch {
      setError('Не удалось сгенерировать ответ. Попробуйте позже.')
      setIsLoading(false)
    }
  }

  const isDisabled = isLoading || isParsing || isTranslating || isIllustrating

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-6 sm:px-6 sm:py-8">
      <div className="w-full max-w-2xl min-w-0 space-y-6">
        <header className="space-y-2 min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-50 break-words sm:text-3xl">
            Referent — AI‑референт статей
          </h1>
          <p className="text-sm text-slate-400 break-words">
            Вставьте URL англоязычной статьи и выберите действие: краткое описание,
            тезисы или пост для Telegram.
          </p>
        </header>

        <section className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/40 p-4 shadow-lg shadow-slate-950/40 min-w-0">
          <label className="block text-sm font-medium text-slate-200 mb-1">
            URL статьи
          </label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Введите URL статьи, например: https://example.com/article"
            className="w-full min-w-0 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500 outline-none ring-0 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/40 transition"
          />
          <p className="text-xs text-slate-500">
            Укажите ссылку на англоязычную статью.
          </p>
          <div className="pt-1">
            <button
              type="button"
              onClick={handleClear}
              disabled={isDisabled}
              title="Очистить форму и результаты"
              className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-slate-700 hover:border-slate-500 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Очистить
            </button>
          </div>
        </section>

        {error && (
          <Alert variant="destructive">
            <AlertTitle>Ошибка</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Мобильный: кнопки столбиком. Планшет/десктоп: в одну строку, сверху место для подсказок */}
        <section className="min-w-0 overflow-visible pt-4 md:pt-14">
          <div className="flex flex-col gap-3 md:flex-row md:flex-nowrap md:items-center md:gap-3 md:-mt-11">
            <span className="relative group inline-flex flex-shrink-0 w-full md:w-auto">
              <button
                type="button"
                onClick={handleParse}
                disabled={isDisabled}
                className="inline-flex w-full md:w-auto items-center justify-center rounded-full border border-purple-600 bg-purple-600 px-4 py-2 text-sm font-medium text-slate-50 shadow-sm shadow-purple-900/50 transition hover:bg-purple-500 hover:border-purple-500 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isParsing ? 'Парсинг...' : 'Парсить статью'}
              </button>
              <span className="btn-tooltip" role="tooltip">
                Загрузить страницу и извлечь заголовок, дату и текст статьи
              </span>
            </span>
            <span className="relative group inline-flex flex-shrink-0 w-full md:w-auto">
              <button
                type="button"
                onClick={handleTranslate}
                disabled={isDisabled || !parsedData?.content}
                className="inline-flex w-full md:w-auto items-center justify-center rounded-full border border-orange-600 bg-orange-600 px-4 py-2 text-sm font-medium text-slate-50 shadow-sm shadow-orange-900/50 transition hover:bg-orange-500 hover:border-orange-500 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isTranslating ? 'Перевод...' : 'Перевести'}
              </button>
              <span className="btn-tooltip" role="tooltip">
                {!parsedData?.content ? 'Сначала распарсите статью' : 'Перевести распарсенный текст статьи на русский язык'}
              </span>
            </span>
            <span className="relative group inline-flex flex-shrink-0 w-full md:w-auto">
              <button
                type="button"
                onClick={() => handleRun('about')}
                disabled={isDisabled || !parsedData?.content}
                className="inline-flex w-full md:w-auto items-center justify-center rounded-full border border-sky-600 bg-sky-600 px-4 py-2 text-sm font-medium text-slate-50 shadow-sm shadow-sky-900/50 transition hover:bg-sky-500 hover:border-sky-500 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                О чем статья?
              </button>
              <span className="btn-tooltip" role="tooltip">
                {!parsedData?.content ? 'Сначала распарсите статью' : 'Получить краткое описание статьи (1–2 абзаца)'}
              </span>
            </span>
            <span className="relative group inline-flex flex-shrink-0 w-full md:w-auto">
              <button
                type="button"
                onClick={() => handleRun('theses')}
                disabled={isDisabled || !parsedData?.content}
                className="inline-flex w-full md:w-auto items-center justify-center rounded-full border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-100 shadow-sm shadow-slate-950/40 transition hover:bg-slate-800 hover:border-slate-500 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Тезисы
              </button>
              <span className="btn-tooltip" role="tooltip">
                {!parsedData?.content ? 'Сначала распарсите статью' : 'Выделить ключевые тезисы в виде списка'}
              </span>
            </span>
            <span className="relative group inline-flex flex-shrink-0 w-full md:w-auto">
              <button
                type="button"
                onClick={() => handleRun('telegram')}
                disabled={isDisabled || !parsedData?.content}
                className="inline-flex w-full md:w-auto items-center justify-center rounded-full border border-emerald-600 bg-emerald-600 px-4 py-2 text-sm font-medium text-slate-50 shadow-sm shadow-emerald-950/50 transition hover:bg-emerald-500 hover:border-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Пост для Telegram
              </button>
            <span className="btn-tooltip" role="tooltip">
              {!parsedData?.content ? 'Сначала распарсите статью' : 'Сгенерировать короткий пост для публикации в Telegram'}
              </span>
            </span>
            <span className="relative group inline-flex flex-shrink-0 w-full md:w-auto">
              <button
                type="button"
                onClick={handleIllustrate}
                disabled={isDisabled || !parsedData?.content}
                className="inline-flex w-full md:w-auto items-center justify-center rounded-full border border-amber-600 bg-amber-600 px-4 py-2 text-sm font-medium text-slate-50 shadow-sm shadow-amber-900/50 transition hover:bg-amber-500 hover:border-amber-500 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isIllustrating ? 'Генерация…' : 'Иллюстрация'}
              </button>
              <span className="btn-tooltip" role="tooltip">
                {!parsedData?.content ? 'Сначала распарсите статью' : 'Сгенерировать изображение по смыслу статьи'}
              </span>
            </span>
          </div>
        </section>
        {!parsedData?.content && (
          <p className="text-xs text-slate-500">
            Кнопки «О чем статья?», «Тезисы», «Пост для Telegram» и «Иллюстрация» доступны после парсинга статьи.
          </p>
        )}

        {(isParsing || isTranslating || isLoading || isIllustrating) && (
          <div className="rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2">
            <p className="text-sm text-slate-300">
              {isParsing && 'Загружаю статью…'}
              {isTranslating && !isParsing && 'Перевожу статью…'}
              {isIllustrating && !isParsing && !isTranslating && 'Генерирую иллюстрацию…'}
              {isLoading && !isParsing && !isTranslating && !isIllustrating && 'Генерирую ответ…'}
            </p>
          </div>
        )}

        <section
          ref={resultBlockRef}
          className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 min-h-[160px] min-w-0"
        >
          <div className="flex items-center justify-between gap-2 mb-2 flex-wrap min-w-0">
            <h2 className="text-sm font-medium text-slate-100">
              Результат
            </h2>
            <div className="flex items-center gap-2">
              {mode && (
                <span className="rounded-full bg-slate-800 px-2.5 py-1 text-xs text-slate-300">
                  {mode === 'about' && 'О чем статья'}
                  {mode === 'theses' && 'Тезисы'}
                  {mode === 'telegram' && 'Пост для Telegram'}
                  {mode === 'illustration' && 'Иллюстрация'}
                </span>
              )}
              {result && !imageResult && (
                <button
                  type="button"
                  onClick={handleCopyResult}
                  className="rounded-lg border border-slate-600 bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-slate-700 hover:border-slate-500"
                >
                  {copied ? 'Скопировано' : 'Копировать'}
                </button>
              )}
            </div>
          </div>

          {!isLoading && !isParsing && !isTranslating && !isIllustrating && imageResult && (
            <div className="space-y-3">
              <img
                src={imageResult}
                alt="Иллюстрация к статье"
                className="max-w-full h-auto rounded-lg border border-slate-700"
              />
              {result && (
                <p className="text-xs text-slate-400 break-words">
                  Промпт: {result}
                </p>
              )}
            </div>
          )}

          {!isLoading && !isParsing && !isTranslating && !isIllustrating && result && !imageResult && (
            <pre className="text-xs leading-relaxed text-slate-100 whitespace-pre-wrap break-words overflow-auto max-h-96 max-w-full bg-slate-950/50 p-3 rounded-lg border border-slate-800">
              {result}
            </pre>
          )}

          {!isLoading && !isParsing && !isTranslating && !isIllustrating && !result && !imageResult && !error && (
            <p className="text-sm text-slate-500">
              Результат появится здесь после выбора действия.
            </p>
          )}
        </section>
      </div>
    </main>
  )
}

