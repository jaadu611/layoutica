import { UserDetails } from "@/types/User";
import { createContext } from "react";

export const UserDetailContext = createContext<UserDetails | null>(null);
