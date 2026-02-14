import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-slate-950 text-slate-100">
      <h1 className="text-2xl font-semibold mb-2">Страница не найдена</h1>
      <p className="text-slate-400 mb-6">Такого адреса нет в приложении.</p>
      <Link
        href="/"
        className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 transition"
      >
        На главную
      </Link>
    </div>
  )
}
