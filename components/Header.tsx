import { headerOptions } from "@/constants/header.constants";
import Image from "next/image";
import { Button } from "./ui/button";
import Link from "next/link";
import { SignInButton, UserButton } from "@clerk/nextjs";
import { currentUser } from "@clerk/nextjs/server";
import { ArrowRight } from "lucide-react";

const Header = async () => {
  const user = await currentUser();

  return (
    <header className="flex items-center justify-between p-4 outline">
      <Link href={"/"}>
        <span className="flex items-center gap-2">
          <Image src={"/logo.png"} alt="logo" height={40} width={40} />
          <h2 className="text-xl max-sm:hidden font-semibold text-[#433B90]">
            Layoutica
          </h2>
        </span>
      </Link>
      <ul className="flex max-sm:hidden gap-5 items-center font-medium text-lg">
        {headerOptions.map((item) => (
          <li key={item} className="hover:text-blue-500 cursor-pointer">
            {item}
          </li>
        ))}
      </ul>
      {user ? (
        <div className="flex gap-2 items-center rounded-full outline p-2 hover:bg-muted transition">
          <UserButton
            appearance={{
              elements: {
                avatarBox: "w-8 h-8",
              },
            }}
          />
          <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
            {user?.firstName}
          </p>
        </div>
      ) : (
        <SignInButton mode="modal">
          <Button className="bg-[#F16860] hover:bg-[#f8584f] flex items-center gap-2">
            Get Started
            <ArrowRight className="h-4 w-4" />
          </Button>
        </SignInButton>
      )}
    </header>
  );
};

export default Header;
