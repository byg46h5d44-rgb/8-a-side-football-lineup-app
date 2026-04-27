"use client";

import React, { useEffect, useMemo, useState } from "react";

const NL = String.fromCharCode(10);
const CR = String.fromCharCode(13);

const FORMATIONS = {
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

const SAMPLE_PLAYERS = [
  { id: "p10", number: "10", name: "山田太郎", nickname: "タロ" },
  { id: "p7", number: "7", name: "佐藤健", nickname: "ケン" },
  { id: "p3", number: "3", name: "鈴木翔", nickname: "ショウ" },
  { id: "p1", number: "1", name: "田中悠斗", nickname: "ユウト" },
  { id: "p8", number: "8", name: "中村蓮", nickname: "レン" },
  { id: "p11", number: "11", name: "高橋蒼", nickname: "アオ" },
  { id: "p5", number: "5", name: "小林陸", nickname: "リク" },
  { id: "p9", number: "9", name: "伊藤陽", nickname: "ハル" },
  { id: "p2", number: "2", name: "森大和", nickname: "ヤマ" },
  { id: "p6", number: "6", name: "清水海", nickname: "カイ" },
];

const SAMPLE_CSV = ["number,name,nickname", "10,山田太郎,タロ", "7,佐藤健,ケン"].join(NL);
const STORAGE_KEY_PLAYERS = "eightAsideSoccerPlayers";
const STORAGE_KEY_MATCHES = "eightAsideSoccerMatches";

const buttonStyle = {
  border: "1px solid #cbd5e1",
  borderRadius: 14,
  padding: "8px 12px",
  background: "white",
  fontWeight: 700,
  cursor: "pointer",
};

function removeBom(value) {
  const text = String(value || "");
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

function splitCsvLine(line) {
  const result = [];
  let current = "";
  let insideQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === '"' && nextChar === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      insideQuotes = !insideQuotes;
    } else if (char === "," && !insideQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

function parseLines(text) {
  return removeBom(text)
    .split(CR + NL)
    .join(NL)
    .split(CR)
    .join(NL)
    .split(NL)
    .map((line) => line.trim())
    .filter(Boolean);
}

function parseCsv(text) {
  const lines = parseLines(text);
  if (lines.length < 2) return [];

  const headers = splitCsvLine(lines[0]).map((header) => header.trim());

  return lines.slice(1).map((line, index) => {
    const cols = splitCsvLine(line);
    const row = Object.fromEntries(headers.map((header, colIndex) => [header, cols[colIndex] ?? ""]));
    const fallbackName = `選手${index + 1}`;
    const number = row.number || "";
    const name = row.name || "";
    const nickname = row.nickname || name || fallbackName;

    return {
      id: `p_${number || index}_${nickname}`,
      number,
      name,
      nickname,
    };
  });
}

function makeEmptyPositions(formation) {
  const positions = {};
  FORMATIONS[formation].flat().forEach((position) => {
    positions[position.id] = [];
  });
  return positions;
}

function normalizePositionsForFormation(formation, positions) {
  const empty = makeEmptyPositions(formation);
  Object.keys(empty).forEach((key) => {
    empty[key] = Array.isArray(positions?.[key]) ? positions[key].slice(0, 2) : [];
  });
  return empty;
}

function clonePositions(positions) {
  return Object.fromEntries(Object.entries(positions).map(([key, value]) => [key, [...value]]));
}

function calculateTotals(players, matches) {
  const base = Object.fromEntries(
    players.map((player) => [player.id, { FW: 0, MF: 0, DF: 0, GK: 0, total: 0 }])
  );

  matches.forEach((match) => {
    const meta = {};
    FORMATIONS[match.formation].flat().forEach((position) => {
      meta[position.id] = position;
    });

    Object.entries(match.positions).forEach(([positionId, playerIds]) => {
      if (!playerIds.length) return;
      const point = playerIds.length === 1 ? 1 : 0.5;
      const group = meta[positionId]?.group;

      playerIds.forEach((playerId) => {
        if (!base[playerId] || !group) return;
        base[playerId][group] += point;
        base[playerId].total += point;
      });
    });
  });

  return base;
}

function findPlayerPosition(positions, playerId) {
  for (const [positionId, playerIds] of Object.entries(positions)) {
    if (playerIds.includes(playerId)) return positionId;
  }
  return null;
}

function loadJson(key, fallbackValue) {
  try {
    const rawValue = window.localStorage.getItem(key);
    return rawValue ? JSON.parse(rawValue) : fallbackValue;
  } catch {
    return fallbackValue;
  }
}

function saveJson(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // 保存できない環境では何もしない
  }
}

function encodeShareData(value) {
  const json = JSON.stringify(value);
  const encoded = encodeURIComponent(json);
  return window.btoa(encoded);
}

function decodeShareData(value) {
  const decoded = window.atob(value);
  return JSON.parse(decodeURIComponent(decoded));
}

function assertTest(condition, message) {
  if (!condition) throw new Error(`Self test failed: ${message}`);
}

function runSelfTests() {
  const shareSource = { players: SAMPLE_PLAYERS.slice(0, 1), savedMatches: [], formation: "2-4-1" };
  if (typeof window !== "undefined") {
    const restoredShare = decodeShareData(encodeShareData(shareSource));
    assertTest(restoredShare.players[0].nickname === "タロ", "Share URL data should round-trip Japanese text");
  }

  const unixRows = parseCsv(["number,name,nickname", "10,山田太郎,タロ", "7,佐藤健,ケン"].join(NL));
  assertTest(unixRows.length === 2, "Unix line breaks should parse two players");
  assertTest(unixRows[0].nickname === "タロ", "First Unix CSV nickname should be タロ");

  const windowsRows = parseCsv(["number,name,nickname", "10,山田太郎,タロ", "7,佐藤健,ケン"].join(CR + NL));
  assertTest(windowsRows.length === 2, "Windows line breaks should parse two players");
  assertTest(windowsRows[1].number === "7", "Windows CSV second player should be number 7");

  const oldMacRows = parseCsv(["number,name,nickname", "1,田中悠斗,ユウト", "2,森大和,ヤマ"].join(CR));
  assertTest(oldMacRows.length === 2, "Old Mac line breaks should parse two players");

  const bom = String.fromCharCode(0xfeff);
  const bomRows = parseCsv(`${bom}${["number,name,nickname", "1,田中悠斗,ユウト"].join(NL)}`);
  assertTest(bomRows.length === 1, "CSV with BOM should parse one player");

  const fallbackRows = parseCsv(["number,name,nickname", "4,山本空,"].join(NL));
  assertTest(fallbackRows[0].nickname === "山本空", "Missing nickname should fall back to name");

  const quotedRows = parseCsv(["number,name,nickname", '12,"山田,太郎","タロ,くん"'].join(NL));
  assertTest(quotedRows[0].name === "山田,太郎", "Quoted CSV name may include comma");
  assertTest(quotedRows[0].nickname === "タロ,くん", "Quoted CSV nickname may include comma");

  const positions = makeEmptyPositions("2-4-1");
  positions.FW = ["p10"];
  positions.CH_L = ["p7", "p3"];
  const totals = calculateTotals(SAMPLE_PLAYERS, [{ matchNo: 1, formation: "2-4-1", positions }]);
  assertTest(totals.p10.FW === 1, "Single FW should count as 1");
  assertTest(totals.p7.MF === 0.5, "Two players in one MF slot should count as 0.5 each");
  assertTest(totals.p3.MF === 0.5, "Second player in one MF slot should count as 0.5");
  assertTest(findPlayerPosition(positions, "p10") === "FW", "Assigned player should be found in FW");

  const normalized = normalizePositionsForFormation("2-4-1", { FW: ["p10", "p7", "p3"], GK: ["p1"] });
  assertTest(normalized.FW.length === 2, "Position slots should keep at most two players");
  assertTest(Array.isArray(normalized.CH_L), "Missing positions should be initialized");
}

function PlayerBadge({ player, selected, onSelect, onRemove }) {
  return (
    <div
      onClick={(event) => {
        event.stopPropagation();
        onSelect?.(player.id);
      }}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 6,
        border: selected ? "3px solid #f59e0b" : "1px solid #cbd5e1",
        background: selected ? "#fffbeb" : "white",
        borderRadius: 14,
        padding: selected ? "5px 6px" : "7px 8px",
        fontSize: 13,
        fontWeight: 800,
        color: "#0f172a",
        boxShadow: selected ? "0 0 0 3px rgba(245,158,11,0.25)" : "0 1px 3px rgba(0,0,0,0.12)",
        cursor: "pointer",
        userSelect: "none",
      }}
    >
      <span>{player.number ? `${player.number} ` : ""}{player.nickname}</span>
      {onRemove && (
        <button
          onClick={(event) => {
            event.stopPropagation();
            onRemove();
          }}
          style={{ border: 0, background: "#f1f5f9", borderRadius: 99, cursor: "pointer", lineHeight: 1 }}
          aria-label={`${player.nickname}を外す`}
        >
          ×
        </button>
      )}
    </div>
  );
}

function MemberTable({ players, totals, selectedPlayerId, assignedPositionByPlayerId, onSelectPlayer }) {
  const compactCell = {
    padding: "2px 3px",
    borderBottom: "1px solid #e2e8f0",
    lineHeight: 1.05,
    whiteSpace: "nowrap",
    height: 22,
  };

  const compactHeader = {
    ...compactCell,
    background: "#f8fafc",
    fontSize: 10,
    color: "#475569",
    height: 20,
  };

  const formatCount = (value) => {
    if (!value) return "";
    return Number.isInteger(value) ? String(value) : String(value);
  };

  return (
    <section style={{ background: "white", borderRadius: 16, padding: 6, overflow: "visible" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 4, marginBottom: 3 }}>
        <h2 style={{ margin: 0, fontSize: 13 }}>メンバー表</h2>
        <span style={{ fontSize: 10, color: "#64748b" }}>タップ選択</span>
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, tableLayout: "fixed" }}>
        <colgroup>
          <col style={{ width: 24 }} />
          <col style={{ width: 58 }} />
          <col style={{ width: 25 }} />
          <col style={{ width: 25 }} />
          <col style={{ width: 25 }} />
          <col style={{ width: 25 }} />
          <col style={{ width: 28 }} />
        </colgroup>
        <thead>
          <tr>
            <th style={{ ...compactHeader, textAlign: "left" }}>No</th>
            <th style={{ ...compactHeader, textAlign: "left" }}>愛称</th>
            <th style={{ ...compactHeader, textAlign: "right" }}>FW</th>
            <th style={{ ...compactHeader, textAlign: "right" }}>MF</th>
            <th style={{ ...compactHeader, textAlign: "right" }}>DF</th>
            <th style={{ ...compactHeader, textAlign: "right" }}>GK</th>
            <th style={{ ...compactHeader, textAlign: "right" }}>計</th>
          </tr>
        </thead>
        <tbody>
          {players.map((player) => {
            const selected = selectedPlayerId === player.id;
            const assigned = Boolean(assignedPositionByPlayerId[player.id]);
            return (
              <tr
                key={player.id}
                onClick={() => onSelectPlayer(player.id)}
                style={{
                  background: selected ? "#fffbeb" : assigned ? "#f0fdf4" : "white",
                  outline: selected ? "2px solid #f59e0b" : "none",
                  cursor: "pointer",
                }}
              >
                <td style={{ ...compactCell, textAlign: "left", fontSize: 10 }}>{player.number}</td>
                <td style={{ ...compactCell, textAlign: "left", fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis" }} title={player.nickname}>
                  {player.nickname}
                </td>
                {["FW", "MF", "DF", "GK"].map((key) => (
                  <td key={key} style={{ ...compactCell, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                    {formatCount(totals[player.id]?.[key] ?? 0)}
                  </td>
                ))}
                <td style={{ ...compactCell, textAlign: "right", fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>
                  {formatCount(totals[player.id]?.total ?? 0)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

function SavedMatchList({ savedMatches, onStartEditMatch, onDeleteMatch }) {
  return (
    <div style={{ marginTop: 10, background: "white", borderRadius: 20, padding: 10, fontSize: 13 }}>
      <b>保存済み試合</b>
      {savedMatches.length === 0 ? (
        <p style={{ margin: "8px 0 0" }}>まだありません</p>
      ) : (
        savedMatches.map((match) => (
          <div key={match.matchNo} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, borderTop: "1px solid #e2e8f0", padding: "8px 0" }}>
            <span>第{match.matchNo}試合：{match.formation}</span>
            <span style={{ display: "flex", gap: 6 }}>
              <button onClick={() => onStartEditMatch(match.matchNo)} style={{ ...buttonStyle, padding: "5px 8px", borderRadius: 10 }}>修正</button>
              <button onClick={() => onDeleteMatch(match.matchNo)} style={{ ...buttonStyle, padding: "5px 8px", borderRadius: 10, color: "#b91c1c" }}>削除</button>
            </span>
          </div>
        ))
      )}
    </div>
  );
}

function FormationBoard({
  formation,
  positions,
  playerMap,
  selectedPlayerId,
  editingMatchNo,
  matchNo,
  zoom,
  onChangeFormation,
  onPlacePlayer,
  onRemoveFromPosition,
  onSelectPlayer,
}) {
  return (
    <section style={{ background: "white", borderRadius: 24, padding: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <h2 style={{ margin: 0, fontSize: 13 }}>{editingMatchNo !== null ? `第${editingMatchNo}試合を編集中` : `第${matchNo}試合 フォーメーション`}</h2>
        <span style={{ fontSize: 13, color: "#64748b", fontWeight: 700 }}>{formation}</span>
      </div>

      <div style={{ marginTop: 10, background: "#047857", borderRadius: 18, padding: 6, overflow: "hidden" }}>
        <div style={{ width: 680 * zoom, height: 620 * zoom, position: "relative" }}>
          <div style={{ width: 680, height: 620, transform: `scale(${zoom})`, transformOrigin: "top left", border: "4px solid rgba(255,255,255,.85)", borderRadius: 24, background: "#059669", padding: 16, display: "flex", flexDirection: "column", justifyContent: "space-between", boxSizing: "border-box" }}>
          {FORMATIONS[formation].map((row, rowIndex) => (
            <div key={rowIndex} style={{ display: "flex", justifyContent: "center", gap: 12 }}>
              {row.map((position) => {
                const assignedIds = positions[position.id] || [];
                const isFull = assignedIds.length >= 2;
                const canTapPlace = Boolean(selectedPlayerId && !isFull);

                return (
                  <div
                    key={position.id}
                    onClick={() => onPlacePlayer(position.id, selectedPlayerId)}
                    style={{
                      minHeight: 108,
                      width: 120,
                      border: canTapPlace ? "3px solid #facc15" : "2px dashed rgba(255,255,255,.85)",
                      background: canTapPlace ? "rgba(254,240,138,.28)" : "rgba(255,255,255,.16)",
                      borderRadius: 22,
                      padding: canTapPlace ? 7 : 8,
                      color: "white",
                      cursor: canTapPlace ? "pointer" : "default",
                    }}
                  >
                    <div style={{ textAlign: "center", fontWeight: 800, marginBottom: 8 }}>{position.label}</div>
                    <div style={{ display: "grid", gap: 7 }}>
                      {assignedIds.map((playerId) => (
                        playerMap[playerId] && (
                          <PlayerBadge
                            key={playerId}
                            player={playerMap[playerId]}
                            selected={selectedPlayerId === playerId}
                            onSelect={onSelectPlayer}
                            onRemove={() => onRemoveFromPosition(position.id, playerId)}
                          />
                        )
                      ))}
                      {assignedIds.length < 2 && (
                        <div style={{ border: "1px solid rgba(255,255,255,.55)", borderRadius: 12, padding: 8, textAlign: "center", fontSize: 12 }}>
                          {selectedPlayerId ? "タップで配置" : "空き"}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default function App() {
  const [players, setPlayers] = useState(() => {
    if (typeof window === "undefined") return SAMPLE_PLAYERS;
    const restoredPlayers = loadJson(STORAGE_KEY_PLAYERS, SAMPLE_PLAYERS);
    return Array.isArray(restoredPlayers) && restoredPlayers.length ? restoredPlayers : SAMPLE_PLAYERS;
  });
  const [formation, setFormation] = useState("2-4-1");
  const [matchNo, setMatchNo] = useState(1);
  const [positions, setPositions] = useState(makeEmptyPositions("2-4-1"));
  const [savedMatches, setSavedMatches] = useState(() => {
    if (typeof window === "undefined") return [];
    const restoredMatches = loadJson(STORAGE_KEY_MATCHES, []);
    return Array.isArray(restoredMatches) ? restoredMatches : [];
  });
  const [editingMatchNo, setEditingMatchNo] = useState(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState(null);
  const [message, setMessage] = useState("");
  const [shareUrl, setShareUrl] = useState("");
  const [viewportWidth, setViewportWidth] = useState(typeof window === "undefined" ? 1280 : window.innerWidth);
  const [zoom, setZoom] = useState(0.55);

  useEffect(() => {
    try {
      runSelfTests();
      setMessage("内部テストOK：メンバー表タップ配置・集計ロジックは正常です。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "内部テストで不明なエラーが発生しました。");
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const shared = params.get("share");
    if (!shared) return;

    try {
      const data = decodeShareData(shared);
      if (Array.isArray(data.players) && data.players.length) setPlayers(data.players);
      if (Array.isArray(data.savedMatches)) setSavedMatches(data.savedMatches);
      if (data.formation && FORMATIONS[data.formation]) setFormation(data.formation);
      if (data.positions && data.formation && FORMATIONS[data.formation]) setPositions(normalizePositionsForFormation(data.formation, data.positions));
      if (typeof data.matchNo === "number") setMatchNo(data.matchNo);
      setEditingMatchNo(null);
      setSelectedPlayerId(null);
      setMessage("共有URLからデータを復元しました。");
      window.history.replaceState(null, "", window.location.pathname);
    } catch {
      setMessage("共有URLの読み込みに失敗しました。");
    }
  }, []);

  useEffect(() => {
    saveJson(STORAGE_KEY_PLAYERS, players);
  }, [players]);

  useEffect(() => {
    saveJson(STORAGE_KEY_MATCHES, savedMatches);
  }, [savedMatches]);

  useEffect(() => {
    const updateViewportWidth = () => setViewportWidth(window.innerWidth);
    updateViewportWidth();
    window.addEventListener("resize", updateViewportWidth);
    return () => window.removeEventListener("resize", updateViewportWidth);
  }, []);

  const playerMap = useMemo(() => Object.fromEntries(players.map((player) => [player.id, player])), [players]);
  const assignedPositionByPlayerId = useMemo(() => {
    const result = {};
    Object.entries(positions).forEach(([positionId, playerIds]) => {
      playerIds.forEach((playerId) => {
        result[playerId] = positionId;
      });
    });
    return result;
  }, [positions]);

  const selectedPlayer = selectedPlayerId ? playerMap[selectedPlayerId] : null;
  const nextMatchNo = savedMatches.length + 1;
  const isNarrow = viewportWidth < 900;
  const boardZoom = isNarrow ? Math.min(zoom, 0.48) : zoom;
  const layoutColumns = isNarrow ? "minmax(210px, 1fr) minmax(150px, 0.72fr)" : "minmax(700px, 1.85fr) minmax(260px, 0.65fr)";

  const matchesForTotals = useMemo(() => {
    const draftMatch = { matchNo, formation, positions };
    if (editingMatchNo === null) return [...savedMatches, draftMatch];
    return savedMatches.map((match) => (match.matchNo === editingMatchNo ? draftMatch : match));
  }, [savedMatches, matchNo, formation, positions, editingMatchNo]);

  const totals = useMemo(() => calculateTotals(players, matchesForTotals), [players, matchesForTotals]);

  const changeFormation = (nextFormation) => {
    setFormation(nextFormation);
    setPositions((currentPositions) => normalizePositionsForFormation(nextFormation, currentPositions));
    setSelectedPlayerId(null);
  };

  const placePlayerToPosition = (positionId, playerId) => {
    if (!playerId) return;
    setPositions((previousPositions) => {
      const nextPositions = Object.fromEntries(
        Object.entries(previousPositions).map(([key, value]) => [key, value.filter((id) => id !== playerId)])
      );
      if ((nextPositions[positionId] || []).length >= 2) return nextPositions;
      nextPositions[positionId] = [...(nextPositions[positionId] || []), playerId];
      return nextPositions;
    });
    setSelectedPlayerId(null);
  };

  const removeFromPosition = (positionId, playerId) => {
    setPositions((previousPositions) => ({
      ...previousPositions,
      [positionId]: previousPositions[positionId].filter((id) => id !== playerId),
    }));
    if (selectedPlayerId === playerId) setSelectedPlayerId(null);
  };

  const clearCurrentBoard = () => {
    setPositions(makeEmptyPositions(formation));
    setSelectedPlayerId(null);
  };

  const saveMatch = () => {
    if (editingMatchNo !== null) {
      setSavedMatches((previousMatches) =>
        previousMatches.map((match) =>
          match.matchNo === editingMatchNo ? { matchNo: editingMatchNo, formation, positions: clonePositions(positions) } : match
        )
      );
      setMessage(`第${editingMatchNo}試合を修正しました。`);
      setEditingMatchNo(null);
      setMatchNo(nextMatchNo);
      setPositions(makeEmptyPositions(formation));
      setSelectedPlayerId(null);
      return;
    }

    setSavedMatches((previousMatches) => [...previousMatches, { matchNo: nextMatchNo, formation, positions: clonePositions(positions) }]);
    setMessage(`第${nextMatchNo}試合を保存しました。`);
    setMatchNo(nextMatchNo + 1);
    setPositions(makeEmptyPositions(formation));
    setSelectedPlayerId(null);
  };

  const startEditMatch = (targetMatchNo) => {
    const target = savedMatches.find((match) => match.matchNo === targetMatchNo);
    if (!target) return;
    setEditingMatchNo(target.matchNo);
    setMatchNo(target.matchNo);
    setFormation(target.formation);
    setPositions(normalizePositionsForFormation(target.formation, target.positions));
    setSelectedPlayerId(null);
    setMessage(`第${target.matchNo}試合を編集中です。修正後に「修正を保存」を押してください。`);
  };

  const cancelEdit = () => {
    setEditingMatchNo(null);
    setMatchNo(nextMatchNo);
    setPositions(makeEmptyPositions(formation));
    setSelectedPlayerId(null);
    setMessage("編集をキャンセルしました。");
  };

  const deleteMatch = (targetMatchNo) => {
    const filtered = savedMatches.filter((match) => match.matchNo !== targetMatchNo);
    const renumbered = filtered.map((match, index) => ({ ...match, matchNo: index + 1 }));
    setSavedMatches(renumbered);
    setEditingMatchNo(null);
    setMatchNo(renumbered.length + 1);
    setPositions(makeEmptyPositions(formation));
    setSelectedPlayerId(null);
    setMessage(`第${targetMatchNo}試合を削除しました。試合番号を振り直しました。`);
  };

  const resetAll = () => {
    setSavedMatches([]);
    setEditingMatchNo(null);
    setMatchNo(1);
    setPositions(makeEmptyPositions(formation));
    setSelectedPlayerId(null);
    saveJson(STORAGE_KEY_PLAYERS, SAMPLE_PLAYERS);
    saveJson(STORAGE_KEY_MATCHES, []);
    setMessage("全データをリセットしました。選手情報も初期データに戻しました。");
  };

  const createShareUrl = async () => {
    const payload = {
      players,
      savedMatches,
      formation,
      positions: clonePositions(positions),
      matchNo,
    };
    const encoded = encodeShareData(payload);
    const url = `${window.location.origin}${window.location.pathname}?share=${encoded}`;
    setShareUrl(url);

    try {
      await window.navigator.clipboard.writeText(url);
      setMessage("共有URLをコピーしました。LINEなどに貼り付けて共有できます。");
    } catch {
      setMessage("共有URLを作成しました。下のURLをコピーして共有してください。");
    }
  };

  const handleCsv = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const parsedPlayers = parseCsv(text);

    if (parsedPlayers.length) {
      setPlayers(parsedPlayers);
      setSavedMatches([]);
      setEditingMatchNo(null);
      setMatchNo(1);
      setPositions(makeEmptyPositions(formation));
      setSelectedPlayerId(null);
      setMessage(`${parsedPlayers.length}名の選手をCSVから読み込み、次回起動用に保存しました。`);
    } else {
      setMessage("CSVを読み込めませんでした。1行目は number,name,nickname にしてください。");
    }

    event.target.value = "";
  };

  return (
    <div style={{ minHeight: "100vh", background: "#e2e8f0", padding: 12, fontFamily: "system-ui, sans-serif", color: "#0f172a" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <div style={{ background: "white", borderRadius: 22, padding: 12, marginBottom: 12, display: "flex", gap: 12, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22 }}>8人制サッカー 出場管理プロトタイプ</h1>
            <p style={{ margin: "4px 0 0", color: "#64748b" }}>メンバー表の行をタップ → ポジション枠をタップで配置・移動。</p>
            {selectedPlayer && (
              <p style={{ margin: "8px 0 0", color: "#b45309", fontWeight: 800 }}>
                選択中：{selectedPlayer.number ? `${selectedPlayer.number} ` : ""}{selectedPlayer.nickname} → 配置したい枠をタップ
              </p>
            )}
            {message && (
              <p style={{ margin: "8px 0 0", color: message.includes("failed") || message.includes("失敗") || message.includes("エラー") ? "#b91c1c" : "#047857", fontSize: 13 }}>
                {message}
              </p>
            )}
            {shareUrl && (
              <textarea
                readOnly
                value={shareUrl}
                style={{ marginTop: 8, width: "100%", maxWidth: 560, height: 44, fontSize: 11, border: "1px solid #cbd5e1", borderRadius: 10, padding: 6 }}
                onFocus={(event) => event.target.select()}
              />
            )}
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <label style={buttonStyle}>
              CSV読込
              <input type="file" accept=".csv,text/csv" onChange={handleCsv} style={{ display: "none" }} />
            </label>
            <button onClick={saveMatch} style={{ ...buttonStyle, background: editingMatchNo !== null ? "#b45309" : "#0f172a", color: "white" }}>
              {editingMatchNo !== null ? `第${editingMatchNo}試合の修正を保存` : `第${nextMatchNo}試合を保存`}
            </button>
            {editingMatchNo !== null && <button onClick={cancelEdit} style={buttonStyle}>編集キャンセル</button>}
            <button onClick={clearCurrentBoard} style={buttonStyle}>盤面クリア</button>
            <button onClick={resetAll} style={buttonStyle}>全リセット</button>
            <button onClick={createShareUrl} style={{ ...buttonStyle, background: "#047857", color: "white" }}>共有URL</button>
            {Object.keys(FORMATIONS).map((formationName) => (
              <button
                key={formationName}
                onClick={() => changeFormation(formationName)}
                style={{
                  ...buttonStyle,
                  background: formation === formationName ? "#0f172a" : "white",
                  color: formation === formationName ? "white" : "#0f172a",
                }}
              >
                {formationName}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: layoutColumns, gap: 12, alignItems: "start" }}>
          <FormationBoard
            formation={formation}
            positions={positions}
            playerMap={playerMap}
            selectedPlayerId={selectedPlayerId}
            editingMatchNo={editingMatchNo}
            matchNo={matchNo}
            zoom={boardZoom}
            onChangeFormation={changeFormation}
            onPlacePlayer={placePlayerToPosition}
            onRemoveFromPosition={removeFromPosition}
            onSelectPlayer={setSelectedPlayerId}
          />
          <div>
            {selectedPlayerId && <button onClick={() => setSelectedPlayerId(null)} style={{ ...buttonStyle, marginBottom: 10, width: "100%" }}>選択解除</button>}
            <MemberTable
              players={players}
              totals={totals}
              selectedPlayerId={selectedPlayerId}
              assignedPositionByPlayerId={assignedPositionByPlayerId}
              onSelectPlayer={setSelectedPlayerId}
            />
            <SavedMatchList savedMatches={savedMatches} onStartEditMatch={startEditMatch} onDeleteMatch={deleteMatch} />
            <div style={{ marginTop: 8, background: "white", borderRadius: 16, padding: 6, fontSize: 10 }}>
              <b>CSV形式</b>
              <pre style={{ background: "#f8fafc", padding: 8, borderRadius: 12, overflow: "auto", margin: "8px 0 0" }}>{SAMPLE_CSV}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
