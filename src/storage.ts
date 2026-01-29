/**
 * LocalStorage管理システム
 */

import type { PomodoroSettings } from "./types";
import { DEFAULT_SETTINGS } from "./types";

const STORAGE_KEY = "pomodoro-timer-settings";

export class StorageManager {
  /**
   * 設定を保存
   */
  saveSettings(settings: PomodoroSettings): boolean {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      return true;
    } catch (error) {
      console.error("設定の保存に失敗しました:", error);
      return false;
    }
  }

  /**
   * 設定を読み込み
   */
  loadSettings(): PomodoroSettings {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        return { ...DEFAULT_SETTINGS };
      }

      const parsed = JSON.parse(stored);
      // デフォルト値とマージして、不足しているプロパティを補完
      return { ...DEFAULT_SETTINGS, ...parsed };
    } catch (error) {
      console.error("設定の読み込みに失敗しました:", error);
      return { ...DEFAULT_SETTINGS };
    }
  }

  /**
   * 設定をリセット
   */
  resetSettings(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error("設定のリセットに失敗しました:", error);
    }
  }

  /**
   * LocalStorageが利用可能かどうか
   */
  isAvailable(): boolean {
    try {
      const testKey = "__storage_test__";
      localStorage.setItem(testKey, testKey);
      localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }
}
