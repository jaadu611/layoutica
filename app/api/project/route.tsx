import connectDB from "@/config/mongodb";
import Project from "@/models/project.model";
import User from "@/models/user.model";
import { currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const user = await currentUser();

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { userInput, type } = await req.json();

    if (!userInput || !type) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    await connectDB();

    const dbUser = await User.findOne({ clerkId: user.id });

    const project = await Project.create({
      userInput,
      type,
      creator: dbUser._id,
    });

    return NextResponse.json({ success: true, project }, { status: 201 });
  } catch (error) {
    console.error("POST /api/layout error:", error);

    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
