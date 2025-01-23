"use client";

import { cn } from "@/lib/utils";
import { HTMLMotionProps } from "motion/react";
import { AnimatePresence, motion } from "motion/react";
import React, { useState, useEffect } from "react";

interface AnimatedSubscribeButtonProps
  extends Omit<HTMLMotionProps<"button">, "ref"> {
  subscribeStatus?: boolean;
  children: React.ReactNode;
  className?: string;
  duration?: number; // Duration for the second child to be displayed (in milliseconds)
  subscribedBgColor?: string; // Background color for the second (subscribed) state
}

export const AnimatedSubscribeButton = React.forwardRef<
  HTMLButtonElement,
  AnimatedSubscribeButtonProps
>(
  (
    {
      subscribeStatus = false,
      onClick,
      className,
      children,
      duration = 300,
      subscribedBgColor = "bg-green-500", // Default background color for "subscribed" state
      ...props
    },
    ref
  ) => {
    const [isSubscribed, setIsSubscribed] = useState<boolean>(subscribeStatus);
    const [isVisible, setIsVisible] = useState<boolean>(false);

    useEffect(() => {
      let timer: NodeJS.Timeout;

      if (isSubscribed) {
        // When the subscribed state is active, start a timer to automatically switch back after `duration`
        setIsVisible(true);
        timer = setTimeout(() => {
          setIsVisible(false); // Start transitioning the second child out
          setTimeout(() => {
            setIsSubscribed(false); // After the second child exits, revert back to the unsubscribed state
          }, 200); // Small delay to let the exit animation finish
        }, duration);
      } else {
        setIsVisible(false); // Ensure the second child is hidden immediately if not subscribed
      }

      return () => clearTimeout(timer); // Cleanup timer if the component unmounts or changes state
    }, [isSubscribed, duration]);

    if (
      React.Children.count(children) !== 2 ||
      !React.Children.toArray(children).every(
        (child) => React.isValidElement(child) && child.type === "span"
      )
    ) {
      throw new Error(
        "AnimatedSubscribeButton expects two children, both of which must be <span> elements."
      );
    }

    const childrenArray = React.Children.toArray(children);
    const initialChild = childrenArray[0];
    const changeChild = childrenArray[1];

    return (
      <AnimatePresence mode="wait">
        {isSubscribed && isVisible ? (
          <motion.button
            ref={ref}
            className={cn(
              "relative flex h-10 w-fit items-center justify-center overflow-hidden rounded-lg px-6 text-primary-foreground",
              subscribedBgColor, // Apply the background color for "subscribed" state
              className
            )}
            onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
              setIsSubscribed(false);
              setIsVisible(false); // Immediately hide the second child when clicking again
              onClick?.(e);
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            {...props}
          >
            <motion.span
              key="action"
              className="relative flex h-full w-full items-center justify-center font-semibold"
              initial={{ y: -50 }}
              animate={{ y: 0 }}
              exit={{
                opacity: 0,
                transition: { duration: 0.2 }, // Animate the exit of the "subscribed" state
              }}
            >
              {changeChild} {/* Show "subscribed" state */}
            </motion.span>
          </motion.button>
        ) : (
          <motion.button
            ref={ref}
            className={cn(
              "relative flex h-10 w-fit cursor-pointer items-center justify-center rounded-lg border-none bg-primary px-6 text-primary-foreground",
              className
            )}
            onClick={(e) => {
              setIsSubscribed(true);
              onClick?.(e);
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            {...props}
          >
            <motion.span
              key="reaction"
              className="relative flex items-center justify-center font-semibold"
              initial={{ y: 50 }} // Same animation for both states
              animate={{ y: 0 }} // Animate the "subscribe" state into place
              exit={{
                y: 50,
                transition: { duration: 0.1 },
              }}
            >
              {initialChild} {/* Show "subscribe" state */}
            </motion.span>
          </motion.button>
        )}
      </AnimatePresence>
    );
  }
);

AnimatedSubscribeButton.displayName = "AnimatedSubscribeButton";
