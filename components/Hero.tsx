import { ChevronRight } from "lucide-react";
import InputArea from "./InputArea";
import { AnimatedGradientText } from "./ui/animated-gradient-text";

const Hero = () => {
  return (
    <section className="pt-24 flex flex-col justify-center items-center sm:pt-28 md:pt-32 lg:pt-36 px-3 sm:px-6 md:px-10 lg:px-14 xl:px-16">
      <div className="group mb-5 relative inline-flex items-center rounded-full px-4 py-1.5 shadow-[inset_0_-8px_10px_#8fdfff1f] transition-shadow duration-500 ease-out hover:shadow-[inset_0_-5px_10px_#8fdfff3f]">
        <span
          className="animate-gradient absolute inset-0 block h-full rounded-[inherit] bg-linear-to-r from-[#ffaa40]/50 via-[#9c40ff]/50 to-[#ffaa40]/50 bg-size-[300%_100%] p-px"
          style={{
            WebkitMask:
              "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
            WebkitMaskComposite: "destination-out",
            mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
            maskComposite: "subtract",
            WebkitClipPath: "padding-box",
          }}
        />
        🎉 <hr className="mx-2 h-4 w-px shrink-0 bg-neutral-500" />
        <AnimatedGradientText className="text-sm font-medium max-w-xs wrap-break-word">
          Introducing Magic UI
        </AnimatedGradientText>
        <ChevronRight className="ml-1 size-4 stroke-neutral-500 transition-transform duration-300 ease-in-out group-hover:translate-x-0.5" />
      </div>

      <h1 className="leading-tight text-center font-bold tracking-tight text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl">
        Generate High-Quality{" "}
        <span className="text-[#F2574E]">Websites & Mobile Apps</span> Designs
      </h1>

      <p className="mx-auto mt-4 max-w-xl text-center text-base sm:text-lg text-gray-600">
        Turn your ideas into production-ready UI in seconds.
      </p>

      <InputArea />
    </section>
  );
};

export default Hero;
