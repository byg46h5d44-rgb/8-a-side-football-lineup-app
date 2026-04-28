"use client";

import { useMemo, useState } from "react";

type Group = "FW" | "MF" | "DF" | "GK";

type Player = {
  id: string;
  number: string;
  name: string;
  nickname: string;
};

type Position = {
  id: string;
  label: string;
  group: Group;
};

const FORMATIONS: Record<string, Position[][]> = {
  "3-3-1": [
    [{ id: "FW", label: "FW", group: "FW" }],
    [
      { id: "MF_L", label: "MF", group: "MF" },
      { id: "MF_C", label: "MF", group: "MF" },
      { id: "MF_R", label: "MF", group: "MF" },
    ],
    [
      { id: "DF_L", label: "DF", group: "DF" },
      { id: "DF_C", label: "DF", group: "DF" },
      { id: "DF_R", label: "DF", group: "DF" },
    ],
    [{ id: "GK", label: "GK", group: "GK" }],
  ],
  "2-4-1": [
    [{ id: "FW", label: "FW", group: "FW" }],
    [
      { id: "SH_L", label: "SH", group: "MF" },
      { id: "CH_L", label: "CH", group: "MF" },
      { id: "CH_R", label: "CH", group: "MF" },
      { id: "SH_R", label: "SH", group: "MF" },
    ],
    [
      { id: "CB_L", label: "CB", group: "DF" },
      { id: "CB_R", label: "CB", group: "DF" },
    ],
    [{ id: "GK", label: "GK", group: "GK" }],
  ],
  "2-3-2": [
    [
      { id: "FW_L", label: "FW", group: "FW" },
      { id: "FW_R", label: "FW", group: "FW" },
    ],
    [
      { id: "MF_L", label: "MF", group: "MF" },
      { id: "MF_C", label: "MF", group: "MF" },
      { id: "MF_R", label: "MF", group: "MF" },
    ],
    [
      { id: "DF_L", label: "DF", group: "DF" },
      { id: "DF_R", label: "DF", group: "DF" },
    ],
    [{ id: "GK", label: "GK", group: "GK" }],
  ],
};

function emptyPositions(formation: string): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  FORMATIONS[formation].flat().forEach((p) => {
    result[p.id] = [];
  });
  return result;
}

function formatCount(value: number) {
  if (!value) return "";
  return Number.isInteger(value) ? String(value) : String(value);
}

export default function Home() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [formation, setFormation] = useState("2-4-1");
  const [positions, setPositions] = useState<Record<string, string[]>>(
    emptyPositions("2-4-1")
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const playerMap = useMemo(() => {
    return Object.fromEntries(players.map((p) => [p.id, p]));
  }, [players]);

  const assignedMap = useMemo(() => {
    const result: Record<string, boolean> = {};
    Object.values(positions).forEach((ids) => {
      ids.forEach((id) => {
        result[id] = true;
      });
    });
    return result;
  }, [positions]);

  const totals = useMemo(() => {
    const base: Record<
      string,
      { FW: number; MF: number; DF: number; GK: number; total: number }
    > = {};

    players.forEach((p) => {
      base[p.id] = { FW: 0, MF: 0, DF: 0, GK: 0, total: 0 };
    });

    FORMATIONS[formation].flat().forEach((pos) => {
      const ids = positions[pos.id] || [];
      if (ids.length === 0) return;

      const point = ids.length === 1 ? 1 : 0.5;

      ids.forEach((id) => {
        if (!base[id]) return;
        base[id][pos.group] += point;
        base[id].total += point;
      });
    });

    return base;
  }, [players, positions, formation]);

  const handleCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = (event) => {
      let text = String(event.target?.result || "");
      text = text.replace(/、/g, ",");

      const lines = text
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);

      const dataLines = lines[0]?.toLowerCase().includes("number")
        ? lines.slice(1)
        : lines;

      const parsed = dataLines
        .map((line, index) => {
          const [numberRaw, nameRaw, nicknameRaw] = line.split(",");

          const number = (numberRaw || "99").trim();
          const name = (nameRaw || "").trim();
          const nickname = (nicknameRaw || name || `選手${index + 1}`).trim();

          return {
            id: `${index}-${number}-${nickname}`,
            number,
            name,
            nickname,
          };
        })
        .sort((a, b) => Number(a.number) - Number(b.number));

      setPlayers(parsed);
      setSelectedId(null);
      setPositions(emptyPositions(formation));
      e.target.value = "";
    };

    reader.readAsText(file, "UTF-8");
  };

  const changeFormation = (nextFormation: string) => {
    setFormation(nextFormation);
    setPositions(emptyPositions(nextFormation));
    setSelectedId(null);
  };

  const placePlayer = (positionId: string) => {
    if (!selectedId) return;

    setPositions((prev) => {
      const next: Record<string, string[]> = {};

      Object.entries(prev).forEach(([key, ids]) => {
        next[key] = ids.filter((id) => id !== selectedId);
      });

      const current = next[positionId] || [];
      if (current.length >= 2) return next;

      next[positionId] = [...current, selectedId];
      return next;
    });

    setSelectedId(null);
  };

  const removePlayer = (positionId: string, playerId: string) => {
    setPositions((prev) => ({
      ...prev,
      [positionId]: (prev[positionId] || []).filter((id) => id !== playerId),
    }));

    if (selectedId === playerId) setSelectedId(null);
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0b0f0d",
        color: "white",
        padding: 10,
        fontFamily: "system-ui, sans-serif",
        fontSize: 12,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
        <div>
          <h1 style={{ fontSize: 15, margin: "0 0 6px" }}>
            8人制サッカー 出場管理
          </h1>

          <input type="file" accept=".csv,text/csv" onChange={handleCSV} />
        </div>

        <div style={{ display: "flex", gap: 6, alignItems: "start" }}>
          {Object.keys(FORMATIONS).map((f) => (
            <button
              key={f}
              onClick={() => changeFormation(f)}
              style={{
                padding: "6px 10px",
                borderRadius: 8,
                border: "1px solid #94a3b8",
                background: formation === f ? "#1f2937" : "white",
                color: formation === f ? "white" : "#111827",
                fontWeight: 700,
              }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {selectedId && (
        <div style={{ marginTop: 6, color: "#facc15", fontWeight: 800 }}>
          選択中：{playerMap[selectedId]?.nickname} → 配置したい枠をタップ
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(220px, 1fr) minmax(155px, 0.7fr)",
          gap: 10,
          marginTop: 8,
          alignItems: "start",
        }}
      >
        <section>
          <h2 style={{ fontSize: 12, margin: "0 0 5px" }}>
            第1試合 フォーメーション
          </h2>

          <div
            style={{
              background: "#0f7a3b",
              borderRadius: 12,
              padding: 8,
              border: "2px solid #166534",
              minHeight: 500,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            {FORMATIONS[formation].map((row, rowIndex) => (
              <div
                key={rowIndex}
                style={{
                  display: "flex",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                {row.map((pos) => {
                  const ids = positions[pos.id] || [];
                  const isFull = ids.length >= 2;
                  const canPlace = selectedId && !isFull;

                  return (
                    <div
                      key={pos.id}
                      onClick={() => placePlayer(pos.id)}
                      style={{
                        width: formation === "2-4-1" ? 82 : 92,
                        minHeight: 76,
                        background: canPlace ? "#dcfce7" : "#ecfdf5",
                        color: "#052e16",
                        border: canPlace
                          ? "3px solid #facc15"
                          : "2px solid #bbf7d0",
                        borderRadius: 10,
                        padding: 5,
                        boxSizing: "border-box",
                        cursor: canPlace ? "pointer" : "default",
                      }}
                    >
                      <div style={{ fontWeight: 900, marginBottom: 4 }}>
                        {pos.label}
                      </div>

                      <div style={{ display: "grid", gap: 4 }}>
                        {ids.map((id) => (
                          <button
                            key={id}
                            onClick={(event) => {
                              event.stopPropagation();
                              removePlayer(pos.id, id);
                            }}
                            style={{
                              fontSize: 11,
                              fontWeight: 800,
                              borderRadius: 8,
                              border: "1px solid #86efac",
                              background: "white",
                              padding: "3px 4px",
                              color: "#111827",
                            }}
                          >
                            {playerMap[id]?.nickname} ×
                          </button>
                        ))}

                        {ids.length < 2 && (
                          <div
                            style={{
                              fontSize: 10,
                              color: "#166534",
                              opacity: 0.8,
                            }}
                          >
                            空き
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 style={{ fontSize: 12, margin: "0 0 5px" }}>メンバー表</h2>

          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 11,
              tableLayout: "fixed",
            }}
          >
            <colgroup>
              <col style={{ width: 28 }} />
              <col style={{ width: 64 }} />
              <col style={{ width: 28 }} />
              <col style={{ width: 28 }} />
              <col style={{ width: 28 }} />
              <col style={{ width: 28 }} />
              <col style={{ width: 28 }} />
            </colgroup>

            <thead>
              <tr>
                {["No", "愛称", "FW", "MF", "DF", "GK", "計"].map((h) => (
                  <th
                    key={h}
                    style={{
                      borderBottom: "1px solid #64748b",
                      padding: 3,
                      textAlign: h === "No" || h === "愛称" ? "left" : "right",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {players.map((p) => {
                const selected = selectedId === p.id;
                const assigned = assignedMap[p.id];

                return (
                  <tr
                    key={p.id}
                    onClick={() => setSelectedId(p.id)}
                    style={{
                      background: selected
                        ? "#facc15"
                        : assigned
                        ? "#064e3b"
                        : "transparent",
                      color: selected ? "#111827" : "white",
                      cursor: "pointer",
                    }}
                  >
                    <td style={{ padding: 3 }}>{p.number}</td>
                    <td
                      style={{
                        padding: 3,
                        fontWeight: 800,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {p.nickname}
                    </td>
                    <td style={{ padding: 3, textAlign: "right" }}>
                      {formatCount(totals[p.id]?.FW || 0)}
                    </td>
                    <td style={{ padding: 3, textAlign: "right" }}>
                      {formatCount(totals[p.id]?.MF || 0)}
                    </td>
                    <td style={{ padding: 3, textAlign: "right" }}>
                      {formatCount(totals[p.id]?.DF || 0)}
                    </td>
                    <td style={{ padding: 3, textAlign: "right" }}>
                      {formatCount(totals[p.id]?.GK || 0)}
                    </td>
                    <td
                      style={{
                        padding: 3,
                        textAlign: "right",
                        fontWeight: 900,
                      }}
                    >
                      {formatCount(totals[p.id]?.total || 0)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      </div>
    </main>
  );
}