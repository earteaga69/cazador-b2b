import { useState, useEffect, useMemo } from "react";
import { Radar, MapPin, Search, Phone, Globe, ExternalLink, Copy, Check, Loader2, Save, Trash2, Download, Upload } from "lucide-react";

const theme = {
  bg: "#060B08", panel: "#0C1610", panel2: "#101D15", border: "#1F3A28",
  text: "#E4F5E9", muted: "#6E9C7E", accent: "#3FE07C", accent2: "#7FE0AF",
  warn: "#E0B23F",
};
const FONT_MONO = "'IBM Plex Mono', 'Consolas', monospace";
const FONT_SANS = "-apple-system, 'Segoe UI', Roboto, sans-serif";

const SERVICES = [
  { id: "mantenimiento", label: "Mantenimiento de equipo de cómputo" },
  { id: "cctv", label: "Instalación de CCTV" },
  { id: "web-nueva", label: "Desarrollo web (no tienen sitio)" },
  { id: "web-mejora", label: "Mejora de sitio existente / Google Maps" },
];

const PROPOSAL_TEMPLATES = {
  mantenimiento: (name) => `Hola, soy Esteban de Soluciones TI Cuautitlán. Vi que ${name} está en la zona — ofrezco mantenimiento preventivo y correctivo de equipo de cómputo con más de 30 años de experiencia. ¿Les interesaría una cotización sin compromiso?`,
  cctv: (name) => `Hola, soy Esteban de Soluciones TI Cuautitlán. Vi que ${name} está en la zona — instalo sistemas de videovigilancia (CCTV) para negocios. ¿Les interesaría una cotización sin compromiso?`,
  "web-nueva": (name) => `Hola, soy Esteban de Soluciones TI Cuautitlán. Noté que no encontré un sitio web público de ${name} — puedo ayudarles a tener presencia en internet, con diseño y mantenimiento incluido. ¿Les interesa platicarlo?`,
  "web-mejora": (name) => `Hola, soy Esteban de Soluciones TI Cuautitlán. Vi el sitio de ${name} y creo que puedo ayudarles a mejorar su posicionamiento en Google Maps y su diseño. ¿Les interesaría revisarlo juntos?`,
};

// Categories mapped to real OpenStreetMap tags — this is what makes the search free (no Google API/card needed)
const CATEGORIES = [
  { id: "comercios", label: "Comercios / Tiendas", query: 'node["shop"](around:{r},{lat},{lng});' },
  { id: "oficinas", label: "Oficinas / Servicios profesionales", query: 'node["office"](around:{r},{lat},{lng});' },
  { id: "restaurantes", label: "Restaurantes / Cafés", query: 'node["amenity"~"^(restaurant|cafe|fast_food)$"](around:{r},{lat},{lng});' },
  { id: "escuelas", label: "Escuelas", query: 'node["amenity"~"^(school|college|university)$"](around:{r},{lat},{lng});' },
  { id: "bancos", label: "Bancos / Financiero", query: 'node["amenity"="bank"](around:{r},{lat},{lng});' },
  { id: "salud", label: "Clínicas / Consultorios", query: 'node["amenity"~"^(clinic|doctors|dentist|pharmacy)$"](around:{r},{lat},{lng});' },
  { id: "talleres", label: "Talleres / Industria", query: 'node["shop"="car_repair"](around:{r},{lat},{lng});node["craft"](around:{r},{lat},{lng});' },
];

const RADII = [1000, 3000, 5000, 10000];

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function loadLeads() {
  try {
    const saved = localStorage.getItem("cazador-leads");
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
}

export default function App() {
  const [origin, setOrigin] = useState(null); // { lat, lng, label }
  const [manualQuery, setManualQuery] = useState("");
  const [radius, setRadius] = useState(3000);
  const [selectedCats, setSelectedCats] = useState(["comercios", "oficinas"]);
  const [locating, setLocating] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState([]);
  const [leadData, setLeadData] = useState(loadLeads); // keyed by osm id: { status, service, notes }
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    try {
      localStorage.setItem("cazador-leads", JSON.stringify(leadData));
    } catch {}
  }, [leadData]);

  const toggleCat = (id) => setSelectedCats((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));

  const useGPS = () => {
    setError("");
    setLocating(true);
    if (!navigator.geolocation) {
      setError("Tu navegador no soporta geolocalización.");
      setLocating(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setOrigin({ lat: pos.coords.latitude, lng: pos.coords.longitude, label: "Tu ubicación actual" });
        setLocating(false);
      },
      (err) => {
        setError("No se pudo obtener tu ubicación: " + err.message);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const searchAddress = async () => {
    if (!manualQuery.trim()) return;
    setError("");
    setLocating(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(manualQuery)}`);
      const data = await res.json();
      if (data.length === 0) {
        setError("No se encontró esa dirección. Intenta ser más específico (ej. agrega la ciudad).");
      } else {
        setOrigin({ lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), label: data[0].display_name });
      }
    } catch (e) {
      setError("Error buscando la dirección. Intenta de nuevo.");
    }
    setLocating(false);
  };

  const runSearch = async () => {
    if (!origin) {
      setError("Primero define una ubicación (GPS o dirección).");
      return;
    }
    if (selectedCats.length === 0) {
      setError("Elige al menos una categoría de negocio.");
      return;
    }
    setError("");
    setSearching(true);
    setResults([]);
    const parts = CATEGORIES.filter((c) => selectedCats.includes(c.id))
      .map((c) => c.query.replaceAll("{r}", radius).replaceAll("{lat}", origin.lat).replaceAll("{lng}", origin.lng))
      .join("\n");
    const query = `[out:json][timeout:25];(${parts});out body;`;
    try {
      const res = await fetch("https://overpass-api.de/api/interpreter", {
        method: "POST",
        body: query,
      });
      if (!res.ok) throw new Error("La API de OpenStreetMap no respondió (puede estar saturada, intenta en un momento).");
      const data = await res.json();
      const named = (data.elements || []).filter((el) => el.tags && el.tags.name);
      const enriched = named.map((el) => {
        const t = el.tags;
        const addr = [t["addr:street"], t["addr:housenumber"]].filter(Boolean).join(" ") || t["addr:full"] || "";
        return {
          id: `${el.type}/${el.id}`,
          name: t.name,
          address: addr,
          phone: t.phone || t["contact:phone"] || "",
          website: t.website || t["contact:website"] || "",
          category: t.shop || t.office || t.amenity || t.craft || "negocio",
          lat: el.lat,
          lng: el.lon,
          distance: haversine(origin.lat, origin.lng, el.lat, el.lon),
        };
      });
      enriched.sort((a, b) => a.distance - b.distance);
      setResults(enriched);
      if (enriched.length === 0) setError("No se encontraron negocios con nombre en esa zona/categorías. Intenta ampliar el radio.");
    } catch (e) {
      setError(e.message || "Error en la búsqueda.");
    }
    setSearching(false);
  };

  const setLead = (id, patch) => {
    setLeadData((d) => ({ ...d, [id]: { ...d[id], ...patch } }));
  };

  const buildWhatsAppLink = (lead, serviceId) => {
    if (!lead.phone) return null;
    const digits = lead.phone.replace(/[^0-9]/g, "");
    const withCountry = digits.startsWith("52") ? digits : `52${digits}`;
    const text = PROPOSAL_TEMPLATES[serviceId](lead.name);
    return `https://wa.me/${withCountry}?text=${encodeURIComponent(text)}`;
  };

  const copyProposal = async (lead, serviceId) => {
    const text = PROPOSAL_TEMPLATES[serviceId](lead.name);
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(lead.id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {}
  };

  const exportLeads = () => {
    const blob = new Blob([JSON.stringify(leadData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "cazador-b2b-leads.json";
    a.click();
  };

  const importLeads = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        setLeadData((d) => ({ ...d, ...parsed }));
      } catch {
        setError("El archivo no es un JSON válido de leads.");
      }
    };
    reader.readAsText(file);
  };

  const inputBase = { background: theme.panel2, border: `1px solid ${theme.border}`, color: theme.text };
  const savedCount = Object.keys(leadData).length;

  return (
    <div style={{ background: theme.bg, color: theme.text, fontFamily: FONT_SANS, minHeight: "100vh" }} className="w-full p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Radar size={22} style={{ color: theme.accent }} aria-hidden="true" />
            <span style={{ fontSize: 20, fontWeight: 600, fontFamily: FONT_MONO, letterSpacing: "0.02em" }}>CAZADOR B2B</span>
          </div>
          <div style={{ fontSize: 12, color: theme.muted, fontFamily: FONT_MONO }}>{savedCount} leads guardados</div>
        </div>

        {/* Location panel */}
        <div className="rounded-xl p-4 mb-5" style={{ background: theme.panel, border: `1px solid ${theme.border}` }}>
          <div style={{ fontSize: 12, color: theme.muted, fontFamily: FONT_MONO, textTransform: "uppercase", marginBottom: 10 }}>1. Ubicación</div>
          <div className="flex flex-wrap gap-2 mb-3">
            <button onClick={useGPS} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm" style={{ background: theme.accent, color: "#04210F", fontWeight: 600 }}>
              {locating ? <Loader2 size={14} className="animate-spin" /> : <MapPin size={14} />} Usar mi ubicación GPS
            </button>
            <input value={manualQuery} onChange={(e) => setManualQuery(e.target.value)} placeholder="O escribe una dirección/colonia" className="flex-1 min-w-[200px] rounded-lg p-2 text-sm" style={inputBase} />
            <button onClick={searchAddress} className="px-3 py-2 rounded-lg text-sm" style={{ border: `1px solid ${theme.border}`, color: theme.muted }}>Buscar dirección</button>
          </div>
          {origin && <div style={{ fontSize: 12, color: theme.accent2 }}>📍 {origin.label} ({origin.lat.toFixed(4)}, {origin.lng.toFixed(4)})</div>}
        </div>

        {/* Category + radius panel */}
        <div className="rounded-xl p-4 mb-5" style={{ background: theme.panel, border: `1px solid ${theme.border}` }}>
          <div style={{ fontSize: 12, color: theme.muted, fontFamily: FONT_MONO, textTransform: "uppercase", marginBottom: 10 }}>2. Qué buscar</div>
          <div className="flex flex-wrap gap-2 mb-4">
            {CATEGORIES.map((c) => (
              <button key={c.id} onClick={() => toggleCat(c.id)} className="px-2.5 py-1 rounded-md text-xs" style={{
                background: selectedCats.includes(c.id) ? theme.accent2 : "transparent",
                color: selectedCats.includes(c.id) ? "#04210F" : theme.muted,
                border: `1px solid ${selectedCats.includes(c.id) ? theme.accent2 : theme.border}`,
              }}>{c.label}</button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span style={{ fontSize: 12, color: theme.muted }}>Radio:</span>
            {RADII.map((r) => (
              <button key={r} onClick={() => setRadius(r)} className="px-2 py-1 rounded-md text-xs" style={{
                background: radius === r ? theme.accent : "transparent",
                color: radius === r ? "#04210F" : theme.muted,
                border: `1px solid ${radius === r ? theme.accent : theme.border}`,
              }}>{r >= 1000 ? `${r / 1000}km` : `${r}m`}</button>
            ))}
          </div>
        </div>

        <button onClick={runSearch} disabled={searching} className="w-full flex items-center justify-center gap-2 rounded-lg py-3 mb-5 text-sm" style={{ background: theme.accent, color: "#04210F", fontWeight: 700, opacity: searching ? 0.7 : 1 }}>
          {searching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
          {searching ? "Buscando negocios..." : "Buscar negocios cercanos"}
        </button>

        {error && <div className="rounded-lg p-3 mb-5 text-xs" style={{ background: "rgba(224,178,63,0.1)", border: `1px solid ${theme.warn}`, color: theme.warn }}>{error}</div>}

        {/* Results */}
        {results.length > 0 && (
          <div className="flex flex-col gap-3 mb-8">
            <div style={{ fontSize: 12, color: theme.muted, fontFamily: FONT_MONO, textTransform: "uppercase" }}>{results.length} negocios encontrados</div>
            {results.map((lead) => {
              const saved = leadData[lead.id] || { status: "nuevo", service: "mantenimiento" };
              const waLink = buildWhatsAppLink(lead, saved.service);
              return (
                <div key={lead.id} className="rounded-xl p-4" style={{ background: theme.panel, border: `1px solid ${theme.border}` }}>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <div style={{ fontWeight: 600 }}>{lead.name}</div>
                      <div style={{ fontSize: 12, color: theme.muted }}>{lead.category} · {lead.distance.toFixed(1)} km · {lead.address || "sin dirección registrada"}</div>
                    </div>
                    <select value={saved.status} onChange={(e) => setLead(lead.id, { status: e.target.value })} className="text-xs rounded-md p-1.5" style={inputBase}>
                      <option value="nuevo">Nuevo</option>
                      <option value="contactado">Contactado</option>
                      <option value="cotizado">Cotizado</option>
                      <option value="cerrado">Cerrado</option>
                    </select>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 mb-3" style={{ fontSize: 12 }}>
                    {lead.phone ? (
                      <span className="flex items-center gap-1" style={{ color: theme.accent2 }}><Phone size={12} /> {lead.phone}</span>
                    ) : (
                      <span style={{ color: theme.muted }}>Sin teléfono en OpenStreetMap</span>
                    )}
                    {lead.website ? (
                      <a href={lead.website.startsWith("http") ? lead.website : `https://${lead.website}`} target="_blank" rel="noopener" className="flex items-center gap-1" style={{ color: theme.accent2 }}><Globe size={12} /> Tiene sitio web</a>
                    ) : (
                      <a href={`https://www.google.com/search?q=${encodeURIComponent(lead.name + " " + (lead.address || ""))}`} target="_blank" rel="noopener" className="flex items-center gap-1" style={{ color: theme.warn }}>
                        <ExternalLink size={12} /> Sin sitio en OSM — verificar
                      </a>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <select value={saved.service} onChange={(e) => setLead(lead.id, { service: e.target.value })} className="text-xs rounded-md p-1.5 flex-1 min-w-[180px]" style={inputBase}>
                      {SERVICES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                    </select>
                    {waLink ? (
                      <a href={waLink} target="_blank" rel="noopener" className="px-3 py-1.5 rounded-md text-xs" style={{ background: theme.accent, color: "#04210F", fontWeight: 600 }}>Enviar propuesta →</a>
                    ) : (
                      <button onClick={() => copyProposal(lead, saved.service)} className="flex items-center gap-1 px-3 py-1.5 rounded-md text-xs" style={{ border: `1px solid ${theme.border}`, color: theme.muted }}>
                        {copiedId === lead.id ? <Check size={12} /> : <Copy size={12} />} Copiar propuesta
                      </button>
                    )}
                    <button onClick={() => setLead(lead.id, { saved: true, name: lead.name, phone: lead.phone, address: lead.address })} className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs" style={{ border: `1px solid ${theme.border}`, color: theme.muted }}>
                      <Save size={12} /> Guardar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Backup */}
        <div className="rounded-xl p-4 flex items-center justify-between flex-wrap gap-2" style={{ background: theme.panel, border: `1px solid ${theme.border}` }}>
          <div style={{ fontSize: 12, color: theme.muted }}>Tus leads se guardan en este navegador. Respáldalos de vez en cuando:</div>
          <div className="flex gap-2">
            <button onClick={exportLeads} className="flex items-center gap-1 px-3 py-1.5 rounded-md text-xs" style={{ border: `1px solid ${theme.border}`, color: theme.muted }}><Download size={12} /> Exportar</button>
            <label className="flex items-center gap-1 px-3 py-1.5 rounded-md text-xs cursor-pointer" style={{ border: `1px solid ${theme.border}`, color: theme.muted }}>
              <Upload size={12} /> Importar
              <input type="file" accept="application/json" onChange={importLeads} className="hidden" />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
