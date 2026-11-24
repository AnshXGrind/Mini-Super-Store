import Image from "next/image";

export default function StoreLogo({ size = 44 }: { size?: number }) {
  return (
    <span
      className="brand-logo-container"
      aria-hidden="true"
      style={{ width: size, height: size, flexBasis: size }}
    >
      <Image
        src="/icon.svg"
        alt=""
        width={size}
        height={size}
        className="brand-logo-image"
      />
    </span>
  );
}
