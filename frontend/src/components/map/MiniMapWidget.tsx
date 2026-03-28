import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import { motion } from 'framer-motion';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useTheme } from '../../hooks/useTheme';
import { MapPin, ExternalLink } from 'lucide-react';

// ─── Oman Center ──────────────────────────────────────────────────────────────
const OMAN_CENTER: [number, number] = [21.4735, 55.9754];

// ─── Custom Animated Marker ───────────────────────────────────────────────────
const createPulseMarker = (color: string) => L.divIcon({
  className: '',
  iconSize: [48, 48],
  iconAnchor: [24, 24],
  html: `
    <div style="position:relative;width:48px;height:48px;cursor:pointer;">
      <!-- Pulse rings -->
      <div style="position:absolute;inset:0;border-radius:50%;background:${color}30;animation:pulse-ring 2s ease-out infinite;"></div>
      <div style="position:absolute;inset:6px;border-radius:50%;background:${color}40;animation:pulse-ring 2s ease-out 0.4s infinite;"></div>
      <!-- Center dot -->
      <div style="position:absolute;inset:16px;border-radius:50%;background:${color};box-shadow:0 0 20px ${color}80,0 0 40px ${color}40;border:3px solid rgba(255,255,255,0.9);"></div>
    </div>
    <style>
      @keyframes pulse-ring {
        0% { transform: scale(0.8); opacity: 1; }
        100% { transform: scale(2); opacity: 0; }
      }
    </style>
  `,
});

// ─── Fit to Oman on Mount ─────────────────────────────────────────────────────
function FitOman() {
  const map = useMap();
  useEffect(() => {
    map.setView(OMAN_CENTER, 6);
  }, [map]);
  return null;
}

// ─── Mini Map Widget ──────────────────────────────────────────────────────────
export function MiniMapWidget() {
  const { colors: P } = useTheme();
  const navigate = useNavigate();

  const markerIcon = useMemo(() => createPulseMarker(P.accent), [P.accent]);

  const handleMarkerClick = () => {
    navigate('/map');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative overflow-hidden rounded-[20px]"
      style={{
        background: P.card,
        border: `1px solid ${P.border}`,
        boxShadow: `inset 0 1px 0 0 ${P.glow}25, 0 12px 40px rgba(0,0,0,0.05), 0 2px 8px rgba(0,0,0,0.03)`,
      }}
    >
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-[1000] p-4 flex items-center justify-between" style={{ background: `linear-gradient(to bottom, ${P.card}ee, transparent)` }}>
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg flex items-center justify-center" style={{ background: `${P.accent}15`, border: `1px solid ${P.accent}25` }}>
            <MapPin size={13} style={{ color: P.accent }} />
          </div>
          <div>
            <h3 className="text-sm font-bold" style={{ color: P.textHi, fontFamily: 'Playfair Display, serif' }}>Oman CSR Map</h3>
            <p className="text-[10px]" style={{ color: P.textLo }}>Click to explore projects</p>
          </div>
        </div>
        <button
          onClick={() => navigate('/map')}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition-all hover:scale-105"
          style={{ background: `${P.accent}12`, color: P.accent, border: `1px solid ${P.accent}25` }}
        >
          View All <ExternalLink size={10} />
        </button>
      </div>

      {/* Map Container */}
      <div style={{ height: 280 }}>
        <MapContainer
          center={OMAN_CENTER}
          zoom={6}
          zoomControl={false}
          attributionControl={false}
          scrollWheelZoom={false}
          dragging={false}
          doubleClickZoom={false}
          style={{ height: '100%', width: '100%', background: P.surface }}
        >
          <FitOman />
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
          <Marker
            position={OMAN_CENTER}
            icon={markerIcon}
            eventHandlers={{
              click: handleMarkerClick,
            }}
          />
        </MapContainer>
      </div>

      {/* Bottom gradient overlay */}
      <div
        className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none"
        style={{ background: `linear-gradient(to top, ${P.card}, transparent)` }}
      />

      {/* Stats row */}
      <div className="absolute bottom-3 left-3 right-3 z-[1000] flex items-center justify-around px-3 py-2 rounded-xl" style={{ background: `${P.card}e0`, backdropFilter: 'blur(8px)', border: `1px solid ${P.border}` }}>
        {[
          { label: 'Governorates', value: '11' },
          { label: 'Projects', value: '25+' },
          { label: 'Regions', value: 'All' },
        ].map((s, i) => (
          <div key={i} className="text-center">
            <p className="text-xs font-bold tabular-nums" style={{ color: P.textHi }}>{s.value}</p>
            <p className="text-[9px]" style={{ color: P.textLo }}>{s.label}</p>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

export default MiniMapWidget;
