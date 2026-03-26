import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://ffhizdfgwocnnnniojqq.supabase.co",
  "sb_publishable_JlQJPyDc1vbGOmx3N213VA_fAPEzOsv"
);

function App() {
  const [workouts, setWorkouts] = useState([]);
  const [exercise, setExercise] = useState("");
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");

  const fetchWorkouts = async () => {
    const { data, error } = await supabase
      .from("workouts")
      .select("*")
      .order("id", { ascending: false });

    if (error) {
      alert("取得エラー: " + error.message);
      console.log(error);
      return;
    }

    setWorkouts(data || []);
  };

  useEffect(() => {
    fetchWorkouts();
  }, []);

  const addWorkout = async () => {
    if (!exercise || !weight || !reps) {
      alert("全部入力して");
      return;
    }

    const { error } = await supabase.from("workouts").insert([
      {
        exercise,
        weight,
        reps,
      },
    ]);

    if (error) {
      alert("保存エラー: " + error.message);
      console.log(error);
      return;
    }

    alert("保存成功");
    setExercise("");
    setWeight("");
    setReps("");
    fetchWorkouts();
  };

  const deleteWorkout = async (id) => {
    const { error } = await supabase.from("workouts").delete().eq("id", id);

    if (error) {
      alert("削除エラー: " + error.message);
      console.log(error);
      return;
    }

    fetchWorkouts();
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f3f4f6",
        padding: "40px 20px",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          maxWidth: "760px",
          margin: "0 auto",
          background: "#fff",
          borderRadius: "20px",
          padding: "32px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
        }}
      >
        <h1
          style={{
            textAlign: "center",
            fontSize: "48px",
            marginBottom: "30px",
          }}
        >
          筋トレ記録アプリ
        </h1>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr 1fr auto",
            gap: "12px",
            marginBottom: "24px",
          }}
        >
          <input
            placeholder="種目"
            value={exercise}
            onChange={(e) => setExercise(e.target.value)}
            style={{
              padding: "14px",
              borderRadius: "14px",
              border: "1px solid #d1d5db",
              fontSize: "18px",
            }}
          />

          <input
            placeholder="重量"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            style={{
              padding: "14px",
              borderRadius: "14px",
              border: "1px solid #d1d5db",
              fontSize: "18px",
            }}
          />

          <input
            placeholder="回数"
            value={reps}
            onChange={(e) => setReps(e.target.value)}
            style={{
              padding: "14px",
              borderRadius: "14px",
              border: "1px solid #d1d5db",
              fontSize: "18px",
            }}
          />

          <button
            onClick={addWorkout}
            style={{
              padding: "14px 20px",
              border: "none",
              borderRadius: "14px",
              background: "#2563eb",
              color: "#fff",
              fontWeight: "bold",
              fontSize: "18px",
              cursor: "pointer",
            }}
          >
            追加
          </button>
        </div>

        {workouts.length === 0 ? (
          <p
            style={{
              textAlign: "center",
              color: "#6b7280",
              marginTop: "30px",
              fontSize: "18px",
            }}
          >
            まだ記録がありません
          </p>
        ) : (
          <div style={{ display: "grid", gap: "14px" }}>
            {workouts.map((w) => (
              <div
                key={w.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "18px 20px",
                  background: "#f9fafb",
                  border: "1px solid #e5e7eb",
                  borderRadius: "16px",
                }}
              >
                <div style={{ fontSize: "22px", color: "#4b5563" }}>
                  {w.exercise} ／ {w.weight}kg ／ {w.reps}回
                </div>

                <button
                  onClick={() => deleteWorkout(w.id)}
                  style={{
                    padding: "12px 18px",
                    border: "none",
                    borderRadius: "12px",
                    background: "#ef4444",
                    color: "#fff",
                    fontWeight: "bold",
                    fontSize: "16px",
                    cursor: "pointer",
                  }}
                >
                  削除
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;