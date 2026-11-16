import React from "react";
import { AbsoluteFill, staticFile, useCurrentFrame } from "remotion";
import { KenFace } from "./World";

/** Face texture frames for the Blender puppet: index = talk(4) x lids(3) x mood(2). 820x925, transparent. */
export const FACE_TALK = [0, 0.2, 0.4, 0.6];
export const FACE_LIDS = [0, 0.45, 1];
export const FACE_SMILE = [0.7, -0.35];
export const KenFaceFrame: React.FC = () => {
  const f = useCurrentFrame();
  const talk = FACE_TALK[f % 4];
  const lid = FACE_LIDS[Math.floor(f / 4) % 3];
  const smile = FACE_SMILE[Math.floor(f / 12) % 2];
  return (
    <AbsoluteFill>
      <svg width={820} height={925} viewBox="0 0 820 925">
        <image href={staticFile("narrator/ken-head.png")} width={820} height={925} />
        <KenFace open={talk} smile={smile} lid={lid} uid={`f${f}`} />
      </svg>
    </AbsoluteFill>
  );
};

/** Phone screen states for the 3D phone: 0 empty, 1 typing, 2 sent, 3 delivered. 608x1272. */
export const PhoneScreen: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: "#0f1420", fontFamily: "Inter, Arial, sans-serif", alignItems: "center" }}>
      <div style={{ marginTop: 110, width: 96, height: 96, borderRadius: 48, background: "#2e3550", color: "#e9ecf5", fontSize: 50, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>G</div>
      <div style={{ color: "#e9ecf5", fontSize: 36, fontWeight: 700, marginTop: 14 }}>God</div>
      <div style={{ width: "86%", height: 2, background: "#262c40", marginTop: 26 }} />
      {f >= 2 ? (
        <div style={{ alignSelf: "flex-end", marginRight: 40, marginTop: 120, background: "#3478f6", color: "#fff", fontSize: 44, fontWeight: 600, padding: "26px 34px", borderRadius: 44 }}>God, are You there?</div>
      ) : null}
      {f >= 3 ? <div style={{ alignSelf: "flex-end", marginRight: 50, marginTop: 14, color: "#8d94aa", fontSize: 30 }}>Delivered</div> : null}
      <div style={{ position: "absolute", bottom: 90, width: "84%", height: 84, borderRadius: 42, background: "#1d2335", border: "3px solid #2f3650", color: "#e9ecf5", fontSize: 38, display: "flex", alignItems: "center", paddingLeft: 34 }}>
        {f === 1 ? "God, are You there?|" : ""}
      </div>
    </AbsoluteFill>
  );
};
