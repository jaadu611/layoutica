import mongoose from "mongoose";

const projectSchema = new mongoose.Schema(
  {
    userInput: {
      type: String,
      required: true,
      trim: true,
      maxlength: [5000, "User input cannot exceed 5000 characters"],
    },
    type: {
      type: String,
      enum: ["website", "mobile"],
      required: true,
    },
    config: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const Project =
  mongoose.models.Project || mongoose.model("Project", projectSchema);

export default Project;
