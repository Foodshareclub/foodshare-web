'use client';

import React, { useState } from "react";
import { useSearchParams } from "next/navigation";
import stars from "@/assets/starsForPopup.webp";
import calendar from "@/assets/image 22.png";
import likeUp from "@/assets/likeUp.svg";
import strawberry from "@/assets/clubnika-min.webp";

import { StarIcon } from "@/utils/icons";
import { useAuth } from "@/hooks/useAuth";
import { useWriteReview } from "@/hooks/queries/useChatQueries";
import { GlassDialogContent } from "@/components/Glass";
import { GlassButton } from "@/components/Glass";
import { Dialog, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type ModalType = {
  isOpen: boolean;
  onClose: () => void;
};
type FeedBackType = {
  id?: number;
  reviewed_rating: number;
  profile_id: string;
  post_id: number;
  forum_id?: number;
  challenge_id?: number;
  feedback: string;
};

/**
 * PopupNotificationModal Component
 * Modal for leaving feedback after a successful exchange
 * Uses React Query instead of Redux for review submission
 */
const PopupNotificationModal: React.FC<ModalType> = ({ isOpen, onClose }) => {
  const searchParams = useSearchParams();

  // Auth and review mutation from React Query (replaces Redux)
  const { user } = useAuth();
  const userID = user?.id;
  const writeReview = useWriteReview();

  const sharerId = searchParams?.get("s") as string;
  const postId = searchParams?.get("p") as string;
  const requesterId = searchParams?.get("r") as string;

  const initialRef = React.useRef(null);
  const finalRef = React.useRef(null);
  const [numberM, setNumberM] = useState<"first" | "second" | "third" | "fourth">("second");
  const [value, setValue] = useState(0);
  const [textArea, setTextArea] = useState("");

  const click = async () => {
    numberM === "second" && setNumberM("third");
    if (numberM === "third") {
      const feedback: FeedBackType = {
        reviewed_rating: Number(value),
        profile_id: sharerId === userID ? requesterId : sharerId,
        post_id: Number(postId),
        feedback: textArea,
      };
      await writeReview.mutateAsync(feedback);
      setNumberM("fourth");
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open: boolean) => {
        if (!open) {
          onClose();
          setNumberM("second");
        }
      }}
    >
      <GlassDialogContent>
        <DialogHeader>
          {numberM === "first" && (
            <DialogTitle className="text-lg text-center">
              "Say a day & time"
            </DialogTitle>
          )}

          {numberM === "second" && (
            <DialogTitle className="pt-4 text-base text-center">
              "Congratulations, you guys made it!"
            </DialogTitle>
          )}
          {numberM === "fourth" && (
            <DialogTitle className="pt-4 text-base text-center">
              "Thank you for your feedback it's very important for us!"
            </DialogTitle>
          )}
        </DialogHeader>

        <div className="pb-6 pt-0">
          {numberM === "first" && (
            <img className="m-auto w-[200px]" src={calendar.src} alt="calendar" loading="lazy" decoding="async" />
          )}
          {numberM === "fourth" && (
            <img className="m-auto w-[200px]" src={strawberry.src} alt="strawberry" loading="lazy" decoding="async" />
          )}
          {numberM === "second" && (
            <>
              <img className="object-cover h-20 m-auto mb-2.5 w-[250px]" src={stars.src} alt="stars" loading="lazy" decoding="async" />
              <p className="font-medium text-center">
                "Would you like to leave feedback?"
              </p>
            </>
          )}
          {numberM === "third" && (
            <>
              <div className="flex justify-center">
                {Array(5)
                  .fill("")
                  .map((item, i) => (
                    <StarIcon
                      size={40}
                      onClick={() => setValue(i + 1)}
                      key={i}
                      color={i < value ? "#319795" : "#D1D5DB"}
                      cursor="pointer"
                    />
                  ))}
              </div>
              <textarea
                value={textArea}
                onChange={(e) => setTextArea(e.currentTarget.value)}
                className="mt-5 flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder="Please write smth."
              />
            </>
          )}
          {(numberM === "second" || numberM === "third") && (
            <GlassButton
              variant="accentOrange"
              className={`block mx-auto mt-5 uppercase ${
                numberM === "second" ? "h-[55px] rounded-full" : "h-10 rounded-lg"
              }`}
              onClick={click}
            >
              {numberM === "second" ? "yes" : "send"}
            </GlassButton>
          )}
          {numberM === "first" && (
            <div>
              <div className="flex">
                <img className="pt-2 self-start mr-2 w-4" src={likeUp} alt="like up" />
                <p>
                  Make sure to say when you can pick this up in your first message It will
                  significantly increase your chances of getting it.
                </p>
              </div>
              <div className="flex mt-4">
                <img className="pb-2 mr-2 w-4 rotate-180" src={likeUp} alt="like down" />
                <p>Requesting delivery/mailing isn't allowed.</p>
              </div>
            </div>
          )}
        </div>
      </GlassDialogContent>
    </Dialog>
  );
};

export default PopupNotificationModal;
