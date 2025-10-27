// src/App.js
import React, { useState, useEffect, useMemo } from "react";
import fundoImg from './assets/cegonha.png';

const MAX_GIFTS = { "Fralda RN": 10, "Fralda P": 20, "Fralda M": 30, "Fralda G": 30 };

export default function App() {
  console.log("🎊 App carregado");
  const eventISO = "2025-11-23T15:00:00-03:00";
  const eventDate = new Date(eventISO);
 
  const [activeTab, setActiveTab] = useState("passaporte");
  const [selectedForGifts, setSelectedForGifts] = useState(null);
  const [guests, setGuests] = useState(() => {
    try {
      const s = localStorage.getItem("guests_list_v2");
      return s ? JSON.parse(s) : [];
    } catch (error) {
      console.error("❌ Failed to load guests from localStorage:", error);
      return [];
    }
  });
  const [countdown, setCountdown] = useState(getDiff(eventDate, new Date()));
  const [tabTransition, setTabTransition] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState(null);
  const [apiStatus, setApiStatus] = useState('checking');

  const darkMode = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;

  // Carrega o estoque do backend com fallback e atualização
  const [totals, setTotals] = useState(MAX_GIFTS);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  useEffect(() => {
    async function fetchEstoque() {
      try {
        console.log('🔍 Buscando estoque da API...');
        setApiStatus('loading');
        
        const res = await fetch(`/api/estoque`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        
        if (!res.ok) {
          console.error('❌ Erro HTTP:', res.status, res.statusText);
          throw new Error(`Erro HTTP: ${res.status}`);
        }
        
        const data = await res.json();
        console.log('✅ Estoque recebido:', data);
        setTotals(data);
        setError(null);
        setApiStatus('success');
        setLastUpdate(new Date());
      } catch (err) {
        console.error('❌ Erro ao carregar estoque:', err);
        setError('Falha ao conectar à API. Usando valores padrão.');
        setTotals(MAX_GIFTS);
        setApiStatus('error');
      }
    }

    fetchEstoque();
    const interval = setInterval(fetchEstoque, 8000); // Atualiza a cada 8s
    return () => clearInterval(interval);
  }, []);

  const totalsUsed = useMemo(() => {
    const used = { "Fralda RN": 0, "Fralda P": 0, "Fralda M": 0, "Fralda G": 0 };
    guests.forEach(g => {
      if (g.gifts) {
        Object.keys(used).forEach(k => {
          if (g.gifts[k]) used[k] += 1;
        });
      }
    });
    console.log('📊 Presentes usados calculados:', used);
    return used;
  }, [guests]);

  useEffect(() => {
    const t = setInterval(() => {
      try {
        setCountdown(getDiff(eventDate, new Date()));
      } catch (error) {
        console.error("❌ Error updating countdown:", error);
        setError("Erro ao atualizar o contador de tempo.");
      }
    }, 1000);
    return () => clearInterval(t);
  }, [eventDate]);

  useEffect(() => {
    try {
      localStorage.setItem("guests_list_v2", JSON.stringify(guests));
      const all = {};
      guests.forEach(g => {
        all[g.name || "(sem nome)"] = {
          "Fralda RN": !!g.gifts["Fralda RN"],
          "Fralda P": !!g.gifts["Fralda P"],
          "Fralda M": !!g.gifts["Fralda M"],
          "Fralda G": !!g.gifts["Fralda G"],
          mimo: g.mimo || ""
        };
      });
      localStorage.setItem("allGuestsGifts", JSON.stringify(all));
    } catch (error) {
      console.error("❌ Failed to save to localStorage:", error);
      setError("Erro ao salvar dados localmente.");
    }
  }, [guests]);

  useEffect(() => {
    setTabTransition(true);
    const timeout = setTimeout(() => setTabTransition(false), 300);
    return () => clearTimeout(timeout);
  }, [activeTab]);

  function isBlockedFor(type, guestIndex) {
    if (!guests[guestIndex]) return true;
    const already = totalsUsed[type];
    const guestHas = guests[guestIndex].gifts && guests[guestIndex].gifts[type];
    const totalLeft = totals[type] || 0;
    const blocked = totalLeft <= already && !guestHas;
    
    if (blocked) {
      console.log(`🚫 ${type} bloqueado para ${guests[guestIndex].name}. Total: ${totalLeft}, Usado: ${already}, Guest tem: ${guestHas}`);
    }
    
    return blocked;
  }

  function updateGuest(index, patch) {
    if (patch.age && (parseInt(patch.age) > 120 || parseInt(patch.age) < 0)) {
      alert("Por favor, insira uma idade válida (0 a 120 anos).");
      return;
    }
    setGuests(prev => {
      const copy = prev.map(g => ({ ...g }));
      copy[index] = { ...copy[index], ...patch };
      return copy;
    });
  }

  function removeGuest(i) {
    setGuests(prev => prev.filter((_, idx) => idx !== i));
  }

  function openGiftsFor(index) {
    setSelectedForGifts(index);
  }

  function clearGuestList() {
    if (window.confirm("Tem certeza que deseja limpar toda a lista de check-ins?")) {
      setGuests([]);
      localStorage.removeItem("guests_list_v2");
      localStorage.removeItem("allGuestsGifts");
    }
  }

  async function confirmAllAndSend() {
    if (guests.length === 0) {
      alert("Adicione pelo menos um check-in antes de confirmar.");
      return;
    }

    const missing = guests.some(g => !g.name || !g.name.trim());
    if (missing) {
      alert("Por favor, preencha o nome de todos os check-ins antes de confirmar.");
      return;
    }

    const missingAdultGifts = guests.some(g => parseInt(g.age) >= 18 && !Object.values(g.gifts).some(v => v));
    if (missingAdultGifts) {
      alert("Por favor, selecione pelo menos um presente para cada adulto antes de confirmar.");
      return;
    }

    setIsSending(true);
    setError(null);

    try {
      console.log('🔄 Iniciando processo de reserva para', guests.length, 'convidados');
      
      for (const g of guests) {
        if (Object.values(g.gifts).some(v => v)) {
          console.log(`📦 Reservando para ${g.name}:`, g.gifts);
          
          const res = await fetch(`/api/reservar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              gifts: g.gifts, 
              convidado: g.name 
            })
          });
          
          const result = await res.json();
          console.log(`📨 Resposta da API para ${g.name}:`, result);
          
          if (!res.ok) {
            throw new Error(result.error || `Erro ${res.status} ao reservar para ${g.name}`);
          }
          
          if (!result.success) {
            throw new Error(result.error || `Falha na reserva para ${g.name}`);
          }
          
          console.log(`✅ Reserva confirmada para ${g.name}`);
        }
      }

      // Preparar mensagem do WhatsApp
      const parts = guests.map(g => {
        const isChild = parseInt(g.age) < 18 || !g.age;
        const nameWithTag = isChild ? `${g.name} (criança)` : g.name;
        const ageStr = g.age ? `${g.age} anos` : "idade não informada";
        
        if (!isChild) {
          const selected = Object.keys(g.gifts).filter(k => g.gifts[k]);
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

      console.log('📤 Abrindo WhatsApp...');
      
      if (/iPhone|iPad|iPod/.test(navigator.userAgent) && !window.open(url, "_blank")) {
        location.href = url;
      } else {
        window.open(url, "_blank");
      }

      // Limpa a lista após sucesso
      setTimeout(() => {
        setGuests([]);
        console.log('🧹 Lista de convidados limpa após envio');
      }, 1000);
      
    } catch (error) {
      console.error("💥 Erro no processo de reserva:", error);
      setError("Erro ao confirmar reservas: " + error.message);
      alert("Erro ao confirmar: " + error.message);
    } finally {
      setIsSending(false);
    }
  }

  const availableGifts = {
    "Fralda RN": totals["Fralda RN"] - totalsUsed["Fralda RN"],
    "Fralda P": totals["Fralda P"] - totalsUsed["Fralda P"], 
    "Fralda M": totals["Fralda M"] - totalsUsed["Fralda M"],
    "Fralda G": totals["Fralda G"] - totalsUsed["Fralda G"]
  };

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

          <div style={{ 
            ...styles.tabContent, 
            opacity: tabTransition ? 0 : 1, 
            transform: tabTransition ? 'translateY(10px)' : 'translateY(0)' 
          }}>
            {activeTab === "passaporte" && (
              <Passaporte eventDate={eventDate} countdown={countdown} darkMode={darkMode} />
            )}

            {activeTab === "checkin" && (
              <div>
                {/* Status da API */}
                <div style={{ 
                  marginBottom: 14, 
                  padding: 8, 
                  borderRadius: 8, 
                  background: apiStatus === 'error' ? '#ffebee' : '#e8f5e8',
                  color: apiStatus === 'error' ? '#c62828' : '#2e7d32',
                  fontSize: 12,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span>
                    {apiStatus === 'loading' && '🔄 Conectando...'}
                    {apiStatus === 'success' && '✅ Conectado ao servidor'}
                    {apiStatus === 'error' && '❌ Usando dados locais'}
                  </span>
                  <span style={{ fontSize: 10, opacity: 0.7 }}>
                    Atualizado: {lastUpdate.toLocaleTimeString()}
                  </span>
                </div>

                {error && (
                  <div style={{ 
                    color: '#d32f2f', 
                    margin: '10px 0', 
                    padding: 10,
                    background: '#ffebee',
                    borderRadius: 8,
                    border: '1px solid #ffcdd2'
                  }}>
                    {error}
                  </div>
                )}

                <h3 style={{ marginTop: 0, color: darkMode ? "#ffdfe8" : "#7f3b57" }}>
                  Lista de Check-ins
                </h3>
                
                <p style={{ marginTop: 6, marginBottom: 14, fontSize: 14, color: darkMode ? "#ffdfe8" : "#7f3b57" }}>
                  Crianças não precisam levar presente.
                </p>
                
                <div style={{ 
                  marginBottom: 14, 
                  padding: 12,
                  background: darkMode ? '#3a2b3b' : '#fff0f5',
                  borderRadius: 8,
                  fontSize: 14, 
                  color: darkMode ? "#ffdfe8" : "#7f3b57" 
                }}>
                  <strong>🎁 Presentes restantes disponíveis:</strong><br />
                  Fralda RN: <strong>{availableGifts["Fralda RN"]}</strong> | 
                  Fralda P: <strong>{availableGifts["Fralda P"]}</strong> | 
                  Fralda M: <strong>{availableGifts["Fralda M"]}</strong> | 
                  Fralda G: <strong>{availableGifts["Fralda G"]}</strong>
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
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <button 
                          title="Editar presentes" 
                          aria-label="Editar presentes" 
                          onClick={() => openGiftsFor(i)} 
                          style={styles.presentButton}
                        >
                          🎀
                        </button>
                        <button
                          title="Remover check-in"
                          aria-label="Remover check-in"
                          onClick={() => removeGuest(i)}
                          style={{ ...styles.cancelButton, color: darkMode ? "#ff85b3" : "#333" }}
                        >
                          ✖
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  <AddGuestRow
                    onAdd={(obj) => {
                      setGuests(prev => [...prev, { 
                        ...obj, 
                        gifts: { "Fralda RN": false, "Fralda P": false, "Fralda M": false, "Fralda G": false }, 
                        mimo: "" 
                      }]);
                    }}
                    darkMode={darkMode}
                  />
                </div>

                {selectedForGifts !== null && (
                  <div style={{ ...styles.giftsEditorContainer, animation: 'fadeIn 0.3s ease-in-out' }}>
                    <GiftsEditor
                      guest={guests[selectedForGifts]}
                      guestIndex={selectedForGifts}
                      updateGuest={(patch) => updateGuest(selectedForGifts, patch)}
                      isBlockedFor={(type) => isBlockedFor(type, selectedForGifts)}
                      done={() => setSelectedForGifts(null)}
                      darkMode={darkMode}
                      availableGifts={availableGifts}
                    />
                  </div>
                )}

                <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button
                    style={styles.confirmButton}
                    onClick={confirmAllAndSend}
                    disabled={isSending}
                  >
                    {isSending ? "🔄 Enviando..." : "✅ Confirmar check-ins e enviar WhatsApp"}
                  </button>
                  <button
                    style={{ ...styles.cancelButton, color: darkMode ? "#ff85b3" : "#333" }}
                    onClick={clearGuestList}
                  >
                    🗑️ Limpar lista
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

/* ---------- Subcomponentes ---------- */

function Passaporte({ eventDate, countdown, darkMode }) {
  return (
    <div style={darkMode ? { ...styles.darkPassport, color: "#fff" } : styles.passport}>
      <h2 style={{ animation: 'fadeInText 2s ease-in-out' }}>Você está convidado!</h2>
      <p>📍 Local: Rua Doutor Carlos Alberto Curado 1561 - José Menino, Santos, SP</p>
      <p>📅 Data: {formatDate(eventDate)} | 🕒 Hora: {formatTime(eventDate)}</p>
      <p>Teremos bingo, brincadeiras e muitas surpresas! Venha pronto para se divertir 🎉</p>
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
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [age, setAge] = useState("");

  function handleAdd() {
    if (!name.trim()) {
      alert("Digite ao menos um nome.");
      return;
    }
    if (age && (parseInt(age) > 120 || parseInt(age) < 0)) {
      alert("Por favor, insira uma idade válida (0 a 120 anos).");
      return;
    }
    onAdd({ name: name.trim(), age: age ? age.trim() : "" });
    setName("");
    setAge("");
    setOpen(false);
  }

  return (
    <div>
      {!open ? (
        <button
          style={{ ...styles.confirmButton, color: darkMode ? "#fff" : "#fff" }}
          onClick={() => setOpen(true)}
        >
          ➕ Adicionar pessoa
        </button>
      ) : (
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
          <button
            onClick={handleAdd}
            style={{ ...styles.confirmButton, color: darkMode ? "#fff" : "#fff" }}
          >
            💾 Salvar
          </button>
          <button
            onClick={() => setOpen(false)}
            style={{ ...styles.cancelButton, color: darkMode ? "#ff85b3" : "#333" }}
          >
            ❌ Cancelar
          </button>
        </div>
      )}
    </div>
  );
}

function GiftsEditor({ guest, guestIndex, updateGuest, isBlockedFor, done, darkMode, availableGifts }) {
  if (!guest) return null;

  function toggle(type) {
    if (isBlockedFor(type, guestIndex) && !guest.gifts[type]) return;
    const newGifts = { ...guest.gifts, [type]: !guest.gifts[type] };
    updateGuest({ gifts: newGifts });
  }

  function onMimoChange(e) {
    updateGuest({ mimo: e.target.value });
  }

  const isChild = parseInt(guest.age) < 18 || !guest.age;

  return (
    <div style={{ 
      marginTop: 10, 
      padding: 16, 
      background: darkMode ? "#3e2836" : "#fff7fb", 
      borderRadius: 12,
      border: `2px solid ${darkMode ? '#ff85b3' : '#ffb6c1'}`
    }}>
      <div style={{ 
        color: darkMode ? "#fff" : "#7f3b57",
        marginBottom: 12 
      }}>
        <strong>{guest.name}</strong> • {guest.age ? `${guest.age} anos` : "idade não informada"}
        {isChild && <span style={{color: '#ff85b3', marginLeft: 8}}>👶 (criança - não precisa de presente)</span>}
      </div>
      
      {!isChild && (
        <>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 600, color: darkMode ? "#ffdfe8" : "#7f3b57", marginBottom: 8 }}>
              🎁 Escolha as fraldas:
            </div>
            {["Fralda RN", "Fralda P", "Fralda M", "Fralda G"].map(f => {
              const blocked = isBlockedFor(f, guestIndex);
              const checked = !!(guest.gifts && guest.gifts[f]);
              const available = availableGifts[f] > 0;
              
              return (
                <label key={f} style={{ 
                  display: 'block', 
                  marginBottom: 6,
                  opacity: (blocked && !checked) || !available ? 0.6 : 1, 
                  color: darkMode ? "#fff" : "#333",
                  padding: '4px 0'
                }}>
                  <input 
                    type="checkbox" 
                    checked={checked} 
                    onChange={() => toggle(f)} 
                    disabled={(blocked && !checked) || !available}
                    style={{ marginRight: 8 }}
                  /> 
                  {f} 
                  <span style={{ 
                    fontSize: 12, 
                    marginLeft: 8,
                    color: available ? '#4caf50' : '#f44336'
                  }}>
                    ({availableGifts[f]} disponíveis)
                  </span>
                  {blocked && !checked && (
                    <span style={{ color: "#f44336", marginLeft: 8, fontSize: 12 }}>
                      ❌ Limite atingido
                    </span>
                  )}
                </label>
              );
            })}
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ color: darkMode ? "#ffdfe8" : "#7f3b57", display: 'block', marginBottom: 4 }}>
              🎀 Outro mimo (opcional):
            </label>
            <input
              type="text"
              value={guest.mimo || ""}
              onChange={onMimoChange}
              placeholder="Ex.: brinquedo, roupa, acessório..."
              style={darkMode ? styles.darkInput : styles.input}
            />
          </div>
        </>
      )}

      <button
        style={{ ...styles.confirmButton, color: darkMode ? "#fff" : "#fff" }}
        onClick={done}
      >
        💾 Salvar
      </button>
    </div>
  );
}

function CounterBlock({ label, value, darkMode }) {
  return (
    <div style={darkMode ? styles.darkCounterBlock : styles.counterBlock}>
      <div style={{ ...styles.counterValue, color: darkMode ? "#fff" : "#7f3b57" }}>
        {String(value).padStart(2, "0")}
      </div>
      <div style={{ ...styles.counterLabel, color: darkMode ? "#ffdfe8" : "#7f3b57" }}>
        {label}
      </div>
    </div>
  );
}

/* ---------- Styles ---------- */
const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    fontFamily: "'Inter', 'Roboto', 'Arial', sans-serif",
    color: "#333",
    backgroundColor: "#f5f5f5",
    position: "relative",
    overflow: "hidden",
  },
  card: {
    width: "100%",
    maxWidth: 720,
    background: "rgba(255, 255, 255, 0.95)",
    padding: 24,
    borderRadius: 16,
    boxShadow: "0 12px 40px rgba(0, 0, 0, 0.1)",
    backdropFilter: "blur(8px)",
    zIndex: 20,
  },
  darkCard: {
    width: "100%",
    maxWidth: 720,
    background: "rgba(58, 43, 59, 0.9)",
    padding: 24,
    borderRadius: 16,
    boxShadow: "0 12px 40px rgba(0, 0, 0, 0.4)",
    backdropFilter: "blur(8px)",
    color: "#fff",
    zIndex: 20,
  },
  tabs: {
    display: "flex",
    gap: 10,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    padding: "12px 16px",
    background: "#f0f0f0",
    border: "none",
    borderRadius: 10,
    cursor: "pointer",
    fontWeight: 600,
    transition: "background 0.3s ease, transform 0.2s ease",
    color: "#333",
  },
  tabActive: {
    background: "#ff85b3",
    color: "#fff",
  },
  tabContent: {
    marginTop: 6,
    transition: "opacity 0.3s ease, transform 0.3s ease",
  },
  passport: {
    padding: 24,
    borderRadius: 12,
    background: "#fff7fb",
    textAlign: "center",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)",
  },
  darkPassport: {
    padding: 24,
    borderRadius: 12,
    background: "#3e2836",
    textAlign: "center",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.2)",
  },
  countdownBox: {
    background: "#fff0f5",
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
  },
  darkCountdownBox: {
    background: "#4a2f3d",
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
  },
  counterBlock: {
    background: "#fff",
    padding: "12px 8px",
    borderRadius: 10,
    textAlign: "center",
    flex: 1,
    boxShadow: "0 3px 10px rgba(0, 0, 0, 0.05)",
  },
  darkCounterBlock: {
    background: "#5a3a48",
    padding: "12px 8px",
    borderRadius: 10,
    textAlign: "center",
    flex: 1,
    boxShadow: "0 3px 10px rgba(0, 0, 0, 0.2)",
  },
  counterValue: {
    fontSize: 20,
    fontWeight: 800,
  },
  counterLabel: {
    fontSize: 12,
    opacity: 0.8,
  },
  guestRow: {
    display: "flex",
    gap: 12,
    alignItems: "center",
    background: "linear-gradient(90deg, rgba(255, 255, 255, 0.95), rgba(255, 244, 246, 0.85))",
    padding: 12,
    borderRadius: 12,
    boxShadow: "0 4px 12px rgba(171, 107, 140, 0.08)",
  },
  darkGuestRow: {
    display: "flex",
    gap: 12,
    alignItems: "center",
    background: "linear-gradient(90deg, rgba(78, 58, 79, 0.95), rgba(94, 62, 80, 0.85))",
    padding: 12,
    borderRadius: 12,
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.2)",
  },
  presentButton: {
    border: "none",
    background: "#ffc0cb",
    padding: 10,
    borderRadius: 8,
    cursor: "pointer",
    fontSize: 16,
    transition: "transform 0.2s ease, box-shadow 0.2s ease",
  },
  cancelButton: {
    border: "none",
    background: "#ffe4e9",
    padding: 8,
    borderRadius: 8,
    cursor: "pointer",
    fontSize: 14,
    transition: "background 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
    color: "#333",
  },
  confirmButton: {
    padding: "12px 18px",
    borderRadius: 10,
    background: "#ff85b3",
    border: "none",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 700,
    transition: "background 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
  },
  nameInput: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    border: "1px solid #e7d6df",
    fontSize: 14,
    transition: "border 0.2s ease, box-shadow 0.2s ease",
  },
  darkNameInput: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    border: "1px solid #5a3a48",
    fontSize: 14,
    background: "#4a2f3d",
    color: "#fff",
    transition: "border 0.2s ease, box-shadow 0.2s ease",
  },
  ageInput: {
    width: 70,
    padding: 12,
    borderRadius: 8,
    border: "1px solid #e7d6df",
    fontSize: 14,
    transition: "border 0.2s ease, box-shadow 0.2s ease",
  },
  darkAgeInput: {
    width: 70,
    padding: 12,
    borderRadius: 8,
    border: "1px solid #5a3a48",
    fontSize: 14,
    background: "#4a2f3d",
    color: "#fff",
    transition: "border 0.2s ease, box-shadow 0.2s ease",
  },
  input: {
    width: "100%",
    padding: 12,
    borderRadius: 8,
    border: "1px solid #e7d6df",
    fontSize: 14,
    transition: "border 0.2s ease, box-shadow 0.2s ease",
  },
  darkInput: {
    width: "100%",
    padding: 12,
    borderRadius: 8,
    border: "1px solid #5a3a48",
    fontSize: 14,
    background: "#4a2f3d",
    color: "#fff",
    transition: "border 0.2s ease, box-shadow 0.2s ease",
  },
  giftsEditorContainer: {
    animation: 'fadeIn 0.3s ease-in-out',
  },
};

/* ---------- Helpers ---------- */
function getDiff(target, current) {
  try {
    const diff = Math.max(0, target - current);
    const secs = Math.floor(diff / 1000);
    const days = Math.floor(secs / (3600 * 24));
    const hours = Math.floor((secs % (3600 * 24)) / 3600);
    const minutes = Math.floor((secs % 3600) / 60);
    const seconds = secs % 60;
    return { days, hours, minutes, seconds };
  } catch (error) {
    console.error("❌ Error calculating countdown:", error);
    return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  }
}

function formatDate(d) {
  try {
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch (error) {
    console.error("❌ Error formatting date:", error);
    return "Data inválida";
  }
}

function formatTime(d) {
  try {
    return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  } catch (error) {
    console.error("❌ Error formatting time:", error);
    return "Hora inválida";
  }
}

/* ---------- Estilos Globais para Animações ---------- */
const GlobalStyles = () => (
  <style>
    {`
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes fadeInText {
        from { opacity: 0; transform: scale(0.9); }
        to { opacity: 1; transform: scale(1); }
      }
      @keyframes fall {
        0% { transform: translateY(-100vh) rotate(0deg); opacity: 0; }
        10% { opacity: 1; }
        100% { transform: translateY(100vh) rotate(360deg); opacity: 0; }
      }
      .particle {
        position: absolute;
        width: 10px;
        height: 10px;
        background: radial-gradient(circle, rgba(255, 182, 193, 0.8) 0%, rgba(255, 105, 180, 0.6) 100%);
        border-radius: 50%;
        animation: fall 6s infinite linear;
        z-index: 10;
      }
      .particle:nth-child(1) { left: 10%; animation-delay: 0s; animation-duration: 5s; }
      .particle:nth-child(2) { left: 30%; animation-delay: 1s; animation-duration: 6s; }
      .particle:nth-child(3) { left: 50%; animation-delay: 2s; animation-duration: 5.5s; }
      .particle:nth-child(4) { left: 70%; animation-delay: 0.5s; animation-duration: 6.5s; }
      .particle:nth-child(5) { left: 90%; animation-delay: 1.5s; animation-duration: 5.8s; }
      button:hover:not(:disabled) {
        transform: scale(1.02);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      }
      input:focus {
        border-color: #ff85b3;
        box-shadow: 0 0 0 2px rgba(255, 133, 179, 0.2);
      }
    `}
  </style>
);