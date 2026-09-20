import { useEffect, useState } from "preact/hooks";
import { createPortal } from "preact/compat";
import { Star } from "lucide-preact";

export default function StarRatingIsland({
  productId,
  initialAverage,
  initialCount,
  userRating,
}: {
  productId: string;
  initialAverage: number;
  initialCount: number;
  userRating?: number | null;
}) {
  const [average, setAverage] = useState(initialAverage);
  const [count, setCount] = useState(initialCount);
  const [currentRating, setCurrentRating] = useState<number | null>(
    userRating || null,
  );
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  const displayRating = hoverRating !== null ? hoverRating : currentRating;

  useEffect(() => {
    if (error) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => setError(null), 300); // Wait for transition
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const handleRate = async (rating: number) => {
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/ratings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, rating }),
      });

      if (res.status === 401) {
        setError("Please log in to rate");
        return;
      }
      if (!res.ok) {
        setError("Failed to submit");
        return;
      }

      const stats = await res.json();
      setAverage(stats.average);
      setCount(stats.count);
      setCurrentRating(rating);
    } catch (e) {
      setError("Error submitting");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div class="flex flex-col gap-0.5 mt-1 mb-1">
      <div
        class="flex items-center gap-1.5"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        <div
          class="flex items-center"
          onMouseLeave={() => setHoverRating(null)}
        >
          {[1, 2, 3, 4, 5].map((star) => {
            let fillPercentage = 0;
            if (displayRating !== null) {
              fillPercentage = star <= displayRating ? 100 : 0;
            } else {
              if (average >= star) fillPercentage = 100;
              else if (average > star - 1) {
                fillPercentage = (average - (star - 1)) * 100;
              }
            }

            return (
              <button
                key={star}
                disabled={isSubmitting}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleRate(star);
                }}
                onMouseEnter={() => setHoverRating(star)}
                class="relative p-0.5 focus:outline-none focus:scale-125 transition-transform disabled:opacity-50 cursor-pointer"
                aria-label={`Rate ${star} stars`}
                title={`Rate ${star} stars`}
              >
                {/* Empty background star */}
                <Star class="w-4 h-4 text-gray-300" strokeWidth={1.5} />
                {/* Filled foreground star clipped to percentage */}
                <div
                  class="absolute inset-0.5 overflow-hidden"
                  style={{ width: `${fillPercentage}%` }}
                >
                  <Star
                    class="w-4 h-4 text-yellow-400 fill-yellow-400"
                    strokeWidth={1.5}
                  />
                </div>
              </button>
            );
          })}
        </div>
        <span class="text-xs text-gray-500 font-medium">
          {average > 0 ? `${average.toFixed(1)}/5` : "No ratings"}{" "}
          {count > 0 && `(${count})`}
        </span>
      </div>

      {/* Snackbar Notification (Portaled to body to escape transform trapping) */}
      {typeof document !== "undefined" && createPortal(
        <div
          class={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] transition-all duration-300 ease-in-out ${
            isVisible
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-4 pointer-events-none"
          }`}
        >
          <div class="bg-slate-100 text-slate-800 border border-slate-200 px-5 py-2.5 rounded-lg shadow-md text-sm font-medium tracking-wide whitespace-nowrap">
            {error}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
