"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

const Page = () => {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        toast.error("Invalid email or password");
        setLoading(false);
        return;
      }

      toast.success("Logged in successfully");
      router.push("/");
      router.refresh();
    } catch {
      toast.error("Something went wrong. Please try again");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-zinc-100 selection:bg-zinc-800">
      <div className="w-full max-w-87.5 space-y-8">
        {/* Header */}
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            Welcome back
          </h1>
          <p className="text-sm text-zinc-400">
            Enter your email to sign in to your account
          </p>
        </div>

        {/* Form */}
        <div className="grid gap-6">
          <form onSubmit={handleLogin}>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium leading-none text-zinc-300 ml-1">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  placeholder="name@example.com"
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="flex h-10 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 ring-offset-zinc-950 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
                />
              </div>

              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium leading-none text-zinc-300 ml-1">
                    Password
                  </label>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    placeholder="Enter password"
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="flex h-10 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 ring-offset-zinc-950 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 transition-colors pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-zinc-100 text-zinc-950 hover:bg-zinc-200 mt-2 h-10"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {loading ? "Signing in..." : "Sign In"}
              </Button>
            </div>
          </form>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-zinc-800" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-zinc-950 px-2 text-zinc-500">
                DONT HAVE AN ACCOUNT?
              </span>
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full bg-zinc-100 text-zinc-950 hover:bg-zinc-200 mt-2 h-10"
            onClick={() => router.push("/signup")}
          >
            Create an account
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Page;
