import { trpc } from "@/lib/trpc";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import "./index.css";

const persistedTheme = window.localStorage.getItem("civicresolve-theme");
if (persistedTheme === "dark") document.documentElement.classList.add("dark");

const queryClient = new QueryClient();
const trpcClient = trpc.createClient({ links: [httpBatchLink({ url: "/api/trpc", transformer: superjson, fetch: (input, init) => globalThis.fetch(input, { ...(init ?? {}) }) })] });

createRoot(document.getElementById("root")!).render(<trpc.Provider client={trpcClient} queryClient={queryClient}><QueryClientProvider client={queryClient}><App /></QueryClientProvider></trpc.Provider>);
