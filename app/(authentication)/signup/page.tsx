"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

const Page = () => {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSignupAndLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Signup failed");
        setLoading(false);
        return;
      }

      toast.success("Account created! Logging in...");

      const loginResult = await signIn("credentials", {
        name,
        email,
        password,
        redirect: false,
      });

      if (loginResult?.error) {
        toast.error("Invalid email or password");
        setLoading(false);
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      toast.error("An error occurred. Please try again");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-zinc-100 selection:bg-zinc-800">
      <div className="w-full max-w-87.5 space-y-8">
        {/* Header */}
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            Create an account
          </h1>
          <p className="text-sm text-zinc-400">
            Enter your details below to get started
          </p>
        </div>

        {/* Form Container */}
        <div className="grid gap-6">
          <form onSubmit={handleSignupAndLogin}>
            <div className="grid gap-4">
              {/* Name */}
              <div className="grid gap-2">
                <label className="text-sm font-medium leading-none text-zinc-300 ml-1">
                  Name
                </label>
                <input
                  type="text"
                  value={name}
                  placeholder="John Doe"
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="flex h-10 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-700 transition-colors"
                />
              </div>

              {/* Email */}
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
                  className="flex h-10 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-700 transition-colors"
                />
              </div>

              {/* Password */}
              <div className="grid gap-2">
                <label className="text-sm font-medium leading-none text-zinc-300 ml-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    placeholder="Create a password"
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="flex h-10 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-700 transition-colors pr-10"
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

              {/* Submit */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-zinc-100 text-zinc-950 hover:bg-zinc-200 mt-2 h-10 font-medium"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {loading ? "Creating account..." : "Sign up"}
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
                Already have an account?
              </span>
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full bg-zinc-100 text-zinc-950 hover:bg-zinc-200 mt-2 h-10 font-medium"
            onClick={() => router.push("/login")}
          >
            Log in to account
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Page;
