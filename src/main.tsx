// Extract Telegram OIDC redirect token from URL hash before React mounts
(function() {
  var hash = window.location.hash;
  if (hash.startsWith('#token=')) {
    var parts = hash.substring(1).split('&');
    var token = parts[0].split('=')[1];
    localStorage.setItem('auth_token', token);
    window.history.replaceState(null, '', window.location.pathname);
  }
})();

import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
