"use client";

import { UserDetailContext } from "@/context/UserDetailContext";
import { useUser } from "@clerk/nextjs";
import axios from "axios";
import { useEffect, useState } from "react";

const Provider = ({ children }: { children: React.ReactNode }) => {
  const { isSignedIn, isLoaded } = useUser();
  const [userDetails, setUserDetails] = useState();

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    const createNewUser = async () => {
      try {
        const result = await axios.post("/api/user");
        console.log(result.data);
        setUserDetails(result?.data);
      } catch (err) {
        console.error("Error creating user:", err);
      }
    };

    if (isLoaded && isSignedIn) {
      createNewUser();
    }
  }, [isLoaded, isSignedIn]);

  return (
    <>
      <UserDetailContext.Provider value={{ userDetails, setUserDetails }}>
        {children}
      </UserDetailContext.Provider>
    </>
  );
};

export default Provider;
