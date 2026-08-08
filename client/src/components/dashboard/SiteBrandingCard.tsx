import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Upload, Loader2, Check, Image as ImageIcon } from "lucide-react";

type UploadSlot = "faviconUrl" | "menuLogoUrl" | "footerLogoUrl";

const SLOTS: { key: UploadSlot; label: string; hint: string }[] = [
  { key: "faviconUrl", label: "Favicon", hint: "Shown in the browser tab. Square PNG/ICO, 32×32 or larger." },
  { key: "menuLogoUrl", label: "Menu logo", hint: "Top navigation bar. Transparent PNG works best." },
  { key: "footerLogoUrl", label: "Footer logo", hint: "Site footer. Transparent PNG works best." },
];

export function SiteBrandingCard() {
  const { data, isLoading, refetch } = trpc.siteSettings.get.useQuery();
  const save = trpc.siteSettings.save.useMutation();

  const [values, setValues] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState<string | null>(null);

  useEffect(() => {
    if (data) {
      setValues({
        faviconUrl: data.faviconUrl ?? "",
        menuLogoUrl: data.menuLogoUrl ?? "",
        footerLogoUrl: data.footerLogoUrl ?? "",
      });
    }
  }, [data]);

  const handleUpload = async (slot: UploadSlot, file: File) => {
    setUploading(slot);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Upload failed");
      const json = await res.json();
      const url = json.url as string;
      setValues((v) => ({ ...v, [slot]: url }));
      await save.mutateAsync({ [slot]: url });
      await refetch();
      toast.success(`${SLOTS.find((s) => s.key === slot)?.label} updated`);
    } catch {
      toast.error("Upload failed — check that R2 storage is configured.");
    } finally {
      setUploading(null);
    }
  };

  return (
    <Card className="glass-card border-border/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ImageIcon className="w-4 h-4 text-primary" /> Portal branding
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Upload the favicon and logos for the Lynx portal. Changes apply across the site after refresh.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          SLOTS.map((slot) => (
            <div key={slot.key} className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl border border-border/40 bg-muted/30 flex items-center justify-center overflow-hidden shrink-0">
                {values[slot.key] ? (
                  <img
                    src={values[slot.key]}
                    alt={slot.label}
                    className="w-full h-full object-contain"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                  />
                ) : (
                  <ImageIcon className="w-5 h-5 text-muted-foreground/50" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">{slot.label}</div>
                <div className="text-xs text-muted-foreground">{slot.hint}</div>
              </div>
              <label className="shrink-0">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/x-icon,image/svg+xml,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleUpload(slot.key, f);
                    e.currentTarget.value = "";
                  }}
                />
                <div className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border/40 bg-muted/30 text-sm font-medium cursor-pointer transition-colors hover:bg-muted/60 ${uploading === slot.key ? "opacity-50 pointer-events-none" : ""}`}>
                  {uploading === slot.key ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : values[slot.key] ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Upload className="w-3.5 h-3.5" />
                  )}
                  {values[slot.key] ? "Replace" : "Upload"}
                </div>
              </label>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

export default SiteBrandingCard;
