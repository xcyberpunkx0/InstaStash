import React, { useState, useRef, useEffect } from "react";
import type { VideoFormat } from "@/types";

export interface VideoDetailsProps {
  title: string;
  formats: VideoFormat[];
  onDownload: (formatId: string) => void;
  url: string;
  thumbnail?: string;
  previewVideoUrl?: string;
}

/**
 * After URL detection: shows the URL in mono, file name field, and quality dropdown.
 * Matches the design system screenshot: recessed paper fields, grotesk labels.
 */
export function VideoDetails({
  title,
  formats,
  onDownload,
  url,
  thumbnail,
  previewVideoUrl,
}: VideoDetailsProps) {
  const [selectedFormat, setSelectedFormat] = useState(
    formats[0]?.formatId ?? "best",
  );
  const [aspectRatio, setAspectRatio] = useState<
    "landscape" | "portrait" | "square" | null
  >(null);
  const [videoError, setVideoError] = useState(false);
  const [imageError, setImageError] = useState(false);

  const imgRef = useRef<HTMLImageElement>(null);

  const selectedOption =
    formats.find((f) => f.formatId === selectedFormat) ?? formats[0];
  const resolution = selectedOption?.resolution ?? "1080p";
  const sizeMB = selectedOption
    ? Math.round(selectedOption.fileSize / (1024 * 1024))
    : 0;
  const directUrl = selectedOption?.directUrl;
  const rawPreviewUrl = previewVideoUrl ?? directUrl;
  // Proxy through our server to bypass Instagram CDN CORS blocks
  const previewUrl = rawPreviewUrl
    ? `/api/proxy-video?url=${encodeURIComponent(rawPreviewUrl)}`
    : undefined;

  const proxiedThumbnail = thumbnail
    ? `/api/proxy-image?url=${encodeURIComponent(thumbnail)}`
    : undefined;

  useEffect(() => {
    if (imgRef.current) {
      if (imgRef.current.complete && imgRef.current.naturalWidth === 0) {
        setImageError(true);
      }
    }
  }, [proxiedThumbnail]);

  return (
    <div className="w-full max-w-[680px] space-y-4">
      {/* URL display in the pill bar */}
      <div className="flex items-center gap-2 py-2 pl-6 pr-2 bg-(--color-bg-surface) rounded-pill border border-line-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.55),0_22px_50px_-22px_rgba(31,27,22,0.30)]">
        {/* Link icon */}
        <svg
          className="w-[18px] h-[18px] text-(--color-ink-300) shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M9 17H7A5 5 0 0 1 7 7h2" />
          <path d="M15 7h2a5 5 0 1 1 0 10h-2" />
          <line x1="8" x2="16" y1="12" y2="12" />
        </svg>
        {/* URL in mono — https:// lighter */}
        <div className="flex-1 py-[14px] font-mono text-body truncate">
          <span className="text-(--color-ink-300)">https://</span>
          <span className="text-(--color-ink-900)">
            {url.replace(/^https?:\/\//, "")}
          </span>
        </div>
        {/* Download button */}
        <button
          type="button"
          onClick={() => onDownload(selectedFormat)}
          className="inline-flex items-center gap-2 px-6 py-[14px] rounded-pill bg-(--color-ink-900) text-(--color-paper-50) font-grotesk font-semibold text-[15px] cursor-pointer border-0 shadow-[0_8px_20px_-10px_rgba(31,27,22,0.45)] hover:translate-y-[-1px] hover:shadow-[0_14px_26px_-10px_rgba(31,27,22,0.5)] active:translate-y-0 transition-[transform,box-shadow] duration-[160ms] ease-(--ease-paper) shrink-0"
        >
          Download
          <svg
            className="w-[14px] h-[14px]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 5v14" />
            <path d="m19 12-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Video/Image Preview Container */}
      {(previewUrl && !videoError) || (proxiedThumbnail && !imageError) ? (
        <div
          className={`mx-auto bg-black/95 border border-line-soft rounded-lg overflow-hidden flex items-center justify-center relative shadow-(--shadow-card) transition-[max-width,aspect-ratio] duration-300 ${
            aspectRatio === "portrait"
              ? "w-full max-w-[270px] aspect-9/16 max-h-[480px]"
              : aspectRatio === "square"
                ? "w-full max-w-[360px] aspect-square max-h-[360px]"
                : "w-full aspect-video max-h-[360px]"
          }`}
        >
          {previewUrl && !videoError ? (
            <video
              src={previewUrl}
              poster={
                proxiedThumbnail && !imageError ? proxiedThumbnail : undefined
              }
              controls
              preload="auto"
              playsInline
              crossOrigin="anonymous"
              onError={(e) => {
                const video = e.currentTarget;
                const err = video.error;
                console.error('[VideoPreview] video error:', err?.code, err?.message, 'src:', video.src.substring(0, 80));
                setVideoError(true);
              }}
              onLoadedMetadata={(e) => {
                const video = e.currentTarget;
                const width = video.videoWidth;
                const height = video.videoHeight;
                if (width && height) {
                  if (height > width * 1.2) {
                    setAspectRatio("portrait");
                  } else if (width > height * 1.2) {
                    setAspectRatio("landscape");
                  } else {
                    setAspectRatio("square");
                  }
                }
              }}
              className="w-full h-full object-contain bg-black/95 focus:outline-none"
            />
          ) : (
            <img
              ref={imgRef}
              src={proxiedThumbnail}
              alt="Video preview poster"
              referrerPolicy="no-referrer"
              onError={() => setImageError(true)}
              onLoad={(e) => {
                const img = e.currentTarget;
                const width = img.naturalWidth;
                const height = img.naturalHeight;
                if (width && height) {
                  if (height > width * 1.2) {
                    setAspectRatio("portrait");
                  } else if (width > height * 1.2) {
                    setAspectRatio("landscape");
                  } else {
                    setAspectRatio("square");
                  }
                }
              }}
              className="w-full h-full object-contain"
            />
          )}
        </div>
      ) : (
        /* Fallback Placeholder (when image fails or directUrl is empty and thumbnail fails) */
        <div className="w-full aspect-video bg-black/95 border border-line-soft rounded-lg overflow-hidden flex flex-col items-center justify-center relative shadow-(--shadow-card) text-ink-400 text-small gap-2">
          {/* Movie/Video icon */}
          <svg
            className="w-10 h-10 text-ink-500"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="m22 8-6 4 6 4V8Z" />
            <rect width="14" height="12" x="2" y="6" rx="2" ry="2" />
          </svg>
          <span className="text-[13px] text-ink-300">
            Preview not available (Instagram CDN expired)
          </span>
        </div>
      )}

      {/* File name + Quality row */}
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-4">
        {/* File name field */}
        <div>
          <label className="block font-grotesk font-semibold text-[11px] uppercase tracking-[0.14em] text-ink-400 mb-2">
            File name
          </label>
          <div className="px-4 py-3 bg-(--color-bg-recessed) rounded-md font-mono text-[15px] text-(--color-ink-900) truncate">
            {title
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/^-|-$/g, "")}
          </div>
        </div>

        {/* Quality dropdown */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <label
              htmlFor="quality-select"
              className="font-grotesk font-semibold text-[11px] uppercase tracking-[0.14em] text-(--color-ink-400)"
            >
              Quality
            </label>
            {/* Hand-drawn hint — clarifies that this is a dropdown */}
            <span
              aria-hidden="true"
              style={{
                fontFamily: "var(--font-hand)",
                transform: "rotate(-3deg)",
              }}
              className="inline-flex items-center gap-1 text-[16px] text-terra-600 whitespace-nowrap pointer-events-none select-none leading-none"
            >
              <svg
                className="w-5 h-3"
                viewBox="0 0 60 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M2 12 C 14 4, 30 20, 56 12" />
                <path d="m50 6 6 6-6 6" />
              </svg>
              tap to change ✦
            </span>
          </div>
          <select
            id="quality-select"
            value={selectedFormat}
            onChange={(e) => setSelectedFormat(e.target.value)}
            aria-label="Choose video quality"
            className="
              w-full px-4 py-3 pr-10
              bg-(--color-bg-recessed) rounded-md
              font-mono text-[15px] text-(--color-ink-900)
              border border-line-medium outline-none cursor-pointer
              hover:border-terra-500 hover:bg-(--color-paper-200)
              focus:border-terra-500
              transition-colors duration-[160ms]
              appearance-none
              bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2214%22 height=%2214%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%23C97B4E%22 stroke-width=%222.25%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22><path d=%22m6 9 6 6 6-6%22/></svg>')]
              bg-no-repeat bg-[position:right_12px_center]
            "
          >
            {formats.map((f) => (
              <option key={f.formatId} value={f.formatId}>
                {f.resolution} · mp4
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Format chips */}
      <div className="flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-pill bg-(--color-paper-200) border border-line-soft font-sans text-micro text-(--color-ink-700)">
          <span className="w-1.5 h-1.5 rounded-full bg-(--color-ink-400)" />
          {resolution}
        </span>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-pill bg-(--color-paper-200) border border-line-soft font-sans text-micro text-(--color-ink-700)">
          <span className="w-1.5 h-1.5 rounded-full bg-(--color-ink-400)" />
          mp4
        </span>
        {sizeMB > 0 && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-pill bg-(--color-paper-200) border border-line-soft font-sans text-micro text-(--color-ink-700)">
            <span className="w-1.5 h-1.5 rounded-full bg-(--color-ink-400)" />
            {sizeMB} MB
          </span>
        )}
      </div>
    </div>
  );
}
