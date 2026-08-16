import { useEffect, useState } from "react";
import QRCode from "qrcode";
import type { DeviceCodeSession } from "../lib/types";

interface DeviceCodePromptProps {
  provider: "microsoft" | "elyby";
  mode: "browser" | "device";
  session?: DeviceCodeSession;
  deviceLink?: string;
}

export function DeviceCodePrompt({
  provider,
  mode,
  session,
  deviceLink,
}: DeviceCodePromptProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const isMicrosoft = provider === "microsoft";

  useEffect(() => {
    if (mode !== "device" || !deviceLink) {
      setQrDataUrl(null);
      return;
    }
    QRCode.toDataURL(deviceLink, { margin: 1, width: 180 })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null));
  }, [mode, deviceLink]);

  if (mode === "browser") {
    return (
      <div className="device-code-prompt">
        <p className="device-code-title">
          {isMicrosoft ? "Sign in with Microsoft" : "Sign in with Ely.by"}
        </p>
        <p className="field-hint">
          {isMicrosoft
            ? "Sign in in the browser. This window finishes on its own after you approve."
            : "Sign in on account.ely.by. This window finishes on its own after you approve."}
        </p>
      </div>
    );
  }

  return (
    <div className="device-code-prompt">
      <p className="device-code-title">Sign in with code</p>
      <p className="field-hint">
        {isMicrosoft
          ? "Open the link below or scan the QR, then enter the code if asked."
          : "Open the Ely.by code page or scan the QR, then approve access."}
      </p>
      {deviceLink && (
        <div className="device-code-qr-wrap">
          {qrDataUrl ? (
            <img className="device-code-qr" src={qrDataUrl} alt="" width={180} height={180} />
          ) : (
            <div className="device-code-qr placeholder" />
          )}
          <button
            type="button"
            className="link-btn"
            onClick={() => window.open(deviceLink, "_blank")}
          >
            {deviceLink}
          </button>
        </div>
      )}
      {session?.userCode && (
        <div className="device-code-box">
          <span className="device-code-label">Your code</span>
          <code className="device-code-value">{session.userCode}</code>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => navigator.clipboard.writeText(session.userCode)}
          >
            Copy code
          </button>
        </div>
      )}
    </div>
  );
}
