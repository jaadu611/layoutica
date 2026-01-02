import mongoose from "mongoose";

const projectSchema = new mongoose.Schema(
  {
    userInput: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["website", "mobile"],
      required: true,
    },
    config: {
      type: Object,
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
