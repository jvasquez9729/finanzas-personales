import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import { FinanceProvider } from "./contexts/FinanceContext.tsx";
import "./styles/index.css";

createRoot(document.getElementById("root")!).render(
  <FinanceProvider>
    <App />
  </FinanceProvider>
);
