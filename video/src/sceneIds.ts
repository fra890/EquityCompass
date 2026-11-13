export const SCENE_IDS = [
  "hook",
  "iso",
  "roads",
  "trap",
  "refund",
  "intersection",
  "principle",
  "endcard",
  "disclosure",
] as const;
export type SceneId = (typeof SCENE_IDS)[number];
