"use client";

import MuxPlayer from "@mux/mux-player-react";

interface MuxPlayerWrapperProps {
  playbackId: string;
  token?: string;
  title?: string;
}

const MuxPlayerWrapper = ({
  playbackId,
  token,
  title,
}: MuxPlayerWrapperProps) => {
  return (
    <MuxPlayer
      playbackId={playbackId}
      metadata={{
        video_title: title || "Screen Recording",
      }}
      tokens={
        token
          ? {
              playback: token,
              thumbnail: token,
              storyboard: token,
            }
          : undefined
      }
      streamType="on-demand"
      autoPlay={false}
      accentColor="#3b82f6"
    />
  );
};

export default MuxPlayerWrapper;
