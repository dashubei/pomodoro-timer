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
   * iOSデバイスかどうかを判定
   */
  private isIOS(): boolean {
    return (
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
    );
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

    // iOSの場合、通知APIのサポートが限定的
    if (this.isIOS()) {
      // iOSでは通知許可のリクエストが動作しない場合がある
      // 許可状態を再確認
      this.checkPermission();

      if (this.permission === "granted") {
        return true;
      }

      if (this.permission === "denied") {
        console.warn(
          "通知許可が拒否されています。iOSの設定から許可してください。",
        );
        return false;
      }

      // iOSでは、requestPermission()を呼び出してもポップアップが表示されない場合がある
      // それでも試してみる
      try {
        // Promise形式とコールバック形式の両方に対応
        let result: NotificationPermission;

        if (typeof Notification.requestPermission === "function") {
          const permissionResult = Notification.requestPermission();
          if (permissionResult instanceof Promise) {
            result = await permissionResult;
          } else {
            result = permissionResult;
          }
        } else {
          // 古い形式のコールバックAPI（通常は使われないが念のため）
          result = await new Promise<NotificationPermission>((resolve) => {
            if (typeof Notification.requestPermission === "function") {
              const permissionResult = Notification.requestPermission(
                (permission) => {
                  resolve(permission);
                },
              );
              if (permissionResult instanceof Promise) {
                permissionResult.then(resolve);
              }
            } else {
              resolve("denied");
            }
          });
        }

        this.permission = result;

        // iOSで許可が得られなかった場合のガイダンス
        if (result !== "granted" && this.permission === "default") {
          console.warn(
            "iOSでは通知許可のポップアップが表示されない場合があります。",
          );
          console.warn("設定 > Safari > 通知 から手動で許可してください。");
        }

        return result === "granted";
      } catch (error) {
        console.error("通知許可のリクエストに失敗しました:", error);
        // iOSの場合、エラーメッセージを追加
        if (this.isIOS()) {
          console.warn("iOSでは通知許可が正しく動作しない場合があります。");
          console.warn("設定アプリから手動で通知を許可してください。");
        }
        return false;
      }
    }

    // 非iOSデバイスの処理
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
