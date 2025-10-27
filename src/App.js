import React, { useState, useEffect, useMemo } from "react";
import fundoImg from './assets/cegonha.png';

const MAX_GIFTS = { "Fralda RN": 10, "Fralda P": 20, "Fralda M": 30, "Fralda G": 30 };

export default function App() {
  const [guests, setGuests] = useState([]);
  const [totals, setTotals] = useState(MAX_GIFTS);
  const [activeTab, setActiveTab] = useState("passaporte");
  const [selectedForGifts, setSelectedForGifts] = useState(null);
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [tabTransition, setTabTransition] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState(null);

  const darkMode = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;

  useEffect(() => {
  fetch('https://convite-catarine-2iawhhbnk-gabriels-projects-fca19e5c.vercel.app/api/data')
    .then(res => res.json())
    .then(data => {
      setGuests(Object.values(data.guests || {}));
      setTotals(data.totals || MAX_GIFTS);
    })
    .catch(err => setError("Erro ao conectar ao backend: " + err.message));
}, []);

function updateGuest(index, patch) {
  const updatedGuests = [...guests];
  updatedGuests[index] = { ...updatedGuests[index], ...patch };
  setGuests(updatedGuests);

  fetch('https://convite-catarine-2iawhhbnk-gabriels-projects-fca19e5c.vercel.app/api/guests', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updatedGuests[index]),
  })
    .catch(err => setError("Erro ao atualizar convidado: " + err.message));
}

  function removeGuest(i) {
    const updatedGuests = guests.filter((_, idx) => idx !== i);
    setGuests(updatedGuests);
    // Aqui você pode enviar uma requisição DELETE se quiser, mas por simplicidade, vamos confiar no frontend por agora
  }

  function openGiftsFor(index) {
    setSelectedForGifts(index);
  }

  function clearGuestList() {
    if (window.confirm("Tem certeza que deseja limpar toda a lista de check-ins?")) {
      setGuests([]);
      // Enviar para o backend para limpar (opcional, implementar depois)
    }
  }

  function confirmAllAndSend() {
    if (guests.length === 0) {
      alert("Adicione pelo menos um check-in antes de confirmar.");
      return;
    }

    const missing = guests.some(g => !g.name || !g.name.trim());
    if (missing) {
      alert("Por favor, preencha o nome de todos os check-ins antes de confirmar.");
      return;
    }

    const missingAdultGifts = guests.some(g => parseInt(g.age) >= 18 && !Object.values(g.gifts || {}).some(v => v));
    if (missingAdultGifts) {
      alert("Por favor, selecione pelo menos um presente para cada adulto antes de confirmar.");
      return;
    }

    setIsSending(true);

    const parts = guests.map(g => {
      const isChild = parseInt(g.age) < 18 || !g.age;
      const nameWithTag = isChild ? `${g.name} (criança)` : g.name;
      const ageStr = g.age ? `${g.age} anos` : "idade não informada";
      if (!isChild) {
        const selected = Object.keys(g.gifts || {}).filter(k => g.gifts[k]);
        const giftsStr = selected.length ? selected.join(", ") : "apenas presença";
        const mimoStr = g.mimo && g.mimo.trim() ? ` e um mimo especial: ${g.mimo.trim()}` : "";
        return `${nameWithTag} (${ageStr}): Presente${selected.length > 1 ? "s" : ""}: ${giftsStr}${mimoStr}`;
      } else {
        return `${nameWithTag} (${ageStr}): Presença confirmada`;
      }
    });

    const message = `Olá! Estamos confirmando nossa presença para o chá de bebê!\n\n${parts.join("\n")}\n\nEstamos muito animados para compartilhar esse momento especial com você! Até lá!`;
    const encodedMessage = encodeURIComponent(message);
    const url = `https://wa.me/5513996292499?text=${encodedMessage}`;

    try {
      if (/iPhone|iPad|iPod/.test(navigator.userAgent) && !window.open(url, "_blank")) {
        location.href = url;
      } else {
        window.open(url, "_blank");
      }
      setIsSending(false);
    } catch (error) {
      setError("Erro ao abrir o WhatsApp: " + error.message);
      setIsSending(false);
    }
  }

  if (error) {
    return (
      <div style={styles.errorContainer}>
        <h2 style={{ color: "#ff85b3" }}>Ocorreu um erro</h2>
        <p>{error}</p>
        <button style={{ ...styles.confirmButton, color: darkMode ? "#ff85b3" : "#fff" }} onClick={() => setError(null)}>Tentar novamente</button>
      </div>
    );
  }

  return (
    <>
      <GlobalStyles />
      <div
        style={{
          ...styles.page,
          backgroundImage: fundoImg ? `url(${fundoImg})` : "none",
          transition: "transform 0.5s ease",
        }}
        onMouseMove={(e) => {
          const { clientX, clientY } = e;
          const centerX = window.innerWidth / 2;
          const centerY = window.innerHeight / 2;
          const moveX = (clientX - centerX) / 100;
          const moveY = (clientY - centerY) / 100;
          e.currentTarget.style.transform = `scale(1.05) translate(${moveX}px, ${moveY}px)`;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "scale(1)";
        }}
      >
        <div className="particle" />
        <div className="particle" />
        <div className="particle" />
        <div className="particle" />
        <div className="particle" />
        <div style={darkMode ? styles.darkCard : styles.card}>
          <div style={styles.tabs}>
            <button
              style={
                activeTab === "passaporte"
                  ? { ...styles.tab, ...styles.tabActive }
                  : { ...styles.tab, color: darkMode ? "#ff85b3" : "#333" }
              }
              onClick={() => setActiveTab("passaporte")}
              aria-selected={activeTab === "passaporte"}
              role="tab"
              aria-label="Aba Passaporte"
            >
              Passaporte
            </button>
            <button
              style={
                activeTab === "checkin"
                  ? { ...styles.tab, ...styles.tabActive }
                  : { ...styles.tab, color: darkMode ? "#ff85b3" : "#333" }
              }
              onClick={() => setActiveTab("checkin")}
              aria-selected={activeTab === "checkin"}
              role="tab"
              aria-label="Aba Fazer Check-in"
            >
              Fazer Check-in
            </button>
          </div>

          <div style={{ ...styles.tabContent, opacity: tabTransition ? 0 : 1, transform: tabTransition ? 'translateY(10px)' : 'translateY(0)' }}>
            {activeTab === "passaporte" && <Passaporte countdown={countdown} darkMode={darkMode} />}
            {activeTab === "checkin" && (
              <div>
                <h3 style={{ marginTop: 0, color: darkMode ? "#ffdfe8" : "#7f3b57" }}>Lista de Check-ins</h3>
                <p style={{ marginTop: 6, marginBottom: 14, fontSize: 14, color: darkMode ? "#ffdfe8" : "#7f3b57" }}>
                  Crianças não precisam levar presente.
                </p>
                <div style={{ marginBottom: 14, fontSize: 14, color: darkMode ? "#ffdfe8" : "#7f3b57" }}>
                  <strong>Presentes restantes disponíveis:</strong><br />
                  Fralda RN: {totals["Fralda RN"]}<br />
                  Fralda P: {totals["Fralda P"]}<br />
                  Fralda M: {totals["Fralda M"]}<br />
                  Fralda G: {totals["Fralda G"]}<br />
                  <small>(Atualização em tempo real via backend)</small>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {guests.map((g, i) => (
                    <div key={i} style={darkMode ? styles.darkGuestRow : styles.guestRow}>
                      <div style={{ flex: 1, display: "flex", gap: 6, alignItems: "center" }}>
                        <input
                          style={darkMode ? styles.darkNameInput : styles.nameInput}
                          placeholder="Nome"
                          value={g.name || ""}
                          onChange={e => updateGuest(i, { name: e.target.value })}
                        />
                        <input
                          style={darkMode ? styles.darkAgeInput : styles.ageInput}
                          placeholder="Idade"
                          value={g.age || ""}
                          onChange={e => updateGuest(i, { age: e.target.value.replace(/[^\d]/g, "") })}
                        />
                      </div>
                      <button onClick={() => openGiftsFor(i)} style={styles.presentButton}>🎀</button>
                      <button onClick={() => removeGuest(i)} style={{ ...styles.cancelButton, color: darkMode ? "#ff85b3" : "#333" }}>✖</button>
                    </div>
                  ))}
                  <AddGuestRow onAdd={(obj) => setGuests([...guests, { ...obj, gifts: { "Fralda RN": false, "Fralda P": false, "Fralda M": false, "Fralda G": false }, mimo: "" })} darkMode={darkMode} />
                </div>
                {selectedForGifts !== null && (
                  <GiftsEditor
                    guest={guests[selectedForGifts]}
                    guestIndex={selectedForGifts}
                    updateGuest={(patch) => updateGuest(selectedForGifts, patch)}
                    done={() => setSelectedForGifts(null)}
                    darkMode={darkMode}
                  />
                )}
                <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
                  <button style={styles.confirmButton} onClick={confirmAllAndSend} disabled={isSending}>
                    {isSending ? "Enviando..." : "Confirmar check-ins e enviar WhatsApp"}
                  </button>
                  <button style={{ ...styles.cancelButton, color: darkMode ? "#ff85b3" : "#333" }} onClick={clearGuestList}>
                    Limpar lista
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function Passaporte({ countdown, darkMode }) {
  return (
    <div style={darkMode ? { ...styles.darkPassport, color: "#fff" } : styles.passport}>
      <h2>Você está convidado!</h2>
      <p>📍 Local: Rua Doutor Carlos Alberto Curado 1561 - José Menino, Santos, SP</p>
      <p>📅 Data: 23/11/2025 | 🕒 Hora: 15:00</p>
      <p>Teremos bingo, brincadeiras e muitas surpresas! Venha pronto para se divertir 🎉</p>
      <p style={{ color: darkMode ? "#ffdfe8" : "#7f3b57" }}>Por favor, leve sua própria bebida 🍹</p>
      <div style={darkMode ? styles.darkCountdownBox : styles.countdownBox}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
          <CounterBlock label="dias" value={countdown.days} darkMode={darkMode} />
          <CounterBlock label="horas" value={countdown.hours} darkMode={darkMode} />
          <CounterBlock label="min" value={countdown.minutes} darkMode={darkMode} />
          <CounterBlock label="seg" value={countdown.seconds} darkMode={darkMode} />
        </div>
      </div>
    </div>
  );
}

function AddGuestRow({ onAdd, darkMode }) {
  const [name, setName] = useState("");
  const [age, setAge] = useState("");

  function handleAdd() {
    if (!name.trim()) {
      alert("Digite ao menos um nome.");
      return;
    }
    onAdd({ name: name.trim(), age: age ? age.trim() : "" });
    setName("");
    setAge("");
  }

  return (
    <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center", flexWrap: "wrap" }}>
      <input
        placeholder="Nome"
        value={name}
        onChange={e => setName(e.target.value)}
        style={darkMode ? styles.darkNameInput : styles.nameInput}
      />
      <input
        placeholder="Idade"
        value={age}
        onChange={e => setAge(e.target.value.replace(/[^\d]/g, ""))}
        style={darkMode ? styles.darkAgeInput : styles.ageInput}
      />
      <button style={{ ...styles.confirmButton, color: darkMode ? "#fff" : "#fff" }} onClick={handleAdd}>
        Salvar
      </button>
    </div>
  );
}

function GiftsEditor({ guest, guestIndex, updateGuest, done, darkMode }) {
  if (!guest) return null;

  function toggle(type) {
    const newGifts = { ...guest.gifts, [type]: !guest.gifts[type] };
    updateGuest({ gifts: newGifts });
  }

  function onMimoChange(e) {
    updateGuest({ mimo: e.target.value });
  }

  return (
    <div style={{ marginTop: 10, padding: 12, background: darkMode ? "#3e2836" : "#fff7fb", borderRadius: 10 }}>
      <div style={{ color: darkMode ? "#fff" : "#7f3b57" }}><strong>{guest.name}</strong> • {guest.age ? `${guest.age} anos` : "idade não informada"}</div>
      <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ fontWeight: 600, color: darkMode ? "#ffdfe8" : "#7f3b57" }}>Fraldas</div>
        {["Fralda RN", "Fralda P", "Fralda M", "Fralda G"].map(f => (
          <label key={f} style={{ color: darkMode ? "#fff" : "#333" }}>
            <input type="checkbox" checked={guest.gifts && guest.gifts[f]} onChange={() => toggle(f)} /> {f}
          </label>
        ))}
      </div>
      <div style={{ marginTop: 6 }}>
        <label style={{ color: darkMode ? "#ffdfe8" : "#7f3b57" }}>Quero levar outro mimo (opcional)</label>
        <input
          type="text"
          value={guest.mimo || ""}
          onChange={onMimoChange}
          style={darkMode ? styles.darkInput : styles.input}
        />
      </div>
      <div style={{ marginTop: 6 }}>
        <button style={{ ...styles.confirmButton, color: darkMode ? "#fff" : "#fff" }} onClick={done}>
          Salvar
        </button>
      </div>
    </div>
  );
}

function CounterBlock({ label, value, darkMode }) {
  return (
    <div style={darkMode ? styles.darkCounterBlock : styles.counterBlock}>
      <div style={{ ...styles.counterValue, color: darkMode ? "#fff" : "#7f3b57" }}>{String(value).padStart(2, "0")}</div>
      <div style={{ ...styles.counterLabel, color: darkMode ? "#ffdfe8" : "#7f3b57" }}>{label}</div>
    </div>
  );
}

const styles = {
  page: { minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center", padding: 20, backgroundSize: "cover", backgroundPosition: "center", backgroundRepeat: "no-repeat", fontFamily: "'Inter', 'Roboto', 'Arial', sans-serif", color: "#333", backgroundColor: "#f5f5f5", position: "relative", overflow: "hidden" },
  card: { width: "100%", maxWidth: 720, background: "rgba(255, 255, 255, 0.95)", padding: 24, borderRadius: 16, boxShadow: "0 12px 40px rgba(0, 0, 0, 0.1)", backdropFilter: "blur(8px)", zIndex: 20 },
  darkCard: { width: "100%", maxWidth: 720, background: "rgba(58, 43, 59, 0.9)", padding: 24, borderRadius: 16, boxShadow: "0 12px 40px rgba(0, 0, 0, 0.4)", backdropFilter: "blur(8px)", color: "#fff", zIndex: 20 },
  tabs: { display: "flex", gap: 10, marginBottom: 20 },
  tab: { flex: 1, padding: "12px 16px", background: "#f0f0f0", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 600, transition: "background 0.3s ease, transform 0.2s ease", color: "#333" },
  tabActive: { background: "#ff85b3", color: "#fff" },
  tabContent: { marginTop: 6, transition: "opacity 0.3s ease, transform 0.3s ease" },
  passport: { padding: 24, borderRadius: 12, background: "#fff7fb", textAlign: "center", boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)" },
  darkPassport: { padding: 24, borderRadius: 12, background: "#3e2836", textAlign: "center", boxShadow: "0 4px 12px rgba(0, 0, 0, 0.2)" },
  countdownBox: { background: "#fff0f5", padding: 16, borderRadius: 12, marginTop: 16 },
  darkCountdownBox: { background: "#4a2f3d", padding: 16, borderRadius: 12, marginTop: 16 },
  counterBlock: { background: "#fff", padding: "12px 8px", borderRadius: 10, textAlign: "center", flex: 1, boxShadow: "0 3px 10px rgba(0, 0, 0, 0.05)" },
  darkCounterBlock: { background: "#5a3a48", padding: "12px 8px", borderRadius: 10, textAlign: "center", flex: 1, boxShadow: "0 3px 10px rgba(0, 0, 0, 0.2)" },
  counterValue: { fontSize: 20, fontWeight: 800 },
  counterLabel: { fontSize: 12, opacity: 0.8 },
  guestRow: { display: "flex", gap: 12, alignItems: "center", background: "linear-gradient(90deg, rgba(255, 255, 255, 0.95), rgba(255, 244, 246, 0.85))", padding: 12, borderRadius: 12, boxShadow: "0 4px 12px rgba(171, 107, 140, 0.08)" },
  darkGuestRow: { display: "flex", gap: 12, alignItems: "center", background: "linear-gradient(90deg, rgba(78, 58, 79, 0.95), rgba(94, 62, 80, 0.85))", padding: 12, borderRadius: 12, boxShadow: "0 4px 12px rgba(0, 0, 0, 0.2)" },
  presentButton: { border: "none", background: "#ffc0cb", padding: 10, borderRadius: 8, cursor: "pointer", fontSize: 16, transition: "transform 0.2s ease, box-shadow 0.2s ease" },
  cancelButton: { border: "none", background: "#ffe4e9", padding: 8, borderRadius: 8, cursor: "pointer", fontSize: 14, transition: "background 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease", boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)", color: "#333" },
  confirmButton: { padding: "12px 18px", borderRadius: 10, background: "#ff85b3", border: "none", color: "#fff", cursor: "pointer", fontWeight: 700, transition: "background 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease", boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)" },
  nameInput: { flex: 1, padding: 12, borderRadius: 8, border: "1px solid #e7d6df", fontSize: 14, transition: "border 0.2s ease, box-shadow 0.2s ease" },
  darkNameInput: { flex: 1, padding: 12, borderRadius: 8, border: "1px solid #5a3a48", fontSize: 14, background: "#4a2f3d", color: "#fff", transition: "border 0.2s ease, box-shadow 0.2s ease" },
  ageInput: { width: 70, padding: 12, borderRadius: 8, border: "1px solid #e7d6df", fontSize: 14, transition: "border 0.2s ease, box-shadow 0.2s ease" },
  darkAgeInput: { width: 70, padding: 12, borderRadius: 8, border: "1px solid #5a3a48", fontSize: 14, background: "#4a2f3d", color: "#fff", transition: "border 0.2s ease, box-shadow 0.2s ease" },
  input: { width: "100%", padding: 12, borderRadius: 8, border: "1px solid #e7d6df", fontSize: 14, transition: "border 0.2s ease, box-shadow 0.2s ease" },
  darkInput: { width: "100%", padding: 12, borderRadius: 8, border: "1px solid #5a3a48", fontSize: 14, background: "#4a2f3d", color: "#fff", transition: "border 0.2s ease, box-shadow 0.2s ease" },
  errorContainer: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", textAlign: "center", padding: 20, backgroundColor: "#f5f5f5" },
};

function getDiff(target, current) {
  const diff = Math.max(0, target - current);
  const secs = Math.floor(diff / 1000);
  return {
    days: Math.floor(secs / (3600 * 24)),
    hours: Math.floor((secs % (3600 * 24)) / 3600),
    minutes: Math.floor((secs % 3600) / 60),
    seconds: secs % 60,
  };
}

const GlobalStyles = () => (
  <style>
    {`
      @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes fall { 0% { transform: translateY(-100vh) rotate(0deg); opacity: 0; } 10% { opacity: 1; } 100% { transform: translateY(100vh) rotate(360deg); opacity: 0; } }
      .particle { position: absolute; width: 10px; height: 10px; background: radial-gradient(circle, rgba(255, 182, 193, 0.8) 0%, rgba(255, 105, 180, 0.6) 100%); border-radius: 50%; animation: fall 6s infinite linear; zIndex: 10; }
      .particle:nth-child(1) { left: 10%; animation-delay: 0s; animation-duration: 5s; }
      .particle:nth-child(2) { left: 30%; animation-delay: 1s; animation-duration: 6s; }
      .particle:nth-child(3) { left: 50%; animation-delay: 2s; animation-duration: 5.5s; }
      .particle:nth-child(4) { left: 70%; animation-delay: 0.5s; animation-duration: 6.5s; }
      .particle:nth-child(5) { left: 90%; animation-delay: 1.5s; animation-duration: 5.8s; }
      button:hover:not(:disabled) { transform: scale(1.02); box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15); }
      input:focus { border-color: #ff85b3; box-shadow: 0 0 0 2px rgba(255, 133, 179, 0.2); }
    `}
  </style>
);