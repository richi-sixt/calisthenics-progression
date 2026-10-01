import Image from "next/image";

/**
 * Logo above a title, scaled to exactly the title's width: the image has no
 * intrinsic width contribution (w-0), so the wrapper is as wide as the
 * title text, and min-w-full stretches the logo to that width.
 */
export function BrandLogo({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-block">
      <Image
        src="/icon-512.png"
        alt=""
        width={512}
        height={512}
        priority
        className="mb-4 h-auto w-0 min-w-full"
      />
      {children}
    </div>
  );
}
