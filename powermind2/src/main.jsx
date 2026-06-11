import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import { JourneyProvider } from "./context/JourneyContext.jsx";
import { RouterProvider } from "./router/RouterContext.jsx";
import "./styles.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  document.body.innerHTML = "<div class='runtime-error'><h1>Preview error</h1><p>Root element was not found.</p></div>";
} else {
  createRoot(rootElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <RouterProvider>
        <JourneyProvider>
          <App />
        </JourneyProvider>
      </RouterProvider>
    </ErrorBoundary>
  </React.StrictMode>
  );
}
