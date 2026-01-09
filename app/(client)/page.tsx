"use client";

import { signOut, useSession } from "next-auth/react";

const Page = () => {
  const { data: session } = useSession();
  console.log(session);

  return (
    <>
      <p>
        Logged in as <strong>{session?.user?.name}</strong>
      </p>
      <button onClick={() => signOut()}>Logout</button>
    </>
  );
};

export default Page;
