import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
const N = ["bedroom_night", "bedroom_dawn", "hills", "hills_dusk", "church_out", "church_in", "radio_room", "elijah", "qumran", "study", "road", "corkboard", "studio"];
export const PlatesSheet: React.FC = () => (
  <AbsoluteFill style={{ background: "#fff", flexDirection: "row", flexWrap: "wrap", gap: 6, padding: 6, alignContent: "flex-start" }}>
    {N.map((n) => <Img key={n} src={staticFile(`plates/${n}.jpg`)} style={{ height: 460, width: "auto" }} />)}
  </AbsoluteFill>
);
