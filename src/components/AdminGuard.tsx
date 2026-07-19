import { createAsync, Navigate } from "@solidjs/router";
import { Show, type ParentComponent } from "solid-js";
import { isAdminQuery } from "~/server/api";

/**
 * Renders children only for an authenticated admin; everyone else is sent to
 * /admin (the login screen). Waits for the session check before deciding so
 * SSR doesn't flash a redirect at logged-in admins.
 */
export const AdminGuard: ParentComponent = props => {
  const admin = createAsync(() => isAdminQuery());
  return (
    <Show when={admin() !== undefined}>
      <Show when={admin()} fallback={<Navigate href="/admin" />}>
        {props.children}
      </Show>
    </Show>
  );
};
