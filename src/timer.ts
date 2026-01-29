/**
 * ポモドーロタイマーのコアロジック
 */

import type {
  PomodoroSettings,
  TimerState,
  SessionType,
  TimerCallbacks,
} from "./types";
import { DEFAULT_SETTINGS } from "./types";

export class PomodoroTimer {
  private settings: PomodoroSettings;
  private state: TimerState;
  private callbacks: Partial<TimerCallbacks>;

  // タイマー制御用
  private intervalId: number | null = null;
  private startTime: number = 0;
  private endTime: number = 0;
  private pausedRemainingTime: number = 0;

  constructor(
    settings: Partial<PomodoroSettings> = {},
    callbacks: Partial<TimerCallbacks> = {},
  ) {
    this.settings = { ...DEFAULT_SETTINGS, ...settings };
    this.callbacks = callbacks;
    this.state = this.createInitialState();
  }

  private createInitialState(): TimerState {
    const duration = this.settings.workDuration * 60 * 1000;
    return {
      status: "idle",
      currentSession: "work",
      currentSet: 1,
      remainingTime: duration,
      totalDuration: duration,
    };
  }

  /**
   * 設定を更新
   */
  updateSettings(settings: Partial<PomodoroSettings>): void {
    this.settings = { ...this.settings, ...settings };
  }

  /**
   * コールバックを更新
   */
  updateCallbacks(callbacks: Partial<TimerCallbacks>): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * 現在の設定を取得
   */
  getSettings(): PomodoroSettings {
    return { ...this.settings };
  }

  /**
   * 現在の状態を取得
   */
  getState(): TimerState {
    return { ...this.state };
  }

  /**
   * タイマーを開始
   */
  start(): void {
    if (this.state.status === "running") return;

    if (this.state.status === "paused") {
      // 一時停止からの再開
      this.resume();
      return;
    }

    // 新規開始
    this.state.status = "running";
    const duration = this.getSessionDuration(this.state.currentSession);
    this.state.totalDuration = duration;
    this.state.remainingTime = duration;

    this.startTimer(duration);
    this.notifyStateChange();
  }

  /**
   * タイマーを一時停止
   */
  pause(): void {
    if (this.state.status !== "running") return;

    this.stopInterval();
    this.pausedRemainingTime = this.state.remainingTime;
    this.state.status = "paused";
    this.notifyStateChange();
  }

  /**
   * タイマーを再開
   */
  private resume(): void {
    if (this.state.status !== "paused") return;

    this.state.status = "running";
    this.startTimer(this.pausedRemainingTime);
    this.notifyStateChange();
  }

  /**
   * タイマーをリセット（設定画面に戻る）
   */
  reset(): void {
    this.stopInterval();
    this.state = this.createInitialState();
    this.notifyStateChange();
  }

  /**
   * 現在のセッションをスキップ
   */
  skip(): void {
    if (this.state.status === "idle" || this.state.status === "completed")
      return;
    this.handleSessionEnd();
  }

  /**
   * セッションの時間を取得（ミリ秒）
   */
  private getSessionDuration(session: SessionType): number {
    switch (session) {
      case "work":
        return this.settings.workDuration * 60 * 1000;
      case "break":
        return this.settings.breakDuration * 60 * 1000;
      case "longBreak":
        return this.settings.longBreakDuration * 60 * 1000;
    }
  }

  /**
   * タイマーを開始（内部処理）
   */
  private startTimer(duration: number): void {
    this.startTime = Date.now();
    this.endTime = this.startTime + duration;

    // 100msごとにチェック（精度と省電力のバランス）
    this.intervalId = window.setInterval(() => {
      this.tick();
    }, 100);
  }

  /**
   * タイマーのインターバルを停止
   */
  private stopInterval(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * 毎tick処理（100msごと）
   */
  private tick(): void {
    const now = Date.now();
    const remaining = Math.max(0, this.endTime - now);

    this.state.remainingTime = remaining;

    if (remaining === 0) {
      this.handleSessionEnd();
    } else {
      this.callbacks.onTick?.(this.getState());
    }
  }

  /**
   * セッション終了時の処理
   */
  private handleSessionEnd(): void {
    this.stopInterval();

    const endedSession = this.state.currentSession;
    const nextSession = this.getNextSession();

    // コールバックを呼び出し
    this.callbacks.onSessionEnd?.(endedSession, nextSession);

    if (nextSession === null) {
      // 全セット完了
      this.state.status = "completed";
      this.state.remainingTime = 0;
      this.callbacks.onComplete?.();
    } else {
      // 次のセッションへ
      if (endedSession === "work") {
        // 作業完了したのでセット数を更新（次の休憩開始時）
      }

      this.state.currentSession = nextSession;

      // 休憩終了後は次のセットへ
      if (
        (endedSession === "break" || endedSession === "longBreak") &&
        nextSession === "work"
      ) {
        this.state.currentSet++;
      }

      const duration = this.getSessionDuration(nextSession);
      this.state.totalDuration = duration;
      this.state.remainingTime = duration;
      this.state.status = "running";

      this.startTimer(duration);
    }

    this.notifyStateChange();
  }

  /**
   * 次のセッションを決定
   */
  private getNextSession(): SessionType | null {
    const { currentSession, currentSet } = this.state;
    const { totalSets, longBreakInterval } = this.settings;

    if (currentSession === "work") {
      // 作業終了後
      if (currentSet >= totalSets) {
        // 最後のセットの場合
        return null; // 完了
      } else if (currentSet % longBreakInterval === 0) {
        // 長い休憩のタイミング
        return "longBreak";
      } else {
        return "break";
      }
    } else {
      // 休憩終了後 → 次の作業へ
      if (currentSet >= totalSets) {
        return null; // 完了
      }
      return "work";
    }
  }

  /**
   * 状態変更を通知
   */
  private notifyStateChange(): void {
    this.callbacks.onStateChange?.(this.getState());
  }

  /**
   * 残り時間をフォーマット（MM:SS）
   */
  static formatTime(ms: number): string {
    const totalSeconds = Math.ceil(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }

  /**
   * 進捗率を計算（0-100）
   */
  getProgress(): number {
    if (this.state.totalDuration === 0) return 0;
    const elapsed = this.state.totalDuration - this.state.remainingTime;
    return (elapsed / this.state.totalDuration) * 100;
  }

  /**
   * 一時停止中かどうか
   */
  isPaused(): boolean {
    return this.state.status === "paused";
  }

  /**
   * 実行中かどうか
   */
  isRunning(): boolean {
    return this.state.status === "running";
  }

  /**
   * 完了したかどうか
   */
  isCompleted(): boolean {
    return this.state.status === "completed";
  }

  /**
   * アイドル状態かどうか
   */
  isIdle(): boolean {
    return this.state.status === "idle";
  }
}
