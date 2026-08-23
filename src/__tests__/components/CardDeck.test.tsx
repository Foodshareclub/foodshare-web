import { describe, it, expect, mock, beforeAll, afterEach } from "bun:test";
import React from "react";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { CardDeck } from "@/components/modals/challenge-reveal/CardDeck";
import type { InitialProductStateType } from "@/types/product.types";

// Setup DOM for bun test
beforeAll(() => {
  if (typeof window === "undefined") {
    GlobalRegistrator.register();
  }
});

afterEach(() => {
  cleanup();
});

// We need to mock next/image because it throws an invalid URL error in happy-dom
mock.module("next/image", () => ({
  default: ({ src, alt, ...props }: any) => <img src={src} alt={alt} {...props} />,
}));

// We need to mock framer-motion to simplify testing components that use it heavily
mock.module("framer-motion", () => {
  const React = require("react");
  const AnimatePresence = ({ children }: any) => <>{children}</>;
  const motion = {
    div: React.forwardRef(
      (
        {
          children,
          _animate,
          _initial,
          _exit,
          _variants,
          _style,
          _onMouseEnter,
          _onMouseLeave,
          _onClick,
          _onKeyDown,
          _whileHover,
          _whileTap,
          _drag,
          _dragConstraints,
          _dragElastic,
          _onDragEnd,
          ...props
        }: any,
        ref: any
      ) => (
        <div ref={ref} {...props}>
          {children}
        </div>
      )
    ),
    button: React.forwardRef(
      (
        { children, _animate, _initial, _exit, _variants, _whileHover, _whileTap, ...props }: any,
        ref: any
      ) => (
        <button ref={ref} {...props}>
          {children}
        </button>
      )
    ),
    img: React.forwardRef(({ _children, ...props }: any, ref: any) => <img ref={ref} {...props} />),
  };
  const createMotionValue = () => ({
    get: () => 0,
    set: () => {},
    onChange: () => () => {},
    on: () => () => {},
  });
  return {
    AnimatePresence,
    motion,
    useReducedMotion: () => true,
    useAnimation: () => ({ start: mock(() => Promise.resolve()) }),
    useMotionValue: createMotionValue,
    useTransform: createMotionValue,
    useMotionValueEvent: () => {},
    animate: () => Promise.resolve(),
  };
});

const mockChallenges = [
  { id: "1", post_name: "Challenge One", post_content: "Content 1", metadata: {} },
  { id: "2", post_name: "Challenge Two", post_content: "Content 2", metadata: {} },
  { id: "3", post_name: "Challenge Three", post_content: "Content 3", metadata: {} },
] as unknown as InitialProductStateType[];

describe("CardDeck Interactions", () => {
  it("renders the active challenge first", () => {
    render(<CardDeck challenges={mockChallenges} activeChallenge={mockChallenges[0]} />);

    // Active challenge is rendered
    expect(screen.getByText("Challenge One")).toBeTruthy();
    // 3 challenges remaining text
    expect(screen.getByText("3")).toBeTruthy();
  });

  it("calls onAccept and advances index when accept button is clicked", async () => {
    const user = userEvent.setup();
    const onAcceptMock = mock(() => {});

    render(
      <CardDeck
        challenges={mockChallenges}
        activeChallenge={mockChallenges[0]}
        onAccept={onAcceptMock}
      />
    );

    const acceptButton = screen.getByLabelText("Accept challenge");
    await user.click(acceptButton);

    // onAccept should be called with the ID of the first challenge
    expect(onAcceptMock).toHaveBeenCalledWith("1");

    // Wait for internal 50ms setTimeout to advance the index
    await new Promise((resolve) => setTimeout(resolve, 60));

    // The deck should now have 2 remaining
    expect(screen.getByText("2")).toBeTruthy();
    expect(screen.queryByText("Challenge One")).toBeNull();
  });

  it("shows empty state when all challenges are consumed", async () => {
    const user = userEvent.setup();
    render(
      <CardDeck challenges={mockChallenges.slice(0, 1)} activeChallenge={mockChallenges[0]} />
    );

    const skipButton = screen.getByLabelText("Skip challenge");
    await user.click(skipButton);

    await new Promise((resolve) => setTimeout(resolve, 60));

    // Should display the empty state
    expect(screen.getByText("All Caught Up!")).toBeTruthy();
  });
});
