/**
 * ポモドーロタイマー - メインエントリーポイント
 */

import "./styles/main.css";
import { PomodoroTimer } from "./timer";
import { AudioManager } from "./audio";
import { NotificationManager } from "./notification";
import { StorageManager } from "./storage";
import type {
  PomodoroSettings,
  TimerState,
  SessionType,
  ThemeMode,
} from "./types";
import { DEFAULT_SETTINGS } from "./types";

// マネージャーインスタンス
const storage = new StorageManager();
const audio = new AudioManager();
const notification = new NotificationManager();
let timer: PomodoroTimer;

// DOM要素キャッシュ
let app: HTMLDivElement;

/**
 * テーマを適用
 */
function applyTheme(themeMode: ThemeMode): void {
  document.documentElement.setAttribute("data-theme", themeMode);
}

/**
 * アプリケーション初期化
 */
function init(): void {
  app = document.querySelector<HTMLDivElement>("#app")!;

  // 保存された設定を読み込み
  const settings = storage.loadSettings();

  // テーマを適用
  applyTheme(settings.themeMode);

  // タイマー初期化
  timer = new PomodoroTimer(settings, {
    onTick: handleTick,
    onSessionEnd: handleSessionEnd,
    onComplete: handleComplete,
    onStateChange: handleStateChange,
  });

  // 設定画面を表示
  renderSettingsScreen(settings);
}

/**
 * 設定画面のHTML生成
 */
function renderSettingsScreen(settings: PomodoroSettings): void {
  app.innerHTML = `
    <div class="card screen">
      <h1>🍅 ポモドーロタイマー</h1>
      <form class="settings-form" id="settings-form">
        <div class="form-row">
          <div class="form-group">
            <label for="work-duration">作業時間（分）</label>
            <input type="number" id="work-duration" min="1" max="60" value="${settings.workDuration}" required>
          </div>
          <div class="form-group">
            <label for="break-duration">休憩時間（分）</label>
            <input type="number" id="break-duration" min="1" max="30" value="${settings.breakDuration}" required>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="long-break-duration">長い休憩（分）</label>
            <input type="number" id="long-break-duration" min="1" max="60" value="${settings.longBreakDuration}" required>
          </div>
          <div class="form-group">
            <label for="total-sets">セット数</label>
            <input type="number" id="total-sets" min="1" max="12" value="${settings.totalSets}" required>
          </div>
        </div>
        <div class="form-group">
          <label for="long-break-interval">長い休憩の頻度（セット毎）</label>
          <input type="number" id="long-break-interval" min="2" max="12" value="${settings.longBreakInterval}" required>
        </div>
        
        <div class="toggle-group">
          <span class="toggle-label">🔊 音声通知</span>
          <label class="toggle">
            <input type="checkbox" id="sound-enabled" ${settings.soundEnabled ? "checked" : ""}>
            <span class="toggle-slider"></span>
          </label>
        </div>
        
        <div class="toggle-group">
          <span class="toggle-label">🔔 ブラウザ通知</span>
          <label class="toggle">
            <input type="checkbox" id="notification-enabled" ${settings.notificationEnabled ? "checked" : ""}>
            <span class="toggle-slider"></span>
          </label>
        </div>
        
        <div class="form-group" style="margin-top: 0.5rem;">
          <label for="theme-mode">🎨 テーマ</label>
          <select id="theme-mode">
            <option value="system" ${settings.themeMode === "system" ? "selected" : ""}>システム設定に従う</option>
            <option value="light" ${settings.themeMode === "light" ? "selected" : ""}>ライトモード</option>
            <option value="dark" ${settings.themeMode === "dark" ? "selected" : ""}>ダークモード</option>
          </select>
        </div>
        
        <button type="submit" class="btn btn-primary" style="margin-top: 1rem; width: 100%;">
          ▶️ スタート
        </button>
      </form>
    </div>
  `;

  // フォーム送信イベント
  const form = document.getElementById("settings-form") as HTMLFormElement;
  form.addEventListener("submit", handleFormSubmit);

  // 音声トグル変更時にAudioContextを初期化
  const soundToggle = document.getElementById(
    "sound-enabled",
  ) as HTMLInputElement;
  soundToggle.addEventListener("change", () => {
    if (soundToggle.checked) {
      audio.init();
      audio.playTest();
    }
  });

  // 通知トグル変更時に許可をリクエスト
  const notificationToggle = document.getElementById(
    "notification-enabled",
  ) as HTMLInputElement;
  notificationToggle.addEventListener("change", async () => {
    if (notificationToggle.checked) {
      const granted = await notification.requestPermission();
      if (!granted) {
        notificationToggle.checked = false;
        // iOSの場合、より詳細なガイダンスを提供
        const isIOS =
          /iPad|iPhone|iPod/.test(navigator.userAgent) ||
          (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
        if (isIOS) {
          alert(
            "iOSでは通知許可のポップアップが表示されない場合があります。\n\n設定 > Safari > このサイト > 通知 から手動で許可してください。\n\n（Chromeを使用している場合も、iOSではSafariの設定を確認してください）",
          );
        } else {
          alert("通知の許可が必要です。ブラウザの設定から許可してください。");
        }
      }
    }
  });

  // テーマ変更時に即座に適用
  const themeSelect = document.getElementById(
    "theme-mode",
  ) as HTMLSelectElement;
  themeSelect.addEventListener("change", () => {
    const themeMode = themeSelect.value as ThemeMode;
    applyTheme(themeMode);
    // 設定を保存
    const currentSettings = getFormSettings();
    storage.saveSettings(currentSettings);
  });
}

/**
 * フォーム送信処理
 */
async function handleFormSubmit(e: Event): Promise<void> {
  e.preventDefault();

  const settings = getFormSettings();

  // 設定を保存
  storage.saveSettings(settings);

  // タイマー設定を更新
  timer.updateSettings(settings);

  // 音声・通知の設定を反映
  audio.setEnabled(settings.soundEnabled);
  notification.setEnabled(settings.notificationEnabled);

  // AudioContextを初期化（ユーザー操作後）
  audio.init();

  // 通知許可をリクエスト（ユーザー操作のコンテキスト内で）
  if (settings.notificationEnabled) {
    // 許可状態を確認して、必要に応じてリクエスト
    if (!notification.hasPermission()) {
      const granted = await notification.requestPermission();
      if (!granted) {
        // 許可が得られなかった場合、設定を無効化
        settings.notificationEnabled = false;
        storage.saveSettings(settings);
        notification.setEnabled(false);
      }
    }
  }

  // タイマー画面を表示
  renderTimerScreen();

  // タイマー開始
  timer.start();
}

/**
 * フォームから設定を取得
 */
function getFormSettings(): PomodoroSettings {
  return {
    workDuration: getInputValue("work-duration", DEFAULT_SETTINGS.workDuration),
    breakDuration: getInputValue(
      "break-duration",
      DEFAULT_SETTINGS.breakDuration,
    ),
    longBreakDuration: getInputValue(
      "long-break-duration",
      DEFAULT_SETTINGS.longBreakDuration,
    ),
    totalSets: getInputValue("total-sets", DEFAULT_SETTINGS.totalSets),
    longBreakInterval: getInputValue(
      "long-break-interval",
      DEFAULT_SETTINGS.longBreakInterval,
    ),
    soundEnabled: (document.getElementById("sound-enabled") as HTMLInputElement)
      .checked,
    notificationEnabled: (
      document.getElementById("notification-enabled") as HTMLInputElement
    ).checked,
    themeMode: (document.getElementById("theme-mode") as HTMLSelectElement)
      .value as ThemeMode,
  };
}

/**
 * 入力値を取得（バリデーション付き）
 */
function getInputValue(id: string, defaultValue: number): number {
  const input = document.getElementById(id) as HTMLInputElement;
  const value = parseInt(input.value, 10);
  return isNaN(value) || value <= 0 ? defaultValue : value;
}

/**
 * タイマー画面のHTML生成
 */
function renderTimerScreen(): void {
  const state = timer.getState();
  const settings = timer.getSettings();

  app.innerHTML = `
    <div class="card screen timer-screen">
      <div id="session-label" class="session-label ${getSessionClass(state.currentSession)}">
        ${getSessionLabel(state.currentSession)}
      </div>
      
      <div class="timer-display">
        <div id="time" class="time ${getSessionClass(state.currentSession)}">
          ${PomodoroTimer.formatTime(state.remainingTime)}
        </div>
        <div id="paused-indicator" class="paused-indicator hidden">⏸ 一時停止中</div>
      </div>
      
      <div class="progress-container">
        <div class="progress-bar">
          <div id="progress-fill" class="progress-fill ${getSessionClass(state.currentSession)}" style="width: 0%"></div>
        </div>
        <div id="progress-text" class="progress-text">
          セット ${state.currentSet} / ${settings.totalSets}
        </div>
      </div>
      
      <div id="set-indicators" class="set-indicators">
        ${generateSetIndicators(state.currentSet, settings.totalSets)}
      </div>
      
      <div class="controls">
        <button id="pause-btn" class="btn btn-primary btn-icon" title="一時停止">
          ⏸
        </button>
        <button id="skip-btn" class="btn btn-secondary btn-icon" title="スキップ">
          ⏭
        </button>
      </div>
      
      <div class="controls-secondary">
        <button id="reset-btn" class="btn btn-secondary" style="padding: 0.5rem 1rem; font-size: 0.875rem;">
          🔄 リセット
        </button>
      </div>
    </div>
  `;

  // イベントリスナー設定
  document
    .getElementById("pause-btn")!
    .addEventListener("click", handlePauseClick);
  document
    .getElementById("skip-btn")!
    .addEventListener("click", handleSkipClick);
  document
    .getElementById("reset-btn")!
    .addEventListener("click", handleResetClick);

  // キーボードショートカット
  document.addEventListener("keydown", handleKeyDown);
}

/**
 * セットインジケーターのHTML生成
 */
function generateSetIndicators(currentSet: number, totalSets: number): string {
  let html = "";
  for (let i = 1; i <= totalSets; i++) {
    let className = "set-dot";
    if (i < currentSet) {
      className += " completed";
    } else if (i === currentSet) {
      className += " current";
    }
    html += `<div class="${className}"></div>`;
  }
  return html;
}

/**
 * セッションのCSSクラスを取得
 */
function getSessionClass(session: SessionType): string {
  switch (session) {
    case "work":
      return "work";
    case "break":
      return "break";
    case "longBreak":
      return "long-break";
  }
}

/**
 * セッションのラベルを取得
 */
function getSessionLabel(session: SessionType): string {
  switch (session) {
    case "work":
      return "🔥 作業中";
    case "break":
      return "☕ 休憩中";
    case "longBreak":
      return "🌴 長い休憩";
  }
}

/**
 * 一時停止/再開ボタンクリック
 */
function handlePauseClick(): void {
  const pauseBtn = document.getElementById("pause-btn")!;

  if (timer.isRunning()) {
    timer.pause();
    pauseBtn.textContent = "▶";
    pauseBtn.title = "再開";
  } else if (timer.isPaused()) {
    timer.start();
    pauseBtn.textContent = "⏸";
    pauseBtn.title = "一時停止";
  }
}

/**
 * スキップボタンクリック
 */
function handleSkipClick(): void {
  if (confirm("現在のセッションをスキップしますか？")) {
    timer.skip();
  }
}

/**
 * リセットボタンクリック
 */
function handleResetClick(): void {
  if (confirm("タイマーをリセットして設定画面に戻りますか？")) {
    document.removeEventListener("keydown", handleKeyDown);
    timer.reset();
    renderSettingsScreen(storage.loadSettings());
  }
}

/**
 * キーボードショートカット
 */
function handleKeyDown(e: KeyboardEvent): void {
  if (e.code === "Space" && !isInputFocused()) {
    e.preventDefault();
    handlePauseClick();
  }
}

/**
 * 入力フィールドにフォーカスがあるか
 */
function isInputFocused(): boolean {
  const active = document.activeElement;
  return (
    active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement
  );
}

/**
 * タイマーtickコールバック
 */
function handleTick(state: TimerState): void {
  updateTimerDisplay(state);
}

/**
 * セッション終了コールバック
 */
function handleSessionEnd(
  sessionType: SessionType,
  _nextSession: SessionType | null,
): void {
  // 音声通知
  if (sessionType === "work") {
    audio.play("workEnd");
  } else {
    audio.play("breakEnd");
  }

  // ブラウザ通知
  notification.notifySessionEnd(sessionType);
}

/**
 * 全セット完了コールバック
 */
function handleComplete(): void {
  audio.play("complete");
  notification.notifyComplete();
  renderCompleteScreen();
}

/**
 * 状態変更コールバック
 */
function handleStateChange(state: TimerState): void {
  if (state.status === "running" || state.status === "paused") {
    updateTimerDisplay(state);
    updatePausedIndicator(state.status === "paused");
  }
}

/**
 * タイマー表示を更新
 */
function updateTimerDisplay(state: TimerState): void {
  const timeEl = document.getElementById("time");
  const sessionLabelEl = document.getElementById("session-label");
  const progressFillEl = document.getElementById("progress-fill");
  const progressTextEl = document.getElementById("progress-text");
  const setIndicatorsEl = document.getElementById("set-indicators");

  if (!timeEl) return;

  const settings = timer.getSettings();
  const sessionClass = getSessionClass(state.currentSession);

  // 時間更新
  timeEl.textContent = PomodoroTimer.formatTime(state.remainingTime);
  timeEl.className = `time ${sessionClass}`;
  if (state.status === "paused") {
    timeEl.classList.add("paused");
  }

  // セッションラベル更新
  if (sessionLabelEl) {
    sessionLabelEl.textContent = getSessionLabel(state.currentSession);
    sessionLabelEl.className = `session-label ${sessionClass}`;
  }

  // プログレスバー更新
  if (progressFillEl) {
    progressFillEl.style.width = `${timer.getProgress()}%`;
    progressFillEl.className = `progress-fill ${sessionClass}`;
  }

  // プログレステキスト更新
  if (progressTextEl) {
    progressTextEl.textContent = `セット ${state.currentSet} / ${settings.totalSets}`;
  }

  // セットインジケーター更新
  if (setIndicatorsEl) {
    setIndicatorsEl.innerHTML = generateSetIndicators(
      state.currentSet,
      settings.totalSets,
    );
  }
}

/**
 * 一時停止インジケーター表示/非表示
 */
function updatePausedIndicator(isPaused: boolean): void {
  const indicator = document.getElementById("paused-indicator");
  if (indicator) {
    indicator.classList.toggle("hidden", !isPaused);
  }
}

/**
 * 完了画面のHTML生成
 */
function renderCompleteScreen(): void {
  document.removeEventListener("keydown", handleKeyDown);
  const settings = timer.getSettings();

  app.innerHTML = `
    <div class="card screen complete-screen">
      <div class="complete-icon">🎉</div>
      <h1 class="complete-title">おめでとうございます！</h1>
      <p class="complete-message">
        ${settings.totalSets}セット完了しました。<br>
        お疲れさまでした！
      </p>
      <button id="restart-btn" class="btn btn-success" style="width: 100%;">
        🔄 もう一度
      </button>
    </div>
  `;

  document.getElementById("restart-btn")!.addEventListener("click", () => {
    timer.reset();
    renderSettingsScreen(storage.loadSettings());
  });
}

// アプリケーション開始
init();
