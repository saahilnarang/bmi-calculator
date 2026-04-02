import { useState } from "react"

const BMI_CATEGORIES = [
  { label: "Underweight", range: [0, 18.5], color: "#3b82f6" },
  { label: "Normal weight", range: [18.5, 25], color: "#22c55e" },
  { label: "Overweight", range: [25, 30], color: "#f59e0b" },
  { label: "Obese", range: [30, Infinity], color: "#ef4444" },
]

function getBMICategory(bmi) {
  return BMI_CATEGORIES.find(({ range }) => bmi >= range[0] && bmi < range[1])
}

async function apiFetchTips({ bmi, category, unit, weight, height }) {
  const prompt = `I just calculated my BMI. Here are my stats:
- BMI: ${bmi.toFixed(1)}
- Category: ${category}
- Weight: ${weight} ${unit === "imperial" ? "lbs" : "kg"}
- Height: ${height}

Please give me 4 concise, practical, personalized health tips based on my BMI category.
Format them as a numbered list. Keep each tip under 2 sentences. Be encouraging but honest.`

  const res = await fetch("/api/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-opus-4-6",
      max_tokens: 512,
      messages: [{ role: "user", content: prompt }],
    }),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err?.error?.message || "API request failed")
  }

  const data = await res.json()
  return data.content?.[0]?.text || "No response received."
}

export default function App() {
  const [unit, setUnit] = useState("imperial")

  // Imperial inputs
  const [feet, setFeet] = useState("")
  const [inches, setInches] = useState("")
  const [lbs, setLbs] = useState("")

  // Metric inputs
  const [cm, setCm] = useState("")
  const [kg, setKg] = useState("")

  const [bmi, setBmi] = useState(null)
  const [category, setCategory] = useState(null)
  const [tips, setTips] = useState("")
  const [loadingTips, setLoadingTips] = useState(false)
  const [error, setError] = useState("")

  function calculateBMI() {
    setError("")
    setTips("")
    setBmi(null)
    setCategory(null)

    let bmiValue
    if (unit === "imperial") {
      const totalInches = parseFloat(feet) * 12 + parseFloat(inches || 0)
      const weight = parseFloat(lbs)
      if (!totalInches || !weight || totalInches <= 0 || weight <= 0) {
        setError("Please enter valid height and weight.")
        return
      }
      bmiValue = (703 * weight) / (totalInches * totalInches)
    } else {
      const heightCm = parseFloat(cm)
      const weightKg = parseFloat(kg)
      if (!heightCm || !weightKg || heightCm <= 0 || weightKg <= 0) {
        setError("Please enter valid height and weight.")
        return
      }
      const heightM = heightCm / 100
      bmiValue = weightKg / (heightM * heightM)
    }

    if (bmiValue < 10 || bmiValue > 80) {
      setError("Please double-check your inputs — BMI seems out of range.")
      return
    }

    const cat = getBMICategory(bmiValue)
    setBmi(bmiValue)
    setCategory(cat)
  }

  async function handleGetTips() {
    if (!bmi || !category) return
    setLoadingTips(true)
    setError("")
    setTips("")

    try {
      const heightDisplay =
        unit === "imperial"
          ? `${feet}' ${inches || 0}"`
          : `${cm} cm`

      const text = await apiFetchTips({
        bmi,
        category: category.label,
        unit,
        weight: unit === "imperial" ? lbs : kg,
        height: heightDisplay,
      })
      setTips(text)
    } catch (err) {
      setError("Failed to get tips: " + err.message)
    } finally {
      setLoadingTips(false)
    }
  }

  function reset() {
    setFeet(""); setInches(""); setLbs("")
    setCm(""); setKg("")
    setBmi(null); setCategory(null)
    setTips(""); setError("")
  }

  const gaugePercent = bmi ? Math.min(Math.max(((bmi - 10) / 40) * 100, 0), 100) : null

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>⚕️ BMI Health Calculator</h1>
        <p style={styles.subtitle}>Powered by Claude AI</p>

        {/* Unit Toggle */}
        <div style={styles.toggleRow}>
          {["imperial", "metric"].map((u) => (
            <button
              key={u}
              onClick={() => { setUnit(u); reset() }}
              style={{ ...styles.toggleBtn, ...(unit === u ? styles.toggleActive : {}) }}
            >
              {u === "imperial" ? "🇺🇸 Imperial (lbs/ft)" : "🌍 Metric (kg/cm)"}
            </button>
          ))}
        </div>

        {/* Inputs */}
        <div style={styles.inputGroup}>
          {unit === "imperial" ? (
            <>
              <label style={styles.label}>Height</label>
              <div style={styles.row}>
                <input style={styles.input} type="number" placeholder="Feet" min="1" max="9"
                  value={feet} onChange={e => setFeet(e.target.value)} />
                <input style={styles.input} type="number" placeholder="Inches" min="0" max="11"
                  value={inches} onChange={e => setInches(e.target.value)} />
              </div>
              <label style={styles.label}>Weight (lbs)</label>
              <input style={{ ...styles.input, width: "100%" }} type="number" placeholder="e.g. 175"
                value={lbs} onChange={e => setLbs(e.target.value)} />
            </>
          ) : (
            <>
              <label style={styles.label}>Height (cm)</label>
              <input style={{ ...styles.input, width: "100%" }} type="number" placeholder="e.g. 175"
                value={cm} onChange={e => setCm(e.target.value)} />
              <label style={styles.label}>Weight (kg)</label>
              <input style={{ ...styles.input, width: "100%" }} type="number" placeholder="e.g. 70"
                value={kg} onChange={e => setKg(e.target.value)} />
            </>
          )}
        </div>

        {error && <p style={styles.error}>{error}</p>}

        <button style={styles.primaryBtn} onClick={calculateBMI}>
          Calculate BMI
        </button>

        {/* Result */}
        {bmi && category && (
          <div style={styles.result}>
            <div style={{ ...styles.bmiScore, color: category.color }}>
              {bmi.toFixed(1)}
            </div>
            <div style={{ ...styles.categoryBadge, background: category.color }}>
              {category.label}
            </div>

            {/* Gauge bar */}
            <div style={styles.gaugeTrack}>
              {BMI_CATEGORIES.map((c, i) => (
                <div key={i} style={{ flex: 1, background: c.color, height: "100%",
                  borderRadius: i === 0 ? "4px 0 0 4px" : i === 3 ? "0 4px 4px 0" : "0" }} />
              ))}
              <div style={{ ...styles.gaugeMarker, left: `${gaugePercent}%` }} />
            </div>
            <div style={styles.gaugeLabels}>
              <span>Underweight</span><span>Normal</span><span>Overweight</span><span>Obese</span>
            </div>

            <button style={styles.tipsBtn} onClick={handleGetTips} disabled={loadingTips}>
              {loadingTips ? "⏳ Getting your tips..." : "✨ Get AI Health Tips"}
            </button>
          </div>
        )}

        {/* AI Tips */}
        {tips && (
          <div style={styles.tipsBox}>
            <h3 style={styles.tipsTitle}>🤖 Personalized Health Tips</h3>
            <p style={styles.tipsText}>{tips}</p>
          </div>
        )}

        {bmi && (
          <button style={styles.resetBtn} onClick={reset}>↩ Reset</button>
        )}
      </div>
    </div>
  )
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
    fontFamily: "'Segoe UI', system-ui, sans-serif",
  },
  card: {
    background: "#fff",
    borderRadius: "20px",
    padding: "36px",
    maxWidth: "480px",
    width: "100%",
    boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
  },
  title: { margin: 0, fontSize: "1.8rem", fontWeight: 700, color: "#1e1e2e", textAlign: "center" },
  subtitle: { textAlign: "center", color: "#888", marginTop: "4px", marginBottom: "24px" },
  toggleRow: { display: "flex", gap: "8px", marginBottom: "24px" },
  toggleBtn: {
    flex: 1, padding: "10px 8px", border: "2px solid #e2e8f0", borderRadius: "10px",
    cursor: "pointer", background: "#f8fafc", fontSize: "0.85rem", fontWeight: 500,
    transition: "all 0.2s",
  },
  toggleActive: { borderColor: "#667eea", background: "#eef2ff", color: "#667eea" },
  inputGroup: { marginBottom: "16px" },
  label: { display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#374151", marginBottom: "6px", marginTop: "12px" },
  row: { display: "flex", gap: "10px" },
  input: {
    flex: 1, padding: "12px 14px", border: "2px solid #e2e8f0", borderRadius: "10px",
    fontSize: "1rem", outline: "none", transition: "border-color 0.2s",
    boxSizing: "border-box",
  },
  error: { color: "#ef4444", fontSize: "0.875rem", marginBottom: "8px" },
  primaryBtn: {
    width: "100%", padding: "14px", background: "linear-gradient(135deg, #667eea, #764ba2)",
    color: "#fff", border: "none", borderRadius: "12px", fontSize: "1rem",
    fontWeight: 600, cursor: "pointer", marginTop: "8px",
  },
  result: { textAlign: "center", marginTop: "28px" },
  bmiScore: { fontSize: "4rem", fontWeight: 800, lineHeight: 1 },
  categoryBadge: {
    display: "inline-block", color: "#fff", padding: "4px 16px",
    borderRadius: "20px", fontSize: "0.9rem", fontWeight: 600, marginTop: "8px",
  },
  gaugeTrack: {
    display: "flex", height: "12px", borderRadius: "6px", overflow: "visible",
    marginTop: "20px", position: "relative",
  },
  gaugeMarker: {
    position: "absolute", top: "-4px", width: "4px", height: "20px",
    background: "#1e1e2e", borderRadius: "2px", transform: "translateX(-50%)",
    transition: "left 0.5s ease",
  },
  gaugeLabels: {
    display: "flex", justifyContent: "space-between",
    fontSize: "0.7rem", color: "#888", marginTop: "6px",
  },
  tipsBtn: {
    marginTop: "20px", padding: "12px 28px",
    background: "linear-gradient(135deg, #f093fb, #f5576c)",
    color: "#fff", border: "none", borderRadius: "12px",
    fontSize: "0.95rem", fontWeight: 600, cursor: "pointer",
  },
  tipsBox: {
    background: "#f8fafc", borderRadius: "12px", padding: "20px",
    marginTop: "20px", borderLeft: "4px solid #667eea",
  },
  tipsTitle: { margin: "0 0 10px", color: "#1e1e2e", fontSize: "1rem" },
  tipsText: { margin: 0, color: "#374151", lineHeight: "1.7", fontSize: "0.9rem", whiteSpace: "pre-wrap" },
  resetBtn: {
    width: "100%", marginTop: "16px", padding: "10px",
    background: "transparent", border: "2px solid #e2e8f0",
    borderRadius: "10px", cursor: "pointer", color: "#888", fontSize: "0.9rem",
  },
}
