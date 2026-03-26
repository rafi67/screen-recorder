"use client";

import MuxPlayer from "@mux/mux-player-react";

type MuxPlayerWrapperProps = {
  playbackId: string;
  title?: string;
};

const MuxPlayerWrapper = ({ playbackId, title }: MuxPlayerWrapperProps) => {
  return (
    <MuxPlayer
      playbackId={playbackId}
      metadata={{
        video_title: title || "Screen Recording",
      }}
      streamType="on-demand"
      autoPlay={false}
      accentColor="#3b82f6"
    />
  );
};

export default MuxPlayerWrapper;
