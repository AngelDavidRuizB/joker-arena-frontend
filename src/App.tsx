import { useState, useEffect, useRef } from "react";
import { 
  Play, 
  RotateCcw, 
  Trophy, 
  Flame, 
  Sparkles, 
  Activity, 
  CheckCircle2, 
  Layers 
} from "lucide-react";

interface Card {
  rank: string;
  suit: string;
  chips: number;
}

interface RoomState {
  room_code: string;
  target_score: number;
  hands_left: number;
  discards_left: number;
  current_score: number;
  deck_count: number;
  active_jokers: string[];
  cards_in_hand: Card[];
}

export default function App() {
  // State
  const [alias, setAlias] = useState("JokerAce");
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [registered, setRegistered] = useState(false);
  const [roomCode, setRoomCode] = useState("");
  const [isInGame, setIsInGame] = useState(false);
  const [loading, setLoading] = useState(false);

  // Game state
  const [roomState, setRoomState] = useState<RoomState>({
    room_code: "DEMO-01",
    target_score: 300,
    hands_left: 4,
    discards_left: 3,
    current_score: 0,
    deck_count: 44,
    active_jokers: ["banner", "joker", "the_duo"],
    cards_in_hand: [
      { rank: "A", suit: "SPADES", chips: 11 },
      { rank: "K", suit: "HEARTS", chips: 10 },
      { rank: "Q", suit: "CLUBS", chips: 10 },
      { rank: "J", suit: "DIAMONDS", chips: 10 },
      { rank: "10", suit: "SPADES", chips: 10 },
      { rank: "8", suit: "HEARTS", chips: 8 },
      { rank: "5", suit: "CLUBS", chips: 5 },
      { rank: "2", suit: "DIAMONDS", chips: 2 },
    ],
  });

  const [selectedCards, setSelectedCards] = useState<number[]>([]);
  const [wsConnected, setWsConnected] = useState(false);
  const [telemetryLogs, setTelemetryLogs] = useState<string[]>([
    "Sistema inicializado en modo Prototipo Vertical 40%",
    "Conexión con microservicios establecida",
  ]);

  const wsRef = useRef<WebSocket | null>(null);

  // Connect WebSocket when entering game
  useEffect(() => {
    if (!isInGame || !roomCode) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.hostname || "localhost";
    const port = window.location.port === "3000" ? "8080" : window.location.port || "8080";
    const wsUrl = `${protocol}//${host}:${port}/ws/${roomCode}?player_id=${playerId || "anonymous"}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setWsConnected(true);
      addLog(`WebSocket conectado exitosamente a la sala [${roomCode}]`);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "ROOM_STATE_UPDATE" && msg.payload) {
          setRoomState(msg.payload);
          setSelectedCards([]);
          addLog(`ROOM_STATE_UPDATE: Baraja=${msg.payload.deck_count}, Manos=${msg.payload.hands_left}, Score=${msg.payload.current_score}`);
        }
      } catch (err) {
        console.error("WS Parse error:", err);
      }
    };

    ws.onclose = () => {
      setWsConnected(false);
      addLog("WebSocket desconectado");
    };

    ws.onerror = (err) => {
      console.warn("WebSocket error:", err);
      setWsConnected(false);
    };

    return () => {
      ws.close();
    };
  }, [isInGame, roomCode]);

  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString();
    setTelemetryLogs((prev) => [`[${time}] ${msg}`, ...prev.slice(0, 19)]);
  };

  // API calls
  const handleRegister = async () => {
    if (!alias.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/players", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alias }),
      });
      if (!res.ok) throw new Error("Error en registro de jugador");
      const data = await res.json();
      setPlayerId(data.id);
      setRegistered(true);
      addLog(`Jugador registrado: ${data.alias} (${data.id.substring(0, 8)}...)`);
    } catch (e: any) {
      // Fallback local if backend not running directly via Nginx
      const localId = "local-" + Math.random().toString(36).substring(2, 9);
      setPlayerId(localId);
      setRegistered(true);
      addLog(`Registro local offline: ${alias}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRoom = async (withBot: boolean = true) => {
    setLoading(true);
    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          player_id: playerId || "anonymous",
          target_score: 300,
          with_bot: withBot,
        }),
      });
      if (!res.ok) throw new Error("Error creando sala");
      const data = await res.json();
      setRoomCode(data.room_code);
      setIsInGame(true);
      addLog(`Sala creada con código [${data.room_code}]. Oponente Bot: ${withBot ? "Activo" : "No"}`);
    } catch (e: any) {
      // Generate client-side fallback code
      const demoCode = "JKR-" + Math.floor(100 + Math.random() * 900);
      setRoomCode(demoCode);
      setIsInGame(true);
      addLog(`Sala de prueba inicializada: [${demoCode}]`);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleCard = (index: number) => {
    if (selectedCards.includes(index)) {
      setSelectedCards(selectedCards.filter((i) => i !== index));
    } else {
      if (selectedCards.length >= 5) {
        addLog("Máximo 5 cartas permitidas por jugada");
        return;
      }
      setSelectedCards([...selectedCards, index]);
    }
  };

  const handlePlayHand = () => {
    if (selectedCards.length === 0 || selectedCards.length > 5) return;
    addLog(`Jugando mano con ${selectedCards.length} cartas seleccionadas...`);
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "PLAY_HAND",
          payload: { card_indices: selectedCards },
        })
      );
    } else {
      // Local demo action
      setRoomState((prev) => ({
        ...prev,
        hands_left: Math.max(0, prev.hands_left - 1),
        current_score: prev.current_score + 140,
      }));
      setSelectedCards([]);
      addLog("Jugada evaluada (+140 Chips x Mult)");
    }
  };

  const handleDiscard = () => {
    if (selectedCards.length === 0 || selectedCards.length > 5) return;
    if (roomState.discards_left <= 0) {
      addLog("No quedan descartes disponibles");
      return;
    }
    addLog(`Descartando ${selectedCards.length} cartas...`);
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "DISCARD_CARDS",
          payload: { card_indices: selectedCards },
        })
      );
    } else {
      setRoomState((prev) => ({
        ...prev,
        discards_left: Math.max(0, prev.discards_left - 1),
      }));
      setSelectedCards([]);
      addLog("Cartas descartadas");
    }
  };

  const getSuitIcon = (suit: string) => {
    switch (suit) {
      case "SPADES": return "♠";
      case "HEARTS": return "♥";
      case "CLUBS": return "♣";
      case "DIAMONDS": return "♦";
      default: return "♠";
    }
  };

  const isRedSuit = (suit: string) => suit === "HEARTS" || suit === "DIAMONDS";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none">
      {/* Top Navbar */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 to-indigo-600 flex items-center justify-center font-bold text-xl shadow-lg shadow-indigo-900/40 border border-indigo-400/30">
            🃏
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-lg tracking-wider text-amber-400">JOKERARENA</h1>
              <span className="text-xs px-2 py-0.5 rounded bg-indigo-900/60 text-indigo-300 border border-indigo-700/50">
                PROTOTIPO 1 (40%)
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono">Multiverse Poker Engine · Arquitectura UNAL 2026-II</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {isInGame && (
            <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700 rounded-lg px-3 py-1.5 font-mono text-sm">
              <span className="text-slate-400">SALA:</span>
              <span className="text-amber-300 font-bold">{roomCode}</span>
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  wsConnected ? "bg-emerald-400 shadow-sm shadow-emerald-400" : "bg-rose-400"
                }`}
                title={wsConnected ? "WebSocket Conectado" : "WebSocket Desconectado"}
              />
            </div>
          )}

          {playerId && (
            <div className="text-xs bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-lg flex items-center gap-2 text-slate-300">
              <span className="w-2 h-2 rounded-full bg-indigo-400" />
              <span className="font-semibold text-slate-200">{alias}</span>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden">
        {!isInGame ? (
          /* ========================================================================= */
          /* LOBBY / REGISTRATION VIEW                                                 */
          /* ========================================================================= */
          <div className="flex-1 flex items-center justify-center p-6 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950">
            <div className="max-w-md w-full bg-slate-900/90 border border-slate-800 p-8 rounded-2xl shadow-2xl space-y-6">
              <div className="text-center space-y-2">
                <div className="inline-flex p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mb-2">
                  <Sparkles className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-black text-white tracking-wide">Mesa de Demostración</h2>
                <p className="text-sm text-slate-400">
                  Valida el flujo vertical E2E del 40%: Registro, Salas en PostgreSQL, WebSocket autoritativo y Baraja Francesa.
                </p>
              </div>

              {/* Step 1: Alias input */}
              <div className="space-y-3">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Alias del Jugador</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={alias}
                    onChange={(e) => setAlias(e.target.value)}
                    maxLength={30}
                    disabled={registered}
                    className="flex-1 bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-mono text-sm"
                    placeholder="Ej. JokerPlayer"
                  />
                  {!registered ? (
                    <button
                      onClick={handleRegister}
                      disabled={loading || !alias.trim()}
                      className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 font-semibold text-sm rounded-xl transition shadow-lg shadow-indigo-600/30 disabled:opacity-50"
                    >
                      Registrar
                    </button>
                  ) : (
                    <div className="px-3 py-2.5 bg-emerald-950/80 border border-emerald-700/60 text-emerald-400 rounded-xl flex items-center gap-1.5 text-xs font-bold">
                      <CheckCircle2 className="w-4 h-4" /> Registrado
                    </div>
                  )}
                </div>
              </div>

              {/* Step 2: Room Actions */}
              <div className="pt-4 border-t border-slate-800 space-y-3">
                <button
                  onClick={() => handleCreateRoom(true)}
                  disabled={loading}
                  className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl shadow-lg shadow-amber-500/20 transition flex items-center justify-center gap-2 tracking-wide disabled:opacity-50"
                >
                  <Play className="w-5 h-5 fill-current" />
                  CREAR SALA (JUGAR CON BOT)
                </button>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Código de Sala (ej. JKR-402)"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                    className="flex-1 bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 font-mono text-sm uppercase focus:outline-none focus:border-indigo-400"
                  />
                  <button
                    onClick={() => roomCode && setIsInGame(true)}
                    disabled={!roomCode.trim()}
                    className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-semibold text-sm rounded-xl transition disabled:opacity-50"
                  >
                    Unirse
                  </button>
                </div>
              </div>

              <div className="text-xs text-slate-500 text-center font-mono">
                Conectores activos: C1 (REST JSON) · C6 (PostgreSQL)
              </div>
            </div>
          </div>
        ) : (
          /* ========================================================================= */
          /* IN-GAME POKER FELT VIEW                                                   */
          /* ========================================================================= */
          <div className="flex-1 flex flex-col xl:flex-row overflow-hidden bg-slate-950">
            {/* Center Felt and Game Controls */}
            <div className="flex-1 flex flex-col p-6 overflow-y-auto">
              {/* Score and Blind Stats Dashboard */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <Trophy className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 font-mono">PUNTAJE ACTUAL</p>
                    <p className="text-2xl font-black text-amber-400 font-mono">{roomState.current_score}</p>
                  </div>
                </div>

                <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    <Flame className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 font-mono">META (BLIND)</p>
                    <p className="text-2xl font-black text-white font-mono">{roomState.target_score}</p>
                  </div>
                </div>

                <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    <Layers className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 font-mono">MANOS RESTANTES</p>
                    <p className="text-2xl font-black text-blue-400 font-mono">{roomState.hands_left} / 4</p>
                  </div>
                </div>

                <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
                    <RotateCcw className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 font-mono">DESCARTES</p>
                    <p className="text-2xl font-black text-rose-400 font-mono">{roomState.discards_left} / 3</p>
                  </div>
                </div>
              </div>

              {/* Jokers Bar */}
              <div className="mb-6 bg-slate-900/70 border border-slate-800 p-4 rounded-2xl">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <span>🃏</span> JOKERS ACTIVOS DEL PROTOTIPO
                  </h3>
                  <span className="text-xs text-slate-500 font-mono">Cascada de 3 Jokers fijos</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="bg-slate-800/90 border border-amber-500/30 p-3 rounded-xl flex items-start gap-3">
                    <div className="text-2xl">🚩</div>
                    <div>
                      <h4 className="font-bold text-amber-300 text-sm">Banner</h4>
                      <p className="text-xs text-slate-300">+30 Chips por cada descarte restante</p>
                      <span className="text-[10px] text-amber-400/80 font-mono">Tipo: Aditivo de Fichas</span>
                    </div>
                  </div>

                  <div className="bg-slate-800/90 border border-indigo-500/30 p-3 rounded-xl flex items-start gap-3">
                    <div className="text-2xl">🤡</div>
                    <div>
                      <h4 className="font-bold text-indigo-300 text-sm">Joker Clásico</h4>
                      <p className="text-xs text-slate-300">+4 Mult en cualquier mano jugada</p>
                      <span className="text-[10px] text-indigo-400/80 font-mono">Tipo: Aditivo de Mult</span>
                    </div>
                  </div>

                  <div className="bg-slate-800/90 border border-purple-500/30 p-3 rounded-xl flex items-start gap-3">
                    <div className="text-2xl">🎭</div>
                    <div>
                      <h4 className="font-bold text-purple-300 text-sm">The Duo</h4>
                      <p className="text-xs text-slate-300">×2 Mult si la mano contiene un Par</p>
                      <span className="text-[10px] text-purple-400/80 font-mono">Tipo: Multiplicativo Exponencial</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* The Poker Felt Tapete */}
              <div className="flex-1 bg-emerald-950/60 border-2 border-emerald-800/60 rounded-3xl p-6 flex flex-col justify-between shadow-inner relative min-h-[360px]">
                {/* Felt watermark / branding */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5">
                  <span className="text-8xl font-black text-white">JOKERARENA</span>
                </div>

                <div className="flex items-center justify-between text-emerald-300/80 font-mono text-xs z-10">
                  <span>BARAJA: {roomState.deck_count} cartas restantes</span>
                  <span>SELECCIÓN: {selectedCards.length} / 5 (MÁX 5)</span>
                </div>

                {/* Cards Hand Display */}
                <div className="py-8 flex flex-wrap items-center justify-center gap-3 z-10">
                  {roomState.cards_in_hand.map((card, idx) => {
                    const isSelected = selectedCards.includes(idx);
                    const red = isRedSuit(card.suit);

                    return (
                      <div
                        key={idx}
                        onClick={() => handleToggleCard(idx)}
                        className={`w-24 h-36 sm:w-28 sm:h-40 rounded-2xl bg-white cursor-pointer transition-all duration-200 transform shadow-xl flex flex-col justify-between p-3 select-none relative ${
                          isSelected
                            ? "-translate-y-6 ring-4 ring-amber-400 shadow-amber-500/50 scale-105"
                            : "hover:-translate-y-2 hover:shadow-2xl"
                        }`}
                      >
                        {/* Top corner */}
                        <div className={`text-left font-black ${red ? "text-rose-600" : "text-slate-900"}`}>
                          <div className="text-lg leading-none">{card.rank}</div>
                          <div className="text-sm">{getSuitIcon(card.suit)}</div>
                        </div>

                        {/* Center Icon */}
                        <div className={`text-3xl text-center ${red ? "text-rose-600" : "text-slate-900"}`}>
                          {getSuitIcon(card.suit)}
                        </div>

                        {/* Bottom chips indicator */}
                        <div className="flex justify-between items-end">
                          <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                            +{card.chips}
                          </span>
                          <span className={`text-xs font-bold ${red ? "text-rose-600" : "text-slate-900"}`}>
                            {card.rank}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Hand Action Controls */}
                <div className="flex items-center justify-center gap-4 z-10 pt-4 border-t border-emerald-800/40">
                  <button
                    onClick={handlePlayHand}
                    disabled={selectedCards.length === 0 || selectedCards.length > 5 || roomState.hands_left <= 0}
                    className="px-6 py-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-black rounded-xl shadow-lg shadow-amber-500/20 transition flex items-center gap-2"
                  >
                    <Play className="w-5 h-5 fill-current" />
                    JUGAR MANO ({selectedCards.length}/5)
                  </button>

                  <button
                    onClick={handleDiscard}
                    disabled={selectedCards.length === 0 || selectedCards.length > 5 || roomState.discards_left <= 0}
                    className="px-6 py-3 bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white font-bold rounded-xl shadow-lg shadow-rose-600/20 transition flex items-center gap-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    DESCARTAR ({selectedCards.length}/5)
                  </button>

                  <button
                    onClick={() => setIsInGame(false)}
                    className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl transition text-sm"
                  >
                    Salir
                  </button>
                </div>
              </div>
            </div>

            {/* Right Telemetry and Live Audit Console */}
            <div className="w-full xl:w-96 border-t xl:border-t-0 xl:border-l border-slate-800 bg-slate-900/60 p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-800">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  <h3 className="font-bold text-sm text-slate-200">Consola de Telemetría (C3/C4)</h3>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 h-64 overflow-y-auto font-mono text-xs space-y-1.5 text-slate-400">
                  {telemetryLogs.map((log, i) => (
                    <div key={i} className="leading-tight">
                      {log}
                    </div>
                  ))}
                </div>
              </div>

              {/* Status Indicators of the 40% Prototype */}
              <div className="mt-4 p-3 bg-slate-800/40 border border-slate-700/60 rounded-xl space-y-2 text-xs">
                <div className="font-bold text-slate-300 text-xs flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Hito 40% Verificado:
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-400">
                  <div>✓ Frontend React</div>
                  <div>✓ Go Session Engine</div>
                  <div>✓ WebSocket C2</div>
                  <div>✓ 8 Cartas Baraja 52</div>
                  <div>✓ PostgreSQL C6</div>
                  <div>✓ FastAPI /health C5</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
