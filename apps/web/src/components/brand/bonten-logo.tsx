import { type SVGProps } from 'react';

/**
 * BONTEN — símbolo. Emblema angular em laranja: asas superiores com canal
 * central em "V", corpo em "M" e quatro apoios inferiores. Original, sem
 * gradiente, funciona sobre qualquer fundo (uma única cor).
 * (Seção 2 — logotipo)
 */
export function BontenMark({
  size = 32,
  ...props
}: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="BONTEN"
      {...props}
    >
      <path
        d="M12 12L30 21L32 34L34 21L52 12L52 22L44 18L44 26L52 30L52 54L42 54L42 40L38 40L38 54L34 54L32 40L30 54L26 54L26 40L22 40L22 54L12 54L12 30L20 26L20 18L12 22Z"
        fill="currentColor"
      />
    </svg>
  );
}

/**
 * Logotipo horizontal: símbolo + wordmark "BONTEN".
 */
export function BontenLogo({
  size = 28,
  className = '',
  showWordmark = true,
}: {
  size?: number;
  className?: string;
  showWordmark?: boolean;
}) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <BontenMark size={size} className="text-brand" />
      {showWordmark && (
        <span
          className="text-fg font-semibold tracking-tight"
          style={{ fontSize: size * 0.72, lineHeight: 1 }}
        >
          BONTEN
        </span>
      )}
    </span>
  );
}