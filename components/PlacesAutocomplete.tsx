"use client";

import { useEffect, useRef } from "react";
import { inputClass } from "@/components/ui";

/* eslint-disable @typescript-eslint/no-explicit-any */

// Loads the Maps JS bootstrap once and resolves when the core API is ready.
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

/**
 * Location input with Google Places Autocomplete. The visible input always
 * submits its text (free-typing works; the server geocodes as a fallback);
 * selecting a suggestion fills the standardized address + hidden lat/lng.
 * Degrades to a plain input when no browser key is configured.
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

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!key) {
      console.warn(
        "[PlacesAutocomplete] NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not set — falling back to a plain input."
      );
      return;
    }
    if (!inputRef.current) return;

    let ac: any;
    let cancelled = false;

    loadMaps(key)
      .then(async () => {
        const g = (window as any).google;
        // Ensure the Places library is loaded before use (async bootstrap).
        const places = await g.maps.importLibrary("places");
        const Autocomplete = places.Autocomplete ?? g.maps.places?.Autocomplete;
        if (!Autocomplete) {
          console.error(
            "[PlacesAutocomplete] Autocomplete unavailable for this key. Enable the Maps JavaScript API + Places API, or migrate to PlaceAutocompleteElement."
          );
          return;
        }
        if (cancelled || !inputRef.current) return;

        ac = new Autocomplete(inputRef.current, {
          fields: ["formatted_address", "geometry", "name"],
        });
        ac.addListener("place_changed", () => {
          const place = ac.getPlace();
          const loc = place.geometry?.location;
          if (place.formatted_address && inputRef.current) {
            inputRef.current.value = place.formatted_address;
          }
          if (latRef.current) latRef.current.value = loc ? String(loc.lat()) : "";
          if (lngRef.current) lngRef.current.value = loc ? String(loc.lng()) : "";
          if (nameRef.current) nameRef.current.value = place.name ?? "";
        });
      })
      .catch((err) => console.error("[PlacesAutocomplete]", err));

    return () => {
      cancelled = true;
      const g = (window as any).google;
      if (ac && g?.maps?.event) g.maps.event.clearInstanceListeners(ac);
    };
  }, []);

  return (
    <>
      <input
        ref={inputRef}
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
        autoComplete="off"
        className={inputClass}
      />
      <input ref={latRef} type="hidden" name={latName} />
      <input ref={lngRef} type="hidden" name={lngName} />
      {placeNameField && <input ref={nameRef} type="hidden" name={placeNameField} />}
    </>
  );
}
