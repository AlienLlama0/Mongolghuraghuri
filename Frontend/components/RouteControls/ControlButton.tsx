import { ReactNode } from 'react';

interface Props{
  active: boolean;
  emphasis: boolean;
  onClick: () => void;
  icon: ReactNode;
  children: ReactNode;
}

const ControlButton = ({active, emphasis, onClick, icon, children}:Props) => {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex h-8 items-center gap-2 rounded-md border px-3 text-[13px] transition-colors ${
        active
          ? "border-route bg-route/15 text-ink"
          : emphasis
            ? "border-line-strong bg-raised text-ink hover:border-route/60"
            : "border-line text-muted hover:border-line-strong hover:text-ink"
      }`}
    >
      {icon}
      {children}
    </button>
  )
}

export default ControlButton