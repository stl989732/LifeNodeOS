import Color from "@tiptap/extension-color";
import { FontFamily, TextStyle } from "@tiptap/extension-text-style";
import Highlight from "@tiptap/extension-highlight";
import Underline from "@tiptap/extension-underline";
import StarterKit from "@tiptap/starter-kit";
import { VaultFontSize } from "@/src/components/pro/vault/fontSizeExtension";

export function getProVaultExtensions() {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
    }),
    Underline,
    TextStyle,
    VaultFontSize,
    Color.configure({ types: ["textStyle"] }),
    FontFamily.configure({ types: ["textStyle"] }),
    Highlight.configure({ multicolor: true }),
  ];
}
