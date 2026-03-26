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

const STEPS = [
  { key: "name", q: "まず、お名前を教えてください！", placeholder: "例：田中 太郎" },
  { key: "goal", q: "あなたの一番の目標は何ですか？", placeholder: "例：体脂肪を落とす、筋肉をつける、健康維持" },
  { key: "level", q: "トレーニング経験はどのくらいですか？", placeholder: "例：完全初心者・週1〜2回・週3回以上" },
  { key: "concern", q: "体の悩みや気になることはありますか？（任意）", placeholder: "例：腰痛持ち、肩が弱い、特になし" },
];

const TABS = ["チャット", "記録", "RM計算", "リマインダー"];
const TAB_ICONS = ["💬", "📋", "💪", "🔔"];

const store = {
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

function buildSimpleReply(profile, text) {
  const q = text.toLowerCase();

  if (q.includes("メニュー")) {
    return `${profile?.name || "あなた"}さん向けのおすすめメニューです🔥

【今日の例】
・メイン：ベンチプレス 4セット × 6〜8回
・補助①：インクラインベンチプレス 3セット × 8〜10回
・補助②：ダンベルフライ 3セット × 10〜12回
・仕上げ：ケーブルクロスオーバー 2〜3セット × 12〜15回

休憩
・高重量種目：2〜3分
・補助種目：60〜90秒

肩に違和感があるなら無理に深く下ろしすぎないで。`;
  }

  if (q.includes("食事") || q.includes("栄養")) {
    return `${profile?.name || "あなた"}さんの目標「${profile?.goal || "未設定"}」向けの基本です🍚

・たんぱく質：体重×1.6〜2.2g/日
・毎食でたんぱく質を分ける
・トレ前後は炭水化物をしっかり
・減量中でもたんぱく質は落としすぎない

必要なら次に、
「増量向け」
「減量向け」
「コンビニだけで組む」
のどれかで具体化できます。`;
  }

  if (q.includes("ストレッチ")) {
    return `おすすめストレッチです。

・胸：ドア枠ストレッチ 30秒×2
・背中：ラットストレッチ 30秒×2
・股関節：ランジストレッチ 30秒×2
・ふくらはぎ：壁押しストレッチ 30秒×2

痛みが出るほどは伸ばさず、呼吸を止めないこと。`;
  }

  if (q.includes("休み") || q.includes("疲労") || q.includes("回復")) {
    return `回復の基本です😴

・睡眠：7〜9時間
・水分：こまめに取る
・高強度の日は連続しすぎない
・筋肉痛が強い部位は無理に追い込みすぎない

強くなるのは「トレーニング中」だけじゃなく「回復中」でもあります。`;
  }

  return `${profile?.name || "あなた"}さん、確認しました🔥

「${text}」について深掘りできます。
次に聞くならこのへんがおすすめです。

・今日のトレーニングメニュー
・食事
・フォーム
・回復
・ストレッチ`;
}

export default function App() {
  const [phase, setPhase] = useState("loading");
  const [tab, setTab] = useState(0);

  const [stepIdx, setStepIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [inputVal, setInputVal] = useState("");
  const [profile, setProfile] = useState(null);

  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");

  const [workouts, setWorkouts] = useState([]);
  const [exercise, setExercise] = useState("");
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");

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

  const [logView, setLogView] = useState("calendar");
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [selectedDate, setSelectedDate] = useState(null);

  const [reminders, setReminders] = useState([]);
  const [lastTrained, setLastTrained] = useState(null);
  const [notification, setNotification] = useState(null);

  const [exercises, setExercises] = useState(DEFAULT_EXERCISES);
  const [masterCategory, setMasterCategory] = useState(Object.keys(DEFAULT_EXERCISES)[0]);
  const [newExerciseName, setNewExerciseName] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [showAddCategory, setShowAddCategory] = useState(false);

  const [showRemForm, setShowRemForm] = useState(false);
  const [remForm, setRemForm] = useState({ message: "", days: 2 });

  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: "", goal: "", level: "", concern: "" });

  const chatEndRef = useRef(null);

  useEffect(() => {
    const p = store.get("ignite_profile");
    const h = store.get("ignite_history", []);
    const lg = store.get("ignite_logs", []);
    const rm = store.get("ignite_reminders", []);
    const lt = store.get("ignite_last_trained");
    const ex = store.get("ignite_exercises", DEFAULT_EXERCISES);

    setLogs(lg);
    setReminders(rm);
    setLastTrained(lt);
    setExercises(ex);

    if (p) {
      setProfile(p);
      setMessages(
        h.length > 0
          ? h
          : [{ role: "assistant", content: `おかえりなさい、${p.name}さん！🔥\n今日も積み上げていこう。` }]
      );
      setPhase("chat");
    } else {
      setPhase("onboard");
    }
  }, []);

  useEffect(() => {
    fetchWorkouts();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!notification) return;
    const t = setTimeout(() => setNotification(null), 3000);
    return () => clearTimeout(t);
  }, [notification]);

  async function fetchWorkouts() {
    const { data, error } = await supabase.from("workouts").select("*").order("id", { ascending: false });

    if (error) {
      alert("取得エラー: " + error.message);
      console.log(error);
      return;
    }

    setWorkouts(data || []);
  }

  async function addWorkout() {
    if (!exercise.trim() || !weight.trim() || !reps.trim()) {
      alert("全部入力して");
      return;
    }

    const { error } = await supabase.from("workouts").insert([
      {
        exercise: exercise.trim(),
        weight: weight.trim(),
        reps: reps.trim(),
      },
    ]);

    if (error) {
      alert("保存エラー: " + error.message);
      console.log(error);
      return;
    }

    setExercise("");
    setWeight("");
    setReps("");
    setNotification("記録を保存しました ✓");
    fetchWorkouts();
  }

  async function deleteWorkout(id) {
    const { error } = await supabase.from("workouts").delete().eq("id", id);

    if (error) {
      alert("削除エラー: " + error.message);
      console.log(error);
      return;
    }

    setNotification("削除しました ✓");
    fetchWorkouts();
  }

  async function handleStepSubmit() {
    const val = inputVal.trim() || "未設定";
    const newAnswers = { ...answers, [STEPS[stepIdx].key]: val };
    setAnswers(newAnswers);
    setInputVal("");

    if (stepIdx < STEPS.length - 1) {
      setStepIdx(stepIdx + 1);
      return;
    }

    store.set("ignite_profile", newAnswers);
    setProfile(newAnswers);

    const greet = [
      {
        role: "assistant",
        content: `はじめまして、${newAnswers.name}さん！私はIGNITE、あなた専属のAIトレーナーです 🔥\n\n目標は「${newAnswers.goal}」ですね。一緒に達成しましょう。`,
      },
    ];

    setMessages(greet);
    store.set("ignite_history", greet);
    setPhase("chat");
  }

  async function sendChat(text) {
    const msg = (text || chatInput).trim();
    if (!msg) return;

    setChatInput("");
    const newMsgs = [...messages, { role: "user", content: msg }];
    const reply = buildSimpleReply(profile, msg);
    const final = [...newMsgs, { role: "assistant", content: reply }];

    setMessages(final);
    store.set("ignite_history", final.slice(-40));
  }

  async function addLog() {
    if (!logForm.exercise.trim()) return;
    const newLogs = [{ id: Date.now(), ...logForm }, ...logs];
    setLogs(newLogs);
    store.set("ignite_logs", newLogs);

    const today = new Date().toISOString().slice(0, 10);
    setLastTrained(today);
    store.set("ignite_last_trained", today);

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
    setNotification("詳細ログを保存しました ✓");
  }

  async function deleteLog(id) {
    const n = logs.filter((l) => l.id !== id);
    setLogs(n);
    store.set("ignite_logs", n);
    setNotification("詳細ログを削除しました ✓");
  }

  async function addExercise() {
    if (!newExerciseName.trim()) return;
    const updated = {
      ...exercises,
      [masterCategory]: [...(exercises[masterCategory] || []), newExerciseName.trim()],
    };
    setExercises(updated);
    store.set("ignite_exercises", updated);
    setNewExerciseName("");
    setNotification("種目を追加しました ✓");
  }

  async function deleteExercise(cat, name) {
    const updated = {
      ...exercises,
      [cat]: exercises[cat].filter((e) => e !== name),
    };
    setExercises(updated);
    store.set("ignite_exercises", updated);
    setNotification("種目を削除しました ✓");
  }

  async function addCategory() {
    const name = newCategoryName.trim();
    if (!name || exercises[name]) return;
    const updated = { ...exercises, [name]: [] };
    setExercises(updated);
    store.set("ignite_exercises", updated);
    setMasterCategory(name);
    setNewCategoryName("");
    setShowAddCategory(false);
    setNotification("カテゴリを追加しました ✓");
  }

  async function addReminder() {
    if (!remForm.message.trim()) return;
    const n = [...reminders, { id: Date.now(), ...remForm }];
    setReminders(n);
    store.set("ignite_reminders", n);
    setRemForm({ message: "", days: 2 });
    setShowRemForm(false);
    setNotification("リマインダーを設定しました ✓");
  }

  async function deleteReminder(id) {
    const n = reminders.filter((r) => r.id !== id);
    setReminders(n);
    store.set("ignite_reminders", n);
    setNotification("リマインダーを削除しました ✓");
  }

  async function resetAll() {
    store.del("ignite_profile");
    store.del("ignite_history");
    store.del("ignite_logs");
    store.del("ignite_reminders");
    store.del("ignite_last_trained");
    store.del("ignite_exercises");
    location.reload();
  }

  async function saveProfileEdit() {
    const updated = {
      name: profileForm.name.trim() || profile.name,
      goal: profileForm.goal.trim() || profile.goal,
      level: profileForm.level.trim() || profile.level,
      concern: profileForm.concern.trim() || profile.concern,
    };
    store.set("ignite_profile", updated);
    setProfile(updated);
    setShowProfileEdit(false);
    setNotification("プロフィールを更新しました ✓");
  }

  const daysSince = lastTrained ? Math.floor((Date.now() - new Date(lastTrained).getTime()) / 86400000) : null;

  const QUICK = profile
    ? ["今日のトレーニングメニューを作って", `${profile.goal}に効く食事を教えて`, "前回の続きから始めよう", "ストレッチ方法を教えて"]
    : [];

  const categories = Object.keys(exercises);

  const S = {
    btn: {
      background: "#fff",
      color: "#000",
      border: "none",
      borderRadius: 10,
      padding: "10px 18px",
      fontSize: 12,
      letterSpacing: 1,
      cursor: "pointer",
      fontWeight: 700,
    },
    label: {
      fontSize: 10,
      color: "#777",
      letterSpacing: 1,
      marginBottom: 5,
      display: "block",
      textTransform: "uppercase",
    },
  };

  const calendarUI = () => {
    const loggedDates = new Set(logs.map((l) => l.date));
    const firstDay = new Date(calYear, calMonth, 1).getDay();
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const today = new Date().toISOString().slice(0, 10);
    const cells = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
    const selectedLogs = selectedDate ? logs.filter((l) => l.date === selectedDate) : [];

    function openAddForDate(ds) {
      setLogForm((f) => ({
        ...f,
        date: ds,
        category: "",
        exercise: "",
        sets: "",
        reps: "",
        weight: "",
        memo: "",
      }));
      setShowLogForm(true);
      setTimeout(() => document.getElementById("log-form-anchor")?.scrollIntoView({ behavior: "smooth" }), 100);
    }

    return (
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <button
            onClick={() => {
              if (calMonth === 0) {
                setCalMonth(11);
                setCalYear(calYear - 1);
              } else {
                setCalMonth(calMonth - 1);
              }
            }}
            style={miniNavBtn}
          >
            ‹
          </button>

          <div style={{ fontSize: 12, color: "#888", letterSpacing: 1 }}>
            {new Date(calYear, calMonth).toLocaleDateString("ja-JP", { year: "numeric", month: "long" })}
          </div>

          <button
            onClick={() => {
              if (calMonth === 11) {
                setCalMonth(0);
                setCalYear(calYear + 1);
              } else {
                setCalMonth(calMonth + 1);
              }
            }}
            style={miniNavBtn}
          >
            ›
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2, marginBottom: 3 }}>
          {["日", "月", "火", "水", "木", "金", "土"].map((d) => (
            <div key={d} style={{ textAlign: "center", fontSize: 9, color: "#555", padding: "3px 0" }}>
              {d}
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2 }}>
          {cells.map((d, i) => {
            if (!d) return <div key={i} />;
            const ds = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
            const hasLog = loggedDates.has(ds);
            const isToday = ds === today;
            const isSel = ds === selectedDate;

            return (
              <div
                key={i}
                onClick={() => setSelectedDate(isSel ? null : ds)}
                style={{
                  aspectRatio: "1",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 6,
                  cursor: "pointer",
                  border: `1px solid ${isSel ? "#fff" : isToday ? "#444" : "transparent"}`,
                  background: isSel ? "#fff" : hasLog ? "#1e1e1e" : "transparent",
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    color: isSel ? "#000" : isToday ? "#fff" : hasLog ? "#ddd" : "#444",
                    fontWeight: isToday || hasLog ? 600 : 400,
                  }}
                >
                  {d}
                </span>
                {hasLog && !isSel && <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#fff", marginTop: 2 }} />}
              </div>
            );
          })}
        </div>

        {selectedDate && (
          <div style={{ marginTop: 12 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <div style={{ fontSize: 11, color: "#777", letterSpacing: 1 }}>
                {new Date(selectedDate).toLocaleDateString("ja-JP", { month: "long", day: "numeric", weekday: "short" })}
                <span style={{ marginLeft: 8, fontSize: 10, color: "#aaa" }}>{selectedLogs.length}件</span>
              </div>
              <button style={{ ...S.btn, padding: "5px 12px", fontSize: 10 }} onClick={() => openAddForDate(selectedDate)}>
                + この日に追加
              </button>
            </div>

            {selectedLogs.length === 0 ? (
              <div style={{ fontSize: 12, color: "#555", padding: "12px 0", textAlign: "center" }}>
                記録なし — 上のボタンから追加できます
              </div>
            ) : (
              selectedLogs.map((log) => <LogCard key={log.id} log={log} onDelete={() => deleteLog(log.id)} />)
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={rootWrap}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background:#000; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-thumb { background: #222; border-radius: 4px; }
      `}</style>

      {notification && <div style={notificationStyle}>{notification}</div>}

      {phase === "loading" && <div style={{ color: "#555", fontSize: 13, letterSpacing: 2 }}>LOADING...</div>}

      {phase === "onboard" && (
        <div style={cardWrap}>
          <div style={onboardHeader}>
            <div style={igniteTitle}>IGNITE</div>
            <div style={onboardSub}>AI Personal Trainer</div>
          </div>

          <div style={{ display: "flex", gap: 4, padding: "20px 28px 0" }}>
            {STEPS.map((_, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: 2,
                  borderRadius: 1,
                  background: i <= stepIdx ? "#fff" : "#1c1c1c",
                }}
              />
            ))}
          </div>

          <div style={{ padding: "20px 28px 28px" }}>
            <div style={{ fontSize: 11, color: "#555", marginBottom: 10, letterSpacing: 2 }}>
              {stepIdx + 1} / {STEPS.length}
            </div>
            <div style={{ fontSize: 16, fontWeight: 500, color: "#e0e0e0", marginBottom: 18, lineHeight: 1.6 }}>
              {STEPS[stepIdx].q}
            </div>
            <input
              style={bigInput}
              placeholder={STEPS[stepIdx].placeholder}
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleStepSubmit()}
              autoFocus
            />
            <div style={{ height: 12 }} />
            <button style={{ ...S.btn, width: "100%", padding: "14px", fontSize: 13 }} onClick={handleStepSubmit}>
              {stepIdx < STEPS.length - 1 ? "NEXT →" : "START IGNITE 🔥"}
            </button>
          </div>
        </div>
      )}

      {phase === "chat" && profile && (
        <div style={cardWrap}>
          <div style={topHeader}>
            <div style={igniteSmall}>IGNITE</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: "#666", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#4a4", display: "inline-block" }} />
                {profile.name}さん専属
                <span style={memoryTag}>💾 記憶あり</span>
                {daysSince !== null && daysSince > 0 && (
                  <span style={daysTag}>🔥 {daysSince}日ぶり</span>
                )}
              </div>
            </div>
            <button
              onClick={() => {
                setProfileForm({
                  name: profile.name,
                  goal: profile.goal,
                  level: profile.level,
                  concern: profile.concern,
                });
                setShowProfileEdit(!showProfileEdit);
              }}
              style={settingsBtn}
            >
              ⚙ 設定
            </button>
          </div>

          {showProfileEdit && (
            <div style={editPanel}>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
                {[
                  ["name", "名前", "例：田中 太郎"],
                  ["goal", "目標", "例：体脂肪を落とす"],
                  ["level", "経験", "例：週3回以上"],
                  ["concern", "悩み", "例：腰痛持ち"],
                ].map(([k, l, p]) => (
                  <div key={k} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 10, color: "#555", letterSpacing: 1, width: 56, flexShrink: 0 }}>{l}</span>
                    <input
                      style={smallInput}
                      placeholder={p}
                      value={profileForm[k]}
                      onChange={(e) => setProfileForm({ ...profileForm, [k]: e.target.value })}
                    />
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button style={{ ...S.btn, flex: 1, padding: "10px" }} onClick={saveProfileEdit}>
                  保存
                </button>
                <button style={ghostBtn} onClick={() => setShowProfileEdit(false)}>
                  キャンセル
                </button>
                <button style={ghostBtn} onClick={resetAll}>
                  リセット
                </button>
              </div>
            </div>
          )}

          <div style={tabsRow}>
            {TABS.map((t, i) => (
              <button
                key={i}
                onClick={() => setTab(i)}
                style={{
                  ...tabBtn,
                  ...(tab === i ? tabBtnActive : {}),
                }}
              >
                {TAB_ICONS[i]} {t}
              </button>
            ))}
          </div>

          {tab === 0 && (
            <>
              <div style={profileBar}>
                <span>🎯 {profile.goal}</span>
                <span>📊 {profile.level}</span>
                {profile.concern !== "未設定" && <span>⚠️ {profile.concern}</span>}
              </div>

              <div style={chatArea}>
                {messages.map((m, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                    <div style={m.role === "user" ? userBubble : aiBubble}>{m.content}</div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              <div style={quickRow}>
                {QUICK.map((q, i) => (
                  <button key={i} style={quickChip} onClick={() => sendChat(q)}>
                    {q}
                  </button>
                ))}
              </div>

              <div style={chatInputRow}>
                <input
                  style={chatInputStyle}
                  placeholder={`${profile.name}さん、何でも聞いて`}
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendChat()}
                />
                <button style={chatSendBtn} onClick={() => sendChat()}>
                  ↑
                </button>
              </div>
            </>
          )}

          {tab === 1 && (
            <div style={{ padding: 18, overflowY: "auto", height: 520 }}>
              <div style={sectionHead}>
                <div>
                  <div style={sectionTitle}>トレーニング記録</div>
                  <div style={sectionSub}>{workouts.length}件</div>
                </div>
              </div>

              <div style={mainWorkoutGrid}>
                <input style={smallInput} placeholder="種目" value={exercise} onChange={(e) => setExercise(e.target.value)} />
                <input style={smallInput} placeholder="重量" value={weight} onChange={(e) => setWeight(e.target.value)} />
                <input style={smallInput} placeholder="回数" value={reps} onChange={(e) => setReps(e.target.value)} />
                <button style={{ ...S.btn, padding: "10px 14px" }} onClick={addWorkout}>
                  追加
                </button>
              </div>

              <div style={{ marginTop: 14 }}>
                {workouts.length === 0 ? (
                  <div style={emptyText}>まだ記録がありません</div>
                ) : (
                  workouts.map((w) => (
                    <div key={w.id} style={recordCard}>
                      <div style={recordText}>
                        {w.exercise} ／ {w.weight}kg ／ {w.reps}回
                      </div>
                      <button style={deleteBtn} onClick={() => deleteWorkout(w.id)}>
                        削除
                      </button>
                    </div>
                  ))
                )}
              </div>

              <hr style={divider} />

              <div style={sectionHead}>
                <div>
                  <div style={sectionTitle}>詳細ログ</div>
                  <div style={sectionSub}>{logs.length}件</div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <div style={toggleBox}>
                    {["calendar", "list"].map((v) => (
                      <button
                        key={v}
                        onClick={() => setLogView(v)}
                        style={{
                          ...toggleBtn,
                          ...(logView === v ? toggleBtnActive : {}),
                        }}
                      >
                        {v === "calendar" ? "📅" : "📋"}
                      </button>
                    ))}
                  </div>
                  <button style={S.btn} onClick={() => setShowLogForm(!showLogForm)}>
                    {showLogForm ? "✕" : "+ 追加"}
                  </button>
                </div>
              </div>

              {showLogForm && (
                <div id="log-form-anchor" style={panel}>
                  <div>
                    <span style={S.label}>日付</span>
                    <input
                      style={smallInput}
                      type="date"
                      value={logForm.date}
                      onChange={(e) => setLogForm({ ...logForm, date: e.target.value })}
                    />
                  </div>

                  <div>
                    <span style={S.label}>部位カテゴリ</span>
                    <div style={chipWrap}>
                      {categories.map((cat) => (
                        <button
                          key={cat}
                          style={{
                            ...catChip,
                            ...(logForm.category === cat ? catChipActive : {}),
                          }}
                          onClick={() => {
                            setLogForm({ ...logForm, category: cat, exercise: "" });
                            setMasterCategory(cat);
                          }}
                        >
                          {cat}
                        </button>
                      ))}
                      <button style={{ ...catChip, borderStyle: "dashed" }} onClick={() => setShowAddCategory(!showAddCategory)}>
                        + カテゴリ
                      </button>
                    </div>

                    {showAddCategory && (
                      <div style={inlineRow}>
                        <input
                          style={smallInput}
                          placeholder="新しいカテゴリ名"
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && addCategory()}
                        />
                        <button style={{ ...S.btn, padding: "8px 12px", fontSize: 10 }} onClick={addCategory}>
                          追加
                        </button>
                      </div>
                    )}
                  </div>

                  {logForm.category && (
                    <div>
                      <span style={S.label}>種目</span>
                      <div style={exerciseListWrap}>
                        {(exercises[logForm.category] || []).map((name) => (
                          <div
                            key={name}
                            style={{
                              ...exerciseChip,
                              ...(logForm.exercise === name ? exerciseChipActive : {}),
                            }}
                            onClick={() => setLogForm({ ...logForm, exercise: name })}
                          >
                            <span>{name}</span>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              {logForm.exercise === name && <span style={{ fontSize: 10 }}>✓</span>}
                              <button
                                style={chipX}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteExercise(logForm.category, name);
                                  if (logForm.exercise === name) {
                                    setLogForm({ ...logForm, exercise: "" });
                                  }
                                }}
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div style={inlineRow}>
                        <input
                          style={smallInput}
                          placeholder={`+ ${logForm.category}の種目を追加`}
                          value={newExerciseName}
                          onChange={(e) => setNewExerciseName(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && addExercise()}
                        />
                        <button style={{ ...S.btn, padding: "8px 12px", fontSize: 10 }} onClick={addExercise}>
                          追加
                        </button>
                      </div>
                    </div>
                  )}

                  <div style={tripleGrid}>
                    {[
                      ["weight", "重量(kg)", "60"],
                      ["reps", "回数", "10"],
                      ["sets", "セット数", "3"],
                    ].map(([k, l, p]) => (
                      <div key={k}>
                        <span style={S.label}>{l}</span>
                        <input
                          style={smallInput}
                          placeholder={p}
                          value={logForm[k]}
                          onChange={(e) => setLogForm({ ...logForm, [k]: e.target.value })}
                        />
                      </div>
                    ))}
                  </div>

                  <div>
                    <span style={S.label}>メモ</span>
                    <input
                      style={smallInput}
                      placeholder="例：調子よかった"
                      value={logForm.memo}
                      onChange={(e) => setLogForm({ ...logForm, memo: e.target.value })}
                    />
                  </div>

                  <button style={{ ...S.btn, width: "100%" }} onClick={addLog} disabled={!logForm.exercise.trim()}>
                    保存する
                  </button>
                </div>
              )}

              {logView === "calendar" ? (
                calendarUI()
              ) : logs.length === 0 ? (
                <div style={emptyText}>まだ記録がありません</div>
              ) : (
                logs.map((log) => <LogCard key={log.id} log={log} onDelete={() => deleteLog(log.id)} />)
              )}
            </div>
          )}

          {tab === 2 && <RMCalculator S={S} />}

          {tab === 3 && (
            <div style={{ padding: 18, overflowY: "auto", height: 520 }}>
              <div style={sectionHead}>
                <div>
                  <div style={sectionTitle}>リマインダー</div>
                  <div style={sectionSub}>{lastTrained ? `最終: ${lastTrained}` : "まだ記録なし"}</div>
                </div>
                <button style={S.btn} onClick={() => setShowRemForm(!showRemForm)}>
                  {showRemForm ? "✕ 閉じる" : "+ 追加"}
                </button>
              </div>

              {daysSince !== null && (
                <div
                  style={{
                    background: daysSince >= 3 ? "#1a0800" : "#0a1a0a",
                    border: `1px solid ${daysSince >= 3 ? "#3a1500" : "#1a3a1a"}`,
                    borderRadius: 10,
                    padding: 14,
                    marginBottom: 14,
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <div style={{ fontSize: 22 }}>{daysSince >= 3 ? "🔥" : "💪"}</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: daysSince >= 3 ? "#ff6600" : "#6dcc78" }}>
                      {daysSince === 0 ? "今日トレーニングしました！" : `${daysSince}日間休んでいます`}
                    </div>
                    <div style={{ fontSize: 11, color: "#666", marginTop: 2 }}>
                      {daysSince >= 3 ? "そろそろ動こう！" : "いい調子！続けよう"}
                    </div>
                  </div>
                </div>
              )}

              {showRemForm && (
                <div style={panel}>
                  <div>
                    <span style={S.label}>メッセージ</span>
                    <input
                      style={smallInput}
                      placeholder="例：そろそろ動こう！"
                      value={remForm.message}
                      onChange={(e) => setRemForm({ ...remForm, message: e.target.value })}
                    />
                  </div>

                  <div>
                    <span style={S.label}>何日サボったら通知？</span>
                    <div style={chipWrap}>
                      {[1, 2, 3, 5, 7].map((d) => (
                        <button
                          key={d}
                          onClick={() => setRemForm({ ...remForm, days: d })}
                          style={{
                            ...dayChip,
                            ...(remForm.days === d ? dayChipActive : {}),
                          }}
                        >
                          {d}日
                        </button>
                      ))}
                    </div>
                  </div>

                  <button style={{ ...S.btn, width: "100%" }} onClick={addReminder} disabled={!remForm.message.trim()}>
                    設定する
                  </button>
                </div>
              )}

              {reminders.length === 0 ? (
                <div style={emptyText}>リマインダーが設定されていません</div>
              ) : (
                reminders.map((rem) => (
                  <div key={rem.id} style={logCardWrap}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, color: "#e0e0e0", marginBottom: 3 }}>🔔 {rem.message}</div>
                      <div style={{ fontSize: 11, color: "#666" }}>{rem.days}日間休んだら通知</div>
                    </div>
                    <button style={deleteGhostBtn} onClick={() => deleteReminder(rem.id)}>
                      ✕
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function RMCalculator({ S }) {
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");
  const [targetWeight, setTargetWeight] = useState("");
  const [mode, setMode] = useState("estimate");

  const oneRM = weight && reps ? Math.round(parseFloat(weight) * (1 + parseFloat(reps) / 30)) : null;
  const RM_PCT = [100, 95, 93, 90, 87, 85, 83, 80, 77, 75];
  const rmTable = oneRM ? RM_PCT.map((pct, i) => ({ rm: i + 1, pct, kg: Math.round((oneRM * pct) / 100 * 2) / 2 })) : [];
  const reverseReps =
    oneRM && targetWeight ? Math.max(1, Math.round(30 * (oneRM / parseFloat(targetWeight) - 1))) : null;

  const GOALS = [
    { label: "筋力向上", rep: "1〜5", set: "3〜5", rest: "3〜5分", pct: "85〜100%" },
    { label: "筋肥大", rep: "6〜12", set: "3〜4", rest: "60〜90秒", pct: "67〜85%" },
    { label: "筋持久力", rep: "15〜20", set: "2〜3", rest: "30〜60秒", pct: "50〜67%" },
  ];

  return (
    <div style={{ padding: 18, overflowY: "auto", height: 520 }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: "#e0e0e0", marginBottom: 4 }}>RM計算機</div>
      <div style={{ fontSize: 11, color: "#666", marginBottom: 16 }}>Epley式で1RMを推定します</div>

      <div style={toggleBoxWide}>
        {[
          ["estimate", "1RM推定"],
          ["reverse", "逆算"],
        ].map(([v, l]) => (
          <button
            key={v}
            onClick={() => setMode(v)}
            style={{
              ...toggleBtnWide,
              ...(mode === v ? toggleBtnWideActive : {}),
            }}
          >
            {l}
          </button>
        ))}
      </div>

      {mode === "estimate" && (
        <>
          <div style={doubleGrid}>
            <div>
              <span style={S.label}>重量 (kg)</span>
              <input style={smallInput} placeholder="例: 80" value={weight} onChange={(e) => setWeight(e.target.value)} />
            </div>
            <div>
              <span style={S.label}>回数 (rep)</span>
              <input style={smallInput} placeholder="例: 8" value={reps} onChange={(e) => setReps(e.target.value)} />
            </div>
          </div>

          {oneRM && (
            <>
              <div style={rmMainBox}>推定 1RM：{oneRM}kg</div>

              <div style={rmGrid}>
                {rmTable.map(({ rm, pct, kg }) => (
                  <div key={rm} style={rmCell}>
                    <div style={rmTiny}>{rm}RM</div>
                    <div style={rmBig}>{kg}kg</div>
                    <div style={rmTiny}>{pct}%</div>
                  </div>
                ))}
              </div>

              <div style={goalWrap}>
                {GOALS.map((g) => (
                  <div key={g.label} style={goalCard}>
                    <div style={goalTitle}>{g.label}</div>
                    <div style={goalMeta}>🔁 {g.rep}回</div>
                    <div style={goalMeta}>× {g.set}セット</div>
                    <div style={goalMeta}>⏱ {g.rest}</div>
                    <div style={goalSub}>目安: {g.pct}</div>
                  </div>
                ))}
              </div>
            </>
          )}

          {!oneRM && <div style={emptyText}>重量と回数を入力してください</div>}
        </>
      )}

      {mode === "reverse" && (
        <>
          <div style={doubleGrid}>
            <div>
              <span style={S.label}>現在の重量 (kg)</span>
              <input style={smallInput} placeholder="例: 80" value={weight} onChange={(e) => setWeight(e.target.value)} />
            </div>
            <div>
              <span style={S.label}>その時の回数</span>
              <input style={smallInput} placeholder="例: 8" value={reps} onChange={(e) => setReps(e.target.value)} />
            </div>
          </div>

          {oneRM && <div style={rmHint}>推定1RM: {oneRM}kg</div>}

          <div style={{ marginBottom: 16 }}>
            <span style={S.label}>目標重量 (kg)</span>
            <input
              style={smallInput}
              placeholder="例: 90"
              value={targetWeight}
              onChange={(e) => setTargetWeight(e.target.value)}
            />
          </div>

          {reverseReps && (
            <div style={rmMainBox}>
              {targetWeight}kg で挙げるには 約 {reverseReps}回
            </div>
          )}

          {!oneRM && <div style={emptyText}>現在の重量と回数を入力してください</div>}
        </>
      )}
    </div>
  );
}

function LogCard({ log, onDelete }) {
  return (
    <div style={logCardWrap}>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
          {log.category && <span style={logBadge}>{log.category}</span>}
          <span style={{ fontSize: 13, fontWeight: 600, color: "#e0e0e0" }}>{log.exercise}</span>
        </div>
        <div style={{ display: "flex", gap: 10, fontSize: 11, color: "#666", flexWrap: "wrap" }}>
          <span>📅 {log.date}</span>
          {log.weight && <span>⚖️ {log.weight}kg</span>}
          {log.reps && <span>× {log.reps}回</span>}
          {log.sets && <span>🔁 {log.sets}セット</span>}
        </div>
        {log.memo && <div style={{ fontSize: 11, color: "#888", marginTop: 5 }}>📝 {log.memo}</div>}
      </div>
      <button style={deleteGhostBtn} onClick={onDelete}>
        ✕
      </button>
    </div>
  );
}

const rootWrap = {
  fontFamily: "'Noto Sans JP', sans-serif",
  background: "#000",
  minHeight: "100vh",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: 16,
};

const cardWrap = {
  background: "#0a0a0a",
  border: "1px solid #1c1c1c",
  borderRadius: 20,
  width: "100%",
  maxWidth: 520,
  overflow: "hidden",
  boxShadow: "0 0 60px rgba(0,0,0,.8)",
  color: "#fff",
};

const onboardHeader = {
  background: "#000",
  borderBottom: "1px solid #1a1a1a",
  padding: "36px 28px 28px",
  textAlign: "center",
};

const igniteTitle = {
  fontSize: 42,
  fontWeight: 800,
  letterSpacing: 6,
};

const igniteSmall = {
  fontSize: 24,
  fontWeight: 800,
  letterSpacing: 3,
};

const onboardSub = {
  fontSize: 11,
  color: "#444",
  letterSpacing: 3,
  textTransform: "uppercase",
};

const topHeader = {
  background: "#000",
  borderBottom: "1px solid #1a1a1a",
  padding: "14px 20px",
  display: "flex",
  alignItems: "center",
  gap: 14,
};

const memoryTag = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  fontSize: 9,
  background: "#1a1a1a",
  color: "#555",
  borderRadius: 4,
  padding: "2px 6px",
  letterSpacing: 1,
};

const daysTag = {
  background: "#1a0a00",
  color: "#ff4400",
  borderRadius: 4,
  padding: "2px 6px",
  fontSize: 9,
  letterSpacing: 1,
};

const settingsBtn = {
  background: "none",
  border: "1px solid #222",
  borderRadius: 8,
  color: "#555",
  fontSize: 11,
  cursor: "pointer",
  padding: "5px 10px",
};

const editPanel = {
  background: "#0c0c0c",
  borderBottom: "1px solid #1a1a1a",
  padding: "14px 16px",
};

const tabsRow = {
  display: "flex",
  borderBottom: "1px solid #1a1a1a",
  background: "#000",
};

const tabBtn = {
  flex: 1,
  background: "none",
  border: "none",
  padding: "12px 6px",
  fontSize: 11,
  letterSpacing: 1,
  cursor: "pointer",
  borderBottom: "2px solid transparent",
  color: "#333",
};

const tabBtnActive = {
  color: "#fff",
  borderBottomColor: "#fff",
};

const profileBar = {
  background: "#0a0a0a",
  borderBottom: "1px solid #161616",
  padding: "7px 20px",
  display: "flex",
  gap: 14,
  fontSize: 11,
  color: "#444",
  overflowX: "auto",
};

const chatArea = {
  display: "flex",
  flexDirection: "column",
  gap: 12,
  padding: 20,
  overflowY: "auto",
  height: 360,
};

const aiBubble = {
  background: "#111",
  border: "1px solid #1c1c1c",
  color: "#e0e0e0",
  borderRadius: "16px 16px 16px 4px",
  padding: "13px 16px",
  fontSize: 14,
  lineHeight: 1.75,
  whiteSpace: "pre-wrap",
  maxWidth: "85%",
};

const userBubble = {
  background: "#fff",
  color: "#000",
  borderRadius: "16px 16px 4px 16px",
  padding: "13px 16px",
  fontSize: 14,
  lineHeight: 1.7,
  maxWidth: "85%",
  fontWeight: 500,
  whiteSpace: "pre-wrap",
};

const quickRow = {
  display: "flex",
  gap: 6,
  overflowX: "auto",
  padding: "0 16px 10px",
};

const quickChip = {
  background: "transparent",
  border: "1px solid #222",
  borderRadius: 20,
  padding: "6px 14px",
  fontSize: 12,
  color: "#444",
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const chatInputRow = {
  display: "flex",
  gap: 8,
  padding: "12px 16px 16px",
  borderTop: "1px solid #1a1a1a",
};

const chatInputStyle = {
  flex: 1,
  background: "#111",
  border: "1px solid #222",
  borderRadius: 12,
  padding: "11px 16px",
  fontSize: 14,
  color: "#fff",
  outline: "none",
};

const chatSendBtn = {
  background: "#fff",
  border: "none",
  borderRadius: 12,
  width: 44,
  height: 44,
  cursor: "pointer",
  fontSize: 16,
  color: "#000",
  fontWeight: 700,
};

const bigInput = {
  width: "100%",
  background: "#111",
  border: "1px solid #222",
  borderRadius: 12,
  padding: "14px 18px",
  fontSize: 15,
  color: "#fff",
  outline: "none",
};

const smallInput = {
  width: "100%",
  background: "#111",
  border: "1px solid #1e1e1e",
  borderRadius: 8,
  padding: "9px 12px",
  fontSize: 13,
  color: "#fff",
  outline: "none",
};

const sectionHead = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 14,
};

const sectionTitle = {
  fontSize: 14,
  fontWeight: 600,
  color: "#e0e0e0",
};

const sectionSub = {
  fontSize: 11,
  color: "#444",
  marginTop: 2,
};

const mainWorkoutGrid = {
  display: "grid",
  gridTemplateColumns: "2fr 1fr 1fr auto",
  gap: 8,
};

const recordCard = {
  background: "#0f0f0f",
  border: "1px solid #1a1a1a",
  borderRadius: 10,
  padding: 13,
  marginBottom: 8,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
};

const recordText = {
  fontSize: 13,
  color: "#e0e0e0",
};

const deleteBtn = {
  background: "#fff",
  color: "#000",
  border: "none",
  borderRadius: 8,
  padding: "8px 12px",
  fontSize: 11,
  fontWeight: 700,
  cursor: "pointer",
};

const divider = {
  border: "none",
  borderTop: "1px solid #1a1a1a",
  margin: "18px 0",
};

const toggleBox = {
  display: "flex",
  background: "#111",
  border: "1px solid #1c1c1c",
  borderRadius: 8,
  overflow: "hidden",
};

const toggleBtn = {
  background: "transparent",
  color: "#444",
  border: "none",
  padding: "6px 10px",
  fontSize: 11,
  cursor: "pointer",
};

const toggleBtnActive = {
  background: "#fff",
  color: "#000",
};

const panel = {
  background: "#0c0c0c",
  border: "1px solid #1c1c1c",
  borderRadius: 12,
  padding: 16,
  marginBottom: 14,
};

const chipWrap = {
  display: "flex",
  gap: 6,
  flexWrap: "wrap",
};

const catChip = {
  borderRadius: 20,
  padding: "5px 12px",
  fontSize: 11,
  cursor: "pointer",
  whiteSpace: "nowrap",
  border: "1px solid #1c1c1c",
  background: "transparent",
  color: "#444",
};

const catChipActive = {
  background: "#fff",
  color: "#000",
  borderColor: "#fff",
};

const inlineRow = {
  display: "flex",
  gap: 8,
  marginTop: 8,
};

const exerciseListWrap = {
  display: "flex",
  flexDirection: "column",
  gap: 5,
  maxHeight: 130,
  overflowY: "auto",
};

const exerciseChip = {
  background: "#111",
  border: "1px solid #1c1c1c",
  borderRadius: 8,
  padding: "8px 12px",
  fontSize: 12,
  color: "#ccc",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
};

const exerciseChipActive = {
  background: "#fff",
  color: "#000",
  borderColor: "#fff",
};

const chipX = {
  background: "none",
  border: "none",
  color: "inherit",
  cursor: "pointer",
  fontSize: 11,
  padding: 2,
};

const tripleGrid = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr 1fr",
  gap: 8,
  marginBottom: 10,
};

const doubleGrid = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 10,
  marginBottom: 16,
};

const dayChip = {
  background: "#111",
  color: "#444",
  border: "1px solid #222",
  borderRadius: 8,
  padding: "7px 12px",
  fontSize: 12,
  cursor: "pointer",
};

const dayChipActive = {
  background: "#fff",
  color: "#000",
  borderColor: "#fff",
};

const logCardWrap = {
  background: "#0f0f0f",
  border: "1px solid #1a1a1a",
  borderRadius: 10,
  padding: 14,
  marginBottom: 8,
  display: "flex",
  alignItems: "center",
  gap: 12,
};

const deleteGhostBtn = {
  background: "none",
  border: "none",
  color: "#2a2a2a",
  cursor: "pointer",
  fontSize: 13,
  padding: 4,
  flexShrink: 0,
};

const emptyText = {
  textAlign: "center",
  padding: "40px 20px",
  color: "#2a2a2a",
  fontSize: 13,
};

const logBadge = {
  fontSize: 9,
  background: "#1a1a1a",
  color: "#666",
  borderRadius: 4,
  padding: "2px 7px",
  letterSpacing: 1,
};

const notificationStyle = {
  position: "fixed",
  top: 20,
  left: "50%",
  transform: "translateX(-50%)",
  background: "#fff",
  color: "#000",
  padding: "10px 20px",
  borderRadius: 10,
  fontSize: 13,
  fontWeight: 600,
  zIndex: 999,
  whiteSpace: "nowrap",
};

const miniNavBtn = {
  background: "none",
  border: "1px solid #1c1c1c",
  borderRadius: 6,
  color: "#555",
  width: 26,
  height: 26,
  cursor: "pointer",
  fontSize: 12,
};

const ghostBtn = {
  background: "none",
  border: "1px solid #222",
  borderRadius: 10,
  padding: "10px 14px",
  fontSize: 11,
  color: "#444",
  cursor: "pointer",
};

const toggleBoxWide = {
  display: "flex",
  background: "#111",
  border: "1px solid #1c1c1c",
  borderRadius: 10,
  overflow: "hidden",
  marginBottom: 16,
};

const toggleBtnWide = {
  flex: 1,
  background: "transparent",
  color: "#444",
  border: "none",
  padding: "10px",
  fontSize: 12,
  cursor: "pointer",
};

const toggleBtnWideActive = {
  background: "#fff",
  color: "#000",
};

const rmMainBox = {
  background: "#0f0f0f",
  border: "1px solid #1c1c1c",
  borderRadius: 12,
  padding: 16,
  marginBottom: 16,
  textAlign: "center",
  color: "#fff",
  fontWeight: 700,
  fontSize: 18,
};

const rmGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(5,1fr)",
  gap: 4,
  marginBottom: 16,
};

const rmCell = {
  background: "#111",
  border: "1px solid #1a1a1a",
  borderRadius: 8,
  padding: "8px 4px",
  textAlign: "center",
};

const rmTiny = {
  fontSize: 9,
  color: "#444",
};

const rmBig = {
  fontSize: 13,
  fontWeight: 600,
  color: "#fff",
  margin: "4px 0",
};

const goalWrap = {
  background: "#0f0f0f",
  border: "1px solid #1c1c1c",
  borderRadius: 12,
  padding: 16,
  display: "grid",
  gap: 10,
};

const goalCard = {
  borderBottom: "1px solid #1a1a1a",
  paddingBottom: 10,
};

const goalTitle = {
  fontSize: 11,
  fontWeight: 600,
  color: "#888",
  marginBottom: 4,
};

const goalMeta = {
  fontSize: 11,
  color: "#555",
};

const goalSub = {
  fontSize: 10,
  color: "#333",
  marginTop: 4,
};

const rmHint = {
  background: "#111",
  border: "1px solid #1c1c1c",
  borderRadius: 10,
  padding: "10px 14px",
  marginBottom: 14,
  color: "#fff",
  fontSize: 14,
  fontWeight: 700,
};