import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Upload, Loader2, Check, Image as ImageIcon } from "lucide-react";

type SlotKey =
  | "faviconUrl"
  | "menuLogoLightUrl"
  | "menuLogoDarkUrl"
  | "footerLogoLightUrl"
  | "footerLogoDarkUrl";

// Slots grouped for a clear layout: favicon on its own, then menu & footer
// each with a light-mode and dark-mode version.
const GROUPS: { title: string; hint: string; slots: { key: SlotKey; label: string; dark?: boolean }[] }[] = [
  {
    title: "Favicon",
    hint: "Shown in the browser tab. Square PNG/ICO, 32x32 or larger.",
    slots: [{ key: "faviconUrl", label: "Favicon" }],
  },
  {
    title: "Menu logo",
    hint: "Top navigation bar. Upload a version for each mode.",
    slots: [
      { key: "menuLogoLightUrl", label: "Light mode" },
      { key: "menuLogoDarkUrl", label: "Dark mode", dark: true },
    ],
  },
  {
    title: "Footer logo",
    hint: "Site footer. Upload a version for each mode.",
    slots: [
      { key: "footerLogoLightUrl", label: "Light mode" },
      { key: "footerLogoDarkUrl", label: "Dark mode", dark: true },
    ],
  },
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
        menuLogoLightUrl: data.menuLogoLightUrl ?? "",
        menuLogoDarkUrl: data.menuLogoDarkUrl ?? "",
        footerLogoLightUrl: data.footerLogoLightUrl ?? "",
        footerLogoDarkUrl: data.footerLogoDarkUrl ?? "",
      });
    }
  }, [data]);

  const handleUpload = async (slot: SlotKey, file: File) => {
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
      toast.success("Logo updated");
    } catch {
      toast.error("Upload failed - check that R2 storage is configured.");
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
          Upload the favicon and logos for the Lynx portal. For logos, upload a light-mode and a
          dark-mode version so they look right in both themes. Changes apply after refresh.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : (
          GROUPS.map((group) => (
            <div key={group.title}>
              <div className="font-medium text-sm mb-1">{group.title}</div>
              <div className="text-xs text-muted-foreground mb-3">{group.hint}</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {group.slots.map((slot) => (
                  <div key={slot.key} className="flex items-center gap-3">
                    <div
                      className={`w-16 h-16 rounded-xl border border-border/40 flex items-center justify-center overflow-hidden shrink-0 ${slot.dark ? "bg-neutral-900" : "bg-neutral-100"}`}
                    >
                      {values[slot.key] ? (
                        <img
                          src={values[slot.key]}
                          alt={slot.label}
                          className="w-full h-full object-contain"
                          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                        />
                      ) : (
                        <ImageIcon className={`w-5 h-5 ${slot.dark ? "text-neutral-600" : "text-neutral-400"}`} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{slot.label}</div>
                      <label>
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
                        <div className={`inline-flex items-center gap-1.5 mt-1 px-3 py-1.5 rounded-lg border border-border/40 bg-muted/30 text-xs font-medium cursor-pointer transition-colors hover:bg-muted/60 ${uploading === slot.key ? "opacity-50 pointer-events-none" : ""}`}>
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
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

export default SiteBrandingCard;
