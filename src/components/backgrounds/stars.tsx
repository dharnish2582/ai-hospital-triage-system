"use client";

import { motion } from "motion/react";

export function StarsBackground({
  className,
  starColor = "#FFF"
}: {
  className?: string;
  starColor?: string;
}) {

  const stars = Array.from({ length: 40 });

  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`}>

      {stars.map((_, i) => (

        <motion.div
          key={i}
          className="absolute w-[2px] h-[2px] rounded-full"
          style={{
            backgroundColor: starColor,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`
          }}
          animate={{
            opacity: [0, 1, 0],
            scale: [1, 1.5, 1]
          }}
          transition={{
            duration: 2 + Math.random() * 2,
            repeat: Infinity,
            delay: Math.random() * 2
          }}
        />

      ))}

    </div>
  );
}