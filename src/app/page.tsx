"use client";

import { useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";

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

type MatchRecord = {
  matchNo: number;
  formation: string;
  positions: Record<string, string[]>;
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

const actionButton: CSSProperties = {
  padding: "6px 10px",
  borderRadius: 9,
  border: "1px solid #94a3b8",
  background: "linear-gradient(#ffffff, #e5e7eb)",
  color: "#111827",
  fontWeight: 900,
  fontSize: 12,
  boxShadow: "0 2px 0 rgba(0,0,0,.25)",
  cursor: "pointer",
};

const darkButton: CSSProperties = {
  ...actionButton,
  background: "linear-gradient(#1f2937, #111827)",
  color: "white",
};

function emptyPositions(formation: string): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  FORMATIONS[formation].flat().forEach((p) => {
    result[p.id] = [];
  });
  return result;
}

function clonePositions(positions: Record<string, string[]>) {
  return Object.fromEntries(
    Object.entries(positions).map(([key, value]) => [key, [...value]])
  );
}

function formatCount(value: number) {
  if (!value) return "";
  return Number.isInteger(value) ? String(value) : String(value);
}

function LongPressRemoveButton({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pressing, setPressing] = useState(false);

  const startPress = () => {
    setPressing(true);
    timerRef.current = setTimeout(() => {
      onRemove();
      setPressing(false);
    }, 550);
  };

  const cancelPress = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    setPressing(false);
  };

  return (
    <button
      onPointerDown={(event) => {
        event.stopPropagation();
        startPress();
      }}
      onPointerUp={(event) => {
        event.stopPropagation();
        cancelPress();
      }}
      onPointerLeave={cancelPress}
      onPointerCancel={cancelPress}
      onClick={(event) => event.stopPropagation()}
      style={{
        fontSize: 11,
        fontWeight: 800,
        borderRadius: 8,
        border: pressing ? "2px solid #dc2626" : "1px solid #86efac",
        background: pressing ? "#fee2e2" : "white",
        padding: "3px 4px",
        color: "#111827",
        cursor: "pointer",
        touchAction: "manipulation",
      }}
    >
      {label}
    </button>
  );
}

export default function Home() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [formation, setFormation] = useState("2-4-1");
  const [positions, setPositions] = useState<Record<string, string[]>>(
    emptyPositions("2-4-1")
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [editingMatchNo, setEditingMatchNo] = useState<number | null>(null);
  const [absentIds, setAbsentIds] = useState<Record<string, boolean>>({});

  const playerMap = useMemo(
    () => Object.fromEntries(players.map((p) => [p.id, p])),
    [players]
  );

  const currentPositionMap = useMemo(() => {
    const result: Record<string, string> = {};
    const positionLabelMap = Object.fromEntries(
      FORMATIONS[formation].flat().map((p) => [p.id, p.label])
    );

    Object.entries(positions).forEach(([positionId, ids]) => {
      ids.forEach((id) => {
        result[id] = result[id]
          ? `${result[id]}/${positionLabelMap[positionId]}`
          : positionLabelMap[positionId];
      });
    });

    return result;
  }, [positions, formation]);

  const assignedMap = useMemo(() => {
    const result: Record<string, boolean> = {};
    Object.values(positions).forEach((ids) => {
      ids.forEach((id) => {
        result[id] = true;
      });
    });
    return result;
  }, [positions]);

  const matchesForTotals = useMemo(() => {
    const currentMatch: MatchRecord = {
      matchNo: editingMatchNo ?? matches.length + 1,
      formation,
      positions,
    };

    if (editingMatchNo === null) return [...matches, currentMatch];

    return matches.map((m) =>
      m.matchNo === editingMatchNo ? currentMatch : m
    );
  }, [matches, editingMatchNo, formation, positions]);

  const totals = useMemo(() => {
    const base: Record<
      string,
      { FW: number; MF: number; DF: number; GK: number; total: number }
    > = {};

    players.forEach((p) => {
      base[p.id] = { FW: 0, MF: 0, DF: 0, GK: 0, total: 0 };
    });

    matchesForTotals.forEach((match) => {
      FORMATIONS[match.formation].flat().forEach((pos) => {
        const ids = match.positions[pos.id] || [];
        if (ids.length === 0) return;

        const point = ids.length === 1 ? 1 : 0.5;

        ids.forEach((id) => {
          if (!base[id]) return;
          base[id][pos.group] += point;
          base[id].total += point;
        });
      });
    });

    return base;
  }, [players, matchesForTotals]);

  const sortedPlayers = useMemo(() => {
    return [...players].sort((a, b) => {
      const absentA = absentIds[a.id] ? 1 : 0;
      const absentB = absentIds[b.id] ? 1 : 0;
      if (absentA !== absentB) return absentA - absentB;
      return Number(a.number) - Number(b.number);
    });
  }, [players, absentIds]);

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
      setMatches([]);
      setEditingMatchNo(null);
      setAbsentIds({});
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
    if (!selectedId || absentIds[selectedId]) return;

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

  const toggleAbsent = (playerId: string) => {
    setAbsentIds((prev) => ({ ...prev, [playerId]: !prev[playerId] }));

    setPositions((prev) =>
      Object.fromEntries(
        Object.entries(prev).map(([key, ids]) => [
          key,
          ids.filter((id) => id !== playerId),
        ])
      )
    );

    if (selectedId === playerId) setSelectedId(null);
  };

  const saveMatch = () => {
    const record: MatchRecord = {
      matchNo: editingMatchNo ?? matches.length + 1,
      formation,
      positions: clonePositions(positions),
    };

    if (editingMatchNo !== null) {
      setMatches((prev) =>
        prev.map((m) => (m.matchNo === editingMatchNo ? record : m))
      );
      setEditingMatchNo(null);
    } else {
      setMatches((prev) => [...prev, record]);
    }

    setPositions(emptyPositions(formation));
    setSelectedId(null);
  };

  const editMatch = (matchNo: number) => {
    const target = matches.find((m) => m.matchNo === matchNo);
    if (!target) return;

    setEditingMatchNo(matchNo);
    setFormation(target.formation);
    setPositions(clonePositions(target.positions));
    setSelectedId(null);
  };

  const clearBoard = () => {
    setPositions(emptyPositions(formation));
    setSelectedId(null);
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0b0f0d",
        color: "white",
        padding: 8,
        fontFamily: "system-ui, sans-serif",
        fontSize: 12,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 6 }}>
        <div>
          <h1 style={{ fontSize: 14, margin: "0 0 5px" }}>
            8人制サッカー 出場管理
          </h1>

          <label style={{ ...darkButton, display: "inline-block" }}>
            CSV読込
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={handleCSV}
              style={{ display: "none" }}
            />
          </label>
        </div>

        <div style={{ display: "flex", gap: 5, alignItems: "start" }}>
          {Object.keys(FORMATIONS).map((f) => (
            <button
              key={f}
              onClick={() => changeFormation(f)}
              style={formation === f ? darkButton : actionButton}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", gap: 6, marginTop: 7, flexWrap: "wrap" }}>
        <button onClick={saveMatch} style={darkButton}>
          {editingMatchNo
            ? `第${editingMatchNo}試合を修正保存`
            : `第${matches.length + 1}試合を登録`}
        </button>

        <button onClick={clearBoard} style={actionButton}>
          盤面クリア
        </button>
      </div>

      {matches.length > 0 && (
        <div style={{ display: "flex", gap: 5, marginTop: 6, flexWrap: "wrap" }}>
          {matches.map((m) => (
            <button
              key={m.matchNo}
              onClick={() => editMatch(m.matchNo)}
              style={editingMatchNo === m.matchNo ? actionButton : darkButton}
            >
              第{m.matchNo}試合 修正
            </button>
          ))}
        </div>
      )}

      {selectedId && (
        <div style={{ marginTop: 5, color: "#facc15", fontWeight: 800 }}>
          選択中：{playerMap[selectedId]?.nickname}
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(205px, 1fr) minmax(145px, 0.68fr)",
          gap: 7,
          marginTop: 7,
          alignItems: "start",
        }}
      >
        <section>
          <h2 style={{ fontSize: 12, margin: "0 0 4px" }}>
            第{editingMatchNo ?? matches.length + 1}試合 フォーメーション
          </h2>

          <div
            style={{
              background: "#0f7a3b",
              borderRadius: 10,
              padding: 5,
              border: "2px solid #166534",
              minHeight: 470,
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
                  gap: formation === "2-4-1" ? 5 : 7,
                }}
              >
                {row.map((pos) => {
                  const ids = positions[pos.id] || [];
                  const isFull = ids.length >= 2;
                  const canPlace = selectedId && !isFull && !absentIds[selectedId];

                  return (
                    <div
                      key={pos.id}
                      onClick={() => placePlayer(pos.id)}
                      style={{
                        width: formation === "2-4-1" ? 72 : 84,
                        minHeight: 72,
                        background: canPlace ? "#dcfce7" : "#ecfdf5",
                        color: "#052e16",
                        border: canPlace
                          ? "3px solid #facc15"
                          : "2px solid #bbf7d0",
                        borderRadius: 10,
                        padding: 4,
                        boxSizing: "border-box",
                        cursor: canPlace ? "pointer" : "default",
                      }}
                    >
                      <div style={{ fontWeight: 900, marginBottom: 3 }}>
                        {pos.label}
                      </div>

                      <div style={{ display: "grid", gap: 3 }}>
                        {ids.map((id) => (
                          <LongPressRemoveButton
                            key={id}
                            label={playerMap[id]?.nickname ?? ""}
                            onRemove={() => removePlayer(pos.id, id)}
                          />
                        ))}

                        {ids.length < 2 && (
                          <div style={{ fontSize: 10, color: "#166534" }}>
                            空き
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}

            <div
              style={{
                textAlign: "right",
                fontSize: 10,
                color: "#d1fae5",
                marginTop: 4,
                opacity: 0.85,
              }}
            >
              ※長押しで削除
            </div>
          </div>
        </section>

        <section>
          <h2 style={{ fontSize: 12, margin: "0 0 4px" }}>メンバー表</h2>

          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 11,
              tableLayout: "fixed",
            }}
          >
            <colgroup>
              <col style={{ width: 24 }} />
              <col style={{ width: 46 }} />
              <col style={{ width: 28 }} />
              <col style={{ width: 22 }} />
              <col style={{ width: 22 }} />
              <col style={{ width: 22 }} />
              <col style={{ width: 22 }} />
              <col style={{ width: 22 }} />
              <col style={{ width: 32 }} />
            </colgroup>

            <thead>
              <tr>
                {["No", "愛称", "位置", "FW", "MF", "DF", "GK", "計", "不在"].map(
                  (h) => (
                    <th
                      key={h}
                      style={{
                        borderBottom: "1px solid #64748b",
                        padding: "5px 1px",
                        textAlign:
                          h === "No" || h === "愛称" || h === "位置"
                            ? "left"
                            : "right",
                      }}
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>

            <tbody>
              {sortedPlayers.map((p) => {
                const selected = selectedId === p.id;
                const assigned = assignedMap[p.id];
                const absent = absentIds[p.id];

                return (
                  <tr
                    key={p.id}
                    onClick={() => {
                      if (!absent) setSelectedId(p.id);
                    }}
                    style={{
                      background: absent
                        ? "#374151"
                        : selected
                        ? "#facc15"
                        : assigned
                        ? "#064e3b"
                        : "transparent",
                      color: selected ? "#111827" : absent ? "#9ca3af" : "white",
                      cursor: absent ? "default" : "pointer",
                    }}
                  >
                    <td style={{ padding: "6px 1px" }}>{p.number}</td>
                    <td
                      style={{
                        padding: "6px 1px",
                        fontWeight: 800,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {p.nickname}
                    </td>
                    <td
                      style={{
                        padding: "6px 1px",
                        fontWeight: 900,
                        color: selected ? "#111827" : "#facc15",
                      }}
                    >
                      {currentPositionMap[p.id] || ""}
                    </td>
                    <td style={{ padding: "6px 1px", textAlign: "right" }}>
                      {formatCount(totals[p.id]?.FW || 0)}
                    </td>
                    <td style={{ padding: "6px 1px", textAlign: "right" }}>
                      {formatCount(totals[p.id]?.MF || 0)}
                    </td>
                    <td style={{ padding: "6px 1px", textAlign: "right" }}>
                      {formatCount(totals[p.id]?.DF || 0)}
                    </td>
                    <td style={{ padding: "6px 1px", textAlign: "right" }}>
                      {formatCount(totals[p.id]?.GK || 0)}
                    </td>
                    <td
                      style={{
                        padding: "6px 1px",
                        textAlign: "right",
                        fontWeight: 900,
                      }}
                    >
                      {formatCount(totals[p.id]?.total || 0)}
                    </td>
                    <td style={{ padding: "4px 1px", textAlign: "right" }}>
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          toggleAbsent(p.id);
                        }}
                        style={{
                          ...actionButton,
                          fontSize: 10,
                          padding: "3px 4px",
                          borderRadius: 6,
                          background: absent
                            ? "linear-gradient(#9ca3af, #6b7280)"
                            : "linear-gradient(#1f2937, #111827)",
                          color: absent ? "#111827" : "white",
                        }}
                      >
                        {absent ? "復帰" : "不在"}
                      </button>
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