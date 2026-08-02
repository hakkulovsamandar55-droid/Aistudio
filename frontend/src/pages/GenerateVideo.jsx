import { useEffect, useRef, useState } from "react";
import Layout from "../components/Layout";
import StylePicker from "../components/StylePicker";
import { generationApi } from "../api/generation.api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { Icon } from "../components/icons";
import { Button, Card, Badge, Spinner, CreditPill, cx } from "../components/ui";

const POLL_INTERVAL_MS = 5000;

export default function GenerateVideo() {
  const { credits, refreshUser } = useAuth();
  const toast = useToast();

  const [prompt, setPrompt] = useState("");
  const [styles, setStyles] = useState([]);
  const [style, setStyle] = useState("auto");
  const [tiers, setTiers] = useState([]);
  const [quality, setQuality] = useState("standard");
  const [submitting, setSubmitting] = useState(false);
  const [generation, setGeneration] = useState(null);
  const [error, setError] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const pollRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    generationApi
      .getStyles()
      .then((res) => {
        setStyles(res.data.data.video);
        setTiers(res.data.data.videoTiers || []);
      })
      .catch(() => setStyles([]));
  }, []);

  const stopPolling = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    pollRef.current = null;
    timerRef.current = null;
  };

  useEffect(() => stopPolling, []);

  const startPolling = (generationId) => {
    setElapsed(0);
    timerRef.current = setInterval(() => setElapsed((prev) => prev + 1), 1000);

    pollRef.current = setInterval(async () => {
      try {
        const res = await generationApi.getStatus(generationId);
        const updated = res.data.data;
        setGeneration(updated);

        if (updated.status === "COMPLETED" || updated.status === "FAILED") {
          stopPolling();
          if (updated.status === "COMPLETED") {
            refreshUser();
            toast.success("Video tayyor!");
          } else {
            toast.error("Video yaratilmadi — kredit yechilmadi.");
          }
        }
      } catch {
        stopPolling();
        setError("Holatni tekshirishda xatolik yuz berdi.");
      }
    }, POLL_INTERVAL_MS);
  };

  const selectedTier = tiers.find((tier) => tier.id === quality);
  const cost = selectedTier?.credits ?? 20;
  const notEnough = cost > credits;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setSubmitting(true);
    setError("");
    setGeneration(null);

    try {
      const res = await generationApi.generateVideo(prompt.trim(), {
        style,
        quality,
      });
      const { generationId, status } = res.data.data;
      setGeneration({ id: generationId, status, userPrompt: prompt.trim() });
      startPolling(generationId);
    } catch (err) {
      if (err.response?.status === 402) {
        toast.error("Kredit yetarli emas.");
      } else {
        setError(
          err.response?.data?.error || "Video yaratishda xatolik yuz berdi.",
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    stopPolling();
    setGeneration(null);
    setPrompt("");
    setError("");
  };

  const isProcessing =
    generation && ["PENDING", "PROCESSING"].includes(generation.status);

  return (
    <Layout title="Video yaratish" back="/create">
      {!generation && (
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="overflow-hidden p-0">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              maxLength={500}
              rows={4}
              disabled={submitting}
              placeholder="masalan: tog'lar ustidan dron kadri, quyosh botishi"
              className="w-full resize-none bg-transparent p-4 text-[#1c1a17] placeholder:text-[#a1978a] focus:outline-none disabled:opacity-50"
            />
            <div className="border-t border-[#f0eae0] bg-[#faf7f1] px-4 py-2.5 text-right text-xs text-[#a1978a]">
              {prompt.length}/500
            </div>
          </Card>

          {tiers.length > 0 && (
            <div>
              <p className="mb-2.5 text-sm font-medium text-[#37322b]">
                Sifat darajasi
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {tiers.map((tier) => {
                  const selected = quality === tier.id;
                  const affordable = tier.credits <= credits;
                  return (
                    <button
                      key={tier.id}
                      type="button"
                      onClick={() => setQuality(tier.id)}
                      disabled={submitting}
                      className={cx(
                        "rounded-xl border p-3 text-left transition-colors disabled:opacity-50",
                        selected
                          ? "border-[#5b45e0] bg-[#efecff]"
                          : "border-[#e8e0d3] bg-white hover:border-[#d8cdba]",
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-[#1c1a17]">
                          {tier.label}
                        </span>
                        <CreditPill
                          amount={tier.credits}
                          tone={affordable ? "brand" : "danger"}
                        />
                      </div>
                      <p className="mt-1 text-xs text-[#6d655a]">
                        {tier.description}
                      </p>
                      <p className="mt-1 text-[11px] text-[#a1978a]">
                        ~{Math.ceil(tier.estimatedSeconds / 60)} daqiqa
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <StylePicker
            styles={styles}
            value={style}
            onChange={setStyle}
            disabled={submitting}
          />

          {error && (
            <div className="rounded-xl bg-[#fbeceb] px-4 py-3 text-sm text-[#a8352a]">
              {error}
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm text-[#6d655a]">
              Narx
              <CreditPill
                amount={cost}
                tone={notEnough ? "danger" : "neutral"}
              />
            </span>
            <Button
              type="submit"
              disabled={submitting || !prompt.trim() || notEnough}
              icon="video"
            >
              {submitting ? "Yuborilmoqda..." : "Yaratish"}
            </Button>
          </div>

          {notEnough && (
            <p className="text-center text-sm text-[#a8352a]">
              Kreditingiz yetarli emas.{" "}
              <a href="/billing" className="font-medium underline">
                Kredit sotib olish
              </a>
            </p>
          )}
        </form>
      )}

      {isProcessing && (
        <Card className="flex flex-col items-center gap-3 p-14">
          <Spinner size="lg" />
          <p className="text-center text-[#6d655a]">
            Video yaratilmoqda, bu bir necha daqiqa vaqt olishi mumkin...
          </p>
          <p className="font-mono text-sm text-[#a1978a]">
            {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")}
          </p>
        </Card>
      )}

      {generation?.status === "COMPLETED" && (
        <div className="space-y-4">
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video
            src={generation.resultUrl}
            controls
            className="w-full rounded-2xl bg-[#f4efe6]"
          />
          <div className="flex gap-3">
            <Button
              icon="download"
              onClick={() =>
                generationApi
                  .download(generation.id, `ai-studio-${generation.id}.mp4`)
                  .catch(() => toast.error("Yuklab olishda xatolik."))
              }
              className="flex-1"
            >
              Yuklab olish
            </Button>
            <Button
              onClick={reset}
              variant="secondary"
              className="flex-1"
              icon="refresh"
            >
              Yana yaratish
            </Button>
          </div>
        </div>
      )}

      {generation?.status === "FAILED" && (
        <Card className="p-6 text-center">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fbeceb] text-[#a8352a]">
            <Icon name="alert" size="lg" />
          </span>
          <Badge tone="danger" className="mt-3">
            Xato
          </Badge>
          <p className="mt-3 text-[#37322b]">
            {generation.errorMessage || "Noma'lum xato"}
          </p>
          <p className="mt-1 text-sm text-[#a1978a]">Kredit yechilmadi.</p>
          <Button
            onClick={reset}
            variant="secondary"
            className="mt-5"
            icon="refresh"
          >
            Qaytadan urinish
          </Button>
        </Card>
      )}
    </Layout>
  );
}
