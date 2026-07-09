import { Spinner } from "@/components/ui/spinner";

export default function TracesLoading() {
  return (
    <div className="flex items-center justify-center p-8">
      <Spinner className="size-5" />
    </div>
  );
}
