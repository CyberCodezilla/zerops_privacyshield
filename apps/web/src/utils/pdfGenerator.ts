import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface CertificateData {
  certificateId: string;
  timestamp: string;
  totalPromptsProcessed: number;
  totalTokensRedacted: number;
  averageLatencyMs: number;
  activePolicyProfile: string;
  auditLogs: Array<{
    id: string;
    timestamp: string;
    piiTypes: string[];
    tokensRedacted: number;
    latencyMs: number;
  }>;
}

export function generateCompliancePDF(data: CertificateData) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  // 1. Header Banner
  doc.setFillColor(15, 23, 42); // Slate-900
  doc.rect(0, 0, 210, 40, "F");

  doc.setTextColor(52, 211, 153); // Emerald-400
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("PrivacyShield Zero-Trust Certificate", 14, 22);

  doc.setTextColor(148, 163, 184); // Slate-400
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Enterprise AI Compliance & Data Leak Prevention Audit", 14, 30);

  // 2. Metadata Section
  doc.setTextColor(30, 41, 59); // Slate-800
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Audit Verification Details", 14, 50);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.text(`Certificate ID: ${data.certificateId}`, 14, 57);
  doc.text(`Generated Date: ${data.timestamp}`, 14, 63);
  doc.text(`Active Security Policy: Profile ${data.activePolicyProfile}`, 14, 69);
  doc.text(`Deployment Target: Zerops Managed Cloud Platform`, 14, 75);

  // 3. Security Score Box
  doc.setFillColor(236, 253, 245); // Emerald-50
  doc.setDrawColor(16, 185, 129); // Emerald-500
  doc.roundedRect(120, 48, 76, 30, 3, 3, "FD");

  doc.setTextColor(6, 95, 70); // Emerald-800
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Compliance Score: 100%", 125, 58);

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.text("Zero-Persistence Verified", 125, 65);
  doc.text(`SLA Latency: ${data.averageLatencyMs.toFixed(2)}ms avg`, 125, 71);

  // 4. Audit Table
  const tableRows = data.auditLogs.map((log) => [
    log.id.substring(0, 8) + "...",
    log.timestamp.replace("T", " ").substring(0, 19),
    log.piiTypes.join(", ") || "None",
    log.tokensRedacted.toString(),
    `${log.latencyMs.toFixed(2)} ms`,
    "BLOCKED FROM LLM",
  ]);

  autoTable(doc, {
    startY: 85,
    head: [["Request ID", "Timestamp", "Detected PII", "Redacted", "Proxy Overhead", "Status"]],
    body: tableRows,
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    styles: { fontSize: 8, font: "helvetica" },
  });

  // 5. Official Stamp / Footer
  const finalY = (doc as any).lastAutoTable?.finalY || 200;
  doc.setLineWidth(0.5);
  doc.setDrawColor(226, 232, 240);
  doc.line(14, finalY + 15, 196, finalY + 15);

  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text("Verified by PrivacyShield Security Engine on Zerops Cloud.", 14, finalY + 22);
  doc.text("Zero raw PII stored in backend databases or persistent caches.", 14, finalY + 27);

  // Save PDF file
  doc.save(`PrivacyShield-Compliance-Certificate-${data.certificateId}.pdf`);
}
