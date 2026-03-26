"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";
import Mux from "@mux/mux-node";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

const mux = new Mux({
  tokenId: process.env.MUX_TOKEN_ID,
  tokenSecret: process.env.MUX_TOKEN_SECRET,
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);

export async function createUploadUrl() {
  const upload = await mux.video.uploads.create({
    new_asset_settings: {
      playback_policy: ["signed"],
      video_quality: "plus",
      mp4_support: "standard",
      input: [
        {
          generated_subtitles: [
            {
              language_code: "en",
              name: "English (Auto)",
            },
          ],
        },
        {
          url: "https://cdn-icons-png.flaticon.com/512/4208/4208366.png",
          overlay_settings: {
            vertical_align: "top",
            vertical_margin: "20px",
            horizontal_align: "right",
            horizontal_margin: "20px",
            width: "150px",
            opacity: "80%",
          },
        },
      ],
    },
    cors_origin: "*",
  });

  return upload;
}

export async function getAssetIdFromUpload(uploadId: string) {
  const upload = await await mux.video.uploads.retrieve(uploadId);

  if (upload.asset_id) {
    const asset = await mux.video.assets.retrieve(upload.asset_id);
    return {
      playbackId: asset.playback_ids?.[0]?.id,
      status: asset.status,
    };
  }

  return { status: "waiting" };
}

export async function listVideos() {
  try {
    const assets = await mux.video.assets.list({
      limit: 25,
    });
    return assets.data;
  } catch (e) {
    console.error("Error listing videos", e);
  }
}

function formatVttTime(timestamp: string) {
  return timestamp.split(".")[0];
}

export async function getAssetStatus(playbackId: string) {
  try {
    const assets = await mux.video.assets.list({
      limit: 100,
    });
    const asset = assets.data.find((a) =>
      a.playback_ids?.some((p) => p.id === playbackId),
    );

    if (!asset) return { status: "errored", transcript: [] };

    let transcript: { time: string; text: string }[] = [];
    let transcriptStatus = "preparing";

    if (asset.status === "ready" && asset.tracks) {
      const textTrack = asset.tracks.find(
        (t) => t.type === "text" && t.text_type === "subtitles",
      );

      if (textTrack && textTrack.status === "ready") {
        transcriptStatus = "ready";

        const vttUrl = `https://stream.mux.com/${playbackId}/text/${textTrack.id}.vtt`;
        const response = await fetch(vttUrl);
        const vttText = await response.text();

        const blocks = vttText.split("\n\n");

        transcript = blocks.reduce(
          (acc: { time: string; text: string }[], block) => {
            const lines = block.split("\n");
            if (lines.length >= 2 && lines[1].includes("-->")) {
              const time = formatVttTime(lines[1].split(" --> ")[0]);
              const text = lines.slice(2).join(" ");
              if (text.trim()) acc.push({ time, text });
            }
            return acc;
          },
          [],
        );
      }
    }

    return {
      status: asset.status,
      transcriptStatus,
      transcript,
    };
  } catch (e) {
    return { status: "errored", transcriptStatus: "errored", transcript: [] };
  }
}

export async function generateVideoSummary(playbackId: string) {
  try {
    const assets = await mux.video.assets.list({ limit: 100 });
    const asset = assets.data.find((a) =>
      a.playback_ids?.some((p) => p.id === playbackId),
    );

    if (!asset) {
      throw new Error("Asset not found");
    }

    const { transcript } = await getAssetStatus(playbackId);

    const transcriptText = transcript.map((item) => item.text).join(" ");

    // 3️ Gemini model
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash", // free-tier friendly
    });

    // 4️ Prompt
    const prompt = `
    Generate a professional video title, summary, and tags.

    Transcript:
    ${transcriptText}

    Return ONLY valid JSON:
    {
      "title": "string",
      "summary": "string",
      "tags": ["tag1", "tag2", "tag3"]
    }
    `;

    // 5️ Call Gemini
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    // 6️ Clean response (Gemini often wraps JSON)
    const cleaned = text.replace(/```json|```/g, "").trim();

    const parsed = JSON.parse(cleaned);

    return {
      title: parsed.title,
      summary: parsed.summary,
      tags: parsed.tags,
    };
  } catch (e) {
    console.error("Error generating summary:", e);
    return null;
  }
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  return cookieStore.get("user")?.value || null;
}

export async function getSignedPlaybackToken(playbackId: string) {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  const privateKey = Buffer.from(
    process.env.MUX_SIGNING_KEY_PRIVATE!,
    "base64",
  ).toString("ascii");

  const token = jwt.sign(
    {
      sub: playbackId,
      aud: "v",
      exp: Math.floor(Date.now() / 1000) + 60 * 60,
    },
    privateKey,
    { algorithm: "RS256" },
  );

  return token;
}
