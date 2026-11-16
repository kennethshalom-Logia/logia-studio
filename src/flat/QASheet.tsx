import React from "react";
import { AbsoluteFill, Img, staticFile, getInputProps } from "remotion";
/** Contact sheet of public/qa/*.png given as inputProps.files */
export const QASheet: React.FC = () => {
  const files = ((getInputProps() as { files?: string[] }).files ?? []);
  return (
    <AbsoluteFill style={{ background: "#fff", flexDirection: "row", flexWrap: "wrap", gap: 6, padding: 6, alignContent: "flex-start" }}>
      {files.map((f) => <Img key={f} src={staticFile(`qa/${f}`)} style={{ height: 700, width: "auto" }} />)}
    </AbsoluteFill>
  );
};
