import Link from "next/link";

type Step = {
  label: string;
  href?: string | null;
  value: string;
  muted?: boolean;
};

export function OrderTraceability({ steps }: { steps: Step[] }) {
  return (
    <ol className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
      {steps.map((step, index) => (
        <li
          key={`${step.label}-${index}`}
          className="rounded-lg border bg-muted/30 px-3 py-2"
        >
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {index + 1}. {step.label}
          </p>
          {step.href ? (
            <Link href={step.href} className="mt-1 block text-sm font-medium hover:underline">
              {step.value}
            </Link>
          ) : (
            <p className={`mt-1 text-sm ${step.muted ? "text-muted-foreground" : "font-medium"}`}>
              {step.value}
            </p>
          )}
        </li>
      ))}
    </ol>
  );
}
