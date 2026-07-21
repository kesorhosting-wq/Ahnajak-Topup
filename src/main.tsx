// Extract Telegram OIDC redirect token from URL hash before React mounts
(function() {
  var hash = window.location.hash;
  if (hash.startsWith('#token=')) {
    var parts = hash.substring(1).split('&');
    var tokenParam = parts[0]; // token=JWT
    var token = tokenParam.split('=')[1];
    var state = '';
    for (var i = 1; i < parts.length; i++) {
      if (parts[i].startsWith('state=')) {
        state = parts[i].split('=')[1];
        break;
      }
    }
    var savedState = sessionStorage.getItem('tg_oauth_state');
    if (!state || state === savedState) {
      sessionStorage.removeItem('tg_oauth_state');
      localStorage.setItem('auth_token', token);
    }
    window.history.replaceState(null, '', window.location.pathname);
  }
})();

import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
