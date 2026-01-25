'use client'

import { useState } from 'react'

type Mode = 'about' | 'theses' | 'telegram'

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
  const [error, setError] = useState<string | null>(null)

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
        setError(data.error || 'Ошибка при парсинге статьи')
        setIsParsing(false)
        return
      }

      setParsedData(data)
      setResult(JSON.stringify(data, null, 2))
      setIsParsing(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка')
      setIsParsing(false)
    }
  }

  const handleRun = (nextMode: Mode) => {
    setMode(nextMode)
    setError(null)
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

    setIsLoading(true)

    // Заглушка вместо реального AI-запроса
    setTimeout(() => {
      let mock: string
      if (nextMode === 'about') {
        mock = 'Краткое описание статьи будет показано здесь.'
      } else if (nextMode === 'theses') {
        mock = 'Здесь появятся ключевые тезисы статьи в виде списка.'
      } else {
        mock = 'Здесь появится готовый черновик поста для Telegram.'
      }

      setResult(mock)
      setIsLoading(false)
    }, 800)
  }

  const isDisabled = isLoading || isParsing

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-2xl space-y-6">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-50">
            Referent — AI‑референт статей
          </h1>
          <p className="text-sm text-slate-400">
            Вставьте URL англоязычной статьи и выберите действие: краткое описание,
            тезисы или пост для Telegram.
          </p>
        </header>

        <section className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/40 p-4 shadow-lg shadow-slate-950/40">
          <label className="block text-sm font-medium text-slate-200 mb-1">
            URL статьи
          </label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/article"
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500 outline-none ring-0 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/40 transition"
          />
          {error && (
            <p className="text-xs text-rose-400 mt-1">
              {error}
            </p>
          )}
        </section>

        <section className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleParse}
            disabled={isDisabled}
            className="inline-flex items-center justify-center rounded-full border border-purple-600 bg-purple-600 px-4 py-2 text-sm font-medium text-slate-50 shadow-sm shadow-purple-900/50 transition hover:bg-purple-500 hover:border-purple-500 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isParsing ? 'Парсинг...' : 'Парсить статью'}
          </button>
          <button
            type="button"
            onClick={() => handleRun('about')}
            disabled={isDisabled}
            className="inline-flex items-center justify-center rounded-full border border-sky-600 bg-sky-600 px-4 py-2 text-sm font-medium text-slate-50 shadow-sm shadow-sky-900/50 transition hover:bg-sky-500 hover:border-sky-500 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            О чем статья?
          </button>
          <button
            type="button"
            onClick={() => handleRun('theses')}
            disabled={isDisabled}
            className="inline-flex items-center justify-center rounded-full border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-100 shadow-sm shadow-slate-950/40 transition hover:bg-slate-800 hover:border-slate-500 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            Тезисы
          </button>
          <button
            type="button"
            onClick={() => handleRun('telegram')}
            disabled={isDisabled}
            className="inline-flex items-center justify-center rounded-full border border-emerald-600 bg-emerald-600 px-4 py-2 text-sm font-medium text-slate-50 shadow-sm shadow-emerald-950/50 transition hover:bg-emerald-500 hover:border-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            Пост для Telegram
          </button>
        </section>

        <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 min-h-[160px]">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-medium text-slate-100">
              Результат
            </h2>
            {mode && (
              <span className="rounded-full bg-slate-800 px-2.5 py-1 text-xs text-slate-300">
                {mode === 'about' && 'О чем статья'}
                {mode === 'theses' && 'Тезисы'}
                {mode === 'telegram' && 'Пост для Telegram'}
              </span>
            )}
          </div>

          {isParsing && (
            <p className="text-sm text-slate-400 animate-pulse">
              Парсинг статьи…
            </p>
          )}

          {isLoading && (
            <p className="text-sm text-slate-400 animate-pulse">
              Генерируем ответ с помощью AI…
            </p>
          )}

          {!isLoading && !isParsing && result && (
            <pre className="text-xs leading-relaxed text-slate-100 whitespace-pre-wrap overflow-auto max-h-96 bg-slate-950/50 p-3 rounded-lg border border-slate-800">
              {result}
            </pre>
          )}

          {!isLoading && !isParsing && !result && !error && (
            <p className="text-sm text-slate-500">
              Результат появится здесь после выбора действия.
            </p>
          )}
        </section>
      </div>
    </main>
  )
}

