import { Spinner } from "@/components/ui/spinner";

export default function ChatThreadLoading() {
  return (
    <div className="flex h-[calc(100vh-6rem)] items-center justify-center">
      <Spinner className="size-5" />
    </div>
  );
}
