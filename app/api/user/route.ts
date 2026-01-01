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

    const dbUser = await User.findOne({ email });

    if (dbUser)
      return NextResponse.json(
        { message: "User already exists", user: dbUser },
        { status: 200 }
      );

    const newUser = await User.create({
      name: user.username ?? email?.split("@")[0],
      username: user.username ?? email?.split("@")[0],
      email,
    });

    return NextResponse.json(
      { message: "User created", user: newUser },
      { status: 201 }
    );
  } catch (err) {
    console.error("Error syncing user:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
