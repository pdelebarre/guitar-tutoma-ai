#!/usr/bin/env python3
"""
Faster-Whisper subtitle generator for guitar tutorial videos.

Usage:
    python generate_subtitles.py <video_path> <output_srt_path> [--model-size MODEL_SIZE] [--language LANGUAGE]

Generates an SRT subtitle file from a video using Faster-Whisper.
If an SRT file already exists at the output path, it skips generation.
"""

import argparse
import os
import sys
import time


def generate_subtitles(video_path: str, output_srt_path: str, model_size: str = "base", language: str = "en") -> bool:
    """
    Generate SRT subtitles from a video file using Faster-Whisper.

    Args:
        video_path: Path to the video file.
        output_srt_path: Path where the SRT file should be written.
        model_size: Whisper model size (tiny, base, small, medium, large-v3).
        language: Language code (e.g., 'en', 'fr', 'es').

    Returns:
        True if subtitles were generated, False if skipped (already exists).
    """
    if os.path.exists(output_srt_path):
        print(f"Subtitle file already exists: {output_srt_path}", flush=True)
        return False

    if not os.path.isfile(video_path):
        print(f"Error: Video file not found: {video_path}", file=sys.stderr, flush=True)
        sys.exit(1)

    print(f"Loading Faster-Whisper model '{model_size}'...", flush=True)
    start_time = time.time()

    try:
        from faster_whisper import WhisperModel
    except ImportError:
        print(
            "Error: faster-whisper is not installed. "
            "Install it with: pip install faster-whisper",
            file=sys.stderr,
            flush=True,
        )
        sys.exit(1)

    # Run on CPU with int8 precision for broad compatibility.
    # On Apple Silicon (MPS) we could use compute_type="float16" with device="cuda",
    # but CPU+int8 is the most portable default.
    model = WhisperModel(model_size, device="cpu", compute_type="int8")
    load_time = time.time() - start_time
    print(f"Model loaded in {load_time:.1f}s", flush=True)

    print(f"Transcribing: {video_path}", flush=True)
    transcribe_start = time.time()

    segments, info = model.transcribe(video_path, language=language, beam_size=5)

    detected_language = info.language
    detected_duration = info.duration
    print(
        f"Detected language: '{detected_language}' "
        f"(probability: {info.language_probability:.2f}), "
        f"audio duration: {detected_duration:.1f}s",
        flush=True,
    )

    # Write SRT file
    srt_lines: list[str] = []
    segment_count = 0
    for segment in segments:
        segment_count += 1
        start_ts = _format_srt_timestamp(segment.start)
        end_ts = _format_srt_timestamp(segment.end)
        text = segment.text.strip()

        srt_lines.append(str(segment_count))
        srt_lines.append(f"{start_ts} --> {end_ts}")
        srt_lines.append(text)
        srt_lines.append("")

    # Ensure output directory exists
    os.makedirs(os.path.dirname(output_srt_path) or ".", exist_ok=True)

    with open(output_srt_path, "w", encoding="utf-8") as f:
        f.write("\n".join(srt_lines))

    transcribe_time = time.time() - transcribe_start
    print(
        f"Transcription complete: {segment_count} segments in {transcribe_time:.1f}s",
        flush=True,
    )
    print(f"Subtitle file written: {output_srt_path}", flush=True)
    return True


def _format_srt_timestamp(seconds: float) -> str:
    """Convert seconds to SRT timestamp format: HH:MM:SS,mmm"""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int((seconds - int(seconds)) * 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Generate SRT subtitles from a video using Faster-Whisper"
    )
    parser.add_argument("video_path", help="Path to the video file")
    parser.add_argument("output_srt_path", help="Path for the output SRT file")
    parser.add_argument(
        "--model-size",
        default="base",
        choices=["tiny", "base", "small", "medium", "large-v3"],
        help="Whisper model size (default: base)",
    )
    parser.add_argument(
        "--language",
        default="en",
        help="Language code (default: en)",
    )

    args = parser.parse_args()
    generate_subtitles(
        video_path=args.video_path,
        output_srt_path=args.output_srt_path,
        model_size=args.model_size,
        language=args.language,
    )


if __name__ == "__main__":
    main()
