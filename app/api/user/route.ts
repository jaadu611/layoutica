import connectDB from "@/config/mongodb";
import User from "@/models/user.model";
import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    await connectDB();

    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const email = user.primaryEmailAddress?.emailAddress;
    if (!email) {
      return NextResponse.json(
        { error: "User email not found" },
        { status: 400 }
      );
    }

    const dbUser = await User.findOneAndUpdate(
      { email },
      {
        $setOnInsert: {
          name: user.username ?? email?.split("@")[0],
          username: user.username ?? email?.split("@")[0],
          email,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const isNewUser = !dbUser;

    return NextResponse.json(
      {
        message: isNewUser ? "User created" : "User already exists",
        user: dbUser,
      },
      { status: isNewUser ? 201 : 200 }
    );
  } catch (err) {
    console.error("Error syncing user:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
