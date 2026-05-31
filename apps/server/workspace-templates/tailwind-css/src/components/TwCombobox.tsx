import { useState, type JSX } from "react";
import {
  Combobox,
  ComboboxButton,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
} from "@headlessui/react";

interface Person {
  readonly id: number;
  readonly name: string;
}

const PEOPLE: ReadonlyArray<Person> = [
  { id: 1, name: "Alex Morgan" },
  { id: 2, name: "Jamie Chen" },
  { id: 3, name: "Sam Patel" },
  { id: 4, name: "Robin Lee" },
  { id: 5, name: "Casey Rivera" },
];

export interface TwComboboxProps {
  readonly placeholder?: string;
}

export function TwCombobox(props: TwComboboxProps = {}): JSX.Element {
  const { placeholder = "Select a person" } = props;
  const [selected, setSelected] = useState<Person | null>(PEOPLE[0]);
  const [query, setQuery] = useState("");

  const filtered =
    query === ""
      ? PEOPLE
      : PEOPLE.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="w-64">
      <Combobox value={selected} onChange={setSelected}>
        <div className="relative">
          <ComboboxInput
            placeholder={placeholder}
            onChange={(e) => setQuery(e.target.value)}
            displayValue={(p: Person | null) => p?.name ?? ""}
            className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 pr-8 text-sm text-[var(--foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--ring)]"
          />
          <ComboboxButton className="absolute inset-y-0 right-0 flex items-center px-2 text-[var(--foreground)] opacity-60">
            ▾
          </ComboboxButton>
          <ComboboxOptions className="absolute z-10 mt-1 w-full overflow-auto rounded-md border border-[var(--border)] bg-[var(--background)] py-1 text-sm shadow-lg">
            {filtered.map((person) => (
              <ComboboxOption
                key={person.id}
                value={person}
                className="cursor-pointer px-3 py-1.5 text-[var(--foreground)] data-[focus]:bg-[var(--muted)]"
              >
                {person.name}
              </ComboboxOption>
            ))}
          </ComboboxOptions>
        </div>
      </Combobox>
    </div>
  );
}
