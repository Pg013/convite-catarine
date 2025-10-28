import React, { useState, useEffect, useMemo } from "react";
import fundoImg from './assets/cegonha.png';

const GIFT_CHANCES = {
  "RN": 0.15,
  "P": 0.25,
  "M": 0.30,
  "G": 0.30
};

const TOTAL_INITIAL = { "RN": 10, "P": 20, "M": 30, "G": 30 };

// Hook para detectar mobile
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
};

export default function App() {
  const [guests, setGuests] = useState(() => {
    try {
      const saved = localStorage.getItem("baby_shower_guests");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [totals, setTotals] = useState(TOTAL_INITIAL);
  const [activeTab, setActiveTab] = useState("passaporte");
  const [selectedForGifts, setSelectedForGifts] = useState(null);
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState(null);
  const [spinning, setSpinning] = useState(false);
  const [revealedGift, setRevealedGift] = useState(null);

  const isMobile = useIsMobile();
  const darkMode = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;

  useEffect(() => {
    const eventDate = new Date("2025-11-23T15:00:00-03:00");
    const t = setInterval(() => setCountdown(getDiff(eventDate, new Date())), 1000);
    return () => clearInterval(t);
  }, []);

  // Salvar no localStorage
  useEffect(() => {
    try {
      localStorage.setItem("baby_shower_guests", JSON.stringify(guests));
    } catch (error) {
      console.error("Erro ao salvar:", error);
    }
  }, [guests]);

  // Sorteio com chance ponderada
  const drawGift = () => {
    const rand = Math.random();
    let cumulative = 0;
    for (const [gift, chance] of Object.entries(GIFT_CHANCES)) {
      cumulative += chance;
      if (rand <= cumulative && totals[gift] > 0) {
        return gift;
      }
    }
    return Object.keys(totals).find(g => totals[g] > 0) || null;
  };

  const handleSpin = () => {
  if (spinning || selectedForGifts === null) return;

  const guest = guests[selectedForGifts];
  if (guest.gifts && Object.values(guest.gifts).some(v => v)) {
    alert("Este convidado já sorteou uma fralda!");
    return;
  }

  setSpinning(true);
  setRevealedGift(null);

  if (navigator.vibrate) {
    navigator.vibrate(100);
  }

  setTimeout(() => {
    const gift = drawGift();
    if (gift) {
      setRevealedGift(gift);
      updateGuest(selectedForGifts, { gifts: { [gift]: true } });
      criarConfetes();
    } else {
      alert("Ops! Todas as fraldas já foram sorteadas!");
    }
    setSpinning(false);
  }, 2000);
};;

  const criarConfetes = () => {
    for (let i = 0; i < 30; i++) {
      setTimeout(() => {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = Math.random() * 100 + 'vw';
        confetti.style.background = ['#ff69b4', '#ff1493', '#ffb6c1', '#ffd4e6'][i % 4];
        confetti.style.animationDelay = Math.random() * 1 + 's';
        document.body.appendChild(confetti);
        setTimeout(() => confetti.remove(), 3000);
      }, i * 50);
    }
  };

  function updateGuest(index, patch) {
    const updatedGuests = [...guests];
    updatedGuests[index] = { ...updatedGuests[index], ...patch };
    setGuests(updatedGuests);

    if (patch.gifts) {
      const giftType = Object.keys(patch.gifts)[0];
      if (patch.gifts[giftType]) {
        setTotals(prev => ({ ...prev, [giftType]: prev[giftType] - 1 }));
      }
    }
  }

function removeGuest(i) {
  // FECHA O MAGICCOIN SE FOR O CONVIDADO ABERTO
  if (selectedForGifts === i) {
    setSelectedForGifts(null);
    setRevealedGift(null);
    setSpinning(false);
  }

  // Restaura o total
  const guest = guests[i];
  if (guest.gifts) {
    const giftType = Object.keys(guest.gifts).find(k => guest.gifts[k]);
    if (giftType) {
      setTotals(prev => ({ ...prev, [giftType]: prev[giftType] + 1 }));
    }
  }

  // Remove o convidado
  setGuests(prevGuests => prevGuests.filter((_, idx) => idx !== i));
}
function openGiftsFor(index) {
  setSelectedForGifts(index);

  // Usa o guest atual (do estado atual)
  const guest = guests[index];
  if (guest?.gifts && Object.values(guest.gifts).some(v => v)) {
    const gift = Object.keys(guest.gifts).find(k => guest.gifts[k]);
    setRevealedGift(gift);
  } else {
    setRevealedGift(null);
  }
}
  function clearGuestList() {
    if (window.confirm("Tem certeza que deseja limpar toda a lista?")) {
      setGuests([]);
      setTotals(TOTAL_INITIAL);
      localStorage.removeItem("baby_shower_guests");
    }
  }

  function confirmAllAndSend() {
    if (guests.length === 0) return alert("Adicione pelo menos um check-in!");
    const missing = guests.some(g => !g.name?.trim());
    if (missing) return alert("Preencha o nome de todos os check-ins!");
    const missingAdultGifts = guests.some(g => parseInt(g.age) >= 18 && !Object.values(g.gifts || {}).some(v => v));
    if (missingAdultGifts) return alert("Sorteie uma fralda para cada adulto!");

    setIsSending(true);
    const parts = guests.map(g => {
      const isChild = parseInt(g.age) < 18 || !g.age;
      const nameWithTag = isChild ? `${g.name} (crianca)` : g.name;
      const ageStr = g.age ? `${g.age} anos` : "idade nao informada";
      if (!isChild) {
        const selected = Object.keys(g.gifts || {}).filter(k => g.gifts[k]);
        const giftsStr = selected.length ? selected.join(", ") : "apenas presenca";
        const mimoStr = g.mimo?.trim() ? ` e um mimo especial: ${g.mimo.trim()}` : "";
        return `${nameWithTag} (${ageStr}): Presente: ${giftsStr}${mimoStr}`;
      } else {
        return `${nameWithTag} (${ageStr}): Presenca confirmada`;
      }
    });

    const message = `Ola! Estamos confirmando nossa presenca para o cha de bebe da Catarine!\n\n${parts.join("\n")}\n\nEstamos muito animados para compartilhar esse momento especial com voce! Ate la!`;
    const url = `https://wa.me/5513996292499?text=${encodeURIComponent(message)}`;

    // Abrir WhatsApp de forma otimizada para mobile
    const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);
    
    if ((isIOS || isAndroid) && !window.open(url, "_blank")) {
      window.location.href = url;
    } else {
      window.open(url, "_blank");
    }

    setIsSending(false);
  }

  if (error) {
    return (
      <div style={styles.errorContainer}>
        <h2 style={{ color: "#ff85b3" }}>Ops! Algo deu errado</h2>
        <p>{error}</p>
        <button style={{ ...styles.confirmButton, color: darkMode ? "#ff85b3" : "#fff" }} onClick={() => setError(null)}>
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <>
      <GlobalStyles isMobile={isMobile} />
      <div style={{ 
        ...styles.page, 
        backgroundImage: fundoImg ? `url(${fundoImg})` : "none",
        padding: isMobile ? 10 : 20 
      }}>
        <div style={darkMode ? { ...styles.darkCard, ...(isMobile && styles.mobileCard) } : { ...styles.card, ...(isMobile && styles.mobileCard) }}>
          <div style={styles.tabs}>
            <button
              style={activeTab === "passaporte" ? { ...styles.tab, ...styles.tabActive } : { ...styles.tab, color: darkMode ? "#ff85b3" : "#333" }}
              onClick={() => setActiveTab("passaporte")}
            >
              Passaporte
            </button>
            <button
              style={activeTab === "checkin" ? { ...styles.tab, ...styles.tabActive } : { ...styles.tab, color: darkMode ? "#ff85b3" : "#333" }}
              onClick={() => setActiveTab("checkin")}
            >
              Fazer Check-in
            </button>
          </div>

          <div style={{ ...styles.tabContent }}>
            {activeTab === "passaporte" && <Passaporte countdown={countdown} darkMode={darkMode} isMobile={isMobile} />}
            {activeTab === "checkin" && (
              <div>
                <h3 style={{ 
                  marginTop: 0, 
                  color: darkMode ? "#ffdfe8" : "#7f3b57",
                  fontSize: isMobile ? 18 : 20 
                }}>
                  Lista de Check-ins
                </h3>
                <p style={{ 
                  marginTop: 6, 
                  marginBottom: 14, 
                  fontSize: isMobile ? 13 : 14, 
                  color: darkMode ? "#ffdfe8" : "#7f3b57" 
                }}>
                  Criancas nao precisam levar presente. Adultos: clique na moeda para sortear!
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {guests.map((g, i) => (
                    <div key={i} style={darkMode ? { ...styles.darkGuestRow, ...(isMobile && styles.mobileGuestRow) } : { ...styles.guestRow, ...(isMobile && styles.mobileGuestRow) }}>
                      <div style={{ flex: 1, display: "flex", gap: 6, alignItems: "center", flexWrap: isMobile ? "wrap" : "nowrap" }}>
                        <input
                          style={darkMode ? { ...styles.darkNameInput, ...(isMobile && styles.mobileInput) } : { ...styles.nameInput, ...(isMobile && styles.mobileInput) }}
                          placeholder="Nome"
                          value={g.name || ""}
                          onChange={e => updateGuest(i, { name: e.target.value })}
                        />
                        <input
                          style={darkMode ? { ...styles.darkAgeInput, ...(isMobile && styles.mobileAgeInput) } : { ...styles.ageInput, ...(isMobile && styles.mobileAgeInput) }}
                          placeholder="Idade"
                          value={g.age || ""}
                          onChange={e => updateGuest(i, { age: e.target.value.replace(/[^\d]/g, "") })}
                        />
                      </div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <button 
                          onClick={() => openGiftsFor(i)} 
                          style={{ 
                            ...styles.magicButton, 
                            ...(isMobile && styles.mobileMagicButton),
                            opacity: parseInt(g.age) < 18 ? 0.5 : 1 
                          }} 
                          disabled={parseInt(g.age) < 18}
                        >
                          {parseInt(g.age) >= 18 ? "🪙" : "👶"}
                        </button>
                        <button 
                          onClick={() => removeGuest(i)} 
                          style={{ 
                            ...styles.cancelButton, 
                            color: darkMode ? "#ff85b3" : "#333",
                            ...(isMobile && styles.mobileCancelButton)
                          }}
                        >
                          ✖
                        </button>
                      </div>
                    </div>
                  ))}
                  <AddGuestRow onAdd={(obj) => setGuests([...guests, { ...obj, gifts: {}, mimo: "" }])} darkMode={darkMode} isMobile={isMobile} />
                </div>

                {selectedForGifts !== null && guests[selectedForGifts] && (
  <MagicCoin
    guest={guests[selectedForGifts]}
    onSpin={handleSpin}
    spinning={spinning}
    revealedGift={revealedGift}
    done={() => setSelectedForGifts(null)}
    darkMode={darkMode}
    updateGuest={updateGuest}
    guestIndex={selectedForGifts}
    isMobile={isMobile}
  />
)}

                <div style={{ 
                  marginTop: 16, 
                  display: "flex", 
                  gap: 10, 
                  flexDirection: isMobile ? "column" : "row" 
                }}>
                  <button 
                    style={{ 
                      ...styles.confirmButton, 
                      ...(isMobile && styles.mobileConfirmButton) 
                    }} 
                    onClick={confirmAllAndSend} 
                    disabled={isSending}
                  >
                    {isSending ? "Enviando..." : "Confirmar e enviar no WhatsApp"}
                  </button>
                  <button 
                    style={{ 
                      ...styles.cancelButton, 
                      color: darkMode ? "#ff85b3" : "#333",
                      ...(isMobile && styles.mobileCancelButton)
                    }} 
                    onClick={clearGuestList}
                  >
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

// Componente da Moeda Mágica
function MagicCoin({ guest, onSpin, spinning, revealedGift, done, darkMode, updateGuest, guestIndex, isMobile }) {
  return (
    <div style={{ 
      marginTop: 20, 
      padding: isMobile ? 16 : 20, 
      background: darkMode ? "#3e2836" : "#fff7fb", 
      borderRadius: 16, 
      textAlign: "center", 
      boxShadow: "0 8px 20px rgba(255, 133, 179, 0.2)" 
    }}>
      <p style={{ 
        fontWeight: 600, 
        color: darkMode ? "#ffdfe8" : "#7f3b57", 
        marginBottom: 12,
        fontSize: isMobile ? 15 : 16
      }}>
        {guest.name} • {guest.age ? `${guest.age} anos` : "idade nao informada"}
      </p>
      <p style={{ 
        fontSize: isMobile ? 13 : 14, 
        color: darkMode ? "#ffbbe0" : "#b5658a", 
        marginBottom: 16 
      }}>
        Clique na moeda para revelar!
      </p>

      <div style={{ position: "relative", width: isMobile ? 100 : 140, height: isMobile ? 100 : 140, margin: "0 auto 16px" }}>
        <div
          style={{
            ...styles.coin,
            width: isMobile ? 80 : 120,
            height: isMobile ? 80 : 120,
            top: isMobile ? 10 : 10,
            left: isMobile ? 10 : 10,
            animation: spinning ? "spin 2s cubic-bezier(0.2, 0.8, 0.2, 1) forwards" : revealedGift ? "revealPulse 2s ease-in-out" : "none",
            background: spinning 
              ? "linear-gradient(135deg, #ffd700, #ffeb3b, #ffd700, #fff8e1)"
              : revealedGift
              ? "linear-gradient(135deg, #ff69b4, #ff85b3, #ff69b4)"
              : "linear-gradient(135deg, #ffd700, #ffec3d, #ffd700)",
            boxShadow: spinning 
              ? "0 0 40px #ffd700, 0 0 80px #ffeb3b, inset 0 0 20px rgba(255, 255, 255, 0.8)"
              : revealedGift
              ? "0 0 40px #ff69b4, 0 0 80px #ff85b3, inset 0 0 20px rgba(255, 255, 255, 0.8)"
              : "0 8px 25px rgba(255, 215, 0, 0.6), inset 0 4px 12px rgba(255, 255, 255, 0.7)",
            transform: spinning ? "scale(1.1)" : revealedGift ? "scale(1.05)" : "scale(1)",
          }}
        >
          {spinning ? (
            <div style={styles.spinningContent}>✨</div>
          ) : revealedGift ? (
            <div style={styles.revealedContent}>
              <div style={{...styles.giftText, fontSize: isMobile ? 24 : 32}}>{revealedGift}</div>
            </div>
          ) : (
            <div style={{...styles.coinContent, fontSize: isMobile ? 36 : 48}}>🪙</div>
          )}
        </div>
        
        {/* Efeitos de brilho */}
        {spinning && (
          <>
            <div style={{ ...styles.sparkle, top: 10, left: 15, animationDelay: "0s" }}>✨</div>
            <div style={{ ...styles.sparkle, top: 20, right: 20, animationDelay: "0.3s" }}>⭐</div>
            <div style={{ ...styles.sparkle, bottom: 15, left: 25, animationDelay: "0.6s" }}>💫</div>
            <div style={{ ...styles.sparkle, bottom: 25, right: 15, animationDelay: "0.9s" }}>🌟</div>
          </>
        )}
        
        {/* Anel brilhante ao redor da moeda */}
        <div style={{
          ...styles.glowRing,
          opacity: spinning ? 1 : revealedGift ? 0.8 : 0,
          animation: spinning ? "pulseGlow 1s infinite alternate" : revealedGift ? "pulseGlowPink 1s infinite alternate" : "none"
        }} />
      </div>

      {!guest.gifts?.RN && !guest.gifts?.P && !guest.gifts?.M && !guest.gifts?.G && (
  <button
    style={{
      ...styles.magicSpinButton,
      background: spinning ? "#ccc" : "linear-gradient(135deg, #ff69b4, #ff1493, #ff69b4)",
      cursor: spinning ? "not-allowed" : "pointer",
      transform: spinning ? "scale(0.95)" : "scale(1)",
      fontSize: isMobile ? 14 : 16,
      padding: isMobile ? "12px 20px" : "14px 24px"
    }}
    onClick={onSpin}
    disabled={spinning}
  >
    {spinning ? "Sorteando..." : "Girar a Moeda Mágica!"}
  </button>
)}

      {revealedGift && (
        <div style={styles.revealContainer}>
          <div style={styles.confetti}>🎉</div>
          <p style={{...styles.revealText, fontSize: isMobile ? 18 : 20}}>
            Voce vai levar: <strong style={{...styles.giftHighlight, fontSize: isMobile ? 24 : 28}}>{revealedGift}</strong>!
          </p>
          <div style={styles.confetti}>🎊</div>
        </div>
      )}

      <div style={{ marginTop: 16 }}>
        <label style={{ 
          color: darkMode ? "#ffdfe8" : "#7f3b57", 
          display: "block", 
          marginBottom: 8,
          fontSize: isMobile ? 14 : 15 
        }}>
          Outro mimo (opcional):
        </label>
        <input
          type="text"
          value={guest.mimo || ""}
          onChange={e => updateGuest(guestIndex, { mimo: e.target.value })}
          style={darkMode ? { ...styles.darkInput, ...(isMobile && styles.mobileInput) } : { ...styles.input, ...(isMobile && styles.mobileInput) }}
          placeholder="Ex: pomada, lenco umedecido, brinquedo..."
        />
      </div>

      <button style={{ 
        ...styles.confirmButton, 
        marginTop: 16,
        ...(isMobile && styles.mobileConfirmButton)
      }} onClick={done}>
        Salvar e Fechar
      </button>
    </div>
  );
}

function Passaporte({ countdown, darkMode, isMobile }) {
  return (
    <div style={darkMode ? { ...styles.darkPassport, color: "#fff" } : styles.passport}>
      <h2 style={{ fontSize: isMobile ? 22 : 26 }}>Voce esta convidado!</h2>
      <p style={{ fontSize: isMobile ? 14 : 16 }}>Local: Rua Doutor Carlos Alberto Curado 1561 - Jose Menino, Santos, SP</p>
      <p style={{ fontSize: isMobile ? 14 : 16 }}>Data: 23/11/2025 | Hora: 15:00</p>
      <p style={{ fontSize: isMobile ? 14 : 16 }}>Teremos bingo, brincadeiras e muitas surpresas! Venha pronto para se divertir🎉</p>
      <p style={{ color: darkMode ? "#ffdfe8" : "#7f3b57", fontSize: isMobile ? 13 : 14 }}>Por favor, leve sua propria bebida🍹</p>
      <div style={darkMode ? styles.darkCountdownBox : styles.countdownBox}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: isMobile ? 4 : 8 }}>
          <CounterBlock label="dias" value={countdown.days} darkMode={darkMode} isMobile={isMobile} />
          <CounterBlock label="horas" value={countdown.hours} darkMode={darkMode} isMobile={isMobile} />
          <CounterBlock label="min" value={countdown.minutes} darkMode={darkMode} isMobile={isMobile} />
          <CounterBlock label="seg" value={countdown.seconds} darkMode={darkMode} isMobile={isMobile} />
        </div>
      </div>
    </div>
  );
}

function AddGuestRow({ onAdd, darkMode, isMobile }) {
  const [name, setName] = useState("");
  const [age, setAge] = useState("");

  function handleAdd() {
    if (!name.trim()) return alert("Digite ao menos um nome.");
    onAdd({ name: name.trim(), age: age ? age.trim() : "" });
    setName("");
    setAge("");
  }

  return (
    <div style={{ 
      display: "flex", 
      gap: 8, 
      marginTop: 8, 
      alignItems: "center", 
      flexWrap: "wrap" 
    }}>
      <input 
        placeholder="Nome" 
        value={name} 
        onChange={e => setName(e.target.value)} 
        style={darkMode ? { ...styles.darkNameInput, ...(isMobile && styles.mobileInput) } : { ...styles.nameInput, ...(isMobile && styles.mobileInput) }} 
      />
      <input 
        placeholder="Idade" 
        value={age} 
        onChange={e => setAge(e.target.value.replace(/[^\d]/g, ""))} 
        style={darkMode ? { ...styles.darkAgeInput, ...(isMobile && styles.mobileAgeInput) } : { ...styles.ageInput, ...(isMobile && styles.mobileAgeInput) }} 
      />
      <button 
        style={{ 
          ...styles.confirmButton, 
          ...(isMobile && styles.mobileConfirmButton) 
        }} 
        onClick={handleAdd}
      >
        Adicionar
      </button>
    </div>
  );
}

function CounterBlock({ label, value, darkMode, isMobile }) {
  return (
    <div style={darkMode ? { ...styles.darkCounterBlock, ...(isMobile && styles.mobileCounterBlock) } : { ...styles.counterBlock, ...(isMobile && styles.mobileCounterBlock) }}>
      <div style={{ 
        ...styles.counterValue, 
        color: darkMode ? "#fff" : "#7f3b57",
        fontSize: isMobile ? 16 : 22
      }}>
        {String(value).padStart(2, "0")}
      </div>
      <div style={{ 
        ...styles.counterLabel, 
        color: darkMode ? "#ffdfe8" : "#7f3b57",
        fontSize: isMobile ? 10 : 13
      }}>
        {label}
      </div>
    </div>
  );
}

const styles = {
  page: { 
    minHeight: "100vh", 
    display: "flex", 
    justifyContent: "center", 
    alignItems: "flex-start", 
    backgroundSize: "cover", 
    backgroundPosition: "center", 
    backgroundRepeat: "no-repeat", 
    fontFamily: "'Inter', sans-serif", 
    color: "#333", 
    backgroundColor: "#fdf6f9", 
    position: "relative", 
    overflow: "hidden",
    WebkitOverflowScrolling: "touch" // Suave scrolling no iOS
  },
  card: { 
    width: "100%", 
    maxWidth: 720, 
    background: "rgba(255, 255, 255, 0.95)", 
    padding: 24, 
    borderRadius: 20, 
    boxShadow: "0 15px 40px rgba(255, 133, 179, 0.2)", 
    backdropFilter: "blur(10px)", 
    zIndex: 20 
  },
  darkCard: { 
    width: "100%", 
    maxWidth: 720, 
    background: "rgba(58, 43, 59, 0.95)", 
    padding: 24, 
    borderRadius: 20, 
    boxShadow: "0 15px 40px rgba(0, 0, 0, 0.4)", 
    color: "#fff", 
    zIndex: 20 
  },
  mobileCard: {
    padding: 16,
    borderRadius: 16,
    marginTop: 10,
    marginBottom: 10
  },
  tabs: { 
    display: "flex", 
    gap: 12, 
    marginBottom: 20 
  },
  tab: { 
    flex: 1, 
    padding: "14px 18px", 
    background: "#f9f0f5", 
    border: "none", 
    borderRadius: 12, 
    cursor: "pointer", 
    fontWeight: 600, 
    transition: "all 0.3s ease", 
    color: "#7f3b57",
    WebkitTapHighlightColor: "transparent" // Remove highlight no iOS
  },
  tabActive: { 
    background: "#ff85b3", 
    color: "#fff", 
    transform: "translateY(-2px)", 
    boxShadow: "0 6px 15px rgba(255, 133, 179, 0.3)" 
  },
  tabContent: { 
    transition: "all 0.4s ease" 
  },
  passport: { 
    padding: 28, 
    borderRadius: 16, 
    background: "#fff7fb", 
    textAlign: "center", 
    boxShadow: "0 6px 16px rgba(255, 133, 179, 0.1)" 
  },
  darkPassport: { 
    padding: 28, 
    borderRadius: 16, 
    background: "#3e2836", 
    textAlign: "center", 
    boxShadow: "0 6px 16px rgba(0, 0, 0, 0.3)" 
  },
  countdownBox: { 
    background: "#fff0f5", 
    padding: 18, 
    borderRadius: 14, 
    marginTop: 18 
  },
  darkCountdownBox: { 
    background: "#4a2f3d", 
    padding: 18, 
    borderRadius: 14, 
    marginTop: 18 
  },
  counterBlock: { 
    background: "#fff", 
    padding: "14px 10px", 
    borderRadius: 12, 
    textAlign: "center", 
    flex: 1, 
    boxShadow: "0 4px 12px rgba(255, 133, 179, 0.1)" 
  },
  darkCounterBlock: { 
    background: "#5a3a48", 
    padding: "14px 10px", 
    borderRadius: 12, 
    textAlign: "center", 
    flex: 1, 
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)" 
  },
  mobileCounterBlock: {
    padding: "10px 6px",
    borderRadius: 10
  },
  counterValue: { 
    fontSize: 22, 
    fontWeight: 800 
  },
  counterLabel: { 
    fontSize: 13, 
    opacity: 0.8 
  },
  guestRow: { 
    display: "flex", 
    gap: 12, 
    alignItems: "center", 
    background: "linear-gradient(90deg, rgba(255, 255, 255, 0.98), rgba(255, 244, 246, 0.9))", 
    padding: 14, 
    borderRadius: 14, 
    boxShadow: "0 4px 12px rgba(255, 133, 179, 0.1)" 
  },
  darkGuestRow: { 
    display: "flex", 
    gap: 12, 
    alignItems: "center", 
    background: "linear-gradient(90deg, rgba(78, 58, 79, 0.98), rgba(94, 62, 80, 0.9))", 
    padding: 14, 
    borderRadius: 14, 
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)" 
  },
  mobileGuestRow: {
    padding: 12,
    borderRadius: 12,
    gap: 8
  },
  magicButton: { 
    border: "none", 
    background: "#ffd700", 
    padding: 12, 
    borderRadius: 50, 
    cursor: "pointer", 
    fontSize: 20, 
    transition: "all 0.3s ease", 
    boxShadow: "0 4px 12px rgba(255, 215, 0, 0.4)",
    WebkitTapHighlightColor: "transparent"
  },
  mobileMagicButton: {
    padding: 10,
    fontSize: 18
  },
  cancelButton: { 
    border: "none", 
    background: "#ffe4e9", 
    padding: 10, 
    borderRadius: 50, 
    cursor: "pointer", 
    fontSize: 16, 
    transition: "all 0.2s ease", 
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)", 
    color: "#ff69b4",
    WebkitTapHighlightColor: "transparent"
  },
  mobileCancelButton: {
    padding: 8,
    fontSize: 14
  },
  confirmButton: { 
    padding: "14px 20px", 
    borderRadius: 12, 
    background: "linear-gradient(45deg, #ff69b4, #ff1493)", 
    border: "none", 
    color: "#fff", 
    cursor: "pointer", 
    fontWeight: 700, 
    transition: "all 0.3s ease", 
    boxShadow: "0 4px 12px rgba(255, 105, 180, 0.3)",
    WebkitTapHighlightColor: "transparent"
  },
  mobileConfirmButton: {
    padding: "12px 16px",
    fontSize: 14
  },
  nameInput: { 
    flex: 1, 
    padding: 14, 
    borderRadius: 10, 
    border: "2px solid #ffe4f0", 
    fontSize: 15, 
    transition: "all 0.3s ease" 
  },
  darkNameInput: { 
    flex: 1, 
    padding: 14, 
    borderRadius: 10, 
    border: "2px solid #5a3a48", 
    fontSize: 15, 
    background: "#4a2f3d", 
    color: "#fff" 
  },
  ageInput: { 
    width: 80, 
    padding: 14, 
    borderRadius: 10, 
    border: "2px solid #ffe4f0", 
    fontSize: 15 
  },
  darkAgeInput: { 
    width: 80, 
    padding: 14, 
    borderRadius: 10, 
    border: "2px solid #5a3a48", 
    fontSize: 15, 
    background: "#4a2f3d", 
    color: "#fff" 
  },
  mobileInput: {
    padding: 12,
    fontSize: 14,
    borderRadius: 8
  },
  mobileAgeInput: {
    width: 70,
    padding: 12,
    fontSize: 14,
    borderRadius: 8
  },
  input: { 
    width: "100%", 
    padding: 14, 
    borderRadius: 10, 
    border: "2px solid #ffe4f0", 
    fontSize: 15, 
    marginTop: 8 
  },
  darkInput: { 
    width: "100%", 
    padding: 14, 
    borderRadius: 10, 
    border: "2px solid #5a3a48", 
    fontSize: 15, 
    background: "#4a2f3d", 
    color: "#fff", 
    marginTop: 8 
  },
  errorContainer: { 
    display: "flex", 
    flexDirection: "column", 
    alignItems: "center", 
    justifyContent: "center", 
    minHeight: "100vh", 
    textAlign: "center", 
    padding: 20, 
    backgroundColor: "#fdf6f9" 
  },
  
  // Estilos da moeda
  coin: {
    width: 120, 
    height: 120, 
    borderRadius: "50%", 
    display: "flex", 
    alignItems: "center", 
    justifyContent: "center", 
    position: "absolute", 
    top: 10, 
    left: 10,
    transition: "all 0.5s ease",
    border: "4px solid rgba(255, 255, 255, 0.8)",
  },
  spinningContent: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#fff",
    textShadow: "0 2px 10px rgba(255, 215, 0, 0.8)",
    animation: "pulse 0.5s infinite alternate"
  },
  coinContent: {
    filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))"
  },
  revealedContent: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    height: "100%",
    borderRadius: "50%",
    background: "rgba(255, 255, 255, 0.9)",
    boxShadow: "inset 0 0 20px rgba(255, 105, 180, 0.3)"
  },
  giftText: {
    fontWeight: "bold",
    color: "#ff69b4",
    fontFamily: "'Dancing Script', cursive",
    textShadow: "2px 2px 4px rgba(0,0,0,0.2)",
    transform: "rotate(-5deg)"
  },
  sparkle: { 
    position: "absolute", 
    fontSize: 20, 
    animation: "sparkle 1.5s infinite", 
    pointerEvents: "none",
    filter: "drop-shadow(0 0 8px gold)"
  },
  glowRing: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: "50%",
    border: "3px solid transparent",
    background: "linear-gradient(135deg, #ffd700, #ffeb3b, #ffd700) border-box",
    mask: "linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)",
    maskComposite: "exclude",
    animation: "rotateGlow 2s linear infinite"
  },
  magicSpinButton: { 
    padding: "14px 24px", 
    borderRadius: 50, 
    border: "none", 
    color: "#fff", 
    fontWeight: 600, 
    cursor: "pointer", 
    boxShadow: "0 6px 16px rgba(255, 105, 180, 0.4)", 
    transition: "all 0.3s ease",
    fontSize: 16
  },
  revealContainer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    marginTop: 16,
    padding: "12px 20px",
    background: "linear-gradient(135deg, rgba(255, 105, 180, 0.1), rgba(255, 20, 147, 0.1))",
    borderRadius: 20,
    border: "2px dashed #ff69b4"
  },
  revealText: {
    fontWeight: 600,
    color: "#ff69b4",
    fontFamily: "'Dancing Script', cursive",
    margin: 0,
    textAlign: "center"
  },
  giftHighlight: {
    color: "#ff1493",
    textShadow: "2px 2px 4px rgba(0,0,0,0.1)",
    fontFamily: "'Dancing Script', cursive"
  },
  confetti: {
    fontSize: 24,
    animation: "bounce 0.5s infinite alternate"
  }
};

const GlobalStyles = ({ isMobile }) => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@600;700&display=swap');
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
    
    * {
      box-sizing: border-box;
      -webkit-tap-highlight-color: transparent;
    }
    
    body {
      margin: 0;
      padding: 0;
      font-family: 'Inter', sans-serif;
      overflow-x: hidden;
      background-color: #fdf6f9;
    }
    
    input, button {
      font-family: 'Inter', sans-serif;
    }
    
    @keyframes spin {
      0% { transform: rotateY(0deg) scale(1); }
      25% { transform: rotateY(900deg) scale(1.1); }
      50% { transform: rotateY(1800deg) scale(1.2); }
      75% { transform: rotateY(2700deg) scale(1.1); }
      100% { transform: rotateY(3600deg) scale(1); }
    }
    
    @keyframes revealPulse {
      0% { transform: scale(1); }
      50% { transform: scale(1.05); }
      100% { transform: scale(1); }
    }
    
    @keyframes sparkle {
      0%, 100% { opacity: 0; transform: scale(0) rotate(0deg); }
      50% { opacity: 1; transform: scale(1.5) rotate(180deg); }
    }
    
    @keyframes pulse {
      0% { opacity: 0.7; transform: scale(1); }
      100% { opacity: 1; transform: scale(1.1); }
    }
    
    @keyframes pulseGlow {
      0% { box-shadow: 0 0 20px #ffd700, 0 0 40px #ffeb3b; }
      100% { box-shadow: 0 0 30px #ffd700, 0 0 60px #ffeb3b; }
    }
    
    @keyframes pulseGlowPink {
      0% { box-shadow: 0 0 20px #ff69b4, 0 0 40px #ff85b3; }
      100% { box-shadow: 0 0 30px #ff69b4, 0 0 60px #ff85b3; }
    }
    
    @keyframes rotateGlow {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    
    @keyframes bounce {
      0% { transform: translateY(0); }
      100% { transform: translateY(-10px); }
    }
    
    @keyframes fall { 
      0% { transform: translateY(-100vh) rotate(0deg); opacity: 0; } 
      10% { opacity: 1; } 
      100% { transform: translateY(100vh) rotate(360deg); opacity: 0; } 
    }
    
    .confetti {
      position: fixed;
      width: ${isMobile ? '8px' : '12px'};
      height: ${isMobile ? '8px' : '12px'};
      background: radial-gradient(circle, rgba(255, 182, 193, 0.9) 0%, rgba(255, 105, 180, 0.7) 100%);
      border-radius: 50%;
      animation: fall 3s linear forwards;
      z-index: 1000;
      pointer-events: none;
    }
    
    button {
      -webkit-appearance: none;
      border-radius: 12px;
    }
    
    button:hover:not(:disabled) { 
      transform: translateY(-2px); 
      box-shadow: 0 8px 20px rgba(255, 105, 180, 0.4); 
    }
    
    input:focus { 
      border-color: #ff69b4; 
      box-shadow: 0 0 0 3px rgba(255, 105, 180, 0.2); 
      outline: none; 
    }
    
    /* Melhorias para mobile */
    @media (max-width: 768px) {
      body {
        font-size: 14px;
      }
      
      input {
        font-size: 16px; /* Previne zoom no iOS */
      }
    }
  `}</style>
);

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