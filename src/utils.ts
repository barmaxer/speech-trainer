// Утилиты для работы с API и Firebase

export const fetchWithBackoff = async (
  url: string,
  options: RequestInit,
  retries = 3,
  delay = 1000
): Promise<any> => {
  try {
    const response = await fetch(url, options);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (err) {
    if (retries > 0) {
      await new Promise(res => setTimeout(res, delay));
      return fetchWithBackoff(url, options, retries - 1, delay * 2);
    } else {
      throw err;
    }
  }
};

export const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const normalizeAnalysis = (data: any) => {
  return {
    score: typeof data.score === 'number' ? data.score : 0,
    analysis: typeof data.analysis === 'string' ? data.analysis : 'Анализ не доступен',
    strengths: Array.isArray(data.strengths) ? data.strengths : [],
    improvements: Array.isArray(data.improvements) ? data.improvements : [],
    metrics: {
      pace: typeof data.metrics?.pace === 'number' ? data.metrics.pace : 0,
      fillerWords: typeof data.metrics?.fillerWords === 'number' ? data.metrics.fillerWords : 0,
      clarity: typeof data.metrics?.clarity === 'number' ? data.metrics.clarity : 0,
      vocabulary: typeof data.metrics?.vocabulary === 'number' ? data.metrics.vocabulary : 0,
    }
  };
};
