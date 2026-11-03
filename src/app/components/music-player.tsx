import { useState, useRef, useEffect, useCallback } from "react";
import {
  Music, Play, Pause, SkipForward, SkipBack,
  Volume2, VolumeX, Upload, Trash2, Repeat, Shuffle,
  ChevronUp, ChevronDown, ListMusic, ImageIcon,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ImageWithFallback } from "./image-with-fallback";

/* ── Types ──────────────────────────────────────────────────────────── */
interface Track {
  id: string;
  name: string;
  url: string;
  file: File;
}

/* ── Nostalgia photos ───────────────────────────────────────────────── */
const NOSTALGIA_PHOTOS: { src: string; caption: string; year: string }[] = [
  { src: "https://images.unsplash.com/photo-1730581083392-a18b98805169?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx2aW50YWdlJTIwdGFibGUlMjB0ZW5uaXMlMjBtYXRjaCUyMGJsYWNrJTIwd2hpdGV8ZW58MXx8fHwxNzcyNzkyNzQyfDA&ixlib=rb-4.1.0&q=80&w=1080", caption: "Bordtennismatch vid Nordiska Mästerskapen", year: "1957" },
  { src: "https://images.unsplash.com/photo-1679832634655-acbbe0ae2dc4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxyZXRybyUyMHBpbmclMjBwb25nJTIwY29tcGV0aXRpb24lMjAxOTYwc3xlbnwxfHx8fDE3NzI3OTI3NDN8MA&ixlib=rb-4.1.0&q=80&w=1080", caption: "VM-finalen i Nagoya", year: "1971" },
  { src: "https://images.unsplash.com/photo-1701272873248-ee041b51b02b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxvbGQlMjBzcG9ydCUyMGhhbGwlMjBneW1uYXNpdW0lMjB2aW50YWdlfGVufDF8fHx8MTc3Mjc5Mjc0M3ww&ixlib=rb-4.1.0&q=80&w=1080", caption: "Folkparken, Malmö — klubbturneringen", year: "1963" },
  { src: "https://images.unsplash.com/photo-1597196654949-446259229de0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0YWJsZSUyMHRlbm5pcyUyMHBhZGRsZSUyMHZpbnRhZ2UlMjBlcXVpcG1lbnR8ZW58MXx8fHwxNzcyNzkyNzQzfDA&ixlib=rb-4.1.0&q=80&w=1080", caption: "Det klassiska hardboard-racketet", year: "1952" },
  { src: "https://images.unsplash.com/photo-1761393296074-4baf280c6406?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjbGFzc2ljJTIwc3BvcnQlMjB0cm9waHklMjBibGFjayUyMHdoaXRlfGVufDF8fHx8MTc3Mjc5Mjc0NHww&ixlib=rb-4.1.0&q=80&w=1080", caption: "Vandringspokalen — Rundpingisklubben", year: "1948" },
  { src: "https://images.unsplash.com/photo-1593442808948-b1df0a8f8047?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwaW5nJTIwcG9uZyUyMHBsYXllciUyMGFjdGlvbiUyMGRyYW1hdGljfGVufDF8fHx8MTc3Mjc5Mjc0NHww&ixlib=rb-4.1.0&q=80&w=1080", caption: "Stellan Bengtsson — guld i Birmingham", year: "1971" },
  { src: "https://images.unsplash.com/photo-1693614055184-97cdbe4ebd7a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwaW5nJTIwcG9uZyUyMGJhbGwlMjBjbG9zZXVwJTIwbWFjcm98ZW58MXx8fHwxNzcyNzkyNzQ4fDA&ixlib=rb-4.1.0&q=80&w=1080", caption: "38 mm celluloidbollen — en era tar slut", year: "2000" },
  { src: "https://images.unsplash.com/photo-1576617497557-22895ee5930b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0YWJsZSUyMHRlbm5pcyUyMHBhZGRsZSUyMGNsb3NlfGVufDF8fHx8MTc3MjgwMDY4MXww&ixlib=rb-4.1.0&q=80&w=1080", caption: "Racketet i närbild — fokus och precision", year: "1985" },
  { src: "https://images.unsplash.com/photo-1609513677385-5d2b049d9431?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx2aW50YWdlJTIwZ3ltbmFzaXVtJTIwc3BvcnRzJTIwaGFsbHxlbnwxfHx8fDE3NzI4MDA2ODJ8MA&ixlib=rb-4.1.0&q=80&w=1080", caption: "Gamla gymnastikhallen — lördagsmatcher", year: "1966" },
  { src: "https://images.unsplash.com/photo-1692115272001-978ff4a5e848?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwaW5nJTIwcG9uZyUyMHRhYmxlJTIwZGFyayUyMG1vb2R5fGVufDF8fHx8MTc3MjgwMDY4M3ww&ixlib=rb-4.1.0&q=80&w=1080", caption: "Ensam vid bordet — kvällsträning", year: "1978" },
  { src: "https://images.unsplash.com/photo-1763756856311-d4db1a32b6c7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxyZXRybyUyMHNwb3J0cyUyMGVxdWlwbWVudCUyMGNvbGxlY3Rpb258ZW58MXx8fHwxNzcyODAwNjgzfDA&ixlib=rb-4.1.0&q=80&w=1080", caption: "Utrustningen som byggde legender", year: "1955" },
  { src: "https://images.unsplash.com/photo-1641628878413-5ef336e3a350?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxvbGQlMjB0cm9waHklMjBjYWJpbmV0JTIwdmludGFnZXxlbnwxfHx8fDE3NzI4MDA2ODN8MA&ixlib=rb-4.1.0&q=80&w=1080", caption: "Prissamlingen i klubbhuset", year: "1970" },
  { src: "https://images.unsplash.com/photo-1624936187819-6a64403d63eb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0YWJsZSUyMHRlbm5pcyUyMHNlcnZlJTIwYWN0aW9ufGVufDF8fHx8MTc3MjgwMDY4M3ww&ixlib=rb-4.1.0&q=80&w=1080", caption: "Serven som avgjorde semifinalen", year: "1989" },
  { src: "https://images.unsplash.com/photo-1723965156381-06099ba8cbb1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx2aW50YWdlJTIwc3BvcnRzJTIwY3Jvd2QlMjBzcGVjdGF0b3JzfGVufDF8fHx8MTc3MjgwMDY4M3ww&ixlib=rb-4.1.0&q=80&w=1080", caption: "Publiken under Kirunafinalen", year: "1961" },
  { src: "https://images.unsplash.com/photo-1619296094543-99aca1aa1f9e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxibGFjayUyMHdoaXRlJTIwc3BvcnRzJTIwcGhvdG9ncmFwaHl8ZW58MXx8fHwxNzcyODAwNjg0fDA&ixlib=rb-4.1.0&q=80&w=1080", caption: "Koncentration innan matchboll", year: "1983" },
  { src: "https://images.unsplash.com/photo-1615326882458-e0d45b097f55?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxvbGQlMjB3b29kZW4lMjByYWNrZXQlMjBzcG9ydHxlbnwxfHx8fDE3NzI4MDA2ODV8MA&ixlib=rb-4.1.0&q=80&w=1080", caption: "Farfars gamla racket — fortfarande spelbart", year: "1945" },
  { src: "https://images.unsplash.com/photo-1763280400656-e0bf5b2bc101?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzcG9ydHMlMjBhcmVuYSUyMGVtcHR5JTIwZHJhbWF0aWMlMjBsaWdodGluZ3xlbnwxfHx8fDE3NzI4MDA2ODV8MA&ixlib=rb-4.1.0&q=80&w=1080", caption: "Arenan innan publiken anlände", year: "1974" },
  { src: "https://images.unsplash.com/photo-1771716360934-c3bdc3b011ef?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb21wZXRpdGlvbiUyMHNjb3JlYm9hcmQlMjByZXRyb3xlbnwxfHx8fDE3NzI4MDA2ODZ8MA&ixlib=rb-4.1.0&q=80&w=1080", caption: "Resultattavlan — handskriven", year: "1959" },
  { src: "https://images.unsplash.com/photo-1688658041626-76b9e3d65dc1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhdGhsZXRlJTIwY2VsZWJyYXRpb24lMjB2aWN0b3J5JTIwZmlzdCUyMHB1bXB8ZW58MXx8fHwxNzcyODAwNjg2fDA&ixlib=rb-4.1.0&q=80&w=1080", caption: "Segervrål efter avgörande set", year: "1992" },
  { src: "https://images.unsplash.com/photo-1622389993209-dbdd7239a5ca?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0YWJsZSUyMHRlbm5pcyUyMGJhbGwlMjBib3VuY2UlMjBtb3Rpb258ZW58MXx8fHwxNzcyODAwNjg3fDA&ixlib=rb-4.1.0&q=80&w=1080", caption: "Bollen i luften — fryst ögonblick", year: "1996" },
  { src: "https://images.unsplash.com/photo-1760699128544-39c01944c7f5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxub3JkaWMlMjB3aW50ZXIlMjBzcG9ydHMlMjBub3N0YWxnaWF8ZW58MXx8fHwxNzcyODAwNjg3fDA&ixlib=rb-4.1.0&q=80&w=1080", caption: "Vinterturnering i Norrland", year: "1968" },
  { src: "https://images.unsplash.com/photo-1661474974523-fc0c6b5ec8fd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb25vY2hyb21lJTIwc3BvcnQlMjBzaWxob3VldHRlJTIwZHJhbWF0aWN8ZW58MXx8fHwxNzcyODAwNjg3fDA&ixlib=rb-4.1.0&q=80&w=1080", caption: "Siluetten av en mästare", year: "1980" },
  { src: "https://images.unsplash.com/photo-1769433377504-b35bcfb812fe?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb21tdW5pdHklMjByZWNyZWF0aW9uJTIwY2VudGVyJTIwdmludGFnZXxlbnwxfHx8fDE3NzI4MDA2ODd8MA&ixlib=rb-4.1.0&q=80&w=1080", caption: "Bygdegården — där allt började", year: "1946" },
  { src: "https://images.unsplash.com/photo-1771402899312-d8d20eea333e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzcG9ydHMlMjBtZWRhbCUyMGNlcmVtb255JTIwYXdhcmR8ZW58MXx8fHwxNzcyODAwNjg4fDA&ixlib=rb-4.1.0&q=80&w=1080", caption: "Prisutdelningen — tårar och stolthet", year: "1975" },
  { src: "https://images.unsplash.com/photo-1568663469495-b09d5e3c2e07?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjaGFtcGlvbnNoaXAlMjBmaW5hbCUyMG1hdGNoJTIwYXJlbmF8ZW58MXx8fHwxNzcyODAwNzE4fDA&ixlib=rb-4.1.0&q=80&w=1080", caption: "Finalen — fullt hus i Luleå", year: "1987" },
];

/* ── Helpers ─────────────────────────────────────────────────────────── */
function formatTime(sec: number): string {
  if (!isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const FONT = "inherit";

/* ════════════════════════════════════════════════════════════════════ */
/*  MusicPlayerBar — Spotify-style fixed bottom bar                    */
/* ════════════════════════════════════════════════════════════════════ */

interface MusicPlayerBarProps {
  onNostalgiaToggle: () => void;
  nostalgiaActive: boolean;
}

export function MusicPlayerBar({ onNostalgiaToggle, nostalgiaActive }: MusicPlayerBarProps) {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [muted, setMuted] = useState(false);
  const [repeat, setRepeat] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [queueOpen, setQueueOpen] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  const currentTrack = currentIndex >= 0 && currentIndex < tracks.length ? tracks[currentIndex] : null;

  /* ── Audio engine ─────────────────────────────── */
  useEffect(() => {
    const audio = new Audio();
    audio.volume = volume;
    audioRef.current = audio;
    const onTime = () => setCurrentTime(audio.currentTime);
    const onDur = () => setDuration(audio.duration);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("durationchange", onDur);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("durationchange", onDur);
      audio.pause();
      audio.src = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ended handler (needs fresh refs)
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onEnded = () => {
      if (repeat) {
        audio.currentTime = 0;
        audio.play();
      } else {
        setCurrentIndex((prev) => {
          const next = shuffle
            ? Math.floor(Math.random() * tracks.length)
            : prev + 1;
          if (next >= tracks.length && !shuffle) { setIsPlaying(false); return prev; }
          return next % tracks.length;
        });
      }
    };
    audio.addEventListener("ended", onEnded);
    return () => audio.removeEventListener("ended", onEnded);
  }, [repeat, shuffle, tracks.length]);

  // load track
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;
    audio.src = currentTrack.url;
    audio.load();
    if (isPlaying) audio.play().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, currentTrack?.id]);

  // play/pause
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;
    if (isPlaying) audio.play().catch(() => {});
    else audio.pause();
  }, [isPlaying, currentTrack]);

  // volume
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) audio.volume = muted ? 0 : volume;
  }, [volume, muted]);

  /* ── Track management ─────────────────────────── */
  const handleFiles = useCallback((files: FileList | null) => {
    if (!files) return;
    const newTracks: Track[] = [];
    Array.from(files).forEach((file) => {
      if (file.type.startsWith("audio/") || /\.(mp3|m4a|wav|ogg|flac)$/i.test(file.name)) {
        newTracks.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          name: file.name.replace(/\.[^/.]+$/, ""),
          url: URL.createObjectURL(file),
          file,
        });
      }
    });
    if (newTracks.length > 0) {
      setTracks((prev) => {
        const updated = [...prev, ...newTracks];
        if (prev.length === 0) setCurrentIndex(0);
        return updated;
      });
    }
  }, []);

  const removeTrack = (idx: number) => {
    URL.revokeObjectURL(tracks[idx].url);
    setTracks((prev) => {
      const updated = prev.filter((_, i) => i !== idx);
      if (idx === currentIndex) {
        if (updated.length === 0) { setCurrentIndex(-1); setIsPlaying(false); }
        else setCurrentIndex(Math.min(idx, updated.length - 1));
      } else if (idx < currentIndex) setCurrentIndex((p) => p - 1);
      return updated;
    });
  };

  const playTrack = (idx: number) => { setCurrentIndex(idx); setIsPlaying(true); };

  const togglePlay = () => {
    if (!currentTrack && tracks.length > 0) { setCurrentIndex(0); setIsPlaying(true); return; }
    setIsPlaying((p) => !p);
  };

  const nextTrack = () => {
    if (tracks.length === 0) return;
    setCurrentIndex(shuffle ? Math.floor(Math.random() * tracks.length) : (currentIndex + 1) % tracks.length);
    setIsPlaying(true);
  };

  const prevTrack = () => {
    if (tracks.length === 0) return;
    const audio = audioRef.current;
    if (audio && audio.currentTime > 3) { audio.currentTime = 0; return; }
    setCurrentIndex((currentIndex - 1 + tracks.length) % tracks.length);
    setIsPlaying(true);
  };

  const seekTo = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    const bar = progressRef.current;
    if (!audio || !bar || !duration) return;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audio.currentTime = ratio * duration;
    setCurrentTime(ratio * duration);
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*,.mp3,.m4a,.wav,.ogg,.flac"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {/* ── Queue panel (slides up above bar) ── */}
      <AnimatePresence>
        {queueOpen && (
          <motion.div
            key="queue-panel"
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="fixed bottom-[73px] right-0 left-0 sm:left-auto sm:right-4 sm:bottom-[77px] sm:w-[380px] z-[60] rounded-t-[var(--radius-card)] sm:rounded-[var(--radius-card)] border border-border border-b-0 sm:border-b overflow-hidden"
            style={{ background: "var(--surface-container-high)" }}
          >
            {/* Queue header */}
            <div className="flex items-center justify-between px-5 pt-4 pb-2">
              <span
                className="text-foreground"
                style={{ fontFamily: FONT, fontSize: "var(--text-base)", fontWeight: "var(--font-weight-semibold)" }}
              >
                Spellista
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-button)] bg-primary/12 text-primary hover:bg-primary/20 transition-all duration-200 cursor-pointer"
                  style={{ fontFamily: FONT, fontSize: "var(--text-label)", fontWeight: "var(--font-weight-semibold)" }}
                >
                  <Upload className="w-3.5 h-3.5" />
                  Lägg till
                </button>
                <button
                  onClick={() => setQueueOpen(false)}
                  className="p-1.5 rounded-full text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Track list */}
            <div className="flex flex-col gap-0.5 overflow-y-auto max-h-[50vh] px-3 pb-3">
              {tracks.length === 0 && (
                <div
                  className="flex flex-col items-center gap-2 py-10 cursor-pointer group"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-6 h-6 text-muted-foreground group-hover:text-foreground transition-colors" />
                  <p className="text-muted-foreground" style={{ fontFamily: FONT, fontSize: "var(--text-label)" }}>
                    Ladda upp MP3, WAV, OGG …
                  </p>
                </div>
              )}
              {tracks.map((track, idx) => (
                <div
                  key={track.id}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-[var(--radius-card)] transition-all duration-200 group cursor-pointer ${
                    idx === currentIndex ? "bg-primary/10" : "hover:bg-surface-container-highest/50"
                  }`}
                  onClick={() => playTrack(idx)}
                >
                  <div className="w-5 flex items-center justify-center shrink-0">
                    {idx === currentIndex && isPlaying ? (
                      <div className="flex items-end gap-[2px] h-3.5">
                        <span className="w-[3px] bg-primary rounded-full animate-pulse" style={{ height: "60%", animationDelay: "0ms" }} />
                        <span className="w-[3px] bg-primary rounded-full animate-pulse" style={{ height: "100%", animationDelay: "150ms" }} />
                        <span className="w-[3px] bg-primary rounded-full animate-pulse" style={{ height: "40%", animationDelay: "300ms" }} />
                      </div>
                    ) : (
                      <span
                        className={idx === currentIndex ? "text-primary" : "text-muted-foreground"}
                        style={{ fontFamily: FONT, fontSize: "12px" }}
                      >
                        {idx + 1}
                      </span>
                    )}
                  </div>
                  <span
                    className={`flex-1 truncate ${idx === currentIndex ? "text-primary" : "text-foreground"}`}
                    style={{ fontFamily: FONT, fontSize: "var(--text-label)" }}
                  >
                    {track.name}
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); removeTrack(idx); }}
                    className="p-1 rounded-full text-muted-foreground/40 hover:text-destructive opacity-0 group-hover:opacity-100 transition-all duration-150 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/*  BOTTOM BAR                                                   */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border" style={{ background: "var(--surface-container)" }}>
        {/* Progress rail (thin line above bar) */}
        <div
          ref={progressRef}
          className="absolute top-0 left-0 right-0 h-1 cursor-pointer group -translate-y-full"
          onClick={seekTo}
          style={{ background: "var(--surface-container-highest)" }}
        >
          <div
            className="h-full bg-primary transition-[width] duration-150"
            style={{ width: `${progress}%` }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-primary scale-0 group-hover:scale-100 transition-transform duration-150"
            style={{ left: `calc(${progress}% - 6px)` }}
          />
        </div>

        <div className="flex items-center h-[72px] px-3 sm:px-5 gap-3 sm:gap-5">
          {/* ── Left: Track info ── */}
          <div className="flex items-center gap-3 flex-1 min-w-0 sm:flex-[0_0_30%]">
            {currentTrack ? (
              <>
                <div
                  className="w-11 h-11 rounded-[var(--radius-card)] flex items-center justify-center shrink-0"
                  style={{ background: "var(--surface-container-highest)" }}
                >
                  <Music className="w-4.5 h-4.5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className="text-foreground truncate"
                    style={{ fontFamily: FONT, fontSize: "var(--text-label)", fontWeight: "var(--font-weight-semibold)" }}
                  >
                    {currentTrack.name}
                  </p>
                  <p className="text-muted-foreground" style={{ fontFamily: FONT, fontSize: "12px" }}>
                    {formatTime(currentTime)}<span className="text-muted-foreground/40"> / </span>{formatTime(duration)}
                  </p>
                </div>
              </>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2.5 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <div
                  className="w-11 h-11 rounded-[var(--radius-card)] flex items-center justify-center shrink-0"
                  style={{ background: "var(--surface-container-highest)" }}
                >
                  <Upload className="w-4 h-4" />
                </div>
                <span style={{ fontFamily: FONT, fontSize: "var(--text-label)" }}>
                  Ladda upp musik
                </span>
              </button>
            )}
          </div>

          {/* ── Center: Controls ── */}
          <div className="flex items-center gap-1 sm:gap-2 justify-center sm:flex-1">
            {/* Shuffle (hidden on tiny screens) */}
            <button
              onClick={() => setShuffle((s) => !s)}
              className={`hidden sm:flex p-2 rounded-full transition-all duration-200 cursor-pointer ${
                shuffle ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
              title="Slumpa"
            >
              <Shuffle className="w-4 h-4" />
            </button>
            <button
              onClick={prevTrack}
              className="p-2 rounded-full text-muted-foreground hover:text-foreground transition-all duration-200 cursor-pointer"
              title="Föregående"
            >
              <SkipBack className="w-4 h-4" />
            </button>
            <button
              onClick={togglePlay}
              className="w-10 h-10 rounded-full bg-foreground text-background flex items-center justify-center hover:scale-105 transition-all duration-200 cursor-pointer active:scale-95"
              title={isPlaying ? "Pausa" : "Spela"}
            >
              {isPlaying ? <Pause className="w-4.5 h-4.5" /> : <Play className="w-4.5 h-4.5 ml-0.5" />}
            </button>
            <button
              onClick={nextTrack}
              className="p-2 rounded-full text-muted-foreground hover:text-foreground transition-all duration-200 cursor-pointer"
              title="Nästa"
            >
              <SkipForward className="w-4 h-4" />
            </button>
            {/* Repeat (hidden on tiny screens) */}
            <button
              onClick={() => setRepeat((r) => !r)}
              className={`hidden sm:flex p-2 rounded-full transition-all duration-200 cursor-pointer ${
                repeat ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
              title="Repetera"
            >
              <Repeat className="w-4 h-4" />
            </button>
          </div>

          {/* ── Right: Volume + Queue + Nostalgia ── */}
          <div className="hidden sm:flex items-center gap-2 flex-[0_0_30%] justify-end">
            {/* Nostalgia toggle */}
            <button
              onClick={onNostalgiaToggle}
              className={`p-2 rounded-full transition-all duration-200 cursor-pointer ${
                nostalgiaActive ? "text-primary bg-primary/12" : "text-muted-foreground hover:text-foreground"
              }`}
              title="Nostalgi-läge"
            >
              <ImageIcon className="w-4 h-4" />
            </button>
            {/* Queue toggle */}
            <button
              onClick={() => setQueueOpen((o) => !o)}
              className={`p-2 rounded-full transition-all duration-200 cursor-pointer ${
                queueOpen ? "text-primary bg-primary/12" : "text-muted-foreground hover:text-foreground"
              }`}
              title="Spellista"
            >
              <ListMusic className="w-4 h-4" />
            </button>
            {/* Volume */}
            <button
              onClick={() => setMuted((m) => !m)}
              className="p-2 rounded-full text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              {muted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={muted ? 0 : volume}
              onChange={(e) => { setVolume(parseFloat(e.target.value)); if (muted) setMuted(false); }}
              className="w-24 h-1 accent-[var(--foreground)] cursor-pointer"
              style={{ colorScheme: "dark" }}
            />
          </div>

          {/* Mobile-only: queue + nostalgia buttons */}
          <div className="flex sm:hidden items-center gap-1">
            <button
              onClick={onNostalgiaToggle}
              className={`p-2 rounded-full transition-all duration-200 cursor-pointer ${
                nostalgiaActive ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <ImageIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => setQueueOpen((o) => !o)}
              className={`p-2 rounded-full transition-all duration-200 cursor-pointer ${
                queueOpen ? "text-primary" : "text-muted-foreground"
              }`}
            >
              {queueOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

/* ════════════════════════════════════════════════════════════════════ */
/*  NostalgiaOverlay — fullscreen crossfading B&W historic photos      */
/* ════════════════════════════════════════════════════════════════════ */

/*
 * Approach: we maintain two stacked layers (A and B). One is always visible
 * while the other crossfades in. When the fade finishes, the back layer is
 * silently updated to the *next* image so it's ready for the following cycle.
 * Each visible image has a slow Ken Burns zoom (scale 1 → 1.15) over the
 * display period to add cinematic motion.
 */

const SLIDE_DURATION = 7000;  // ms a photo is fully visible
const FADE_DURATION = 1500;   // ms for the crossfade

export function NostalgiaOverlay({ onClose }: { onClose: () => void }) {
  // layerA / layerB hold photo indices; frontIsA tells us which is on top
  const [layerA, setLayerA] = useState(0);
  const [layerB, setLayerB] = useState(1);
  const [frontIsA, setFrontIsA] = useState(true);
  const [fading, setFading] = useState(false);
  // A generation counter so we can give each "show" a unique key for the zoom
  const [gen, setGen] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const nextPhotoRef = useRef(1); // tracks the next index to load

  useEffect(() => {
    // The back layer already has the next photo preloaded (layerB = 1).
    // Every SLIDE_DURATION we: 1) start fading to back layer, 2) after
    // FADE_DURATION swap roles and load the *next next* photo into the
    // now-hidden layer.
    const cycle = () => {
      // Step 1 — start crossfade
      setFading(true);

      // Step 2 — after fade completes, swap and prepare next
      setTimeout(() => {
        setFrontIsA((prev) => !prev);
        setFading(false);
        setGen((g) => g + 1);

        // The layer that just moved to back needs the next photo
        const upcoming = (nextPhotoRef.current + 1) % NOSTALGIA_PHOTOS.length;
        nextPhotoRef.current = upcoming;

        // We update the now-back layer (the one that *was* front) so it's
        // ready for the next fade.
        setFrontIsA((nowFrontIsA) => {
          // After the flip above, if front is now B, the back is A
          if (nowFrontIsA) {
            // front is A, back is B → update B
            setLayerB(upcoming);
          } else {
            // front is B, back is A → update A
            setLayerA(upcoming);
          }
          return nowFrontIsA;
        });
      }, FADE_DURATION);
    };

    timerRef.current = setInterval(cycle, SLIDE_DURATION);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  // Determine which index is currently "visible" (the front layer)
  const visibleIndex = frontIsA ? layerA : layerB;
  const photo = NOSTALGIA_PHOTOS[visibleIndex];
  const zoomOrigins = ["center", "top left", "bottom right", "top right", "center bottom"];
  const zoomOrigin = zoomOrigins[gen % zoomOrigins.length];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8 }}
      className="fixed inset-0 z-[45] flex flex-col items-center justify-center overflow-hidden cursor-pointer"
      style={{ background: "var(--background)" }}
      onClick={onClose}
    >
      <div className="absolute inset-0">
        <div className="absolute inset-0 will-change-[opacity]" style={{ opacity: fading ? (frontIsA ? 0 : 1) : (frontIsA ? 1 : 0), transition: `opacity ${FADE_DURATION}ms ease-in-out`, zIndex: frontIsA ? 2 : 1 }}>
          <NostalgiaImage key={`a-${layerA}-${frontIsA ? gen : gen + 1}`} src={NOSTALGIA_PHOTOS[layerA].src} alt={NOSTALGIA_PHOTOS[layerA].caption} isActive={frontIsA && !fading} zoomOrigin={frontIsA ? zoomOrigin : "center"} />
        </div>
        <div className="absolute inset-0 will-change-[opacity]" style={{ opacity: fading ? (frontIsA ? 1 : 0) : (frontIsA ? 0 : 1), transition: `opacity ${FADE_DURATION}ms ease-in-out`, zIndex: frontIsA ? 1 : 2 }}>
          <NostalgiaImage key={`b-${layerB}-${!frontIsA ? gen : gen + 1}`} src={NOSTALGIA_PHOTOS[layerB].src} alt={NOSTALGIA_PHOTOS[layerB].caption} isActive={!frontIsA && !fading} zoomOrigin={!frontIsA ? zoomOrigin : "center"} />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 z-[3]" />
        <div className="absolute inset-0 opacity-[0.06] mix-blend-overlay pointer-events-none z-[4]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` }} />
      </div>
      <div className="absolute bottom-24 sm:bottom-28 left-0 right-0 flex flex-col items-center gap-3 px-6 z-10">
        <AnimatePresence mode="wait">
          <motion.span key={`year-${visibleIndex}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 0.5, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.7, ease: "easeOut" }} className="text-foreground/50" style={{ fontFamily: FONT, fontSize: "clamp(48px, 10vw, 96px)", fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1 }}>{photo.year}</motion.span>
        </AnimatePresence>
        <AnimatePresence mode="wait">
          <motion.p key={`cap-${visibleIndex}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.7, delay: 0.1, ease: "easeOut" }} className="text-foreground/80 text-center max-w-lg" style={{ fontFamily: FONT, fontSize: "var(--text-base)", fontWeight: "var(--font-weight-semibold)", letterSpacing: "0.02em" }}>{photo.caption}</motion.p>
        </AnimatePresence>
        <div className="flex items-center gap-2 mt-2">
          {NOSTALGIA_PHOTOS.map((_, i) => (<div key={i} className="w-1.5 h-1.5 rounded-full transition-all duration-500" style={{ background: i === visibleIndex ? "var(--primary)" : "var(--muted-foreground)", opacity: i === visibleIndex ? 1 : 0.3, transform: i === visibleIndex ? "scale(1.4)" : "scale(1)" }} />))}
        </div>
      </div>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} transition={{ delay: 2, duration: 1 }} className="absolute top-6 left-0 right-0 text-center text-foreground/40 z-10" style={{ fontFamily: FONT, fontSize: "var(--text-label)" }}>Tryck för att stänga</motion.p>
    </motion.div>
  );
}

/* ── Single nostalgia image with Ken Burns zoom ── */
function NostalgiaImage({
  src,
  alt,
  isActive,
  zoomOrigin,
}: {
  src: string;
  alt: string;
  isActive: boolean;
  zoomOrigin: string;
}) {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <ImageWithFallback
        src={src}
        alt={alt}
        className="w-full h-full object-cover"
        style={{
          filter: "grayscale(100%) contrast(1.1) brightness(0.45)",
          transformOrigin: zoomOrigin,
          transform: isActive ? "scale(1.15)" : "scale(1.02)",
          transition: `transform ${SLIDE_DURATION}ms cubic-bezier(0.25, 0.1, 0.25, 1)`,
        }}
      />
    </div>
  );
}