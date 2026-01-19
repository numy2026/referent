# referent
AI-реферирование статей

## Установка pnpm (опционально)

Если у вас нет pnpm, вы можете установить его одним из способов:

**Вариант 1: Через Homebrew (рекомендуется для macOS)**
```bash
brew install pnpm
```

**Вариант 2: Через Corepack с sudo**
```bash
sudo corepack enable
```

**Вариант 3: Использовать npx без установки**
Просто используйте `npx pnpm` вместо `pnpm` в командах ниже.

**Вариант 4: Установить через npm с sudo (не рекомендуется)**
```bash
sudo npm install -g pnpm
```

## Установка зависимостей проекта

```bash
# Используя npm
npm install

# Или используя pnpm
pnpm install

# Или используя pnpm через npx (без установки)
npx pnpm install
```

## Запуск

Запустите сервер разработки:

```bash
# Используя npm
npm run dev

# Или используя pnpm
pnpm dev

# Или используя pnpm через npx
npx pnpm dev
```

Откройте [http://localhost:3000](http://localhost:3000) в браузере.

## Сборка

Для создания production сборки:

```bash
# Используя npm
npm run build
npm start

# Или используя pnpm
pnpm build
pnpm start

# Или используя pnpm через npx
npx pnpm build
npx pnpm start
```
