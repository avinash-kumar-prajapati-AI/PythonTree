import { A } from "@solidjs/router";
import type { ParentComponent } from "solid-js";

export const Layout: ParentComponent = props => (
  <>
    <header class="site-header">
      <div class="container">
        <A href="/" class="site-logo">
          🌱 PythonTree
        </A>
        <nav style={{ display: "flex", gap: "1rem" }}>
          <A href="/">Tree</A>
          <A href="/admin">Admin</A>
        </nav>
      </div>
    </header>
    <main class="container">{props.children}</main>
    <footer class="site-footer">
      <div class="container">
        <span>© {new Date().getFullYear()} PythonTree. All rights reserved.</span>
        <span>
          Developed by{" "}
          <a
            href="https://github.com/avinash-kumar-prajapati-AI"
            target="_blank"
            rel="noopener noreferrer"
          >
            Avinash Kumar Prajapati
          </a>
        </span>
      </div>
    </footer>
  </>
);
