"use client";

import { useState } from "react";

export default function Home() {
  const [players, setPlayers] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [positions, setPositions] = useState<Record<string, string | null>>({
    FW: null,
    MF: null,
    DF: null,
    GK: null,
  });

  const addPlayer = () => {
    if (!input) return;
    setPlayers([...players, input]);
    setInput("");
  };

  const assign = (pos: string) => {
    if (!selected) return;
    setPositions({ ...positions, [pos]: selected });
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>8人制サッカー 出場管理プロトタイプ</h1>

      {/* 入力 */}
      <div style={{ marginBottom: 10 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="選手名"
          style={{ border: "1px solid #ccc", padding: 5 }}
        />
        <button onClick={addPlayer} style={{ marginLeft: 10 }}>
          追加
        </button>
      </div>

      {/* メンバー表 */}
      <div style={{ marginBottom: 20 }}>
        <h3>メンバー</h3>
        {players.map((p, i) => (
          <div
            key={i}
            onClick={() => setSelected(p)}
            style={{
              cursor: "pointer",
              padding: 4,
              background: selected === p ? "#fde68a" : "transparent",
            }}
          >
            {p}
          </div>
        ))}
      </div>

      {/* フォーメーション */}
      <div>
        <h3>フォーメーション</h3>
        {Object.keys(positions).map((pos) => (
          <div key={pos} style={{ marginBottom: 5 }}>
            <button onClick={() => assign(pos)}>{pos}</button>
            <span style={{ marginLeft: 10 }}>
              {positions[pos] || "未設定"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}