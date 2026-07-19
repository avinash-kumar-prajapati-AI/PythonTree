import { createSignal, type Component } from "solid-js";
import { Button } from "./Button";

/**
 * Share-node button: native share sheet where available (mobile), clipboard
 * copy elsewhere. Disables itself while working so it can't be spammed.
 */
export const ShareButton: Component<{ title: string; path: string }> = props => {
  const [busy, setBusy] = createSignal(false);
  const [label, setLabel] = createSignal("Share");

  const share = async () => {
    setBusy(true);
    const url = `${window.location.origin}${props.path}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: props.title, url });
        setLabel("Shared!");
      } else {
        await navigator.clipboard.writeText(url);
        setLabel("Link copied!");
      }
    } catch {
      /* user cancelled the share sheet — not an error */
    } finally {
      setBusy(false);
      setTimeout(() => setLabel("Share"), 2000);
    }
  };

  return (
    <Button variant="secondary" busy={busy()} onClick={share} title="Share this node">
      🔗 {label()}
    </Button>
  );
};
