/**
 * ポモドーロタイマーの型定義
 */

// セッションの種類
export type SessionType = "work" | "break" | "longBreak";

// テーマモード
export type ThemeMode = "light" | "dark" | "system";

// ポモドーロの設定
export interface PomodoroSettings {
  workDuration: number; // 作業時間（分）
  breakDuration: number; // 休憩時間（分）
  longBreakDuration: number; // 長い休憩時間（分）
  totalSets: number; // 合計セット数
  longBreakInterval: number; // 長い休憩の頻度（何セット毎）
  soundEnabled: boolean; // 音声通知ON/OFF
  notificationEnabled: boolean; // ブラウザ通知ON/OFF
  themeMode: ThemeMode; // テーマモード
}

// タイマーの状態
export type TimerStatus = "idle" | "running" | "paused" | "completed";

// タイマーの状態
export interface TimerState {
  status: TimerStatus;
  currentSession: SessionType;
  currentSet: number; // 現在のセット番号（1から始まる）
  remainingTime: number; // 残り時間（ミリ秒）
  totalDuration: number; // 現在セッションの総時間（ミリ秒）
}

// デフォルト設定
export const DEFAULT_SETTINGS: PomodoroSettings = {
  workDuration: 25,
  breakDuration: 5,
  longBreakDuration: 15,
  totalSets: 4,
  longBreakInterval: 4,
  soundEnabled: true,
  notificationEnabled: true,
  themeMode: "system",
};

// 音声の種類
export type SoundType = "workEnd" | "breakEnd" | "complete";

// 通知メッセージ
export const NOTIFICATION_MESSAGES: Record<
  SessionType | "complete",
  { title: string; body: string }
> = {
  work: {
    title: "作業時間が終了しました",
    body: "休憩してください。",
  },
  break: {
    title: "休憩時間が終了しました",
    body: "作業を再開しましょう。",
  },
  longBreak: {
    title: "長い休憩が終了しました",
    body: "作業を再開しましょう。",
  },
  complete: {
    title: "おめでとうございます！",
    body: "全セット完了しました。",
  },
};

// タイマーイベントのコールバック型
export interface TimerCallbacks {
  onTick: (state: TimerState) => void;
  onSessionEnd: (
    sessionType: SessionType,
    nextSession: SessionType | null,
  ) => void;
  onComplete: () => void;
  onStateChange: (state: TimerState) => void;
}
