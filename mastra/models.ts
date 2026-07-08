export type OpenCodeGoModel = {
  id: string;
  label: string;
  contextWindow: string;
  inputPricePerMillion: number;
  outputPricePerMillion: number;
  supportsImage: boolean;
  supportsAudio: boolean;
  supportsVideo: boolean;
};

export const OPENCODE_GO_MODELS: OpenCodeGoModel[] = [
  { id: "opencode-go/deepseek-v4-flash", label: "DeepSeek V4 Flash", contextWindow: "1.0M", inputPricePerMillion: 0.14, outputPricePerMillion: 0.28, supportsImage: false, supportsAudio: false, supportsVideo: false },
  { id: "opencode-go/deepseek-v4-pro", label: "DeepSeek V4 Pro", contextWindow: "1.0M", inputPricePerMillion: 2, outputPricePerMillion: 3, supportsImage: false, supportsAudio: false, supportsVideo: false },
  { id: "opencode-go/glm-5.1", label: "GLM 5.1", contextWindow: "203K", inputPricePerMillion: 1, outputPricePerMillion: 4, supportsImage: false, supportsAudio: false, supportsVideo: false },
  { id: "opencode-go/glm-5.2", label: "GLM 5.2", contextWindow: "1.0M", inputPricePerMillion: 1, outputPricePerMillion: 4, supportsImage: false, supportsAudio: false, supportsVideo: false },
  { id: "opencode-go/kimi-k2.6", label: "Kimi K2.6", contextWindow: "262K", inputPricePerMillion: 0.95, outputPricePerMillion: 4, supportsImage: false, supportsAudio: false, supportsVideo: false },
  { id: "opencode-go/kimi-k2.7-code", label: "Kimi K2.7 Code", contextWindow: "262K", inputPricePerMillion: 0.95, outputPricePerMillion: 4, supportsImage: false, supportsAudio: false, supportsVideo: false },
  { id: "opencode-go/mimo-v2.5", label: "MiMo V2.5", contextWindow: "1.0M", inputPricePerMillion: 0.14, outputPricePerMillion: 0.28, supportsImage: false, supportsAudio: false, supportsVideo: false },
  { id: "opencode-go/mimo-v2.5-pro", label: "MiMo V2.5 Pro", contextWindow: "1.0M", inputPricePerMillion: 2, outputPricePerMillion: 3, supportsImage: false, supportsAudio: false, supportsVideo: false },
  { id: "opencode-go/minimax-m2.7", label: "MiniMax M2.7", contextWindow: "205K", inputPricePerMillion: 0.3, outputPricePerMillion: 1, supportsImage: false, supportsAudio: false, supportsVideo: false },
  { id: "opencode-go/minimax-m3", label: "MiniMax M3", contextWindow: "1.0M", inputPricePerMillion: 0.3, outputPricePerMillion: 1, supportsImage: false, supportsAudio: false, supportsVideo: false },
  { id: "opencode-go/qwen3.6-plus", label: "Qwen3.6 Plus", contextWindow: "1.0M", inputPricePerMillion: 0.5, outputPricePerMillion: 3, supportsImage: false, supportsAudio: false, supportsVideo: false },
  { id: "opencode-go/qwen3.7-max", label: "Qwen3.7 Max", contextWindow: "1.0M", inputPricePerMillion: 3, outputPricePerMillion: 8, supportsImage: false, supportsAudio: false, supportsVideo: false },
  { id: "opencode-go/qwen3.7-plus", label: "Qwen3.7 Plus", contextWindow: "1.0M", inputPricePerMillion: 0.4, outputPricePerMillion: 2, supportsImage: false, supportsAudio: false, supportsVideo: false },
];

export const DEFAULT_MODEL = "opencode-go/deepseek-v4-flash";

export function getModel(id: string): OpenCodeGoModel {
  return (
    OPENCODE_GO_MODELS.find((m) => m.id === id) ??
    (OPENCODE_GO_MODELS.find((m) => m.id === DEFAULT_MODEL) as OpenCodeGoModel)
  );
}
