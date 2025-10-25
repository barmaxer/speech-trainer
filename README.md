# Speech Trainer - Тренер по публичным выступлениям

React приложение для тренировки навыков публичных выступлений с использованием искусственного интеллекта для анализа речи.

## Особенности

- 🎤 Запись речи с микрофона
- 🧠 AI-анализ речи с помощью Google Gemini
- 📊 Детальная статистика и метрики
- 💾 Сохранение истории тренировок в Firebase
- 🎯 Структурированные упражнения
- 🌍 Поддержка русского и английского языков

## Технологии

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Backend**: Firebase Firestore для хранения данных
- **AI**: Google Gemini API для анализа речи
- **UI**: Lucide React иконки, современный дизайн

## Установка

1. Клонируйте репозиторий:
```bash
git clone https://github.com/barmaxer/speech-trainer.git
cd speech-trainer
```

2. Установите зависимости:
```bash
npm install
```

3. Настройте переменные окружения:

Создайте файл `.env` в корне проекта и заполните необходимые переменные:

```env
# Firebase Configuration
VITE_FIREBASE_CONFIG={"apiKey":"your-api-key","authDomain":"your-project.firebaseapp.com","projectId":"your-project-id","storageBucket":"your-project.appspot.com","messagingSenderId":"123456789","appId":"your-app-id"}

# Authentication Token (optional)
VITE_INITIAL_AUTH_TOKEN=

# App ID
VITE_APP_ID=default-app-id

# Google Gemini API Key
VITE_GEMINI_API_KEY=your-gemini-api-key-here
```

## Настройка Firebase

1. Создайте проект в [Firebase Console](https://console.firebase.google.com/)
2. Включите Firestore Database
3. Настройте правила безопасности для Firestore (пример в `firestore.rules`)
4. Скопируйте конфигурацию Firebase в переменную `VITE_FIREBASE_CONFIG`

## Настройка Google Gemini API

1. Получите API ключ от [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Добавьте ключ в переменную `VITE_GEMINI_API_KEY`

## Запуск

Для запуска в режиме разработки:
```bash
npm run dev
```

Для сборки production версии:
```bash
npm run build
```

## Структура проекта

```
src/
├── components/          # React компоненты
│   ├── AnalysisResult.tsx
│   ├── HistoryView.tsx
│   └── MetricCard.tsx
├── constants.ts         # Константы и конфигурации
├── types.ts            # TypeScript типы
├── utils.ts            # Утилиты
├── App.tsx             # Главный компонент
└── main.tsx            # Точка входа
```

## Функциональность

### Анализ речи
Приложение анализирует речь по следующим параметрам:
- **Темп речи**: слова в минуту (оптимально 120-150)
- **Слова-паразиты**: автоматическое обнаружение и подсчет
- **Четкость структуры**: логичность построения речи
- **Разнообразие словаря**: уникальность лексики

### Упражнения
- Самопрезентация (60 сек)
- Убеждение (90 сек)
- Объяснение сложных тем (120 сек)
- Рассказывание историй (90 сек)

### Статистика
- Количество тренировок
- Серия дней подряд
- История всех сессий с детальными результатами

## Развертывание

Приложение можно развернуть на:
- Vercel
- Netlify
- Firebase Hosting
- Любом статическом хостинге

## Лицензия

MIT License