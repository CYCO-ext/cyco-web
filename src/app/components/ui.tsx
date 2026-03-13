import { cva } from "class-variance-authority";
import { InputHTMLAttributes, forwardRef } from "react";
import clsx from "clsx";
import React from "react";

export const button = cva(
  "inline-flex items-center justify-center rounded-xl px-4 py-2 text-white bg-cyco-green hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed shadow",
  { variants: { variant: { ghost: "bg-transparent text-cyco-green hover:bg-cyco-light" } } }
);

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={clsx(
        "w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-cyco-green/40",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";

export const MultiSelect = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      multiple
      className={clsx(
        "w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-cyco-green/40 min-h-[48px]",
        "appearance-none cursor-pointer",
        className
      )}
      {...props}
    >
      {children}
    </select>
  )
);
MultiSelect.displayName = "MultiSelect";

interface MaterialDropdownProps {
  options: { name: string }[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
}

export function MaterialDropdown({ options, selected, onChange, placeholder }: MaterialDropdownProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = options.filter(opt => opt.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="relative" ref={dropdownRef}>
      <div
        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm flex items-center cursor-pointer min-h-[48px]"
        onClick={() => setOpen((v) => !v)}
      >
        <input
          className="flex-1 outline-none bg-transparent"
          placeholder={placeholder || "Selecione materiais"}
          value={search}
          onChange={e => setSearch(e.target.value)}
          onFocus={() => setOpen(true)}
        />
        <span className="ml-2 text-gray-400">▼</span>
      </div>
      {open && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-56 overflow-auto">
          {filtered.length === 0 && (
            <div className="p-3 text-gray-400 text-sm">Nenhum material encontrado</div>
          )}
          {filtered.map(opt => (
            <label key={opt.name} className="flex items-center px-4 py-2 hover:bg-cyco-light cursor-pointer gap-2">
              <input
                type="checkbox"
                checked={selected.includes(opt.name)}
                onChange={() => {
                  if (selected.includes(opt.name)) {
                    onChange(selected.filter(m => m !== opt.name));
                  } else {
                    onChange([...selected, opt.name]);
                  }
                }}
              />
              <span>{opt.name}</span>
            </label>
          ))}
        </div>
      )}
      {selected.length > 0 && (
        <div className="absolute left-0 right-0 -bottom-7 text-xs text-cyco-green px-2 truncate">
          {selected.join(", ")}
        </div>
      )}
    </div>
  );
}
