import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ARMS_UP, FPS, IDLE, KNEEL, POINT_UP, SHRUG } from "../Kit";
import { Creator } from "./Creator";
import { CREAM, Defs, Land, SIT } from "./World";

export const CreatorTest: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  return (
    <AbsoluteFill style={{ background: CREAM }}>
      <svg width={1080} height={1920}>
        <Defs />
        <Land floor={1000} />
        <Creator x={220} y={1000} t={t} pose={IDLE} smile={0.8} />
        <Creator x={540} y={1000} t={t} pose={{ ...IDLE, rs: -28, re: -96, head: 6 }} hold="phoneGlow" smile={-0.5} brow={-0.6} lid={0.3} lx={0.8} ly={0.6} />
        <Creator x={860} y={1000} t={t} pose={{ ...IDLE, ls: 100, le: 134, rs: -100, re: -134, head: -6 }} talk={1} wide={1} />
        <Creator x={200} y={1880} t={t} pose={{ ...KNEEL, ls: 20, le: -140, rs: -20, re: 140, head: 8 }} lid={1} s={0.9} />
        <Creator x={470} y={1880} t={t} pose={SHRUG} smile={-0.3} brow={-1} s={0.9} />
        <Creator x={720} y={1880} t={t} pose={{ ...SIT, head: 12, ls: 6, rs: -6 }} smile={-0.8} brow={-1} s={0.9} />
        <Creator x={940} y={1880} t={t} pose={{ ...POINT_UP }} talk={0.5} brow={1} s={0.9} />
        <Creator x={540} y={520} t={t} pose={ARMS_UP} smile={1} s={0.6} />
      </svg>
    </AbsoluteFill>
  );
};
