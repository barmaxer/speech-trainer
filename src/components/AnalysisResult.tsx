import React from 'react';
import {
  BarChart3,
  Play,
  CheckCircle2,
  Target,
  Award,
  Clock,
  Zap,
  MessageSquare,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from 'lucide-react';

interface AnalysisResultProps {
  result: {
    score: number;
    metrics: {
      pace: number;        // сл/мин
      fillerWords: number; // количество слов-паразитов
      clarity: number;     // %
      vocabulary: number;  // %
    };
    analysis: string;
    strengths: string[];
    improvements: string[];
  };
  audioURL: string | null;
  onReset: () => void;
  /** Транскрипт речи (опционально) — для персонализированных советов */
  transcript?: string;
  /** Словарь слов-паразитов (опционально, можно расширять) */
  fillerDictionary?: string[];
  /** Предыдущая сессия для сравнения (опционально) */
  prevResult?: {
    score: number;
    metrics: {
      pace: number;
      fillerWords: number;
      clarity: number;
      vocabulary: number;
    };
    date?: string;
  };
}

const scoreBand = (s: number) =>
  s >= 80 ? 'green' : s >= 60 ? 'blue' : 'orange';

// Жёсткие классы вместо шаблонов — Tailwind их не "выпилит"
const scoreTone: Record<string, string> = {
  green: 'from-green-500 to-green-600',
  blue: 'from-blue-500 to-blue-600',
  orange: 'from-orange-500 to-orange-600',
};

type MetricKey = 'pace' | 'fillerWords' | 'clarity' | 'vocabulary';
type MetricsShape = Record<MetricKey, number | string | undefined | null>;

/** Базовый словарь паразитов (RU) */
const DEFAULT_FILLERS = [
  'ну','вот','как бы','типа','ээ','э','мм','значит','короче',
  'получается','по сути','скажем так','в общем','в целом'
];

type FillerInfo = { list: Array<{word: string; count: number}>, total: number };

function extractFillers(text?: string, dict: string[] = DEFAULT_FILLERS): FillerInfo {
  if (!text) return { list: [], total: 0 };
  const norm = text.toLowerCase()
    .replace(/[.,!?;:()[\]«»"']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const counts: Record<string, number> = {};
  for (const w of dict) {
    // ищем как отдельное слово/фразу
    const re = new RegExp(`(?:^|\\s)${w.replace(/\s+/g, '\\s+')}(?=\\s|$)`, 'g');
    const m = norm.match(re);
    if (m && m.length) counts[w] = m.length;
  }
  const list = Object.entries(counts)
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  return { list, total };
}

const explainMetric = (
  k: MetricKey,
  raw: number | string | undefined | null,
  opts?: { fillers?: FillerInfo }
): { title: string; hint: string } => {
  // жёсткая нормализация входа
  const v = Number(raw) || 0;
  switch (k) {
    case 'pace': {
      const title = `${v} сл/мин`;
      let hint: string;
      if (v <= 0)        hint = 'Не удалось определить темп — проверьте микрофон и повторите запись.';
      else if (v < 120)  hint = 'Темп спокойный. Для энергичности прибавьте 10–20 сл/мин.';
      else if (v <= 140) hint = 'Комфортный темп — отлично для информирования.';
      else if (v <= 170) hint = 'Бодро и вовлекающе. Замедляйтесь на ключевых тезисах, чтобы усилить акцент.';
      else               hint = 'Слишком быстро — смысл может теряться. Ставьте паузы в концах фраз.';
      return { title, hint };
    }
    case 'fillerWords': {
      const title = `${v}`;
      const top = opts?.fillers?.list ?? [];
      if (v <= 0) return { title, hint: 'Отлично: слов-паразитов не обнаружено (или не распознаны).' };
      const examples = top.length
        ? 'Например: ' + top.map(t => `«${t.word}»×${t.count}`).join(', ')
        : 'Попробуйте заменить их короткими паузами.';
      const hint =
        v <= 2
          ? `Редко встречаются слова-паразиты. ${examples}`
          : `Паразиты отвлекают слушателя. ${examples} Старайтесь делать паузу вместо автоматического слова.`;
      return { title, hint };
    }
    case 'clarity': {
      const title = `${v}%`;
      let hint: string;
      if (v <= 0)       hint = 'Чёткость не определилась — возможно, тихая запись или шум.';
      else if (v >= 85) hint = 'Чётко и разборчиво — отлично!';
      else if (v >= 70) hint = 'В целом разборчиво. Чётче произносите окончания и ударные слоги.';
      else              hint = 'Словам не хватает артикуляции. Помогут паузы и медленнее темп в ключевых местах.';
      return { title, hint };
    }
    case 'vocabulary': {
      const title = `${v}%`;
      let hint: string;
      if (v <= 0)       hint = 'Не удалось оценить словарь — короткая запись или сбой распознавания.';
      else if (v >= 80) hint = 'Разнообразные формулировки — слушается профессионально.';
      else if (v >= 60) hint = 'Хороший уровень. Добавляйте синонимы и связки для выразительности.';
      else              hint = 'Повторы заметны. Полезно вводить примеры и заменять часто используемые слова синонимами.';
      return { title, hint };
    }
  }
};

const AnalysisResult: React.FC<AnalysisResultProps> = ({
  result,
  audioURL,
  onReset,
  transcript,
  fillerDictionary,
  prevResult,
}) => {
  // Быстрая диагностика (раскомментируй для отладки)
  // console.log('AR::result', result);
  // console.log('AR::transcript', transcript?.slice(0,200));
  const band = scoreBand(result.score);
  const gradient = scoreTone[band];
  const fillerInfo = extractFillers(transcript, fillerDictionary ?? DEFAULT_FILLERS);
  const fillerCountFromText = fillerInfo.total ?? 0;

  // --- Прогресс: вычисляем дельты (положительное = лучше) ---
  function delta(current: number | undefined | null, prev: number | undefined | null) {
    if (current == null || prev == null) return null;
    return current - prev;
  }
  // Для метрик, где "меньше = лучше", переворачиваем знак
  function deltaBetterWhenLower(current?: number, prev?: number) {
    const d = delta(prev == null ? undefined : prev, current == null ? undefined : current);
    // ↑ формула такова, чтобы "меньше текущее" давало положительный результат
    return d == null ? null : -d;
  }
  function trendChip(value: number | null) {
    if (value == null) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 text-gray-700 border border-gray-200 px-2 py-0.5 text-xs">
          <Minus className="w-3 h-3" /> нет данных
        </span>
      );
    }
    if (value > 0) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 text-xs">
          <ArrowUpRight className="w-3 h-3" /> {value > 0 && (value % 1 ? value.toFixed(1) : value)} ↑
        </span>
      );
    }
    if (value < 0) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 text-xs">
          <ArrowDownRight className="w-3 h-3" /> {Math.abs(value % 1 ? Number(value.toFixed(1)) : value)} ↓
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 text-gray-700 border border-gray-200 px-2 py-0.5 text-xs">
        <Minus className="w-3 h-3" /> без изменений
      </span>
    );
  }

  // данные для отрисовки карточек метрик
  const metrics: Array<{
    key: MetricKey;
    label: string;
    icon: React.ElementType;
    colorBg: string;
    colorText: string;
  }> = [
    {
      key: 'pace',
      label: 'Темп речи',
      icon: Clock,
      colorBg: 'bg-blue-50',
      colorText: 'text-blue-600',
    },
    {
      key: 'fillerWords',
      label: 'Паразиты',
      icon: Zap,
      colorBg: 'bg-orange-50',
      colorText: 'text-orange-600',
    },
    {
      key: 'clarity',
      label: 'Чёткость',
      icon: Target,
      colorBg: 'bg-green-50',
      colorText: 'text-green-600',
    },
    {
      key: 'vocabulary',
      label: 'Словарь',
      icon: MessageSquare,
      colorBg: 'bg-purple-50',
      colorText: 'text-purple-600',
    },
  ];

  return (
    <div className="w-full space-y-4 animate-fade-in">
      {/* Большая оценка */}
      <div
        className={`relative overflow-hidden rounded-3xl p-6 sm:p-8 text-white shadow-xl bg-gradient-to-br ${gradient}`}
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32" />
        <div className="relative">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <span className="text-white/90 text-sm font-medium">Ваша оценка</span>
            <Award className="w-6 h-6 text-white/90" />
          </div>
          <div className="text-5xl sm:text-7xl font-extrabold leading-none mb-2">
            {result.score}
          </div>
          <div className="text-white/95 text-base sm:text-lg">
            {band === 'green'
              ? 'Отличная работа! 🎉'
              : band === 'blue'
              ? 'Хороший результат! 👍'
              : 'Есть куда расти! 💪'}
          </div>
        </div>
      </div>

      {/* Метрики с пояснениями */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {metrics.map(({ key, label, icon: Icon, colorBg, colorText }) => {
          const valueRaw = (result.metrics as unknown as MetricsShape)?.[key];
          const value = key === 'fillerWords'
            ? Math.max(Number(valueRaw || 0), fillerCountFromText)
            : Number(valueRaw || 0);
          const { title, hint } = explainMetric(key, value, {
            fillers: key === 'fillerWords' ? fillerInfo : undefined,
          });
          return (
            <div
              key={key}
              className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-gray-100"
            >
              <div className="flex items-start gap-3">
                <div
                  className={`shrink-0 w-10 h-10 rounded-full ${colorBg} flex items-center justify-center`}
                >
                  <Icon className={`w-5 h-5 ${colorText}`} />
                </div>
                <div className="min-w-0">
                  <div className="text-2xl sm:text-3xl font-extrabold text-gray-900 leading-none">
                    {title}
                  </div>
                  <div className="text-gray-500 text-sm">{label}</div>
                </div>
              </div>
              <div className="mt-2 text-gray-700 text-sm">
                {hint || 'Данные недоступны для интерпретации.'}
              </div>
              {key === 'fillerWords' && fillerInfo.list.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {fillerInfo.list.map(({ word, count }) => (
                    <span
                      key={word}
                      className="inline-flex items-center rounded-full bg-orange-50 text-orange-700 border border-orange-200 px-2 py-0.5 text-xs"
                    >
                      {word} × {count}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 📈 Прогресс по сравнению с прошлой сессией */}
      {prevResult && (
        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-gray-100">
          <h3 className="text-base font-semibold text-gray-900 mb-3 flex items-center">
            <BarChart3 className="w-5 h-5 mr-2 text-indigo-500" />
            Прогресс {prevResult.date ? `с ${prevResult.date}` : ''}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Общая оценка */}
            <div className="rounded-xl border border-gray-100 p-3">
              <div className="text-sm text-gray-500 mb-1">Оценка</div>
              <div className="flex items-center justify-between">
                <div className="text-gray-900 font-bold">{result.score}</div>
                {trendChip(delta(result.score, prevResult.score))}
              </div>
            </div>
            {/* Темп речи — лучше, когда ниже/ближе к 140–160. Для простоты считаем "ниже = лучше" */}
            <div className="rounded-xl border border-gray-100 p-3">
              <div className="text-sm text-gray-500 mb-1">Темп речи</div>
              <div className="flex items-center justify-between">
                <div className="text-gray-900 font-bold">{result.metrics.pace} сл/мин</div>
                {trendChip(deltaBetterWhenLower(result.metrics.pace, prevResult.metrics.pace))}
              </div>
            </div>
            {/* Паразиты — меньше = лучше */}
            <div className="rounded-xl border border-gray-100 p-3">
              <div className="text-sm text-gray-500 mb-1">Паразиты</div>
              <div className="flex items-center justify-between">
                <div className="text-gray-900 font-bold">{result.metrics.fillerWords}</div>
                {trendChip(deltaBetterWhenLower(result.metrics.fillerWords, prevResult.metrics.fillerWords))}
              </div>
            </div>
            {/* Чёткость и Словарь — больше = лучше */}
            <div className="rounded-xl border border-gray-100 p-3">
              <div className="text-sm text-gray-500 mb-1">Чёткость</div>
              <div className="flex items-center justify-between">
                <div className="text-gray-900 font-bold">{result.metrics.clarity}%</div>
                {trendChip(delta(result.metrics.clarity, prevResult.metrics.clarity))}
              </div>
            </div>
            <div className="rounded-xl border border-gray-100 p-3 sm:col-span-2 lg:col-span-1">
              <div className="text-sm text-gray-500 mb-1">Словарь</div>
              <div className="flex items-center justify-between">
                <div className="text-gray-900 font-bold">{result.metrics.vocabulary}%</div>
                {trendChip(delta(result.metrics.vocabulary, prevResult.metrics.vocabulary))}
              </div>
            </div>
          </div>
          {/* Короткое резюме */}
          <div className="mt-3 text-sm text-gray-700">
            {(() => {
              const gain = [
                delta(result.score, prevResult.score) ?? 0,
                delta(result.metrics.clarity, prevResult.metrics.clarity) ?? 0,
                delta(result.metrics.vocabulary, prevResult.metrics.vocabulary) ?? 0,
                deltaBetterWhenLower(result.metrics.fillerWords, prevResult.metrics.fillerWords) ?? 0,
                deltaBetterWhenLower(result.metrics.pace, prevResult.metrics.pace) ?? 0,
              ].filter(n => n > 0).length;
              return gain >= 3
                ? 'Отличный прогресс — большинство показателей выросло 👏'
                : gain >= 1
                ? 'Есть положительные сдвиги — двигаемся в верном направлении ✅'
                : 'Показатели пока без улучшений — попробуйте сосредоточиться на одном-двух фокусах.';
            })()}
          </div>
        </div>
      )}

      {/* Аудио плеер */}
      {audioURL && (
        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-gray-100">
          <div className="flex items-center mb-3">
            <Play className="w-5 h-5 text-gray-500 mr-2" />
            <span className="text-sm font-medium text-gray-900">Прослушать запись</span>
          </div>
          <audio controls src={audioURL} className="w-full h-12">
            Your browser does not support the audio element.
          </audio>
        </div>
      )}

      {/* Анализ */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-gray-100">
        <h3 className="text-base font-semibold text-gray-900 mb-3 flex items-center">
          <BarChart3 className="w-5 h-5 mr-2 text-blue-500" />
          Анализ
        </h3>
        <p className="text-gray-800 leading-relaxed">
          {result.analysis?.trim() || 'Пока без развёрнутого анализа — попробуйте записать чуть дольше (≥30 сек) или говорить ближе к микрофону.'}
        </p>
      </div>

      {/* Сильные стороны и улучшения */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="bg-green-50 rounded-2xl p-4 sm:p-5 border border-green-100">
          <h3 className="text-sm font-semibold text-green-900 mb-3 flex items-center">
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Сильные стороны
          </h3>
          <ul className="space-y-2">
            {result.strengths.map((item, i) => (
              <li key={i} className="text-sm text-green-800 flex items-start">
                <span className="text-green-500 mr-2">•</span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-blue-50 rounded-2xl p-4 sm:p-5 border border-blue-100">
          <h3 className="text-sm font-semibold text-blue-900 mb-3 flex items-center">
            <Target className="w-4 h-4 mr-2" />
            Над чем поработать
          </h3>
          <ul className="space-y-2">
            {result.improvements.map((item, i) => (
              <li key={i} className="text-sm text-blue-800 flex items-start">
                <span className="text-blue-500 mr-2">•</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Кнопки действий */}
      <div className="flex gap-3">
        <button
          onClick={onReset}
          className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-900 py-4 rounded-2xl font-semibold transition-all duration-200"
        >
          Попробовать снова
        </button>
      </div>
    </div>
  );
};

export default AnalysisResult;
