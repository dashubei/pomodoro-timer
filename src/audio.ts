/**
 * 音声管理システム
 * Web Audio APIを使用して音を生成
 */

import type { SoundType } from "./types";

export class AudioManager {
  private audioContext: AudioContext | null = null;
  private enabled: boolean = true;
  private volume: number = 0.5;

  constructor() {
    // AudioContextは最初のユーザー操作後に初期化
  }

  /**
   * AudioContextを初期化（ユーザー操作後に呼び出す）
   */
  init(): void {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }
  }

  /**
   * 音声の有効/無効を切り替え
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * 音声が有効かどうか
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * 音量を設定（0-1）
   */
  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
  }

  /**
   * 指定した種類の音を再生
   */
  play(type: SoundType): void {
    if (!this.enabled) return;
    this.init();
    if (!this.audioContext) return;

    switch (type) {
      case "workEnd":
        this.playChime();
        break;
      case "breakEnd":
        this.playAlert();
        break;
      case "complete":
        this.playComplete();
        break;
    }
  }

  /**
   * チャイム音（作業終了時）- 優しい音
   */
  private playChime(): void {
    if (!this.audioContext) return;

    const now = this.audioContext.currentTime;

    // 和音でチャイム音を作成
    const frequencies = [523.25, 659.25, 783.99]; // C5, E5, G5

    frequencies.forEach((freq, index) => {
      const oscillator = this.audioContext!.createOscillator();
      const gainNode = this.audioContext!.createGain();

      oscillator.type = "sine";
      oscillator.frequency.value = freq;

      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(this.volume * 0.3, now + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 1.5);

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext!.destination);

      oscillator.start(now + index * 0.1);
      oscillator.stop(now + 1.5);
    });
  }

  /**
   * アラート音（休憩終了時）- 注意喚起
   */
  private playAlert(): void {
    if (!this.audioContext) return;

    const now = this.audioContext.currentTime;

    // 2回のビープ音
    for (let i = 0; i < 2; i++) {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.type = "square";
      oscillator.frequency.value = 880; // A5

      const startTime = now + i * 0.3;
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(
        this.volume * 0.2,
        startTime + 0.02,
      );
      gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + 0.2);

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      oscillator.start(startTime);
      oscillator.stop(startTime + 0.2);
    }
  }

  /**
   * 完了音（全セット完了時）- 達成感のある音
   */
  private playComplete(): void {
    if (!this.audioContext) return;

    const now = this.audioContext.currentTime;

    // 上昇するアルペジオ
    const frequencies = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6

    frequencies.forEach((freq, index) => {
      const oscillator = this.audioContext!.createOscillator();
      const gainNode = this.audioContext!.createGain();

      oscillator.type = "sine";
      oscillator.frequency.value = freq;

      const startTime = now + index * 0.15;
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(
        this.volume * 0.4,
        startTime + 0.05,
      );
      gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + 0.8);

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext!.destination);

      oscillator.start(startTime);
      oscillator.stop(startTime + 0.8);
    });

    // 最後にリッチな和音を追加
    setTimeout(() => {
      if (!this.audioContext) return;
      const finalTime = this.audioContext.currentTime;
      const chordFreqs = [523.25, 659.25, 783.99, 1046.5];

      chordFreqs.forEach((freq) => {
        const osc = this.audioContext!.createOscillator();
        const gain = this.audioContext!.createGain();

        osc.type = "sine";
        osc.frequency.value = freq;

        gain.gain.setValueAtTime(this.volume * 0.25, finalTime);
        gain.gain.exponentialRampToValueAtTime(0.001, finalTime + 1.5);

        osc.connect(gain);
        gain.connect(this.audioContext!.destination);

        osc.start(finalTime);
        osc.stop(finalTime + 1.5);
      });
    }, frequencies.length * 150);
  }

  /**
   * テスト用に音を再生
   */
  playTest(): void {
    const originalEnabled = this.enabled;
    this.enabled = true;
    this.playChime();
    this.enabled = originalEnabled;
  }
}
