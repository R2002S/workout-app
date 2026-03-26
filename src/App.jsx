import { useState, useEffect } from "react";

function App() {
  const [workouts, setWorkouts] = useState([]);
  const [exercise, setExercise] = useState("");
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");

  // 最初に保存データを読み込む
  useEffect(() => {
    const savedWorkouts = localStorage.getItem("workouts");
    if (savedWorkouts) {
      setWorkouts(JSON.parse(savedWorkouts));
    }
  }, []);

  // workoutsが変わるたびに保存
  useEffect(() => {
    localStorage.setItem("workouts", JSON.stringify(workouts));
  }, [workouts]);

  const addWorkout = () => {
    if (!exercise.trim() || !weight.trim() || !reps.trim()) {
      alert("種目・重量・回数を全部入力してください");
      return;
    }

    const newWorkout = {
      id: Date.now(),
      exercise: exercise.trim(),
      weight: weight.trim(),
      reps: reps.trim(),
    };

    setWorkouts([newWorkout, ...workouts]);
    setExercise("");
    setWeight("");
    setReps("");
  };

  const deleteWorkout = (id) => {
    const updatedWorkouts = workouts.filter((workout) => workout.id !== id);
    setWorkouts(updatedWorkouts);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#f5f7fb",
        padding: "40px 20px",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          maxWidth: "700px",
          margin: "0 auto",
          backgroundColor: "#ffffff",
          borderRadius: "16px",
          padding: "24px",
          boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
        }}
      >
        <h1
          style={{
            textAlign: "center",
            marginBottom: "24px",
            fontSize: "36px",
          }}
        >
          筋トレ記録アプリ
        </h1>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr 1fr auto",
            gap: "10px",
            marginBottom: "24px",
          }}
        >
          <input
            type="text"
            placeholder="種目"
            value={exercise}
            onChange={(e) => setExercise(e.target.value)}
            style={{
              padding: "12px",
              borderRadius: "10px",
              border: "1px solid #ccc",
              fontSize: "16px",
            }}
          />

          <input
            type="number"
            placeholder="重量"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            style={{
              padding: "12px",
              borderRadius: "10px",
              border: "1px solid #ccc",
              fontSize: "16px",
            }}
          />

          <input
            type="number"
            placeholder="回数"
            value={reps}
            onChange={(e) => setReps(e.target.value)}
            style={{
              padding: "12px",
              borderRadius: "10px",
              border: "1px solid #ccc",
              fontSize: "16px",
            }}
          />

          <button
            onClick={addWorkout}
            style={{
              padding: "12px 18px",
              borderRadius: "10px",
              border: "none",
              backgroundColor: "#2563eb",
              color: "#fff",
              fontSize: "16px",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            追加
          </button>
        </div>

        {workouts.length === 0 ? (
          <p
            style={{
              textAlign: "center",
              color: "#666",
              marginTop: "30px",
            }}
          >
            まだ記録がありません
          </p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {workouts.map((workout) => (
              <li
                key={workout.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "14px 16px",
                  marginBottom: "12px",
                  backgroundColor: "#f9fafb",
                  border: "1px solid #e5e7eb",
                  borderRadius: "12px",
                }}
              >
                <div style={{ fontSize: "16px" }}>
                  <strong>{workout.exercise}</strong> ／ {workout.weight}kg ／{" "}
                  {workout.reps}回
                </div>

                <button
                  onClick={() => deleteWorkout(workout.id)}
                  style={{
                    padding: "8px 14px",
                    borderRadius: "8px",
                    border: "none",
                    backgroundColor: "#ef4444",
                    color: "#fff",
                    cursor: "pointer",
                    fontWeight: "bold",
                  }}
                >
                  削除
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default App;