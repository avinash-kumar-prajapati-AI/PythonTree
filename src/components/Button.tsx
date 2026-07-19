import { splitProps, type JSX, type ParentComponent } from "solid-js";

type Props = JSX.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  /** While true the button is disabled and shows a spinner — use it during
   *  requests so a reader/visitor can't fire the same action twice. */
  busy?: boolean;
};

/**
 * App-wide button. Hover, press (active), focus, disabled and busy states are
 * styled in app.css under `.btn`.
 */
export const Button: ParentComponent<Props> = props => {
  const [local, rest] = splitProps(props, ["variant", "busy", "children", "class", "disabled"]);
  return (
    <button
      {...rest}
      class={`btn btn-${local.variant ?? "primary"} ${local.class ?? ""}`}
      disabled={local.disabled || local.busy}
      aria-busy={local.busy ? "true" : undefined}
    >
      {local.busy && <span class="btn-spinner" aria-hidden="true" />}
      {local.children}
    </button>
  );
};
