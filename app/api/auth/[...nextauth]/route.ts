export const runtime = "nodejs"; // must be at top

import { handlers } from "@/auth";

export const { GET, POST } = handlers;
