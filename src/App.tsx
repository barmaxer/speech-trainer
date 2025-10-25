import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Mic,
  StopCircle,
  Loader2,
  Sparkles,
  Languages,
  Clock,
  MessageSquare,
  ChevronRight,
  Flame,
  Trophy
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  addDoc,
  collection,
  query,
  getDocs,
  limit
} from 'firebase/firestore';

import AnalysisResult from './components/AnalysisResult';
import HistoryView from './components/HistoryView';
import Sparkline from './components/Sparkline';
import { EXERCISES, SYSTEM_PROMPT, JSON_SCHEMA } from './constants';
import { fetchWithBackoff, formatTime } from './utils';
import type { AnalysisResult as AnalysisResultType, HistoryItem } from './types';

const Spinner = () => (
  <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.25"/>
    <path d="M4 12a8 8 0 0 1 8-8" stroke="currentColor" strokeWidth="4" fill="none"/>
  </svg>
);

const exerciseColorBg: Record<string, string> = {
  blue: 'bg-blue-50',
  purple: 'bg-purple-50',
  green: 'bg-green-50',
  pink: 'bg-pink-50',
};

const exerciseColorText: Record<string, string> = {
  blue: 'text-blue-500',
  purple: 'text-purple-500',
  green: 'text-green-500',
  pink: 'text-pink-500',
};

export default function App() {
  const [view, setView] = useState<'home' | 'recording' | 'result'>('home'); // home | recording | result
  type Status = 'idle' | 'recording' | 'processing';
  const [status, setStatus] = useState<Status>('idle');
  const [transcript, setTranscript] = useState('');
  const [finalTranscript, setFinalTranscript] = useState('');
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResultType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedLang, setSelectedLang] = useState('ru-RU');
  const [selectedExercise, setSelectedExercise] = useState<any>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [streak, setStreak] = useState(0);

  // Состояние Firebase
  const [db, setDb] = useState<any>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const speechRecognizerRef = useRef<any>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const appIdRef = useRef(import.meta.env.VITE_APP_ID || 'default-app-id');

  // Защита от дублей: сохраняем только один раз за сессию
  const savedThisSessionRef = useRef(false);

  // Инициализация Firebase и аутентификация
  useEffect(() => {
    const firebaseConfigStr = import.meta.env.VITE_FIREBASE_CONFIG || '{}';

    if (firebaseConfigStr === '{}') {
        console.error("Firebase config is not available.");
        setError("Ошибка конфигурации. Невозможно загрузить данные.");
        return;
    }

    try {
      const firebaseConfig = JSON.parse(firebaseConfigStr);
      const app = initializeApp(firebaseConfig);
      const authInstance = getAuth(app);
      const dbInstance = getFirestore(app);

      setDb(dbInstance);

      const unsubscribe = onAuthStateChanged(authInstance, async (user) => {
        let currentUserId: string;
        if (user) {
          currentUserId = user.uid;
        } else {
          try {
            const token = import.meta.env.VITE_INITIAL_AUTH_TOKEN;
            if (token) {
              const userCredential = await signInWithCustomToken(authInstance, token);
              currentUserId = userCredential.user.uid;
            } else {
              const userCredential = await signInAnonymously(authInstance);
              currentUserId = userCredential.user.uid;
            }
          } catch (authError) {
            console.error("Ошибка аутентификации:", authError);
            setError("Ошибка аутентификации. Функции сохранения/загрузки будут недоступны.");
            currentUserId = `guest-${crypto.randomUUID()}`; // Fallback
          }
        }
        setUserId(currentUserId);
        setIsAuthReady(true);
      });

      return () => unsubscribe();

    } catch (e) {
      console.error("Ошибка парсинга конфигурации Firebase:", e);
      setError("Критическая ошибка конфигурации. Приложение не может запуститься.");
    }
  }, []);

  // Загрузка данных после аутентификации
  useEffect(() => {
    if (isAuthReady && db && userId) {
      loadHistory();
      loadStreak();
    }
  }, [isAuthReady, db, userId]);

  const loadHistory = async () => {
    if (!db || !userId) {
      // локальный фолбэк
      const raw = localStorage.getItem('speech:history');
      if (raw) {
        try {
          const arr = JSON.parse(raw);
          setHistory(arr);
        } catch {}
      }
      return;
    }
    try {
      const historyCol = collection(db, `artifacts/${appIdRef.current}/users/${userId}/speech-history`);
      const q = query(historyCol, limit(20)); // Без orderBy, как в инструкции
      const querySnapshot = await getDocs(q);

      const fetchedHistory: HistoryItem[] = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
              id: doc.id,
              ...data,
              timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : new Date(data.date),
              // Восстанавливаем поля для списка из analysisResult
              score: data.analysisResult.score,
              metrics: data.analysisResult.metrics
          } as HistoryItem;
      });

      // Сортировка в памяти
      fetchedHistory.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      setHistory(fetchedHistory);
    } catch (error) {
      console.log('История пуста или ошибка загрузки:', error);
    }
  };

  const loadStreak = async () => {
    if (!db || !userId) {
      const raw = localStorage.getItem('speech:streak');
      if (raw) {
        try {
          const { streak } = JSON.parse(raw);
          setStreak(streak || 0);
        } catch {}
      }
      return;
    }
    try {
      const streakDocRef = doc(db, `artifacts/${appIdRef.current}/users/${userId}/speech-data/streak`);
      const docSnap = await getDoc(streakDocRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        const today = new Date().toDateString();
        const lastDate = new Date(data.lastDate).toDateString();
        const yesterday = new Date(Date.now() - 86400000).toDateString();

        if (lastDate === today) {
          setStreak(data.streak);
        } else if (lastDate === yesterday) {
          setStreak(data.streak); // Будет обновлено при сохранении
        } else {
          setStreak(0); // Cерия прервана
        }
      }
    } catch (error) {
      console.log('Streak не найден:', error);
    }
  };

  async function persistResultOnce(result: AnalysisResultType) {
    if (savedThisSessionRef.current) return;   // защита от дублей
    savedThisSessionRef.current = true;

    // сформируй запись
    const entry = {
      id: crypto.randomUUID(),
      date: new Date().toLocaleString('ru-RU'),
      timestamp: new Date(),
      audioURL,
      transcript: finalTranscript,
      analysisResult: result,
      score: result.score,
      metrics: result.metrics,
    };

    // 1) Локально — всегда
    setHistory(prev => {
      // антидубликат по последней записи (на случай race)
      const last = prev[0];
      if (last && last.score === entry.score && last.transcript === entry.transcript) return prev;
      const next = [entry, ...prev].slice(0, 50);
      localStorage.setItem('speech:history', JSON.stringify(next));
      return next;
    });

    // streak локально
    const today = new Date().toDateString();
    const raw = localStorage.getItem('speech:streak');
    let streakData = { streak: 1, lastDate: today };
    try {
      if (raw) {
        const s = JSON.parse(raw);
        const last = new Date(s.lastDate).toDateString();
        const y = new Date(Date.now() - 86400000).toDateString();
        streakData =
          last === today ? { streak: s.streak, lastDate: today } :
          last === y     ? { streak: s.streak + 1, lastDate: today } :
                           { streak: 1, lastDate: today };
      }
    } catch {}
    localStorage.setItem('speech:streak', JSON.stringify(streakData));
    setStreak(streakData.streak);

    // prevResult для «Прогресса»
    localStorage.setItem('speech:last', JSON.stringify(result));

    // 2) В облако — если доступно (не блокируем UI)
    if (db && userId) {
      try {
        const newEntry = {
          date: new Date().toLocaleString('ru-RU'),
          timestamp: new Date(),
          audioURL: audioURL,
          transcript: finalTranscript,
          analysisResult: result // Сохраняем полный объект анализа
        };
        const historyCol = collection(db, `artifacts/${appIdRef.current}/users/${userId}/speech-history`);
        await addDoc(historyCol, newEntry);

        // streak в облако
        const streakDocRef = doc(db, `artifacts/${appIdRef.current}/users/${userId}/speech-data/streak`);
        const firestoreStreakData = { streak: streakData.streak, lastDate: today };
        await setDoc(streakDocRef, firestoreStreakData);
      } catch (e) {
        console.warn('cloud save failed (kept local)', e);
      }
    }
  }

  // Таймер записи
  useEffect(() => {
    if (status === 'recording') {
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setRecordingTime(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [status]);

  const runAnalysis = useCallback(async (speechText: string) => {
    if (!speechText || speechText.trim().length < 10) {
      setError("Запись слишком короткая. Попробуйте говорить дольше.");
      setStatus('idle');
      setView('home');
      return;
    }

    setStatus('processing');
    setError(null);

    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || "";
    // Обновленная модель Gemini
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

    const payload = {
      contents: [{ parts: [{ text: `Проанализируй эту речь:\n\n"${speechText}"` }] }],
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: JSON_SCHEMA,
      }
    };

    try {
      const result = await fetchWithBackoff(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const candidate = result.candidates?.[0];
      if (candidate && candidate.content?.parts?.[0]?.text) {
        const parsedResult: AnalysisResultType = JSON.parse(candidate.content.parts[0].text);
        setAnalysisResult(parsedResult);
        setStatus('idle');
        setRecordingTime(0);                // ← теперь обнуляем
        setView('result');
        persistResultOnce(parsedResult);   // автосохранение сразу после анализа
      } else {
        throw new Error("Не удалось получить анализ от AI.");
      }
    } catch (err: any) {
      console.error("Ошибка анализа:", err);
      setError(`Ошибка анализа: ${err.message}`);
      setStatus('idle');
      setView('home');
    }
  }, []);

  const startRecording = async () => {
    savedThisSessionRef.current = false; // сбрасываем флаг для новой сессии
    setStatus('recording');
    setView('recording');
    setError(null);
    setTranscript('');
    setFinalTranscript('');
    setAudioURL(null);
    setAnalysisResult(null);
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      mediaRecorderRef.current = new MediaRecorder(stream);
      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };
      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const url = URL.createObjectURL(audioBlob);
        setAudioURL(url);
      };

      const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognitionAPI) {
        throw new Error("API распознавания речи не поддерживается в этом браузере.");
      }

      speechRecognizerRef.current = new SpeechRecognitionAPI();
      speechRecognizerRef.current.lang = selectedLang;
      speechRecognizerRef.current.interimResults = true;
      speechRecognizerRef.current.continuous = true;

      speechRecognizerRef.current.onresult = (event: any) => {
        let interim = '';
        let final = '';
        for (let i = 0; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript + ' ';
          } else {
            interim += event.results[i][0].transcript;
          }
        }
        setTranscript(final + interim);
        setFinalTranscript(final.trim());
      };

      speechRecognizerRef.current.onerror = (event: any) => {
        console.error("Ошибка распознавания:", event.error);
        setError(`Ошибка распознавания: ${event.error}`);
      };

      mediaRecorderRef.current.start();
      speechRecognizerRef.current.start();

    } catch (err: any) {
      console.error("Ошибка доступа к микрофону:", err);
      setError(`Ошибка: ${err.message}. Убедитесь, что у вас есть микрофон и вы дали разрешение на его использование.`);
      setStatus('idle');
      setView('home');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) mediaRecorderRef.current.stop();
    if (speechRecognizerRef.current) speechRecognizerRef.current.stop();
    setStatus('processing');        // ← мгновенно показываем «Обработка…»

    setTimeout(() => {
      setFinalTranscript(prevFinal => {
        const textToAnalyze = prevFinal || transcript;
        runAnalysis(textToAnalyze);
        return textToAnalyze;
      });
    }, 500);
  };

  const resetApp = () => {
    setView('home');
    setStatus('idle');
    // Ошибку не сбрасываем, чтобы пользователь ее видел
    // setError(null);
    setTranscript('');
    setFinalTranscript('');
    setAudioURL(null);
    setAnalysisResult(null);
    setSelectedExercise(null);
    audioChunksRef.current = [];
  };

  // Получить предыдущий результат из localStorage
  const getPrevResult = () => {
    try {
      const prevRaw = localStorage.getItem('speech:last');
      return prevRaw ? JSON.parse(prevRaw) : undefined;
    } catch {
      return undefined;
    }
  };

  // HOME VIEW
  if (view === 'home') {
  return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
          {/* Header */}
          <div className="text-center mb-6 sm:mb-8">
            <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
              <Sparkles className="w-7 h-7 text-white" />
            </div>
                  <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight mb-2">Тренер по речи</h1>
            <p className="text-gray-600 text-sm sm:text-base">Улучшайте свои навыки публичных выступлений</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6 mb-6">
            <div className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xl font-bold text-gray-900">{history.length}</div>
                  <div className="text-sm text-gray-500 mt-1">Тренировок</div>
                </div>
                <div className="text-blue-500">
                  <Sparkline values={history.slice(0, 12).map(h => h.score).reverse()} />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between">
      <div>
                  <div className="text-xl font-bold text-gray-900">{streak}</div>
                  <div className="text-sm text-gray-500 mt-1">Дней подряд</div>
                </div>
                <Flame className="w-5 h-5 text-orange-500" />
              </div>
            </div>
          </div>

          {/* Language selector */}
          <div className="bg-white/70 backdrop-blur rounded-2xl p-3 sm:p-5 border border-gray-100 shadow-sm mb-24 sm:mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3">
                <Languages className="w-5 h-5 text-gray-400" />
                <span className="font-medium">Язык речи</span>
              </div>
              <div className="flex gap-2 sm:gap-3">
                <button
                  onClick={() => setSelectedLang('ru-RU')}
                  className={`px-4 h-10 rounded-xl font-medium ${
                    selectedLang === 'ru-RU'
                      ? 'bg-blue-600 text-white shadow'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  Русский
                </button>
                <button
                  onClick={() => setSelectedLang('en-US')}
                  className={`px-4 h-10 rounded-xl font-medium ${
                    selectedLang === 'en-US'
                      ? 'bg-blue-600 text-white shadow'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  English
                </button>
              </div>
            </div>
          </div>

          {/* Exercises */}
          <div className="mb-6">
            <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-5">Упражнения</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6 pb-40 sm:pb-10">
              {EXERCISES.map((exercise) => (
                <button
                  key={exercise.id}
                  onClick={() => {
                    setSelectedExercise(exercise);
                    startRecording();
                  }}
                  className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 hover:shadow-lg hover:scale-[1.02] transition-all text-left group"
                >
                  <div className={`w-10 h-10 rounded-xl ${exerciseColorBg[exercise.color] ?? exerciseColorBg.blue} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                    <exercise.icon className={`w-5 h-5 ${exerciseColorText[exercise.color] ?? exerciseColorText.blue}`} />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1">{exercise.title}</h3>
                  <p className="text-sm text-gray-600 mb-2">{exercise.prompt}</p>
                  <div className="flex items-center text-xs text-gray-500">
                    <Clock className="w-3 h-3 mr-1" />
                    {exercise.duration} секунд
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Нижняя плашка: фиксируем на мобиле, на десктопе — обычный поток */}
          <div className="fixed sm:static inset-x-0 bottom-[env(safe-area-inset-bottom)] sm:bottom-auto">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-[calc(8px+env(safe-area-inset-bottom))] sm:pb-0">
              <button
                onClick={startRecording}
                className="w-full h-14 sm:h-12 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold shadow-lg shadow-purple-200 flex items-center justify-center gap-2"
              >
                <Mic className="w-5 h-5" />
                Свободная практика
              </button>
            </div>
          </div>

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 text-red-800 p-4 rounded-2xl text-sm">
              {error}
            </div>
          )}

          <footer className="mt-6 text-center text-xs text-gray-500">
            Данные хранятся локально в вашем браузере и не отправляются на сервер.
          </footer>
        </div>

        {showHistory && (
          <HistoryView
            history={history}
            onClose={() => setShowHistory(false)}
            onReplay={(item) => {
              // Теперь мы загружаем полный сохраненный результат
              setAnalysisResult(item.analysisResult);
              setAudioURL(item.audioURL);
              setFinalTranscript(item.transcript);
              setView('result');
              setShowHistory(false);
            }}
          />
        )}
      </div>
    );
  }

  // RECORDING VIEW
  if (view === 'recording') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          <div className="bg-white rounded-3xl shadow-2xl p-8 sm:p-12">
            {/* Exercise info */}
            {selectedExercise && (
              <div className="text-center mb-8 pb-8 border-b border-gray-100">
                <div className={`w-16 h-16 rounded-3xl ${exerciseColorBg[selectedExercise.color] ?? exerciseColorBg.blue} flex items-center justify-center mx-auto mb-4`}>
                  <selectedExercise.icon className={`w-8 h-8 ${exerciseColorText[selectedExercise.color] ?? exerciseColorText.blue}`} />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">{selectedExercise.title}</h2>
                <p className="text-gray-600">{selectedExercise.prompt}</p>
              </div>
            )}

            {/* Recording indicator */}
            <div className="flex flex-col items-center mb-8">
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-75"></div>
                <button
                  onClick={status === 'recording' ? stopRecording : startRecording}
                  disabled={status === 'processing'}
                  className="relative w-32 h-32 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white transition-all shadow-2xl shadow-red-500/50 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {status === 'processing' ? <Spinner /> : <StopCircle className="w-16 h-16" />}
                </button>
              </div>

              <div className="text-center">
                <div className="text-5xl font-bold text-gray-900 mb-2">{formatTime(recordingTime)}</div>
                <div className="text-gray-600 font-medium">
                  {status === 'processing' ? 'Обработка...' : 'Идет запись...'}
                </div>
              </div>
            </div>

            {/* Live transcript */}
            {transcript && (
              <div className="bg-gray-50 rounded-2xl p-6 min-h-[120px] max-h-[200px] overflow-y-auto border border-gray-100">
                <div className="text-sm text-gray-500 mb-2 flex items-center">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Транскрипция в реальном времени
                </div>
                <p className="text-gray-800 leading-relaxed">{transcript}</p>
              </div>
            )}

            <button
              onClick={stopRecording}
              className="w-full mt-6 bg-blue-500 hover:bg-blue-600 text-white py-4 rounded-2xl font-semibold transition-all shadow-lg shadow-blue-500/30"
            >
              Остановить и проанализировать
            </button>
          </div>
        </div>
      </div>
    );
  }

  // PROCESSING VIEW
  if (status === 'processing') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-24 h-24 bg-white rounded-3xl shadow-2xl flex items-center justify-center mb-6 mx-auto">
            <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Анализируем вашу речь</h2>
          <p className="text-gray-600">Это займет несколько секунд...</p>
          <div className="flex justify-center gap-2 mt-6">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
      </div>
    );
  }

  // RESULT VIEW
  if (view === 'result' && analysisResult) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={resetApp}
              className="w-10 h-10 rounded-full bg-white hover:bg-gray-100 flex items-center justify-center transition-all shadow-sm"
            >
              <ChevronRight className="w-5 h-5 text-gray-600 rotate-180" />
        </button>
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              <span className="text-sm font-medium text-gray-600">Результаты</span>
            </div>
            <div className="w-10"></div>
          </div>

          <AnalysisResult
            result={analysisResult}
            audioURL={audioURL}
            onReset={resetApp}
            transcript={finalTranscript}
            fillerDictionary={['ну','вот','как бы','типа','ээ','э','мм','значит','короче']}
            prevResult={
              history.length > 1
                ? history[1].analysisResult            // сравниваем с предыдущей
                : getPrevResult()                      // или локальный last
            }
          />
        </div>
      </div>
    );
  }

  return null;
}
