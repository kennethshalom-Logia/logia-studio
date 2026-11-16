import { Composition } from "remotion";
import { FPS, H, W } from "./Kit";
import { Hear, HEAR_SECONDS, HearShort, HEAR_SHORT_SECONDS } from "./Hear";
import { HearV2, V2_SECONDS } from "./HearV2";
import { GridTest } from "./Narrator";
import { HeroTest } from "./Hero";
import { Hero2Test, TraceTest } from "./Hero2";
import { LogiaTalkTest } from "./Logia2D";
import { HearV3, V3_SECONDS } from "./HearV3";
import { Hear3D, H3D_SECONDS } from "./flat/Hear3D";
import { KenFaceFrame, PhoneScreen } from "./flat/FaceFrames";
import { HearCine, CINE_SECONDS } from "./flat/HearCine";
import { HearEditorial, EDITORIAL_SECONDS } from "./editorial/HearEditorial";
import { QASheet } from "./flat/QASheet";
import { PlatesSheet } from "./flat/PlatesSheet";
import { HearFlat, FLAT_SECONDS, KenFlatTest } from "./flat/HearFlat";
import { CreatorTest } from "./flat/CreatorTest";
import { Seen, SEEN_SECONDS, SeenPart1, SEEN1_SECONDS, SeenPart2, SEEN2_SECONDS } from "./flat/Seen";
import { Full, FullShort, Part1, Part2, Part2V2, Part2V3, Part3, Part3V2, Part3V3, Part3R } from "./Parts";

export const RemotionRoot = () => (
  <>
    <Composition id="Part1" component={Part1} durationInFrames={Math.round(64 * FPS)} fps={FPS} width={W} height={H} />
    <Composition id="Part2" component={Part2} durationInFrames={Math.round(43.8 * FPS)} fps={FPS} width={W} height={H} />
    <Composition id="Part2v2" component={Part2V2} durationInFrames={Math.round(49.5 * FPS)} fps={FPS} width={W} height={H} />
    <Composition id="Part2v3" component={Part2V3} durationInFrames={Math.round(59.08 * FPS)} fps={FPS} width={W} height={H} />
    <Composition id="Part3" component={Part3} durationInFrames={Math.round(52.6 * FPS)} fps={FPS} width={W} height={H} />
    <Composition id="Part3v2" component={Part3V2} durationInFrames={Math.round(51 * FPS)} fps={FPS} width={W} height={H} />
    <Composition id="Part3v3" component={Part3V3} durationInFrames={Math.round(57.28 * FPS)} fps={FPS} width={W} height={H} />
    <Composition id="Part3r" component={Part3R} durationInFrames={Math.round(73.5 * FPS)} fps={FPS} width={W} height={H} />
    <Composition id="Full" component={Full} durationInFrames={Math.round(127.5 * FPS)} fps={FPS} width={W} height={H} />
    <Composition id="Hear" component={Hear} durationInFrames={Math.round(HEAR_SECONDS * FPS)} fps={FPS} width={W} height={H} />
    <Composition id="HearShort" component={HearShort} durationInFrames={Math.round(HEAR_SHORT_SECONDS * FPS)} fps={FPS} width={W} height={H} />
    <Composition id="HearV2" component={HearV2} durationInFrames={Math.round(V2_SECONDS * FPS)} fps={FPS} width={W} height={H} />
    <Composition id="HearV3" component={HearV3} durationInFrames={Math.round(V3_SECONDS * FPS)} fps={FPS} width={W} height={H} />
    <Composition id="HearFlat" component={HearFlat} durationInFrames={Math.round(FLAT_SECONDS * FPS)} fps={FPS} width={W} height={H} />
    <Composition id="Hear3D" component={Hear3D} durationInFrames={Math.round(H3D_SECONDS * FPS)} fps={FPS} width={W} height={H} />
    <Composition id="KenFaceFrame" component={KenFaceFrame} durationInFrames={24} fps={FPS} width={820} height={925} />
    <Composition id="PhoneScreen" component={PhoneScreen} durationInFrames={4} fps={FPS} width={608} height={1272} />
    <Composition id="HearCine" component={HearCine} durationInFrames={Math.round(CINE_SECONDS * FPS)} fps={FPS} width={W} height={H} />
    <Composition id="HearEditorial" component={HearEditorial} durationInFrames={Math.round(EDITORIAL_SECONDS * FPS)} fps={FPS} width={W} height={H} />
    <Composition id="QASheet" component={QASheet} durationInFrames={1} fps={FPS} width={2400} height={1420} />
    <Composition id="PlatesSheet" component={PlatesSheet} durationInFrames={1} fps={FPS} width={2400} height={1420} />
    <Composition id="Seen" component={Seen} durationInFrames={Math.round(SEEN_SECONDS * FPS)} fps={FPS} width={W} height={H} />
    <Composition id="Seen1" component={SeenPart1} durationInFrames={Math.round(SEEN1_SECONDS * FPS)} fps={FPS} width={W} height={H} />
    <Composition id="Seen2" component={SeenPart2} durationInFrames={Math.round(SEEN2_SECONDS * FPS)} fps={FPS} width={W} height={H} />
    <Composition id="CreatorTest" component={CreatorTest} durationInFrames={30} fps={FPS} width={W} height={H} />
    <Composition id="KenFlatTest" component={KenFlatTest} durationInFrames={120} fps={FPS} width={W} height={H} />
    <Composition id="LogiaTalkTest" component={LogiaTalkTest} durationInFrames={300} fps={FPS} width={W} height={H} />
    <Composition id="TraceTest" component={TraceTest} durationInFrames={1} fps={FPS} width={2160} height={1080} />
    <Composition id="Hero2Test" component={Hero2Test} durationInFrames={1} fps={FPS} width={2160} height={1080} />
    <Composition id="HeroTest" component={HeroTest} durationInFrames={1} fps={FPS} width={W} height={H} />
    <Composition id="NarratorGrid" component={GridTest} durationInFrames={1} fps={FPS} width={1080} height={1440} />
    <Composition id="FullShort" component={FullShort} durationInFrames={Math.round(109.2 * FPS)} fps={FPS} width={W} height={H} />
  </>
);
