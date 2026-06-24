import type { CSSProperties, DetailedHTMLProps, HTMLAttributes } from "react";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "dotlottie-wc": DetailedHTMLProps<
        HTMLAttributes<HTMLElement> & {
          src?: string;
          autoplay?: boolean;
          loop?: boolean;
          style?: CSSProperties;
        },
        HTMLElement
      >;
    }
  }
}

export {};
