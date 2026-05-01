"use client";

import { useState, useRef, useEffect } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type AlgoKey = "bubble" | "selection" | "insertion" | "quick";
type SortState = "comparing" | "swapping" | "done";
type BtnMode = "go" | "pause" | "resume";

interface Step {
  arr: number[];
  state: SortState;
  active: Set<number>;
  sorted: Set<number>;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const COLORS = {
  default: "#3a3a38",
  comparing: "#EF9F27",
  swapping: "#E24B4A",
  sorted: "#1D9E75",
};

const DARK = {
  bg: "#0d0d0d",
  surface: "#161616",
  surfaceAlt: "#1e1e1e",
  border: "#2a2a2a",
  borderStrong: "#404040",
  text1: "#e8e8e8",
  text2: "#888888",
  text3: "#555555",
  btnPrimary: "#e8e8e8",
  btnPrimaryText: "#0d0d0d",
};

const ALGO_KEYS: AlgoKey[] = ["bubble", "selection", "insertion", "quick"];

const ALGO_META: Record<
  AlgoKey,
  { label: string; complexity: string; description: string }
> = {
  bubble: {
    label: "Bubble sort",
    complexity: "O(n²) avg · O(n) best",
    description:
      'Imagine scanning a row of cards from left to right. Whenever two neighboring cards are in the wrong order, you swap them. You keep repeating this full sweep until an entire pass completes with zero swaps — meaning everything is in place. Each pass "bubbles" the next largest value to its final spot on the right, so you do slightly less work each time. It\'s one of the simplest sorting algorithms to understand, but not the most efficient for large datasets.',
  },
  selection: {
    label: "Selection sort",
    complexity: "O(n²) all cases",
    description:
      "Think of picking the smallest card from an unsorted pile and placing it at the front of a new sorted pile, then picking the next smallest, and so on. Each pass scans the entire remaining unsorted portion to find the minimum value, then drops it into its correct position. Unlike bubble sort, it makes at most n−1 swaps total — but since it always scans everything regardless of how sorted the data already is, it never gets a \"lucky\" fast run.",
  },
  insertion: {
    label: "Insertion sort",
    complexity: "O(n²) avg · O(n) best",
    description:
      "This is how most people naturally sort a hand of playing cards. You pick up one card at a time from the unsorted pile and slide it leftward through your already-sorted hand until it lands in the right spot. The left portion of the array is always fully sorted, and it grows by one element each pass. On data that is already nearly sorted, this algorithm is extremely fast — it barely needs to move anything at all.",
  },
  quick: {
    label: "Quick sort",
    complexity: "O(n log n) avg · O(n²) worst",
    description:
      'Pick one element — called the "pivot" — and rearrange the array so that everything smaller than the pivot sits to its left and everything larger sits to its right. The pivot is now in its exact final position. Apply the same logic recursively to the left half and the right half, and keep dividing until each sub-array contains just one element. This divide-and-conquer approach is why it\'s called "quick" — on average it\'s one of the fastest general-purpose sorting algorithms, though a consistently poor pivot choice can slow it down to O(n²).',
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function genArray(n: number): number[] {
  return Array.from({ length: n }, () => rand(4, 100));
}

function getDelay(speed: number): number {
  // speed 1 → ~400ms, speed 50 → ~20ms, speed 100 → ~1ms (log scale)
  return Math.round(Math.pow(400, 1 - (speed - 1) / 99));
}

function computeColors(
  arr: number[],
  state: SortState,
  active: Set<number>,
  sorted: Set<number>
): string[] {
  return arr.map((_, i) => {
    if (active.has(i))
      return state === "swapping" ? COLORS.swapping : COLORS.comparing;
    if (sorted.has(i)) return COLORS.sorted;
    return COLORS.default;
  });
}

// ─── Sorting Generators ───────────────────────────────────────────────────────

function* bubbleSort(a: number[]): Generator<Step> {
  const sorted = new Set<number>();
  for (let i = 0; i < a.length - 1; i++) {
    for (let j = 0; j < a.length - i - 1; j++) {
      yield {
        arr: [...a],
        state: "comparing",
        active: new Set([j, j + 1]),
        sorted: new Set(sorted),
      };
      if (a[j] > a[j + 1]) {
        [a[j], a[j + 1]] = [a[j + 1], a[j]];
        yield {
          arr: [...a],
          state: "swapping",
          active: new Set([j, j + 1]),
          sorted: new Set(sorted),
        };
      }
    }
    sorted.add(a.length - 1 - i);
  }
  sorted.add(0);
  yield {
    arr: [...a],
    state: "done",
    active: new Set(),
    sorted: new Set(a.map((_, i) => i)),
  };
}

function* selectionSort(a: number[]): Generator<Step> {
  const sorted = new Set<number>();
  for (let i = 0; i < a.length - 1; i++) {
    let mi = i;
    for (let j = i + 1; j < a.length; j++) {
      yield {
        arr: [...a],
        state: "comparing",
        active: new Set([mi, j]),
        sorted: new Set(sorted),
      };
      if (a[j] < a[mi]) mi = j;
    }
    if (mi !== i) {
      [a[i], a[mi]] = [a[mi], a[i]];
      yield {
        arr: [...a],
        state: "swapping",
        active: new Set([i, mi]),
        sorted: new Set(sorted),
      };
    }
    sorted.add(i);
  }
  sorted.add(a.length - 1);
  yield {
    arr: [...a],
    state: "done",
    active: new Set(),
    sorted: new Set(a.map((_, i) => i)),
  };
}

function* insertionSort(a: number[]): Generator<Step> {
  const sorted = new Set<number>([0]);
  for (let i = 1; i < a.length; i++) {
    let j = i;
    while (j > 0) {
      yield {
        arr: [...a],
        state: "comparing",
        active: new Set([j - 1, j]),
        sorted: new Set(sorted),
      };
      if (a[j] < a[j - 1]) {
        [a[j], a[j - 1]] = [a[j - 1], a[j]];
        yield {
          arr: [...a],
          state: "swapping",
          active: new Set([j - 1, j]),
          sorted: new Set(sorted),
        };
        j--;
      } else break;
    }
    for (let k = 0; k <= i; k++) sorted.add(k);
  }
  yield {
    arr: [...a],
    state: "done",
    active: new Set(),
    sorted: new Set(a.map((_, i) => i)),
  };
}

function* quickSort(a: number[]): Generator<Step> {
  if (a.length <= 1) {
    yield {
      arr: [...a],
      state: "done",
      active: new Set(),
      sorted: new Set([0]),
    };
    return;
  }
  const sorted = new Set<number>();
  const stack: [number, number][] = [[0, a.length - 1]];

  while (stack.length) {
    const [lo, hi] = stack.pop()!;
    if (lo >= hi) {
      sorted.add(lo);
      continue;
    }
    const pivot = a[hi];
    let i = lo - 1;
    for (let j = lo; j < hi; j++) {
      yield {
        arr: [...a],
        state: "comparing",
        active: new Set([j, hi]),
        sorted: new Set(sorted),
      };
      if (a[j] <= pivot) {
        i++;
        if (i !== j) {
          [a[i], a[j]] = [a[j], a[i]];
          yield {
            arr: [...a],
            state: "swapping",
            active: new Set([i, j]),
            sorted: new Set(sorted),
          };
        }
      }
    }
    const pi = i + 1;
    if (pi !== hi) {
      [a[pi], a[hi]] = [a[hi], a[pi]];
      yield {
        arr: [...a],
        state: "swapping",
        active: new Set([pi, hi]),
        sorted: new Set(sorted),
      };
    }
    sorted.add(pi);
    if (pi - 1 === lo) sorted.add(lo);
    if (pi + 1 === hi) sorted.add(hi);
    if (lo < pi - 1) stack.push([lo, pi - 1]);
    if (pi + 1 < hi) stack.push([pi + 1, hi]);
  }
  yield {
    arr: [...a],
    state: "done",
    active: new Set(),
    sorted: new Set(a.map((_, i) => i)),
  };
}

const ALGO_FNS: Record<AlgoKey, (a: number[]) => Generator<Step>> = {
  bubble: bubbleSort,
  selection: selectionSort,
  insertion: insertionSort,
  quick: quickSort,
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function SortVisualizer() {
  const [algo, setAlgo] = useState<AlgoKey>("bubble");
  const [barHeights, setBarHeights] = useState<number[]>([]);
  const [barColors, setBarColors] = useState<string[]>([]);
  const [cmps, setCmps] = useState(0);
  const [swaps, setSwaps] = useState(0);
  const [status, setStatus] = useState("ready");
  const [btnMode, setBtnMode] = useState<BtnMode>("go");
  const [speed, setSpeed] = useState(60);
  const [barCount, setBarCount] = useState(40);

  // Mutable refs — don't trigger re-renders
  const genRef = useRef<Generator<Step> | null>(null);
  const tidRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pausedRef = useRef(false);
  const speedRef = useRef(60);
  const cmpsRef = useRef(0);
  const swapsRef = useRef(0);

  // stepRef holds an always-fresh copy of step so setTimeout never closes over stale state
  const stepRef = useRef<() => void>(() => {});
  stepRef.current = () => {
    if (!genRef.current || pausedRef.current) return;
    const result = genRef.current.next();
    if (result.done || !result.value) {
      genRef.current = null;
      setBtnMode("go");
      setStatus("sorted!");
      return;
    }
    const { arr, state, active, sorted } = result.value;
    if (state === "comparing") {
      cmpsRef.current++;
      setCmps(cmpsRef.current);
    }
    if (state === "swapping") {
      swapsRef.current++;
      setSwaps(swapsRef.current);
    }
    setBarHeights([...arr]);
    setBarColors(computeColors(arr, state, active, sorted));
    if (state === "done") {
      genRef.current = null;
      setBtnMode("go");
      setStatus("sorted!");
      return;
    }
    tidRef.current = setTimeout(
      () => stepRef.current(),
      getDelay(speedRef.current)
    );
  };

  const stopAnim = () => {
    if (tidRef.current) clearTimeout(tidRef.current);
    tidRef.current = null;
    pausedRef.current = false;
    genRef.current = null;
  };

  const startSort = (key: AlgoKey, heights: number[]) => {
    stopAnim();
    cmpsRef.current = 0;
    swapsRef.current = 0;
    setCmps(0);
    setSwaps(0);
    genRef.current = ALGO_FNS[key]([...heights]);
    pausedRef.current = false;
    setBtnMode("pause");
    setStatus("sorting…");
    stepRef.current();
  };

  const handleGo = () => {
    if (btnMode === "go") {
      startSort(algo, barHeights);
    } else if (btnMode === "pause") {
      pausedRef.current = true;
      if (tidRef.current) clearTimeout(tidRef.current);
      setBtnMode("resume");
      setStatus("paused");
    } else {
      pausedRef.current = false;
      setBtnMode("pause");
      setStatus("sorting…");
      stepRef.current();
    }
  };

  const handleShuffle = () => {
    stopAnim();
    cmpsRef.current = 0;
    swapsRef.current = 0;
    setCmps(0);
    setSwaps(0);
    const a = genArray(barCount);
    setBarHeights(a);
    setBarColors(a.map(() => COLORS.default));
    setBtnMode("go");
    setStatus("ready");
  };

  const handleAlgoChange = (key: AlgoKey) => {
    if (btnMode === "pause") return;
    stopAnim();
    setAlgo(key);
    setCmps(0);
    setSwaps(0);
    cmpsRef.current = 0;
    swapsRef.current = 0;
    setBtnMode("go");
    setStatus("ready");
    setBarColors(barHeights.map(() => COLORS.default));
  };

  const handleBarCountChange = (v: number) => {
    setBarCount(v);
    if (btnMode !== "pause") {
      stopAnim();
      const a = genArray(v);
      setBarHeights(a);
      setBarColors(a.map(() => COLORS.default));
      setCmps(0);
      setSwaps(0);
      cmpsRef.current = 0;
      swapsRef.current = 0;
      setBtnMode("go");
      setStatus("ready");
    }
  };

  // Initialize on mount
  useEffect(() => {
    const a = genArray(40);
    setBarHeights(a);
    setBarColors(a.map(() => COLORS.default));
    return () => {
      if (tidRef.current) clearTimeout(tidRef.current);
    };
  }, []);

  const isRunning = btnMode === "pause";
  const meta = ALGO_META[algo];

  // ─── Inline style helpers ──────────────────────────────────────────────────

  const tabStyle = (key: AlgoKey): React.CSSProperties => ({
    background: algo === key ? DARK.surfaceAlt : "transparent",
    border: `0.5px solid ${algo === key ? DARK.borderStrong : DARK.border}`,
    borderRadius: 8,
    padding: "6px 14px",
    fontSize: 13,
    cursor: isRunning && algo !== key ? "default" : "pointer",
    color: algo === key ? DARK.text1 : DARK.text2,
    fontWeight: algo === key ? 500 : 400,
    opacity: isRunning && algo !== key ? 0.4 : 1,
    transition: "all 0.1s",
    fontFamily: "inherit",
  });

  const primaryBtnStyle: React.CSSProperties = {
    minWidth: 96,
    padding: "8px 20px",
    background:
      btnMode === "go" || btnMode === "resume"
        ? DARK.btnPrimary
        : "transparent",
    color:
      btnMode === "go" || btnMode === "resume"
        ? DARK.btnPrimaryText
        : DARK.text1,
    border: `0.5px solid ${btnMode === "go" || btnMode === "resume" ? DARK.btnPrimary : DARK.borderStrong}`,
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    letterSpacing: "0.04em",
    fontFamily: "inherit",
    transition: "all 0.1s",
  };

  const secondaryBtnStyle: React.CSSProperties = {
    padding: "8px 16px",
    background: "transparent",
    color: DARK.text1,
    border: `0.5px solid ${DARK.border}`,
    borderRadius: 8,
    fontSize: 14,
    cursor: "pointer",
    fontFamily: "inherit",
  };

  const sliderLabelStyle: React.CSSProperties = {
    fontSize: 12,
    color: DARK.text2,
    minWidth: 36,
    fontFamily: "inherit",
  };

  const monoStyle: React.CSSProperties = {
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
  };

  return (
    <div
      style={{
        background: DARK.bg,
        minHeight: "100vh",
        padding: "2rem 1.5rem",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        color: DARK.text1,
        boxSizing: "border-box",
      }}
    >
      <div style={{ maxWidth: 780, margin: "0 auto" }}>

        {/* ── Header ── */}
        <div style={{ marginBottom: "1.75rem" }}>
          <h1
            style={{
              margin: "0 0 4px",
              fontSize: 22,
              fontWeight: 500,
              color: DARK.text1,
            }}
          >
            Sorting algorithms
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: DARK.text2 }}>
            Select an algorithm, hit GO, and watch it work.
          </p>
        </div>

        {/* ── Algorithm tabs ── */}
        <div
          style={{
            display: "flex",
            gap: 6,
            marginBottom: "1rem",
            flexWrap: "wrap",
          }}
        >
          {ALGO_KEYS.map((key) => (
            <button
              key={key}
              onClick={() => handleAlgoChange(key)}
              disabled={isRunning && algo !== key}
              style={tabStyle(key)}
            >
              {ALGO_META[key].label}
            </button>
          ))}
        </div>

        {/* ── Description card ── */}
        <div
          style={{
            background: DARK.surface,
            border: `0.5px solid ${DARK.border}`,
            borderRadius: 10,
            padding: "14px 18px",
            marginBottom: "1.25rem",
          }}
        >
          <div
            style={{
              ...monoStyle,
              fontSize: 11,
              color: DARK.text3,
              marginBottom: 7,
              letterSpacing: "0.02em",
            }}
          >
            {meta.complexity}
          </div>
          <p
            style={{
              margin: 0,
              fontSize: 14,
              lineHeight: 1.7,
              color: DARK.text2,
            }}
          >
            {meta.description}
          </p>
        </div>

        {/* ── Legend ── */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 14,
            marginBottom: 10,
          }}
        >
          {(
            [
              { color: COLORS.comparing, label: "comparing" },
              { color: COLORS.swapping, label: "swapping" },
              { color: COLORS.sorted, label: "sorted" },
            ] as { color: string; label: string }[]
          ).map(({ color, label }) => (
            <div
              key={label}
              style={{ display: "flex", alignItems: "center", gap: 5 }}
            >
              <div
                style={{
                  width: 9,
                  height: 9,
                  borderRadius: 2,
                  background: color,
                  flexShrink: 0,
                }}
              />
              <span style={{ fontSize: 11, color: DARK.text3 }}>{label}</span>
            </div>
          ))}
        </div>

        {/* ── Bar chart ── */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: 2,
            height: 220,
            borderBottom: `0.5px solid ${DARK.border}`,
            marginBottom: "1.25rem",
            overflow: "hidden",
          }}
        >
          {barHeights.map((h, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                minWidth: 2,
                height: `${h}%`,
                backgroundColor: barColors[i] ?? COLORS.default,
                borderRadius: "2px 2px 0 0",
                transition: "background-color 0.05s",
              }}
            />
          ))}
        </div>

        {/* ── Stats ── */}
        <div
          style={{ display: "flex", gap: 10, marginBottom: "1.25rem" }}
        >
          {(
            [
              { label: "Comparisons", value: cmps, mono: true },
              { label: "Swaps", value: swaps, mono: true },
              { label: "Status", value: status, mono: false },
            ] as { label: string; value: string | number; mono: boolean }[]
          ).map(({ label, value, mono }) => (
            <div
              key={label}
              style={{
                flex: 1,
                background: DARK.surface,
                border: `0.5px solid ${DARK.border}`,
                borderRadius: 8,
                padding: "10px 14px",
                textAlign: "center",
              }}
            >
              <div
                style={{ fontSize: 11, color: DARK.text3, marginBottom: 4 }}
              >
                {label}
              </div>
              <div
                style={{
                  fontSize: mono ? 22 : 15,
                  fontWeight: 500,
                  color: DARK.text1,
                  ...(mono ? monoStyle : {}),
                }}
              >
                {value}
              </div>
            </div>
          ))}
        </div>

        {/* ── Primary controls ── */}
        <div
          style={{
            display: "flex",
            gap: 8,
            marginBottom: 12,
            alignItems: "center",
          }}
        >
          <button onClick={handleGo} style={primaryBtnStyle}>
            {btnMode === "go" ? "GO" : btnMode === "pause" ? "PAUSE" : "RESUME"}
          </button>
          <button onClick={handleShuffle} style={secondaryBtnStyle}>
            Shuffle
          </button>
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginLeft: 8,
            }}
          >
            <span style={sliderLabelStyle}>Speed</span>
            <input
              type="range"
              min={1}
              max={100}
              value={speed}
              step={1}
              style={{ flex: 1, accentColor: DARK.text1 }}
              onChange={(e) => {
                const v = Number(e.target.value);
                setSpeed(v);
                speedRef.current = v;
              }}
            />
            <span
              style={{
                ...sliderLabelStyle,
                ...monoStyle,
                minWidth: 28,
                textAlign: "right",
              }}
            >
              {speed}
            </span>
          </div>
        </div>

        {/* ── Bar count ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={sliderLabelStyle}>Bars</span>
          <input
            type="range"
            min={10}
            max={70}
            value={barCount}
            step={1}
            style={{ flex: 1, accentColor: DARK.text1 }}
            onChange={(e) => handleBarCountChange(Number(e.target.value))}
          />
          <span
            style={{
              ...sliderLabelStyle,
              ...monoStyle,
              minWidth: 28,
              textAlign: "right",
            }}
          >
            {barCount}
          </span>
        </div>

      </div>
    </div>
  );
}
