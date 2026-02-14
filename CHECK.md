# Если видите "This page could not be found"

1. **Запустите сервер из папки проекта:**
   ```bash
   cd /Users/numy/Desktop/Work/referent
   npm run dev
   ```

2. **Откройте в браузере именно этот адрес (корень сайта):**
   ```
   http://localhost:3000
   ```
   Не добавляйте путь в конец: не `/page`, не `/home`, не `/index` — только `http://localhost:3000` или `http://localhost:3000/`.

3. **Если порт занят**, в терминале будет что-то вроде:
   ```
   Port 3000 is in use, trying 3001...
   ```
   Тогда откройте `http://localhost:3001` (или тот порт, который покажет Next.js).

4. **Если страница всё равно не найдена** — очистите кэш и перезапустите:
   ```bash
   cd /Users/numy/Desktop/Work/referent
   rm -rf .next
   npm run dev
   ```
   Затем снова откройте `http://localhost:3000`.
