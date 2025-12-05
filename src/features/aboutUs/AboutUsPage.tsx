import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";

import { PersonCard } from "@/components";
import { teamMockArray } from "@/utils";
import kitchen from "../../assets/Foodies Soup Kitchen.png";
import company from "../../assets/AvoAcademy.png";
import { MotionBox, MotionGrid, MotionGridItem } from "./MotionComponents";
import { AnimatedGradientBackground, FloatingOrbs } from "./BackgroundEffects";
import { AnimatedHeader } from "./AnimatedHeader";
import { AnimatedContactButton } from "./AnimatedContactButton";
import { EnhancedImage } from "./components";

const AboutUsPage = () => {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="px-7 xl:px-20 py-7 mt-[18vh] pb-10 relative overflow-hidden">
      <AnimatedGradientBackground />
      <FloatingOrbs />

      <AnimatedHeader mt={8} mb={10} animationDuration="5s">
        "About Us"
      </AnimatedHeader>

      <MotionGrid
        className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 max-w-[1400px] mx-auto items-center pt-8"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
      >
        <MotionGridItem
          className="w-full flex items-center justify-center"
          initial={{ opacity: 0, x: -100 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, type: "spring" }}
        >
          {!isLoaded ? (
            <div className="w-full max-w-[500px] h-[400px] rounded-2xl bg-gray-300 dark:bg-gray-700 animate-pulse" />
          ) : (
            <MotionBox whileHover={{ scale: 1.02 }} transition={{ duration: 0.3 }}>
              <EnhancedImage
                src={kitchen.src}
                alt="Foodshare community kitchen"
                w="100%"
                maxW="500px"
                borderRadius="2xl"
                shadow="2xl"
                border="4px solid"
                borderColor="white"
                _dark={{ borderColor: "gray.700" }}
              />
            </MotionBox>
          )}
        </MotionGridItem>

        <MotionGridItem
          className="w-full"
          initial={{ opacity: 0, x: 100 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, type: "spring" }}
        >
          <div className="glass rounded-xl p-6 h-full transition-shadow duration-300 hover:shadow-[0_20px_40px_-12px_rgba(255,99,71,0.2)]">
            <div className="flex flex-col gap-8">
              {[
                "Foodshare was founded in 2022 by Tarlan and a passionate team of three. Our vision was simple: create an easy-to-use, cross-platform mobile app that connects communities through food sharing.",
                "Our app empowers everyone to share surplus food items from their fridge, pantry, or local shops. Whether it's vegetables nearing their best-by date, fresh bread from the bakery, or items you simply won't use—our community can pick them up for free.",
                "Together, we're building a sustainable future where food waste is minimized, communities are strengthened, and everyone has access to nutritious food. Join us in making a difference, one shared meal at a time.",
              ].map((text, idx) => (
                <MotionBox
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.2, duration: 0.6 }}
                >
                  <p className="text-base md:text-lg leading-[1.9] text-gray-700 dark:text-gray-300 font-normal">
                    "{text}"
                  </p>
                </MotionBox>
              ))}
            </div>
          </div>
        </MotionGridItem>
      </MotionGrid>

      <AnimatedHeader animationDuration="6s">
        "Meet Our Team"
      </AnimatedHeader>

      <div
        className="max-w-[1600px] mx-auto px-6 sm:px-8 md:px-12 py-4 md:py-6"
        {...{
          as: motion.div,
          initial: { opacity: 0 },
          whileInView: { opacity: 1 },
          viewport: { once: true },
          transition: { duration: 0.6 },
        }}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-x-6 sm:gap-x-8 md:gap-x-12 gap-y-8 sm:gap-y-10 md:gap-y-8">
          {teamMockArray.map((el, id) => (
            <PersonCard
              name={el.name}
              secondName={""}
              img={el.img}
              role={el.exp}
              index={id}
              key={id}
            />
          ))}
        </div>
      </div>

      <AnimatedHeader mt={20} animationDuration="7s" delay={1}>
        "Design Tribute"
      </AnimatedHeader>

      <div className="glass rounded-xl p-6 max-w-[1200px] mx-auto mb-10 transition-shadow duration-300 hover:shadow-[0_30px_60px_-12px_rgba(255,99,71,0.25)]">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center">
          <MotionGridItem
            className="w-full"
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, duration: 0.8 }}
          >
            <EnhancedImage
              src={company.src}
              alt="Avocademy Logo"
              m="0 auto"
              maxW={{ base: "250px", md: "300px" }}
              glowColor="rgba(134, 239, 172, 0.4)"
            />
          </MotionGridItem>

          <div className="w-full">
            <div className="flex flex-col gap-6">
              {[
                "An educational platform that helps people change careers into the UX/UI design field through an affordable and short curriculum. Website: https://www.Avocademy.com",
                "Thank you very much their awesome team that has helped Foodshare to build a beautiful UI/UX design :)",
              ].map((text, idx) => (
                <MotionBox
                  key={idx}
                  initial={{ opacity: 0, x: 50 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 + idx * 0.2, duration: 0.8 }}
                >
                  <p className="text-base md:text-lg leading-[1.8] text-gray-700 dark:text-gray-300">
                    "{text}"
                  </p>
                </MotionBox>
              ))}
            </div>
          </div>
        </div>
      </div>

      <AnimatedContactButton />
    </div>
  );
};

export default AboutUsPage;
