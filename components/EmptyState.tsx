import Image from "next/image";

type Props = {
  title: string;
  body?: string;
  className?: string;
};

export default function EmptyState({ title, body, className = "" }: Props) {
  return (
    <div
      className={`surface flex flex-col items-center px-6 py-10 text-center ${className}`}
    >
      <Image
        src="/ornaments/empty.svg"
        alt=""
        width={72}
        height={72}
        className="opacity-70"
      />
      <p className="mt-4 font-display text-lg text-[var(--text)]">{title}</p>
      {body ? (
        <p className="mt-2 max-w-sm text-sm font-light text-[var(--text-muted)]">
          {body}
        </p>
      ) : null}
    </div>
  );
}
