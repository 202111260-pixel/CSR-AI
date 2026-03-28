"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import DottedMap from "dotted-map";

interface Dot {
  start: { lat: number; lng: number };
  end:   { lat: number; lng: number };
}
interface WorldMapProps {
  dots?:      Dot[];
  lineColor?: string;
}

function curvePath(sx: number, sy: number, ex: number, ey: number) {
  const mx = (sx + ex) / 2;
  const my = Math.min(sy, ey) - Math.abs(ex - sx) * 0.25;
  return `M ${sx} ${sy} Q ${mx} ${my} ${ex} ${ey}`;
}

export default function WorldMap({ dots = [], lineColor = "#3b82f6" }: WorldMapProps) {
  const [mapSvg, setMapSvg]   = useState("");
  const [vb, setVb]           = useState({ x: 0, y: 0, w: 1000, h: 500 });

  useEffect(() => {
    const run = () => {
      const map = new DottedMap({ height: 40, grid: "diagonal" });
      const raw = map.getSVG({
        radius: 0.35,
        color: "rgba(255,255,255,0.22)",
        shape: "circle",
        backgroundColor: "transparent",
      });

      // Parse the real viewBox from the SVG output
      const match = raw.match(/viewBox="([\d.\s-]+)"/);
      if (match) {
        const [x, y, w, h] = match[1].split(/\s+/).map(Number);
        setVb({ x, y, w, h });
      }
      setMapSvg(raw);
    };

    if (typeof requestIdleCallback !== "undefined") {
      const id = requestIdleCallback(run, { timeout: 2000 });
      return () => cancelIdleCallback(id);
    }
    const id = setTimeout(run, 60);
    return () => clearTimeout(id);
  }, []);

  // Project lat/lng into the SAME viewBox as the dotted-map SVG
  function project(lat: number, lng: number) {
    return {
      x: ((lng + 180) / 360) * vb.w,
      y: ((90 - lat) / 180) * vb.h,
    };
  }

  return (
    <div className="w-full relative" style={{ aspectRatio: "2/1" }}>

      {/* Base map */}
      {mapSvg && (
        <div
          className="absolute inset-0 w-full h-full"
          dangerouslySetInnerHTML={{ __html: mapSvg }}
          style={{ lineHeight: 0 }}
        />
      )}

      {/* Overlay — same viewBox */}
      <svg
        viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
        className="absolute inset-0 w-full h-full"
        preserveAspectRatio="xMidYMid meet"
        style={{ pointerEvents: "none" }}
      >
        {dots.map((dot, i) => {
          const s = project(dot.start.lat, dot.start.lng);
          const e = project(dot.end.lat, dot.end.lng);
          const d = curvePath(s.x, s.y, e.x, e.y);
          const gid = `lg${i}`;
          return (
            <g key={i}>
              <defs>
                <linearGradient id={gid} x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%"   stopColor={lineColor} stopOpacity="0" />
                  <stop offset="50%"  stopColor={lineColor} stopOpacity="1" />
                  <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
                </linearGradient>
              </defs>

              <path d={d} fill="none" stroke={`url(#${gid})`} strokeWidth={0.5} opacity={0.2} />
              <motion.path d={d} fill="none" stroke={`url(#${gid})`} strokeWidth={0.8}
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 2, delay: i * 0.4, ease: "easeInOut", repeat: Infinity, repeatDelay: 3 }}
              />

              <circle cx={s.x} cy={s.y} r={1.2} fill={lineColor} />
              <motion.circle cx={s.x} cy={s.y} r={2} fill="none" stroke={lineColor} strokeWidth={0.5}
                initial={{ scale: 1, opacity: 0.7 }} animate={{ scale: 2.5, opacity: 0 }}
                transition={{ duration: 1.5, delay: i * 0.4, repeat: Infinity, repeatDelay: 3 }}
              />

              <circle cx={e.x} cy={e.y} r={1.2} fill={lineColor} />
              <motion.circle cx={e.x} cy={e.y} r={2} fill="none" stroke={lineColor} strokeWidth={0.5}
                initial={{ scale: 1, opacity: 0.7 }} animate={{ scale: 2.5, opacity: 0 }}
                transition={{ duration: 1.5, delay: i * 0.4 + 1.5, repeat: Infinity, repeatDelay: 3 }}
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
}
