"use client";

import { useEffect, useRef, useState } from "react";
import { inputClass } from "@/components/ui";

/* eslint-disable @typescript-eslint/no-explicit-any */

// Load the Maps JS bootstrap once; resolve when the core API is ready.
let mapsPromise: Promise<void> | null = null;
function loadMaps(key: string): Promise<void> {
  if (mapsPromise) return mapsPromise;
  mapsPromise = new Promise<void>((resolve, reject) => {
    const w = window as any;
    if (w.google?.maps?.importLibrary) return resolve();
    w.__tpMapsInit = () => resolve();
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      key
    )}&loading=async&callback=__tpMapsInit`;
    s.async = true;
    s.onerror = () => reject(new Error("Google Maps failed to load"));
    document.head.appendChild(s);
  });
  return mapsPromise;
}

type Suggestion = { id: string; label: string; prediction: any };

/**
 * Location input with Places Autocomplete built on the new AutocompleteSuggestion
 * data API (works on all key types). The visible input always submits its text
 * (free-typing works; server geocodes as a fallback); picking a suggestion fills
 * the standardized address + hidden lat/lng. Degrades to a plain input with no key.
 */
export function PlacesAutocomplete({
  name = "address",
  latName = "lat",
  lngName = "lng",
  placeNameField,
  placeholder,
  defaultValue = "",
  required = false,
}: {
  name?: string;
  latName?: string;
  lngName?: string;
  placeNameField?: string;
  placeholder?: string;
  defaultValue?: string;
  required?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const latRef = useRef<HTMLInputElement>(null);
  const lngRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  const placesRef = useRef<any>(null);
  const tokenRef = useRef<any>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!key) {
      console.warn(
        "[PlacesAutocomplete] NEXT_PUBLIC_GOOGLE_MAPS_API_KEY not set — using a plain input."
      );
      return;
    }
    let cancelled = false;
    loadMaps(key)
      .then(async () => {
        const g = (window as any).google;
        const places = await g.maps.importLibrary("places");
        if (cancelled) return;
        placesRef.current = places;
        tokenRef.current = new places.AutocompleteSessionToken();
        setReady(true);
      })
      .catch((err) => console.error("[PlacesAutocomplete]", err));
    return () => {
      cancelled = true;
    };
  }, []);

  function clearCoords() {
    if (latRef.current) latRef.current.value = "";
    if (lngRef.current) lngRef.current.value = "";
    if (nameRef.current) nameRef.current.value = "";
  }

  async function fetchSuggestions(input: string) {
    const places = placesRef.current;
    if (!places || input.trim().length < 3) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    try {
      const { suggestions: raw } =
        await places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input,
          sessionToken: tokenRef.current,
        });
      const list: Suggestion[] = (raw ?? [])
        .filter((s: any) => s.placePrediction)
        .map((s: any, i: number) => ({
          id: s.placePrediction.placeId ?? String(i),
          label:
            s.placePrediction.text?.text ??
            s.placePrediction.mainText?.text ??
            "",
          prediction: s.placePrediction,
        }));
      setSuggestions(list);
      setOpen(list.length > 0);
    } catch (err) {
      console.error("[PlacesAutocomplete] suggestions", err);
    }
  }

  function onInput(e: React.ChangeEvent<HTMLInputElement>) {
    clearCoords(); // typing invalidates a previous selection
    const v = e.target.value;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(v), 220);
  }

  async function choose(s: Suggestion) {
    try {
      const place = s.prediction.toPlace();
      await place.fetchFields({
        fields: ["formattedAddress", "location", "displayName"],
      });
      if (inputRef.current)
        inputRef.current.value = place.formattedAddress ?? s.label;
      if (latRef.current) latRef.current.value = place.location ? String(place.location.lat()) : "";
      if (lngRef.current) lngRef.current.value = place.location ? String(place.location.lng()) : "";
      if (nameRef.current) nameRef.current.value = place.displayName ?? "";
    } catch (err) {
      console.error("[PlacesAutocomplete] place details", err);
      if (inputRef.current) inputRef.current.value = s.label;
    }
    setOpen(false);
    setSuggestions([]);
    // Fresh token for the next search session.
    if (placesRef.current) tokenRef.current = new placesRef.current.AutocompleteSessionToken();
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
        autoComplete="off"
        className={inputClass}
        onChange={ready ? onInput : undefined}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      <input ref={latRef} type="hidden" name={latName} />
      <input ref={lngRef} type="hidden" name={lngName} />
      {placeNameField && <input ref={nameRef} type="hidden" name={placeNameField} />}

      {open && suggestions.length > 0 && (
        <ul className="absolute left-0 right-0 top-[calc(100%+4px)] z-[3000] overflow-hidden rounded-xl border border-faint bg-white shadow-[0_18px_40px_rgba(20,24,40,.18)]">
          {suggestions.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(s)}
                className="block w-full px-4 py-2.5 text-left text-[14px] hover:bg-haze"
              >
                {s.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
