import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://ffhizdfgwocnnnniojqg.supabase.co",
  "sb_publishable_J1QJPyDc1vbG0mx3N213VA_fAPEzOsV"
);

const DEFAULT_EXERCISES = {
  胸: ["ベンチプレス", "インクラインベンチプレス", "ダンベルフライ", "ケーブルクロスオーバー", "ディップス"],
  背中: ["デッドリフト", "懸垂", "ラットプルダウン", "ベントオーバーロウ", "シーテッドロウ"],
  肩: ["ショルダープレス", "サイドレイズ", "フロントレイズ", "リアデルトフライ", "アーノルドプレス"],
  "腕（二頭・三頭）": ["バーベルカール", "ダンベルカール", "ハンマーカール", "トライセプスエクステンション", "ケーブルプッシュダウン"],
  "脚・臀部": ["スクワット", "レッグプレス", "ランジ", "レッグカール", "ヒップスラスト", "カーフレイズ"],
  腹筋: ["クランチ", "レッグレイズ", "プランク", "ロシアンツイスト", "アブローラー"],
  有酸素: ["ランニング", "ウォーキング", "サイクリング", "縄跳び", "水泳", "エリプティカル"],
};

const TABS = ["チャット", "記録", "RM計算", "リマインダー"];
const TAB_ICONS = ["💬", "📋", "💪", "🔔"];

const STEPS = [
  { key: "name", q: "まず、お名前を教えてください！", placeholder: "例：田中 太郎" },
  { key: "goal", q: "あなたの一番の目標は何ですか？", placeholder: "例：体脂肪を落とす、筋肉をつける、健康維持" },
  { key: "level", q: "トレーニング経験はどのくらいですか？", placeholder: "例：完全初心者・週1～2回・週3回以上" },
  { key: "concern", q: "体の悩みや気になることはありますか？（任意）", placeholder: "例：腰痛持ち、肩が弱い、特になし" },
];

const storage = {
  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  },
  del(key) {
    try {
      localStorage.removeItem(key);
    } catch {}
  },
};

function App() {
  const [phase, setPhase] = useState("loading");
  const [tab, setTab] = useState(0);

  const [stepIdx, setStepIdx] = useState(0);
  const [onboardInput, setOnboardInput] = useState("");
  const [answers, setAnswers] = useState({});
  const [profile, setProfile] = useState(null);

  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const chatEndRef = useRef(null);

  const [logs, setLogs] = useState([]);
  const [showLogForm, setShowLogForm] = useState(false);
  const [logForm, setLogForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    category: "",
    exercise: "",
    sets: "",
    reps: "",
    weight: "",
    memo: "",
  });

  const [exercises, setExercises] = useState(DEFAULT_EXERCISES);
  const [masterCategory, setMasterCategory] = useState("胸");
  const [newExerciseName, setNewExerciseName] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [showAddCategory, setShowAddCategory] = useState(false);

  const [reminders, setReminders] = useState([]);
  const [showRemForm, setShowRemForm] = useState(false);
  const [remForm, setRemForm] = useState({ message: "", days: 2 });

  const [notification, setNotification] = useState(null);
  const [lastTrained, setLastTrained] = useState(null);

  useEffect(() => {
    const p = storage.get("ignite_profile");
    const history = storage.get("ignite_history", []);
    const localReminders = storage.get("ignite_reminders", []);
    const localExercises = storage.get("ignite_exercises", DEFAULT_EXERCISES);
    const trained = storage.get("ignite_last_trained");

    setReminders(localReminders);
    setExercises(localExercises);
    setLastTrained(trained);

    if (p) {
      setProfile(p);
      setMessages(
        history.length > 0
          ? history
          : [
              {
                role: "assistant",
                content: `おかえりなさい、${p.name}さん！🔥
今日も積み上げていこう。`,
              },
            ]
      );
      setPhase("main");
    } else {
      setPhase("onboard");
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => setNotification(null), 3000);
    return () => clearTimeout(timer);
  }, [notification]);

  async function fetchLogs() {
    const { data, error } = await supabase.from("logs").select("*").order("id", { ascending: false });

    if (error) {
      console.log(error);
      return;
    }

    setLogs(data || []);
  }

  function handleStepSubmit() {
    const value = onboardInput.trim() || "未設定";
    const nextAnswers = { ...answers, [STEPS[stepIdx].key]: value };
    setAnswers(nextAnswers);
    setOnboardInput("");

    if (stepIdx < STEPS.length - 1) {
      setStepIdx((prev) => prev + 1);
      return;
    }

    storage.set("ignite_profile", nextAnswers);
    setProfile(nextAnswers);

    const starter = [
      {
        role: "assistant",
        content: `はじめまして、${nextAnswers.name}さん！🔥
目標は「${nextAnswers.goal}」ですね。今日から一緒に積み上げましょう。`,
      },
    ];

    setMessages(starter);
    storage.set("ignite_history", starter);
    setPhase("main");
  }

  function buildSimpleReply(text) {
    const q = text.toLowerCase();

    if (q.includes("メニュー")) {
      return `${profile?.name || "あなた"}さん向けの本日のおすすめです🔥

・メイン種目：ベンチプレス 4セット × 6～8回
・補助種目：インクラインベンチプレス 3セット × 8～10回
・仕上げ：ケーブルクロス 3セット × 12～15回
・休憩：メイン2～3分、補助60～90秒

フォーム優先でいこう。`;
    }

    if (q.includes("食事") || q.includes("栄養")) {
      return `食事の基本です🍚

・体重 × 1.6～2.2g のたんぱく質
・毎食でたんぱく質を分ける
・トレ前後は炭水化物をしっかり
・減量なら総摂取カロリーを管理

目標が「${profile?.goal || "未設定"}」なので、次はそこに合わせて細かく組めます。`;
    }

    if (q.includes("ストレッチ")) {
      return `おすすめはこれです。

・胸：ドア枠ストレッチ 30秒 × 2
・背中：ラットストレッチ 30秒 × 2
・股関節：ランジストレッチ 30秒 × 2
・ふくらはぎ：壁押しストレッチ 30秒 × 2

痛みが出るほどは伸ばさないで。`;
    }

    return `${profile?.name || "あなた"}さん、確認しました🔥

「${text}」について、次のどれを深掘りする？
・今日のメニュー
・食事
・フォーム
・回復
・ストレッチ`;
  }

  function sendChat(text) {
    const content = (text ?? chatInput).trim();
    if (!content) return;

    const next = [...messages, { role: "user", content }];
    const reply = buildSimpleReply(content);
    const final = [...next, { role: "assistant", content: reply }];

    setMessages(final);
    setChatInput("");
    storage.set("ignite_history", final.slice(-40));
  }

  async function addLog() {
    if (!logForm.category.trim()) {
      alert("カテゴリーを選んで");
      return;
    }

    if (!logForm.exercise.trim()) {
      alert("種目を選んで");
      return;
    }

    const payload = {
      date: logForm.date,
      category: logForm.category,
      exercise: logForm.exercise,
      weight: logForm.weight,
      reps: logForm.reps,
      sets: logForm.sets,
      memo: logForm.memo,
    };

    const { error } = await supabase.from("logs").insert([payload]);

    if (error) {
      alert("保存エラー: " + error.message);
      console.log(error);
      return;
    }

    const today = new Date().toISOString().slice(0, 10);
    setLastTrained(today);
    storage.set("ignite_last_trained", today);

    setLogForm({
      date: today,
      category: "",
      exercise: "",
      sets: "",
      reps: "",
      weight: "",
      memo: "",
    });

    setShowLogForm(false);
    setNotification("ログ保存 ✓");
    fetchLogs();
  }

  async function deleteLog(id) {
    const { error } = await supabase.from("logs").delete().eq("id", id);

    if (error) {
      alert("削除エラー: " + error.message);
      console.log(error);
      return;
    }

    setNotification("ログ削除 ✓");
    fetchLogs();
  }

  function addReminder() {
    if (!remForm.message.trim()) {
      alert("メッセージを入れて");
      return;
    }

    const next = [...reminders, { id: Date.now(), ...remForm }];
    setReminders(next);
    storage.set("ignite_reminders", next);
    setRemForm({ message: "", days: 2 });
    setShowRemForm(false);
    setNotification("リマインダー追加 ✓");
  }

  function deleteReminder(id) {
    const next = reminders.filter((r) => r.id !== id);
    setReminders(next);
    storage.set("ignite_reminders", next);
    setNotification("リマインダー削除 ✓");
  }

  function addExerciseMaster() {
    if (!newExerciseName.trim() || !masterCategory) return;

    const exists = (exercises[masterCategory] || []).includes(newExerciseName.trim());
    if (exists) {
      alert("その種目はすでにあります");
      return;
    }

    const updated = {
      ...exercises,
      [masterCategory]: [...(exercises[masterCategory] || []), newExerciseName.trim()],
    };

    setExercises(updated);
    storage.set("ignite_exercises", updated);
    setNewExerciseName("");
    setNotification("種目追加 ✓");
  }

  function deleteExerciseMaster(category, name) {
    const updated = {
      ...exercises,
      [category]: exercises[category].filter((e) => e !== name),
    };
    setExercises(updated);
    storage.set("ignite_exercises", updated);
    if (logForm.exercise === name) {
      setLogForm({ ...logForm, exercise: "" });
    }

    setNotification("種目削除 ✓");
  }

  function addCategory() {
    const name = newCategoryName.trim();
    if (!name || exercises[name]) return;

    const updated = { ...exercises, [name]: [] };
    setExercises(updated);
    storage.set("ignite_exercises", updated);
    setMasterCategory(name);
    setNewCategoryName("");
    setShowAddCategory(false);
    setNotification("カテゴリ追加 ✓");
  }

  function resetAll() {
    storage.del("ignite_profile");
    storage.del("ignite_history");
    storage.del("ignite_reminders");
    storage.del("ignite_last_trained");
    storage.del("ignite_exercises");
    location.reload();
  }

  const quickPrompts = useMemo(() => {
    if (!profile) return [];
    return [
      "今日のトレーニングメニューを作って",
      '${profile.goal}に効く食事を教えて',
      "ストレッチ方法を教えて",
      "前回の続きから始めよう",
    ];
  }, [profile]);

  const daysSince = useMemo(() => {
    if (!lastTrained) return null;
    return Math.floor((Date.now() - new Date(lastTrained).getTime()) / 86400000);
  }, [lastTrained]);

  const oneRM = useMemo(() => {
    const w = parseFloat(logForm.weight);
    const r = parseFloat(logForm.reps);
    if (Number.isNaN(w) || Number.isNaN(r) || !w || !r) return null;
    return Math.round(w * (1 + r / 30));
  }, [logForm.weight, logForm.reps]);

  if (phase === "loading") {
    return (
      <div style={styles.pageCenter}>
        <div style={{ color: "#888" }}>Loading...</div>
      </div>
    );
  }

  if (phase === "onboard") {
    return (
      <div style={styles.pageCenter}>
        <div style={styles.card}>
          <h1 style={styles.title}>IGNITE</h1>
          <p style={styles.subTitle}>AI Personal Trainer</p>

          <div style={{ marginTop: 24 }}>
            <div style={styles.stepCount}>
              {stepIdx + 1} / {STEPS.length}
            </div>
            <div style={styles.question}>{STEPS[stepIdx].q}</div>

            <input
              style={styles.input}
              placeholder={STEPS[stepIdx].placeholder}
              value={onboardInput}
              onChange={(e) => setOnboardInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleStepSubmit()}
            />

            <button style={styles.primaryButton} onClick={handleStepSubmit}>
              {stepIdx < STEPS.length - 1 ? "次へ" : "開始する"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      {notification && <div style={styles.notification}>{notification}</div>}

      <div style={styles.appCard}>
        <div style={styles.header}>
          <div>
            <div style={styles.logo}>IGNITE</div>
            <div style={styles.profileText}>
              {profile?.name}さん / 目標: {profile?.goal}
            </div>
          </div>
          <button style={styles.resetButton} onClick={resetAll}>
            リセット
          </button>
        </div>

        <div style={styles.tabRow}>
          {TABS.map((label, i) => (
            <button
              key={label}
              style={{
                ...styles.tabButton,
                ...(tab === i ? styles.tabButtonActive : {}),
              }}
              onClick={() => setTab(i)}
            >
              {TAB_ICONS[i]} {label}
            </button>
          ))}
        </div>

        {tab === 0 && (
          <div style={styles.section}>
            <div style={styles.chatBox}>
              {messages.map((m, i) => (
                <div key={i} style={m.role === "user" ? styles.userWrap : styles.aiWrap}>
                  <div style={m.role === "user" ? styles.userBubble : styles.aiBubble}>{m.content}</div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            <div style={styles.quickRow}>
              {quickPrompts.map((q) => (
                <button key={q} style={styles.quickChip} onClick={() => sendChat(q)}>
                  {q}
                </button>
              ))}
            </div>

            <div style={styles.chatInputRow}>
              <input
                style={styles.input}
                placeholder="聞きたいことを入力"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendChat()}
              />
              <button style={styles.primaryButtonSmall} onClick={() => sendChat()}>
                送信
              </button>
            </div>
          </div>
        )}

        {tab === 1 && (
          <div style={styles.section}>
            <div style={styles.subSectionHeader}>
              <div>
                <h2 style={styles.sectionTitle}>トレーニング記録</h2>
                <div style={styles.subInfo}>{logs.length}件</div>
              </div>
              <button style={styles.primaryButtonSmall} onClick={() => setShowLogForm((v) => !v)}>
                {showLogForm ? "閉じる" : "+ 追加"}
              </button>
            </div>

            {showLogForm && (
              <div style={styles.panel}>
                <input
                  style={styles.input}
                  type="date"
                  value={logForm.date}
                  onChange={(e) => setLogForm({ ...logForm, date: e.target.value })}
                />

                <div style={styles.categoryWrap}>
                  {Object.keys(exercises).map((cat) => (
                    <button
                      key={cat}
                      style={{
                        ...styles.categoryChip,
                        ...(logForm.category === cat ? styles.categoryChipActive : {}),
                      }}
                      onClick={() => {
                        setLogForm({ ...logForm, category: cat, exercise: "" });
                        setMasterCategory(cat);
                      }}
                    >
                      {cat}
                    </button>
                  ))}
                  <button style={styles.categoryChip} onClick={() => setShowAddCategory((v) => !v)}>
                    + カテゴリ
                  </button>
                </div>

                {showAddCategory && (
                  <div style={styles.inlineRow}>
                    <input
                      style={styles.input}
                      placeholder="新カテゴリ名"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                    />
                    <button style={styles.primaryButtonSmall} onClick={addCategory}>
                      追加
                    </button>
                  </div>
                )}

                {logForm.category && (
                  <>
                    <div style={styles.exerciseList}>
                      {(exercises[logForm.category] || []).map((name) => (
                        <div
                          key={name}
                          style={{
                            ...styles.exerciseChip,
                            ...(logForm.exercise === name ? styles.exerciseChipActive : {}),
                          }}
                          onClick={() => setLogForm({ ...logForm, exercise: name })}
                        >
                          <span>{name}</span>
                          <button
                            style={styles.smallX}
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteExerciseMaster(logForm.category, name);
                            }}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>

                    <div style={styles.inlineRow}>
                      <input
                        style={styles.input}
                        placeholder="種目追加"
                        value={newExerciseName}
                        onChange={(e) => setNewExerciseName(e.target.value)}
                      />
                      <button style={styles.primaryButtonSmall} onClick={addExerciseMaster}>
                        追加
                      </button>
                    </div>
                  </>
                )}
                <div style={styles.formRow3}>
                  <input
                    style={styles.input}
                    placeholder="重量"
                    value={logForm.weight}
                    onChange={(e) => setLogForm({ ...logForm, weight: e.target.value })}
                  />
                  <input
                    style={styles.input}
                    placeholder="回数"
                    value={logForm.reps}
                    onChange={(e) => setLogForm({ ...logForm, reps: e.target.value })}
                  />
                  <input
                    style={styles.input}
                    placeholder="セット数"
                    value={logForm.sets}
                    onChange={(e) => setLogForm({ ...logForm, sets: e.target.value })}
                  />
                </div>

                <input
                  style={styles.input}
                  placeholder="メモ"
                  value={logForm.memo}
                  onChange={(e) => setLogForm({ ...logForm, memo: e.target.value })}
                />

                <button style={styles.primaryButton} onClick={addLog}>
                  保存する
                </button>
              </div>
            )}

            <div style={{ marginTop: 14 }}>
              {logs.length === 0 ? (
                <div style={styles.emptyText}>まだ記録がありません</div>
              ) : (
                logs.map((log) => (
                  <div key={log.id} style={styles.logCard}>
                    <div>
                      <div style={styles.logTitle}>
                        {log.category ? '[${log.category}] ' : ""}
                        {log.exercise}
                      </div>
                      <div style={styles.logMeta}>
                        {log.date} / {log.weight || "-"}kg / {log.reps || "-"}回 / {log.sets || "-"}セット
                      </div>
                      {log.memo && <div style={styles.logMemo}>📝 {log.memo}</div>}
                    </div>
                    <button style={styles.deleteGhost} onClick={() => deleteLog(log.id)}>
                      ✕
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {tab === 2 && <RMCalculator oneRM={oneRM} />}

        {tab === 3 && (
          <div style={styles.section}>
            <div style={styles.subSectionHeader}>
              <div>
                <h2 style={styles.sectionTitle}>リマインダー</h2>
                <div style={styles.subInfo}>
                  {daysSince === null ? "まだ記録なし" : ${daysSince}日休み}
                </div>
              </div>
              <button style={styles.primaryButtonSmall} onClick={() => setShowRemForm((v) => !v)}>
                {showRemForm ? "閉じる" : "追加"}
              </button>
            </div>

            {showRemForm && (
              <div style={styles.panel}>
                <input
                  style={styles.input}
                  placeholder="メッセージ"
                  value={remForm.message}
                  onChange={(e) => setRemForm({ ...remForm, message: e.target.value })}
                />

                <div style={styles.daysRow}>
                  {[1, 2, 3, 5, 7].map((d) => (
                    <button
                      key={d}
                      style={{
                        ...styles.dayButton,
                        ...(remForm.days === d ? styles.dayButtonActive : {}),
                      }}
                      onClick={() => setRemForm({ ...remForm, days: d })}
                    >
                      {d}日
                    </button>
                  ))}
                </div>

                <button style={styles.primaryButton} onClick={addReminder}>
                  設定する
                </button>
              </div>
            )}

            {reminders.length === 0 ? (
              <div style={styles.emptyText}>リマインダー未設定</div>
            ) : (
              reminders.map((r) => (
                <div key={r.id} style={styles.logCard}>
                  <div>
                    <div style={styles.logTitle}>🔔 {r.message}</div>
                    <div style={styles.logMeta}>{r.days}日休んだら通知</div>
                  </div>
                  <button style={styles.deleteGhost} onClick={() => deleteReminder(r.id)}>
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function RMCalculator({ oneRM }) {
  const [mode, setMode] = useState("estimate");
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");
  const [targetWeight, setTargetWeight] = useState("");

  const calcOneRM = useMemo(() => {
    const w = parseFloat(weight);
    const r = parseFloat(reps);
    if (Number.isNaN(w) || Number.isNaN(r) || !w || !r) return null;
    return Math.round(w * (1 + r / 30));
  }, [weight, reps]);

  const activeOneRM = calcOneRM || oneRM || null;

  const reverseReps = useMemo(() => {
    const tw = parseFloat(targetWeight);
    if (!activeOneRM || Number.isNaN(tw) || !tw) return null;
    return Math.max(1, Math.round(30 * (activeOneRM / tw - 1)));
  }, [activeOneRM, targetWeight]);

  const table = useMemo(() => {
    if (!activeOneRM) return [];
    const pct = [100, 95, 93, 90, 87, 85, 83, 80, 77, 75];
    return pct.map((p, i) => ({
      rm: i + 1,
      kg: Math.round((activeOneRM * p) / 100 * 2) / 2,
      pct: p,
    }));
  }, [activeOneRM]);

  return (
    <div style={styles.section}>
      <h2 style={styles.sectionTitle}>RM計算</h2>

      <div style={styles.daysRow}>
        <button
          style={{ ...styles.dayButton, ...(mode === "estimate" ? styles.dayButtonActive : {}) }}
          onClick={() => setMode("estimate")}
        >
          1RM推定
        </button>
        <button
          style={{ ...styles.dayButton, ...(mode === "reverse" ? styles.dayButtonActive : {}) }}
          onClick={() => setMode("reverse")}
        >
          逆算
        </button>
      </div>

      <div style={styles.formRow2}>
        <input
          style={styles.input}
          placeholder="重量"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
        />
        <input
          style={styles.input}
          placeholder="回数"
          value={reps}
          onChange={(e) => setReps(e.target.value)}
        />
      </div>

      {mode === "reverse" && (
        <input
          style={styles.input}
          placeholder="目標重量"
          value={targetWeight}
          onChange={(e) => setTargetWeight(e.target.value)}
        />
      )}

      {mode === "estimate" && activeOneRM && (
        <>
          <div style={styles.rmBox}>推定1RM：{activeOneRM}kg</div>
          <div style={styles.rmGrid}>
            {table.map((row) => (
              <div key={row.rm} style={styles.rmCell}>
                <div style={styles.rmSmall}>{row.rm}RM</div>
                <div style={styles.rmBig}>{row.kg}kg</div>
                <div style={styles.rmSmall}>{row.pct}%</div>
              </div>
            ))}
          </div>
        </>
      )}

      {mode === "reverse" && activeOneRM && reverseReps && (
        <div style={styles.rmBox}>
          {targetWeight}kg を挙げるには 約 {reverseReps}回
        </div>
      )}

      {!activeOneRM && <div style={styles.emptyText}>重量と回数を入れると計算されます</div>}
    </div>
  );
}
const styles = {
  page: {
    minHeight: "100vh",
    background: "#000",
    padding: 16,
    display: "flex",
    justifyContent: "center",
    alignItems: "flex-start",
    color: "#fff",
    fontFamily: "'Noto Sans JP', sans-serif",
  },
  pageCenter: {
    minHeight: "100vh",
    background: "#000",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
    fontFamily: "'Noto Sans JP', sans-serif",
  },
  appCard: {
    width: "100%",
    maxWidth: 560,
    background: "#0a0a0a",
    border: "1px solid #1b1b1b",
    borderRadius: 20,
    overflow: "hidden",
    boxShadow: "0 0 50px rgba(0,0,0,0.6)",
  },
  card: {
    width: "100%",
    maxWidth: 520,
    background: "#0a0a0a",
    border: "1px solid #1b1b1b",
    borderRadius: 20,
    padding: 28,
    color: "#fff",
  },
  title: {
    fontSize: 44,
    textAlign: "center",
    fontWeight: 700,
    letterSpacing: 2,
  },
  subTitle: {
    textAlign: "center",
    color: "#666",
    marginTop: 8,
  },
  stepCount: {
    color: "#777",
    marginBottom: 8,
    fontSize: 12,
  },
  question: {
    fontSize: 18,
    marginBottom: 14,
    lineHeight: 1.6,
  },
  header: {
    padding: "18px 20px",
    borderBottom: "1px solid #1a1a1a",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  logo: {
    fontSize: 28,
    fontWeight: 800,
    letterSpacing: 2,
  },
  profileText: {
    color: "#666",
    fontSize: 12,
    marginTop: 4,
  },
  resetButton: {
    background: "transparent",
    border: "1px solid #2a2a2a",
    color: "#aaa",
    borderRadius: 8,
    padding: "8px 12px",
    cursor: "pointer",
  },
  tabRow: {
    display: "flex",
    borderBottom: "1px solid #1a1a1a",
  },
  tabButton: {
    flex: 1,
    background: "transparent",
    color: "#555",
    border: "none",
    padding: "12px 8px",
    cursor: "pointer",
    borderBottom: "2px solid transparent",
  },
  tabButtonActive: {
    color: "#fff",
    borderBottom: "2px solid #fff",
  },
  section: {
    padding: 18,
  },
  sectionTitle: {
    fontSize: 16,
    marginBottom: 12,
  },
  subSectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  subInfo: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  input: {
    width: "100%",
    background: "#111",
    border: "1px solid #222",
    borderRadius: 10,
    padding: "12px 14px",
    color: "#fff",
    fontSize: 14,
    outline: "none",
  },
  primaryButton: {
    width: "100%",
    marginTop: 14,
    background: "#fff",
    color: "#000",
    border: "none",
    borderRadius: 10,
    padding: "12px 14px",
    cursor: "pointer",
    fontWeight: 700,
  },
  primaryButtonSmall: {
    background: "#fff",
    color: "#000",
    border: "none",
    borderRadius: 10,
    padding: "12px 14px",
    cursor: "pointer",
    fontWeight: 700,
    whiteSpace: "nowrap",
  },
  deleteGhost: {
    background: "transparent",
    color: "#888",
    border: "none",
    cursor: "pointer",
    fontSize: 16,
  },
  formRow3: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: 10,
    marginTop: 10,
  },
  formRow2: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 10,
    marginBottom: 12,
  },
  emptyText: {
    textAlign: "center",
    color: "#555",
    padding: "24px 0",
  },
  panel: {
    background: "#0f0f0f",
    border: "1px solid #1c1c1c",
    borderRadius: 14,
    padding: 14,
    display: "grid",
    gap: 10,
    marginBottom: 14,
  },
  categoryWrap: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
  },
  categoryChip: {
    background: "transparent",
    color: "#666",
    border: "1px solid #222",
    borderRadius: 20,
    padding: "6px 12px",
    cursor: "pointer",
  },
  categoryChipActive: {
    background: "#fff",
    color: "#000",
    border: "1px solid #fff",
  },
  inlineRow: {
    display: "flex",
    gap: 10,
    alignItems: "center",
  },
  exerciseList: {
    display: "grid",
    gap: 8,
  },
  exerciseChip: {
    background: "#111",
    border: "1px solid #222",
    borderRadius: 10,
    padding: "10px 12px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    color: "#ddd",
    cursor: "pointer",
  },
  exerciseChipActive: {
    background: "#fff",
    color: "#000",
    border: "1px solid #fff",
  },
  smallX: {
    background: "transparent",
    border: "none",
    cursor: "pointer",
    color: "inherit",
  },
  logCard: {
    background: "#111",
    border: "1px solid #1f1f1f",
    borderRadius: 12,
    padding: 14,
    display: "flex",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 10,
  },
  logTitle: {
    fontSize: 14,
    color: "#e5e5e5",
    fontWeight: 700,
  },
  logMeta: {
    fontSize: 12,
    color: "#777",
    marginTop: 4,
  },
  logMemo: {
    fontSize: 12,
    color: "#aaa",
    marginTop: 6,
  },
  chatBox: {
    height: 360,
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: 12,
    paddingBottom: 8,
  },
  aiWrap: {
    display: "flex",
    justifyContent: "flex-start",
  },
  userWrap: {
    display: "flex",
    justifyContent: "flex-end",
  },
  aiBubble: {
    background: "#111",
    border: "1px solid #1e1e1e",
    color: "#e5e5e5",
    borderRadius: "16px 16px 16px 4px",
    padding: "12px 14px",
    maxWidth: "85%",
    lineHeight: 1.7,
    whiteSpace: "pre-wrap",
  },
  userBubble: {
    background: "#fff",
    color: "#000",
    borderRadius: "16px 16px 4px 16px",
    padding: "12px 14px",
    maxWidth: "85%",
    lineHeight: 1.7,
    whiteSpace: "pre-wrap",
  },
  quickRow: {
    display: "flex",
    gap: 8,
    overflowX: "auto",
    paddingBottom: 10,
    marginTop: 10,
  },
  quickChip: {
    background: "transparent",
    color: "#888",
    border: "1px solid #222",
    borderRadius: 999,
    padding: "7px 12px",
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  chatInputRow: {
    display: "flex",
    gap: 10,
    marginTop: 12,
  },
  notification: {
    position: "fixed",
    top: 20,
    left: "50%",
    transform: "translateX(-50%)",
    background: "#fff",
    color: "#000",
    padding: "10px 16px",
    borderRadius: 10,
    fontWeight: 700,
    zIndex: 9999,
  },
  daysRow: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    marginBottom: 12,
  },
  dayButton: {
    background: "#111",
    color: "#777",
    border: "1px solid #222",
    borderRadius: 10,
    padding: "8px 12px",
    cursor: "pointer",
  },
  dayButtonActive: {
    background: "#fff",
    color: "#000",
    border: "1px solid #fff",
  },
  rmBox: {
    background: "#111",
    border: "1px solid #222",
    borderRadius: 12,
    padding: 16,
    textAlign: "center",
    fontSize: 18,
    fontWeight: 700,
    marginTop: 12,
    marginBottom: 12,
  },
  rmGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(5, 1fr)",
    gap: 8,
  },
  rmCell: {
    background: "#111",
    border: "1px solid #222",
    borderRadius: 10,
    padding: 10,
    textAlign: "center",
  },
  rmSmall: {
    fontSize: 11,
    color: "#777",
  },
  rmBig: {
    fontSize: 14,
    color: "#fff",
    fontWeight: 700,
    margin: "4px 0",
  },
};

export default App;