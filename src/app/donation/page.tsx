import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  FaCoffee,
  FaHeart,
  FaExternalLinkAlt,
  FaHandHoldingHeart,
  FaUsers,
  FaLeaf,
  FaStar,
  FaCheck,
} from "react-icons/fa";
import bracketsUp from "@/assets/bracketsUp.png";
import bracketsDown from "@/assets/bracketsDown.png";
import { DonateButton } from "./DonateButton";

export const metadata: Metadata = {
  title: "Support FoodShare | Donate",
  description:
    "Support FoodShare's mission to reduce food waste and fight hunger. Every donation helps rescue food and feed families in need.",
  openGraph: {
    title: "Support FoodShare | Donate",
    description:
      "Join us in the fight against food waste and hunger. Your support creates real change.",
  },
};

const KOFI_URL = "https://ko-fi.com/organicnz";

export default function DonationPage() {
  return (
    <div className="min-h-screen pt-[8vh] pb-[8vw] relative overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute top-0 left-0 right-0 bottom-0 bg-gradient-to-br from-[#fef5f7] via-white to-[#f7f5fe] -z-10" />

      {/* Floating decorative orbs */}
      <div className="absolute -top-[10%] -right-[5%] w-[600px] h-[600px] bg-[radial-gradient(circle,rgba(255,107,157,0.15),transparent_70%)] rounded-full blur-[80px] pointer-events-none -z-10" />
      <div className="absolute -bottom-[15%] -left-[10%] w-[700px] h-[700px] bg-[radial-gradient(circle,rgba(102,126,234,0.12),transparent_70%)] rounded-full blur-[100px] pointer-events-none -z-10" />
      <div className="absolute top-[30%] left-[50%] w-[400px] h-[400px] bg-[radial-gradient(circle,rgba(240,147,251,0.1),transparent_70%)] rounded-full blur-[90px] pointer-events-none -z-10" />

      <div className="container mx-auto max-w-7xl px-4 relative z-10">
        {/* Hero Section */}
        <div className="flex flex-col gap-12 text-center mb-24 pt-12">
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-center gap-3">
              <div className="w-3 h-3 rounded-full bg-pink-400" />
              <div className="px-5 py-2 rounded-full bg-pink-100 text-pink-700 text-xs uppercase tracking-wider font-bold shadow-[0_2px_8px_rgba(255,45,85,0.2)]">
                Make an Impact Today
              </div>
              <div className="w-3 h-3 rounded-full bg-pink-400" />
            </div>
            <h1 className="text-4xl md:text-6xl font-black bg-gradient-to-r from-[#FF2D55] via-[#FF6B9D] via-[#f093fb] to-[#667eea] bg-clip-text text-transparent leading-tight tracking-tighter max-w-4xl mx-auto">
              Every Coffee Saves a Meal
            </h1>
            <p className="text-lg md:text-2xl text-gray-600 max-w-3xl mx-auto font-medium leading-relaxed">
              Join us in the fight against food waste and hunger. Your support creates real change.
            </p>
          </div>

          {/* Premium Ko-fi CTA with glassmorphism */}
          <div className="w-full max-w-5xl mx-auto relative">
            {/* Multi-layer glow effect */}
            <div className="absolute -top-[30px] -left-[30px] -right-[30px] -bottom-[30px] bg-gradient-to-br from-[rgba(255,45,85,0.3)] to-[rgba(240,147,251,0.3)] rounded-[4rem] blur-[40px] pointer-events-none opacity-60" />

            <div className="relative p-10 md:p-16 bg-gradient-to-br from-[#FF2D55] via-[#FF6B9D] to-[#f093fb] rounded-[3rem] shadow-[0_30px_60px_rgba(255,45,85,0.3)] overflow-hidden hover:translate-y-[-8px] hover:scale-[1.01] hover:shadow-[0_40px_80px_rgba(255,45,85,0.4)] transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]">
              {/* Subtle dot pattern overlay */}
              <div
                className="absolute top-0 left-0 right-0 bottom-0 opacity-[0.08] pointer-events-none"
                style={{
                  backgroundImage:
                    "radial-gradient(circle at 25% 25%, white 2px, transparent 2px), radial-gradient(circle at 75% 75%, white 2px, transparent 2px)",
                  backgroundSize: "60px 60px",
                }}
              />

              <div className="flex flex-col gap-8 relative z-10">
                <div className="bg-white/20 p-6 rounded-full backdrop-blur-[10px] border-2 border-white/30 shadow-[0_8px_32px_rgba(0,0,0,0.1)] w-fit mx-auto">
                  <FaHeart className="w-16 h-16 md:w-24 md:h-24 text-white" />
                </div>
                <div className="flex flex-col gap-4">
                  <h2 className="text-xl md:text-5xl text-white font-black tracking-tight">
                    Buy Us a Coffee ☕
                  </h2>
                  <p className="text-lg md:text-xl max-w-[750px] mx-auto text-white/95 leading-[1.8] font-medium">
                    Every donation directly supports our food rescue mission. 100% of contributions
                    help us reduce waste and feed families in need.
                  </p>
                </div>
                <DonateButton kofiUrl={KOFI_URL} variant="hero" />

                {/* Trust indicators */}
                <div className="flex flex-wrap items-center justify-center gap-6 pt-4">
                  <div className="flex items-center gap-2 text-white/90">
                    <FaCheck />
                    <span className="text-sm font-medium">Secure</span>
                  </div>
                  <div className="flex items-center gap-2 text-white/90">
                    <FaCheck />
                    <span className="text-sm font-medium">100% Goes to Food Rescue</span>
                  </div>
                  <div className="flex items-center gap-2 text-white/90">
                    <FaCheck />
                    <span className="text-sm font-medium">Tax Deductible</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Impact Statistics - Card style */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-24">
          {/* Card 1 */}
          <div className="bg-white p-10 rounded-[3rem] shadow-[0_10px_40px_rgba(0,0,0,0.08)] border-t-[6px] border-pink-400 relative overflow-hidden transition-all duration-[400ms] ease-[cubic-bezier(0.4,0,0.2,1)] hover:shadow-[0_20px_60px_rgba(255,45,85,0.15)] hover:-translate-y-2">
            <div className="absolute -top-[50px] -right-[50px] w-[150px] h-[150px] bg-[radial-gradient(circle,rgba(255,45,85,0.08),transparent)] rounded-full pointer-events-none" />
            <div className="flex flex-col gap-5 items-start relative">
              <div className="w-16 h-16 rounded-full bg-pink-50 border-[3px] border-pink-100 flex items-center justify-center">
                <FaHandHoldingHeart className="w-8 h-8 text-pink-500" />
              </div>
              <div className="flex flex-col gap-3 items-start">
                <h3 className="text-5xl text-gray-800 font-black tracking-tight">100%</h3>
                <h4 className="text-xl text-gray-700 font-bold">Direct Impact</h4>
                <p className="text-gray-600 leading-[1.7] text-base">
                  Every single dollar goes directly to rescuing food and feeding families
                </p>
              </div>
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-white p-10 rounded-[3rem] shadow-[0_10px_40px_rgba(0,0,0,0.08)] border-t-[6px] border-blue-400 relative overflow-hidden transition-all duration-[400ms] ease-[cubic-bezier(0.4,0,0.2,1)] hover:shadow-[0_20px_60px_rgba(22,182,223,0.15)] hover:-translate-y-2">
            <div className="absolute -top-[50px] -right-[50px] w-[150px] h-[150px] bg-[radial-gradient(circle,rgba(22,182,223,0.08),transparent)] rounded-full pointer-events-none" />
            <div className="flex flex-col gap-5 items-start relative">
              <div className="w-16 h-16 rounded-full bg-blue-50 border-[3px] border-blue-100 flex items-center justify-center">
                <FaUsers className="w-8 h-8 text-blue-500" />
              </div>
              <div className="flex flex-col gap-3 items-start">
                <h3 className="text-5xl text-gray-800 font-black tracking-tight">1,000+</h3>
                <h4 className="text-xl text-gray-700 font-bold">Lives Impacted</h4>
                <p className="text-gray-600 leading-[1.7] text-base">
                  Families and individuals supported throughout our community
                </p>
              </div>
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-white p-10 rounded-[3rem] shadow-[0_10px_40px_rgba(0,0,0,0.08)] border-t-[6px] border-green-400 relative overflow-hidden transition-all duration-[400ms] ease-[cubic-bezier(0.4,0,0.2,1)] hover:shadow-[0_20px_60px_rgba(16,185,129,0.15)] hover:-translate-y-2">
            <div className="absolute -top-[50px] -right-[50px] w-[150px] h-[150px] bg-[radial-gradient(circle,rgba(16,185,129,0.08),transparent)] rounded-full pointer-events-none" />
            <div className="flex flex-col gap-5 items-start relative">
              <div className="w-16 h-16 rounded-full bg-green-50 border-[3px] border-green-100 flex items-center justify-center">
                <FaLeaf className="w-8 h-8 text-green-500" />
              </div>
              <div className="flex flex-col gap-3 items-start">
                <h3 className="text-5xl text-gray-800 font-black tracking-tight">Zero</h3>
                <h4 className="text-xl text-gray-700 font-bold">Food Waste Goal</h4>
                <p className="text-gray-600 leading-[1.7] text-base">
                  Promoting sustainability and reducing environmental impact daily
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Mission Statement - Premium glassmorphism card */}
        <div className="bg-white/90 backdrop-blur-[20px] backdrop-saturate-[180%] p-12 md:p-20 rounded-[4rem] shadow-[0_20px_60px_rgba(0,0,0,0.1)] border border-white/70 mb-24 relative overflow-hidden">
          {/* Decorative gradient accent */}
          <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-gradient-to-bl from-[rgba(240,147,251,0.1)] to-transparent rounded-bl-full" />

          <div className="flex flex-col md:flex-row items-center justify-between gap-10 md:gap-14 relative">
            <Image
              src={bracketsUp}
              alt=""
              className="w-0 md:w-24 h-0 md:h-24 opacity-25 hidden md:block"
            />
            <div className="flex flex-col gap-8 flex-1 text-center">
              <p className="text-xl md:text-2xl font-medium text-gray-700 leading-[1.8] tracking-wide">
                We are a foodsharing startup dedicated to reducing food waste and fighting hunger in
                our community. Every day, we rescue excess food from local businesses and distribute
                it to those in need, including families, individuals, and community organizations.
              </p>
              <div className="flex items-center justify-center gap-4">
                <FaStar className="text-pink-400 w-6 h-6" />
                <h3 className="text-2xl bg-gradient-to-r from-[#FF2D55] to-[#f093fb] bg-clip-text text-transparent font-black">
                  Tarlan Isaev, Founder
                </h3>
                <FaStar className="text-pink-400 w-6 h-6" />
              </div>
            </div>
            <Image
              src={bracketsDown}
              alt=""
              className="w-0 md:w-24 h-0 md:h-24 opacity-25 hidden md:block"
            />
          </div>
        </div>

        {/* Final CTA Section */}
        <div className="flex flex-col gap-10 text-center mb-16 pb-12">
          <div className="flex flex-col gap-5">
            <h2 className="text-4xl md:text-5xl text-gray-800 font-black tracking-tight">
              Ready to Make a Difference?
            </h2>
            <p className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto font-medium leading-[1.7]">
              Together, we can fight food insecurity and create a sustainable future for our
              community
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-6 pt-8 w-full justify-center">
            <DonateButton kofiUrl={KOFI_URL} variant="cta" />
            <Link href="/about-us">
              <button className="border-[3px] border-pink-600 text-pink-600 hover:bg-pink-50 hover:-translate-y-1 hover:border-pink-700 hover:shadow-[0_10px_25px_rgba(255,45,85,0.15)] active:scale-[0.98] transition-all duration-300 px-14 py-9 rounded-full font-black text-xl h-auto">
                Learn More About Us
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
