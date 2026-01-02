"use client";

import { useUser } from "@clerk/nextjs";
import axios from "axios";
import { useEffect } from "react";

const Provider = ({ children }: { children: React.ReactNode }) => {
  const { isSignedIn, isLoaded } = useUser();

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    const createNewUser = async () => {
      try {
        await axios.post("/api/user");
      } catch (err) {
        console.error("Error creating user:", err);
      }
    };

    if (isLoaded && isSignedIn) {
      createNewUser();
    }
  }, [isLoaded, isSignedIn]);

  return <>{children}</>;
};

export default Provider;
