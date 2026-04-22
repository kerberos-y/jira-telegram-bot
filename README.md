# Jira Telegram Bot

Telegram-бот для відстеження задач Jira з повідомленнями у груповий чат.

## Структура проекту

```
src/
├── bot/
│   ├── index.js          # Ініціалізація бота
│   └── commands.js       # Обробники команд (/start, /report, /connect_jira)
├── db/
│   ├── index.js          # PostgreSQL pool
│   └── migrations.js     # Створення таблиць
├── routes/
│   ├── telegram.js       # Webhook endpoint для Telegram
│   └── webhook.js        # Webhook endpoint для Jira
├── services/
│   ├── jira.js           # Всі запити до Jira API
│   └── telegramGroup.js  # Отримання учасників групи
├── scripts/
│   ├── setupJira.js      # Одноразове налаштування Jira
│   └── debugJira.js      # Діагностика
└── server.js             # Точка входу
```

## Змінні оточення (.env)

```env
BOT_TOKEN=<токен від @BotFather>
DATABASE_URL=postgresql://user:pass@host:5432/db
JIRA_BASE_URL=https://yoursite.atlassian.net
JIRA_EMAIL=your@email.com
JIRA_API_TOKEN=<Jira API token>
JIRA_PROJECT_KEY=PROJ
RAILWAY_PUBLIC_DOMAIN=your-app.up.railway.app
TELEGRAM_GROUP_CHAT_ID=<від'ємне число, ID групи>
```

## Кроки налаштування

### 1. Встановлення залежностей
```bash
npm install
```

### 2. Запустити міграції БД
```bash
npm run migrate
```

### 3. Налаштувати Jira (один раз)
```bash
npm run setup:jira
```
Скрипт:
- Перевіряє авторизацію
- Створює проект якщо не існує
- Виводить поточні статуси
- Встановлює Jira webhook

### 4. Отримати TELEGRAM_GROUP_CHAT_ID
Додайте бота в групу, надішліть `/start` — в логах сервера побачите `chatId`.
Або використайте [@userinfobot](https://t.me/userinfobot).

### 5. Запуск
```bash
npm start
```

### 6. Налаштування статусів у Jira (вручну)
Jira Cloud не дозволяє керувати статусами через REST API.
Йдіть: **Project Settings → Board → Columns and statuses**
Додайте: `To Do`, `In Progress`, `Ready for QA`, `Done`

> ⚠️ Якщо у вашому проекті статуси на іншій мові (напр. "В работе"),
> не забудьте виправити рядок `status = "В работе"` у `src/services/jira.js`
> на актуальну назву зі свого проекту.

## Команди бота

| Команда | Опис |
|---------|------|
| `/start` | Реєстрація + показ меню |
| `/report` | Звіт по задачах всіх учасників групи |
| `/connect_jira email` | Прив'язати Jira акаунт |
| 📊 Звіт (кнопка) | Те саме що /report |
| 🔗 Підключити Jira (кнопка) | Інструкція з підключення |
| ❓ Допомога (кнопка) | Список команд |

## Діагностика

```bash
npm run debug:jira
```
Показує: авторизацію, проект, статуси, задачі, зареєстровані webhooks