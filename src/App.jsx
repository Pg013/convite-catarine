import React, { useState, useEffect } from "react";
import fundoImg from "./assets/cegonha.png"; // imagem de fundo ajustada

const MAX_GIFTS = { "Fralda RN": 10, "Fralda P": 20, "Fralda M": 30, "Fralda G": 30 };

export default function App() {
  const eventISO = "2025-11-23T15:00:00-03:00";
  const eventDate = new Date(eventISO);

  const [activeTab, setActiveTab] = useState("passaporte");
  const [name, setName] = useState(() => localStorage.getItem("guestName") || "");
  const [confirmed, setConfirmed] = useState(() => localStorage.getItem("rsvpConfirmed") === "true");
  const [gifts, setGifts] = useState(() => {
    const stored = localStorage.getItem("gifts");
    return stored ? JSON.parse(stored) : { "Fralda RN": false, "Fralda P": false, "Fralda M": false, "Fralda G": false, mimo: "" };
  });
  const [countdown, setCountdown] = useState(getDiff(eventDate, new Date()));

  const darkMode = window.matchMedia("(prefers-color-scheme: dark)").matches;

  useEffect(() => {
    const interval = setInterval(() => setCountdown(getDiff(eventDate, new Date())), 1000);
    return () => clearInterval(interval);
  }, [eventDate]);

  function getDiff(target, current) {
    const diff = Math.max(0, target - current);
    const secs = Math.floor(diff / 1000);
    const days = Math.floor(secs / (3600 * 24));
    const hours = Math.floor((secs % (3600 * 24)) / 3600);
    const minutes = Math.floor((secs % 3600) / 60);
    const seconds = secs % 60;
    return { days, hours, minutes, seconds };
  }

  function handleConfirm(e) {
    e.preventDefault();
    if (!name.trim()) { alert("Por favor, escreva seu nome."); return; }
    localStorage.setItem("guestName", name.trim());
    localStorage.setItem("rsvpConfirmed", "true");
    setConfirmed(true);
    setActiveTab("presentes");
  }

  function handleCancel() {
    localStorage.removeItem("rsvpConfirmed");
    setConfirmed(false);
    setActiveTab("passaporte");
  }

  useEffect(() => {
    if (confirmed) {
      const all = JSON.parse(localStorage.getItem("allGuestsGifts") || "{}");
      all[name] = gifts;
      localStorage.setItem("allGuestsGifts", JSON.stringify(all));
    }
  }, [gifts, confirmed, name]);

  function sendWhatsApp() {
    const selected = Object.entries(gifts)
      .filter(([k,v]) => k==="mimo"?v.trim()!=="":v)
      .map(([k,v]) => k==="mimo"?`Mimo: ${v}`:k)
      .join(", ");
    const message = `Embarque Confirmado ✈️\nNome: ${name}\nPresentes: ${selected}\nMal posso esperar para te ver na comemoração! 💖🎉`;
    const url = `https://wa.me/5513996292499?text=${encodeURIComponent(message)}`;
    window.open(url,"_blank");
  }

  const themeStyles = {
    ...styles.page,
    backgroundImage: `url(${fundoImg})`,
    position: "relative",
    color: darkMode ? "#fff" : "#5b2a3a",
  };

  return (
    <div style={themeStyles}>
      {/* Card central */}
      <div style={darkMode?styles.darkCard:styles.card}>
        <div style={styles.tabs}>
          <button style={activeTab==="passaporte"?styles.tabActive:styles.tab} onClick={()=>setActiveTab("passaporte")}>Passaporte</button>
          <button style={activeTab==="rsvp"?styles.tabActive:styles.tab} onClick={()=>setActiveTab("rsvp")}>Fazer Check-in</button>
          <button style={activeTab==="presentes"?styles.tabActive:styles.tab} onClick={()=>setActiveTab("presentes")} disabled={!confirmed}>Presentes</button>
        </div>
        <div style={styles.tabContent}>
          {activeTab==="passaporte" && <Passaporte countdown={countdown} eventDate={eventDate} darkMode={darkMode} />}
          {activeTab==="rsvp" && <RSVP name={name} setName={setName} confirmed={confirmed} handleConfirm={handleConfirm} handleCancel={handleCancel} />}
          {activeTab==="presentes" && <Presentes gifts={gifts} setGifts={setGifts} sendWhatsApp={sendWhatsApp} />}
        </div>
      </div>
    </div>
  );
}

// ---------- Componentes ----------

function Passaporte({ countdown, eventDate, darkMode }) {
  return (
    <div style={darkMode?styles.darkPassport:styles.passport}>
      <h2 style={styles.title}>Você está convidado!</h2>
      <p style={styles.subtitle}>a embarcar na comemoração da chegada do nosso anjinho 💖</p>
      <p><strong>Local de embarque:</strong> Rua Doutor Carlos Alberto Curado 1561 - José Menino, Santos, SP</p>
      <p><strong>Data:</strong> {formatDate(eventDate)} | <strong>Hora:</strong> {formatTime(eventDate)}</p>
      <p>Teremos bingo, brincadeiras e muitas surpresas! Venha pronto para se divertir 🎉</p>
      <div style={styles.countdownBox}>
        <div style={styles.countdownRow}>
          <CounterBlock label="dias" value={countdown.days}/>
          <CounterBlock label="horas" value={countdown.hours}/>
          <CounterBlock label="min" value={countdown.minutes}/>
          <CounterBlock label="seg" value={countdown.seconds}/>
        </div>
      </div>
    </div>
  );
}

function RSVP({ name, setName, confirmed, handleConfirm, handleCancel }) {
  return (
    <div>
      {confirmed ? (
        <div>
          <h3 style={{color:"#7f3b57"}}>Check-in realizado ✈️</h3>
          <p>{name}, seu check-in está confirmado!</p>
          <button style={styles.cancelButton} onClick={handleCancel}>Cancelar check-in</button>
        </div>
      ) : (
        <form onSubmit={handleConfirm}>
          <label style={styles.label}>Nome do passageiro</label>
          <input style={styles.input} value={name} onChange={e=>setName(e.target.value)} placeholder="Seu nome" />
          <button style={styles.confirmButton} type="submit">Fazer Check-in ✈️</button>
        </form>
      )}
    </div>
  );
}

function Presentes({ gifts, setGifts, sendWhatsApp }) {
  const totals = JSON.parse(localStorage.getItem("allGuestsGifts") || "{}");
  const totalUsed = { "Fralda RN":0, "Fralda P":0, "Fralda M":0, "Fralda G":0 };
  Object.values(totals).forEach(g => {
    totalUsed["Fralda RN"] += g["Fralda RN"] ? 1 : 0;
    totalUsed["Fralda P"] += g["Fralda P"] ? 1 : 0;
    totalUsed["Fralda M"] += g["Fralda M"] ? 1 : 0;
    totalUsed["Fralda G"] += g["Fralda G"] ? 1 : 0;
  });

  function handleCheckboxChange(e) {
    const { name, checked } = e.target;
    const newGifts = { ...gifts, [name]: checked };
    setGifts(newGifts);
    localStorage.setItem("gifts", JSON.stringify(newGifts));
    const all = JSON.parse(localStorage.getItem("allGuestsGifts") || "{}");
    const guestName = localStorage.getItem("guestName");
    all[guestName] = newGifts;
    localStorage.setItem("allGuestsGifts", JSON.stringify(all));
  }

  function handleMimoChange(e) {
    const value = e.target.value;
    const newGifts = { ...gifts, mimo: value };
    setGifts(newGifts);
    localStorage.setItem("gifts", JSON.stringify(newGifts));
    const all = JSON.parse(localStorage.getItem("allGuestsGifts") || "{}");
    const guestName = localStorage.getItem("guestName");
    all[guestName] = newGifts;
    localStorage.setItem("allGuestsGifts", JSON.stringify(all));
  }

  return (
    <div>
      <h3 style={{color:"#7f3b57"}}>Lista de presentes</h3>
      {["Fralda RN","Fralda P","Fralda M","Fralda G"].map(f=>{
        const blocked = totalUsed[f] >= MAX_GIFTS[f] && !gifts[f];
        return (
          <div key={f} style={{marginBottom:6}}>
            <label>
              <input type="checkbox" name={f} checked={!!gifts[f]} onChange={handleCheckboxChange} disabled={blocked}/>
              {f}
            </label>
            {blocked && <span style={{color:"red", marginLeft:6}}>Já conseguimos a quantidade que precisamos ❤️</span>}
          </div>
        );
      })}
      <div style={{marginTop:10}}>
        <label>Quero levar outro mimo:</label>
        <input type="text" name="mimo" value={gifts.mimo||""} onChange={handleMimoChange} placeholder="Escreva aqui" style={{width:"100%",padding:6,marginTop:4,borderRadius:6,border:"1px solid #ccc"}}/>
      </div>
      <button style={{...styles.confirmButton, marginTop:10}} onClick={sendWhatsApp}>
        Enviar Confirmação via WhatsApp 💌
      </button>
    </div>
  );
}

function CounterBlock({label,value}) {
  return (
    <div style={styles.counterBlock}>
      <div style={styles.counterValue}>{String(value).padStart(2,"0")}</div>
      <div style={styles.counterLabel}>{label}</div>
    </div>
  );
}

// ---------- Estilos ----------
const styles = {
  // página principal
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    fontFamily: "Inter, Roboto, Arial, sans-serif",
    color: "#5b2a3a",
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
  },
  darkPage: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    fontFamily: "Inter, Roboto, Arial, sans-serif",
    color: "#fff",
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
  },

  // card central
  card: {
    width: "90%",
    maxWidth: 600,
    background: "rgba(255, 255, 255, 0.85)", // semi-transparente
    padding: 20,
    borderRadius: 12,
    boxShadow: "0 8px 25px rgba(0,0,0,0.12)",
    backdropFilter: "blur(6px)",
  },
  darkCard: {
    width: "90%",
    maxWidth: 600,
    background: "rgba(58, 43, 59, 0.85)", // semi-transparente escuro
    padding: 20,
    borderRadius: 12,
    boxShadow: "0 8px 25px rgba(0,0,0,0.12)",
    color: "#fff",
    backdropFilter: "blur(6px)",
  },

  // abas de navegação
  tabs: { display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" },
  tab: {
    flex: 1,
    padding: 10,
    background: "#f3f3f3",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
    transition: "0.3s",
  },
  tabActive: {
    flex: 1,
    padding: 10,
    background: "#f6a6c9",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
    color: "#fff",
    transition: "0.3s",
  },
  tabContent: { marginTop: 10 },

  // passaporte
  passport: {
    background: "#ffeef6",
    padding: 20,
    borderRadius: 12,
    boxShadow: "0 6px 20px rgba(171,107,140,0.18)",
    textAlign: "center",
  },
  darkPassport: {
    background: "#4b2a3a",
    padding: 20,
    borderRadius: 12,
    boxShadow: "0 6px 20px rgba(0,0,0,0.5)",
    textAlign: "center",
    color: "#fff",
  },

  // títulos e textos
  title: { fontSize: "clamp(18px, 4vw, 22px)", color: "#7f3b57", marginBottom: 6 },
  subtitle: { fontSize: "clamp(12px, 3vw, 14px)", color: "#a35a78", marginBottom: 12 },

  // contagem regressiva
  countdownBox: { background: "#fff0f5", padding: 12, borderRadius: 8, marginTop: 12 },
  countdownRow: { display: "flex", gap: 6, justifyContent: "space-between" },
  counterBlock: {
    background: "#fff",
    padding: 10,
    borderRadius: 8,
    textAlign: "center",
    flex: 1,
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
  },
  counterValue: { fontSize: 18, fontWeight: 700 },
  counterLabel: { fontSize: 12, opacity: 0.7 },

  // formulários
  label: { display: "block", marginBottom: 4, fontSize: 14 },
  input: {
    width: "100%",
    padding: 8,
    marginBottom: 10,
    borderRadius: 6,
    border: "1px solid #ccc",
    fontSize: "clamp(12px, 3vw, 14px)",
  },
  confirmButton: {
    width: "100%",
    padding: 10,
    borderRadius: 6,
    background: "#f6a6c9",
    border: "none",
    color: "#fff",
    cursor: "pointer",
    fontSize: "clamp(12px, 3vw, 14px)",
  },
  cancelButton: {
    padding: 8,
    borderRadius: 6,
    background: "#fff",
    border: "1px solid #f6a6c9",
    cursor: "pointer",
    marginTop: 6,
    fontSize: "clamp(12px, 3vw, 14px)",
  },
};

// ---------- Helpers ----------
function formatDate(d){return d.toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit",year:"numeric"});}
function formatTime(d){return d.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"});}
