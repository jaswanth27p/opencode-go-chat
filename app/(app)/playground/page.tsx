"use client";

import * as React from "react";
import { useCompletion } from "@ai-sdk/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ModelSelect } from "@/components/chat/model-select";
import { DEFAULT_MODEL } from "@/mastra/models";
import { toast } from "sonner";
import { playgroundInputSchema } from "@/lib/validations/playground";

const USAGE_MARKER = "\n\n<<usage>>";

export default function PlaygroundPage() {
  const [model, setModel] = React.useState(DEFAULT_MODEL);
  const [systemPrompt, setSystemPrompt] = React.useState("");
  const [temperature, setTemperature] = React.useState("0.7");
  const [maxTokens, setMaxTokens] = React.useState("");
  const [topP, setTopP] = React.useState("");
  const [topK, setTopK] = React.useState("");
  const [presencePenalty, setPresencePenalty] = React.useState("");
  const [frequencyPenalty, setFrequencyPenalty] = React.useState("");
  const [seed, setSeed] = React.useState("");
  const [stopSequences, setStopSequences] = React.useState("");

  const { completion, input, setInput, handleSubmit, isLoading, error } = useCompletion({
    api: "/api/playground",
    streamProtocol: "text",
    body: {
      model,
      systemPrompt: systemPrompt || undefined,
      temperature: temperature ? Number(temperature) : undefined,
      maxOutputTokens: maxTokens ? Number(maxTokens) : undefined,
      topP: topP ? Number(topP) : undefined,
      topK: topK ? Number(topK) : undefined,
      presencePenalty: presencePenalty ? Number(presencePenalty) : undefined,
      frequencyPenalty: frequencyPenalty ? Number(frequencyPenalty) : undefined,
      seed: seed ? Number(seed) : undefined,
      stopSequences: stopSequences || undefined,
    },
  });

  const [responseText, usage] = React.useMemo(() => {
    const markerIndex = completion.indexOf(USAGE_MARKER);
    if (markerIndex === -1) {
      return [completion, null] as const;
    }
    const text = completion.slice(0, markerIndex);
    const raw = completion.slice(markerIndex + USAGE_MARKER.length);
    try {
      return [text, JSON.parse(raw)] as const;
    } catch {
      return [text, null] as const;
    }
  }, [completion]);

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const parsed = playgroundInputSchema.safeParse({
      prompt: input,
      model,
      systemPrompt: systemPrompt || undefined,
      temperature: temperature ? Number(temperature) : undefined,
      maxTokens: maxTokens ? Number(maxTokens) : undefined,
      topP: topP ? Number(topP) : undefined,
      topK: topK ? Number(topK) : undefined,
      presencePenalty: presencePenalty ? Number(presencePenalty) : undefined,
      frequencyPenalty: frequencyPenalty ? Number(frequencyPenalty) : undefined,
      seed: seed ? Number(seed) : undefined,
      stopSequences: stopSequences || undefined,
    });

    if (!parsed.success) {
      const first = parsed.error.issues[0];
      toast.error(first?.message || "Invalid input");
      return;
    }

    handleSubmit(e);
  };

  React.useEffect(() => {
    if (error) {
      toast.error(error.message || "Something went running the model. Try again.");
    }
  }, [error]);

  return (
    <div className="grid h-[calc(100vh-6rem)] grid-cols-1 gap-4 lg:grid-cols-[320px_1fr] lg:gap-6">
      <aside className="flex flex-col gap-4 overflow-y-auto lg:pr-4">
        <div className="space-y-1.5">
          <Label>Model</Label>
          <ModelSelect onChange={setModel} value={model} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="system-prompt">System prompt</Label>
          <Textarea
            id="system-prompt"
            onChange={(e) => setSystemPrompt(e.target.value)}
            placeholder="Optional instructions override"
            value={systemPrompt}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="temperature">Temperature</Label>
            <Input
              id="temperature"
              onChange={(e) => setTemperature(e.target.value)}
              step="0.1"
              type="number"
              value={temperature}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="max-tokens">Max output tokens</Label>
            <Input
              id="max-tokens"
              onChange={(e) => setMaxTokens(e.target.value)}
              type="number"
              value={maxTokens}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="top-p">Top P</Label>
            <Input
              id="top-p"
              onChange={(e) => setTopP(e.target.value)}
              step="0.05"
              type="number"
              value={topP}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="top-k">Top K</Label>
            <Input id="top-k" onChange={(e) => setTopK(e.target.value)} type="number" value={topK} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="presence-penalty">Presence penalty</Label>
            <Input
              id="presence-penalty"
              max="1"
              min="-1"
              onChange={(e) => setPresencePenalty(e.target.value)}
              step="0.1"
              type="number"
              value={presencePenalty}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="frequency-penalty">Frequency penalty</Label>
            <Input
              id="frequency-penalty"
              max="1"
              min="-1"
              onChange={(e) => setFrequencyPenalty(e.target.value)}
              step="0.1"
              type="number"
              value={frequencyPenalty}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="seed">Seed</Label>
            <Input id="seed" onChange={(e) => setSeed(e.target.value)} type="number" value={seed} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="stop-sequences">Stop sequences (comma separated)</Label>
          <Input
            id="stop-sequences"
            onChange={(e) => setStopSequences(e.target.value)}
            value={stopSequences}
          />
        </div>
      </aside>

      <section className="flex min-h-0 flex-col gap-4">
        <form className="flex flex-col gap-2" onSubmit={handleFormSubmit}>
          <Textarea
            className="min-h-24"
            onChange={(e) => setInput(e.target.value)}
            placeholder="Prompt"
            value={input}
          />
          <Button className="self-end" disabled={isLoading || !input.trim()} type="submit">
            {isLoading ? "Running…" : "Run"}
          </Button>
        </form>
        <div className="flex-1 overflow-y-auto rounded-md border p-4 text-sm whitespace-pre-wrap">
          {error ? (
            <span className="text-destructive">{error.message || "Something went wrong. Try again."}</span>
          ) : (
            responseText || <span className="text-muted-foreground">Response will appear here.</span>
          )}
        </div>
        {usage && (
          <div className="text-muted-foreground text-xs">
            {usage.inputTokens ?? 0} in · {usage.outputTokens ?? 0} out · {usage.totalTokens ?? 0} total tokens
          </div>
        )}
      </section>
    </div>
  );
}
