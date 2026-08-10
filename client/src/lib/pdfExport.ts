// Shared PDF export with a native fallback.
// Primary path: html2canvas-pro (supports modern oklch/lab colors) + jsPDF.
// If anything fails (old deploy, CORS-tainted image, browser quirk), we fall
// back to window.print() — the user can "Save as PDF" from the print dialog,
// which never depends on any library.
import { toast } from "sonner";

export async function exportElementToPdf(
  el: HTMLElement,
  filename: string,
  opts?: { width?: number; background?: string },
): Promise<void> {
  toast.loading("Generating PDF...", { id: "pdf-gen" });
  const prevWidth = el.style.width;
  const prevMaxWidth = el.style.maxWidth;
  try {
    const html2canvas = (await import("html2canvas-pro")).default;
    const { jsPDF } = await import("jspdf");

    // Fixed desktop width during capture so mobile exports look identical
    if (opts?.width) {
      el.style.width = `${opts.width}px`;
      el.style.maxWidth = `${opts.width}px`;
    }

    const canvas = await html2canvas(el, {
      scale: 2,
      useCORS: true,
      backgroundColor: opts?.background ?? null,
      logging: false,
      windowWidth: (opts?.width ?? el.clientWidth) + 40,
    });

    el.style.width = prevWidth;
    el.style.maxWidth = prevMaxWidth;

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const imgH = (canvas.height * pageW) / canvas.width;

    let heightLeft = imgH;
    let position = 0;
    pdf.addImage(imgData, "PNG", 0, position, pageW, imgH);
    heightLeft -= pageH;
    while (heightLeft > 0) {
      position -= pageH;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, position, pageW, imgH);
      heightLeft -= pageH;
    }
    pdf.save(filename);
    toast.success("PDF downloaded", { id: "pdf-gen" });
  } catch (err) {
    el.style.width = prevWidth;
    el.style.maxWidth = prevMaxWidth;
    console.error("[pdf] capture failed:", err);
    const msg = err instanceof Error ? err.message : String(err);
    // Native fallback: the browser's print dialog can always save as PDF
    toast.error(`PDF capture failed (${msg.slice(0, 80)}). Opening print dialog — choose "Save as PDF".`, {
      id: "pdf-gen",
      duration: 6000,
    });
    setTimeout(() => window.print(), 400);
  }
}
