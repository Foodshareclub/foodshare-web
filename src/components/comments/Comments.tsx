import React from "react";
import Image from "next/image";
import { StarIcon } from "@/utils/icons";

type PropsCommentsType = {
  name: string;
  img: string;
  rating: number;
  comment: string;
  date: string | number;
};

// React Compiler handles memoization automatically
function Comments({ date, name, img, rating, comment }: PropsCommentsType) {
  return (
    <div className="glass rounded-xl p-4 mt-4 mb-4 transition-all duration-300 ease-in-out hover:-translate-y-0.5 hover:shadow-[0_8px_16px_rgba(0,0,0,0.1)]">
      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <div className="ml-2 relative w-12 h-12">
          <Image src={img} alt={name} fill className="rounded-full object-cover" sizes="48px" />
        </div>
        <div className="flex-1 flex flex-col gap-2">
          <h4 className="text-sm font-semibold">{name}</h4>
          <div className="flex gap-1">
            {Array(5)
              .fill("")
              .map((_, i) => (
                <StarIcon key={i} color={i < rating ? "#ECC94B" : "#D1D5DB"} />
              ))}
          </div>
          <p className="text-sm text-muted-foreground">{date}</p>
          <p className="text-base">{comment}</p>
        </div>
      </div>
    </div>
  );
}

export default Comments;
