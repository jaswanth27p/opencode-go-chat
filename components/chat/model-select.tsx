"use client";

import { Brain } from "lucide-react";
import {
  PromptInputSelect,
  PromptInputSelectContent,
  PromptInputSelectItem,
  PromptInputSelectTrigger,
  PromptInputSelectValue,
} from "@/components/ai-elements/prompt-input";
import { OPENCODE_GO_MODELS, getModel } from "@/mastra/models";

export function ModelSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (id: string) => void;
}) {
  const selected = getModel(value);
  return (
    <PromptInputSelect onValueChange={(value) => onChange(value as string)} value={value}>
      <PromptInputSelectTrigger className="gap-1.5">
        <Brain className="size-4 shrink-0" />
        <PromptInputSelectValue placeholder="Model">
          <span className="hidden sm:inline">{selected.label}</span>
        </PromptInputSelectValue>
      </PromptInputSelectTrigger>
      <PromptInputSelectContent>
        {OPENCODE_GO_MODELS.map((model) => (
          <PromptInputSelectItem key={model.id} value={model.id}>
            {model.label}
          </PromptInputSelectItem>
        ))}
      </PromptInputSelectContent>
    </PromptInputSelect>
  );
}
