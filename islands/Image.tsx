import { useState } from "preact/hooks";
import { JSX } from "preact";
import { Package } from "lucide-preact";

export default function Image(
  { src, alt, class: className, ...props }:
    & JSX.HTMLAttributes<HTMLImageElement>
    & { src?: string | null; alt: string; class?: string },
) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  // via.placeholder.com is often down or blocks hotlinking, causing console errors.
  // We instantly fallback to our UI icon instead of attempting to fetch it.
  const finalSrc = src?.includes("via.placeholder.com") ? null : src;

  if (!finalSrc || hasError) {
    return (
      <div
        class={`relative overflow-hidden bg-gray-50 flex items-center justify-center border border-gray-100 rounded-xl ${
          className || ""
        }`}
      >
        <div class="flex flex-col items-center justify-center text-gray-300 opacity-60">
          <Package strokeWidth={1.5} class="w-10 h-10 mb-1" />
          <span class="text-[10px] font-medium tracking-wider uppercase">
            No Image
          </span>
        </div>
      </div>
    );
  }

  return (
    <div class={`relative overflow-hidden bg-gray-50 ${className || ""}`}>
      {!isLoaded && <div class="absolute inset-0 animate-pulse bg-gray-100" />}
      <img
        src={finalSrc!}
        alt={alt}
        loading="lazy"
        decoding="async"
        class={`w-full h-full object-cover transition-opacity duration-500 ${
          isLoaded ? "opacity-100" : "opacity-0"
        }`}
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
        {...props}
      />
    </div>
  );
}
