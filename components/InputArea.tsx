"use client";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { suggestions } from "@/constants/hero.constants";
import { useUser } from "@clerk/nextjs";
import axios from "axios";
import { Loader, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

function InputArea() {
  const [userInput, setUserInput] = useState<string>("");
  const [type, setType] = useState<"website" | "mobile">("website");
  const [loading, setLoading] = useState<boolean>(false);
  const router = useRouter();
  const user = useUser();

  const onCreateProject = async () => {
    if (!user.isLoaded) return;
    if (!user.isSignedIn) return router.push("/sign-in");

    setLoading(true);

    try {
      const result = await axios.post("/api/project", {
        userInput,
        type,
      });

      console.log(result.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="flex justify-center max-h-60 w-full gap-6">
        <InputGroup className="max-w-4xl mt-5 bg-white">
          <InputGroupTextarea
            data-slot="input-group-control"
            className="flex field-sizing-content w-full resize-none rounded-md px-3 py-2.5 text-base transition-[color,box-shadow] outline-none md:text-sm"
            placeholder="Describe the UI you want to build…"
            value={userInput}
            onChange={(event) => setUserInput(event.target.value)}
          />
          <InputGroupAddon align="block-end">
            <Select
              defaultValue={type}
              onValueChange={(value) => setType(value as "website" | "mobile")}
            >
              <SelectTrigger className="w-45">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="website">Website</SelectItem>
                <SelectItem value="mobile">Mobile</SelectItem>
              </SelectContent>
            </Select>

            <InputGroupButton
              className="ml-auto bg-[#F16860] hover:bg-[#f8584f] cursor-pointer"
              size="sm"
              variant="default"
              onClick={() => onCreateProject()}
              disabled={!userInput || loading}
            >
              {loading ? <Loader className="animate-spin" /> : <Send />}
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
      </div>
      <div className="mt-5 flex gap-5">
        {suggestions.map(({ icon, name, description }) => (
          <div
            key={name}
            onClick={() => setUserInput(description)}
            className="p-2 border cursor-pointer rounded-2xl w-40 flex flex-col items-center justify-center text-center hover:shadow-md transition-shadow duration-300 bg-white dark:bg-gray-800"
          >
            <div className="text-2xl mb-1">{icon}</div>
            <h2 className="font-semibold text-sm mb-1 line-clamp-2">{name}</h2>
          </div>
        ))}
      </div>
    </>
  );
}

export default InputArea;
