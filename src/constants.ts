import { Target, Zap, MessageSquare, Sparkles } from 'lucide-react';
import type { Exercise, JSONSchema } from './types';

// Системная инструкция для AI
export const SYSTEM_PROMPT = `
Вы - опытный и дружелюбный тренер по публичным выступлениям. Ваша задача - анализировать предоставленные транскрипты речей.
Обращайтесь к пользователю так, как будто вы слышали саму речь, а не читали текст.
Ваша обратная связь должна быть конструктивной, позитивной и действенной.
Проанализируйте речь по таким параметрам:
1. **Темп речи** - подсчитайте примерное количество слов в минуту (норма 120-150)
2. **Четкость и структура** - насколько логично построена речь
3. **Слова-паразиты** - найдите и подсчитайте точное количество: "типа", "как бы", "ну", "э-э-э", "вот", "короче", "значит", "в общем"
4. **Уникальность словаря** - насколько разнообразна лексика
5. **Длина предложений** - средняя длина (оптимально 10-20 слов)

Вы должны вернуть ТОЛЬКО JSON-объект с детальной аналитикой.
`;

// Схема JSON для структурированного ответа
export const JSON_SCHEMA: JSONSchema = {
  type: "OBJECT",
  properties: {
    "score": { type: "NUMBER", description: "Общая оценка 0-100" },
    "metrics": {
      type: "OBJECT",
      properties: {
        "pace": { type: "NUMBER", description: "Темп в словах/минуту" },
        "fillerWords": { type: "NUMBER", description: "Количество слов-паразитов" },
        "clarity": { type: "NUMBER", description: "Четкость 0-100" },
        "vocabulary": { type: "NUMBER", description: "Разнообразие словаря 0-100" }
      }
    },
    "analysis": { type: "STRING", description: "Краткий анализ 2-3 предложения" },
    "strengths": { type: "ARRAY", items: { type: "STRING" }, description: "2 сильные стороны" },
    "improvements": { type: "ARRAY", items: { type: "STRING" }, description: "2 области для улучшения" }
  },
  required: ["score", "metrics", "analysis", "strengths", "improvements"]
};

// Упражнения для практики
export const EXERCISES: Exercise[] = [
  { id: 1, title: "Самопрезентация", prompt: "Расскажите о себе за 60 секунд", duration: 60, icon: Target, color: "blue" },
  { id: 2, title: "Убеждение", prompt: "Убедите купить ваш любимый продукт", duration: 90, icon: Zap, color: "purple" },
  { id: 3, title: "Объяснение", prompt: "Объясните сложную тему простыми словами", duration: 120, icon: MessageSquare, color: "green" },
  { id: 4, title: "История", prompt: "Расскажите интересную историю из жизни", duration: 90, icon: Sparkles, color: "pink" }
];
