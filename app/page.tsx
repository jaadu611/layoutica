import Header from "@/components/Header";
import Hero from "@/components/Hero";
import { blobs } from "@/constants/home.constants";

const page = () => {
  return (
    <div className="relative h-dvh overflow-hidden">
      <Header />
      <Hero />
      {blobs.map((classes, i) => (
        <div key={i} className={`absolute -z-1 rounded-full ${classes}`} />
      ))}
    </div>
  );
};

export default page;
