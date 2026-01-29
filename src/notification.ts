/**
 * ブラウザ通知管理システム
 */

import type { SessionType } from "./types";
import { NOTIFICATION_MESSAGES } from "./types";

export class NotificationManager {
  private enabled: boolean = true;
  private permission: NotificationPermission = "default";

  constructor() {
    this.checkPermission();
  }

  /**
   * 現在の通知許可状態を確認
   */
  private checkPermission(): void {
    if ("Notification" in window) {
      this.permission = Notification.permission;
    }
  }

  /**
   * 通知許可をリクエスト
   */
  async requestPermission(): Promise<boolean> {
    if (!("Notification" in window)) {
      console.warn("このブラウザは通知をサポートしていません");
      return false;
    }

    if (this.permission === "granted") {
      return true;
    }

    if (this.permission === "denied") {
      console.warn("通知許可が拒否されています");
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      this.permission = result;
      return result === "granted";
    } catch (error) {
      console.error("通知許可のリクエストに失敗しました:", error);
      return false;
    }
  }

  /**
   * 通知の有効/無効を切り替え
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * 通知が有効かどうか
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * 通知許可があるかどうか
   */
  hasPermission(): boolean {
    return this.permission === "granted";
  }

  /**
   * 許可状態を取得
   */
  getPermission(): NotificationPermission {
    return this.permission;
  }

  /**
   * セッション終了時の通知を表示
   */
  notifySessionEnd(sessionType: SessionType): void {
    if (!this.enabled || this.permission !== "granted") return;

    const message = NOTIFICATION_MESSAGES[sessionType];
    this.show(message.title, message.body);
  }

  /**
   * 全セット完了の通知を表示
   */
  notifyComplete(): void {
    if (!this.enabled || this.permission !== "granted") return;

    const message = NOTIFICATION_MESSAGES.complete;
    this.show(message.title, message.body);
  }

  /**
   * 通知を表示
   */
  private show(title: string, body: string): void {
    try {
      const notification = new Notification(title, {
        body,
        icon: "/tomato.svg",
        badge: "/tomato.svg",
        tag: "pomodoro-timer",
        requireInteraction: false,
      } as NotificationOptions);

      // 5秒後に自動で閉じる
      setTimeout(() => {
        notification.close();
      }, 5000);

      // クリックでフォーカス
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    } catch (error) {
      console.error("通知の表示に失敗しました:", error);
    }
  }
}
