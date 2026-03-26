"use client";

import { useState } from "react";
import Image from "next/image";

const VideoThumbnail = ({ playbackId }: { playbackId: string }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [hasError, setHasError] = useState(false);

  const postUrl = `https://image.mux.com/${playbackId}/thumbnail.jpg?time=0`;
  const gifUrl = `https://image.mux.com/${playbackId}/animated.gif?width=320`;

  if (hasError) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-800 text-slate-500 text-sm">
        No Preview
      </div>
    );
  }
  return (
    <div
      className="w-full h-full relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Image
        src={isHovered ? gifUrl : postUrl}
        alt="Video thumbnail"
        fill
        unoptimized
        onError={() => setHasError(true)}
        className={`object-cover transition-opacity duration-300 ${isHovered ? "opacity-100" : "opacity-90"}`}
      />
    </div>
  );
};

export default VideoThumbnail;
