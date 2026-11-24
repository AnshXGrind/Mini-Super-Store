import Image from "next/image";

export default function StoreLogo() {
  return (
    <span className="brand-logo-container" aria-hidden="true">
      <Image
        src="/icon.svg"
        alt=""
        width={44}
        height={44}
        priority
        className="brand-logo-image"
      />
    </span>
  );
}
