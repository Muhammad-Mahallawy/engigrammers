import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown, Search, X } from "lucide-react";
import { Experiment, outcomeInfo } from "@/lib/flowtrace";

interface Props {
  value: string;
  options: Experiment[];
  exact: boolean;
  onChange: (value: string, exact: boolean) => void;
}

export default function ExperimentSearch({
  value,
  options,
  exact,
  onChange,
}: Props) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const listId = useId();
  const helpId = useId();
  const root = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const effectiveActive = active >= 0 && active < options.length ? active : -1;

  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, []);
  useEffect(() => {
    if (open && effectiveActive >= 0)
      document
        .getElementById(`${listId}-${effectiveActive}`)
        ?.scrollIntoView({ block: "nearest" });
  }, [effectiveActive, listId, open]);

  const choose = (record: Experiment) => {
    onChange(record.test_id, true);
    setOpen(false);
    setActive(-1);
    input.current?.focus();
  };

  return (
    <div
      className="search-field experiment-search"
      ref={root}
      onBlur={event => {
        if (!event.currentTarget.contains(event.relatedTarget as Node))
          setOpen(false);
      }}
    >
      <Search size={17} aria-hidden="true" />
      <input
        ref={input}
        role="combobox"
        aria-label="Search experiments"
        aria-expanded={open}
        aria-autocomplete="list"
        aria-controls={open ? listId : undefined}
        aria-describedby={open ? helpId : undefined}
        aria-activedescendant={
          open && effectiveActive >= 0
            ? `${listId}-${effectiveActive}`
            : undefined
        }
        autoComplete="off"
        value={value}
        placeholder="Search or choose experiment…"
        onFocus={() => {
          setOpen(true);
          setActive(-1);
        }}
        onChange={event => {
          onChange(event.target.value, false);
          setOpen(true);
          setActive(-1);
        }}
        onKeyDown={event => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setOpen(true);
            setActive(current =>
              options.length ? (current + 1) % options.length : -1
            );
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setOpen(true);
            setActive(current =>
              options.length
                ? current <= 0
                  ? options.length - 1
                  : current - 1
                : -1
            );
          } else if (event.key === "Enter" && open && effectiveActive >= 0) {
            event.preventDefault();
            choose(options[effectiveActive]);
          } else if (event.key === "Escape") {
            event.preventDefault();
            setOpen(false);
            setActive(-1);
          } else if (event.key === "Tab") setOpen(false);
        }}
      />
      {value && (
        <button
          className="search-clear"
          aria-label="Clear experiment search"
          onClick={() => {
            onChange("", false);
            setOpen(true);
            setActive(-1);
            input.current?.focus();
          }}
        >
          <X size={14} />
        </button>
      )}
      <button
        className="search-browse"
        aria-label="Browse experiment options"
        aria-expanded={open}
        onMouseDown={event => event.preventDefault()}
        onClick={() => {
          input.current?.focus();
          setOpen(!open);
          setActive(-1);
        }}
      >
        <ChevronDown size={15} />
      </button>
      {open && (
        <div className="experiment-search-menu">
          <div className="experiment-search-caption">
            <span>{exact ? "Chosen experiment" : "Choose an experiment"}</span>
            <span>{options.length} available</span>
          </div>
          <div
            className="experiment-search-list"
            id={listId}
            role="listbox"
            aria-label="Experimental records"
          >
            {options.map((record, index) => {
              const outcome = outcomeInfo(record.outcome);
              return (
                <div
                  key={record.id}
                  id={`${listId}-${index}`}
                  role="option"
                  aria-selected={exact && value === record.test_id}
                  className={`experiment-search-option ${effectiveActive === index ? "active" : ""}`}
                  onMouseEnter={() => setActive(index)}
                  onMouseDown={event => event.preventDefault()}
                  onClick={() => choose(record)}
                >
                  <div>
                    <strong>{record.test_id}</strong>
                    <span>
                      {record.material} ·{" "}
                      {record.investigation || "Investigation not recorded"}
                    </span>
                  </div>
                  <span className="search-option-outcome">
                    <i style={{ background: outcome.color }} />
                    {outcome.label}
                  </span>
                </div>
              );
            })}
            {!options.length && (
              <p className="experiment-search-empty" role="status">
                No matching experiments. Clear your search or adjust the
                filters.
              </p>
            )}
          </div>
          <p className="experiment-search-help" id={helpId}>
            Type to narrow the list · ↑ ↓ to browse · Enter to choose
          </p>
        </div>
      )}
    </div>
  );
}
