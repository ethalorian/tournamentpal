"use client";

import { useEffect, useRef } from "react";
import { inputClass } from "@/components/ui";

/* eslint-disable @typescript-eslint/no-explicit-any */
let mapsPromise: Promise<void> | null = null;
function loadMaps(key: string): Promise<void> {
  if (mapsPromise) return mapsPromise;
  mapsPromise = new Promise<void>((resolve, reject) => {
    const w = window as any;
    if (w.google?.maps?.places) return resolve();
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places&loading=async`;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("maps failed"));
    document.head.appendChild(s);
  });
  return mapsPromise;
}

/**
 * A location input with Google Places Autocomplete. The visible input always
 * submits its text (so free-typing works and the server geocodes as a
 * fallback); selecting a suggestion fills the standardized address plus hidden
 * lat/lng (and optional place name). Degrades to a plain input with no key.
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
    if (!key || !inputRef.current) return;
    let ac: any;
    loadMaps(key)
      .then(() => {
        const g = (window as any).google;
        if (!g?.maps?.places?.Autocomplete || !inputRef.current) return;
        ac = new g.maps.places.Autocomplete(inputRef.current, {
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
      .catch(() => {});
    return () => {
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
