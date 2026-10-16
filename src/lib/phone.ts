const callingCodes = new Set(
  `1 7 20 27 30 31 32 33 34 36 39 40 41 43 44 45 46 47 48 49
  51 52 53 54 55 56 57 58 60 61 62 63 64 65 66 81 82 84 86 90 91 92 93 94 95 98
  211 212 213 216 218 220 221 222 223 224 225 226 227 228 229 230 231 232 233 234 235 236 237 238 239 240 241 242 243 244 245 246 248 249 250 251 252 253 254 255 256 257 258 260 261 262 263 264 265 266 267 268 269
  290 291 297 298 299
  350 351 352 353 354 355 356 357 358 359 370 371 372 373 374 375 376 377 378 380 381 382 383 385 386 387 389
  420 421 423
  500 501 502 503 504 505 506 507 508 509
  590 591 592 593 594 595 596 597 598 599
  670 672 673 674 675 676 677 678 679 680 681 682 683 685 686 687 688 689 690 691 692
  800 808 850 852 853 855 856 870 878 880 881 882 883 886 888 960 961 962 963 964 965 966 967 968 970 971 972 973 974 975 976 977 979 992 993 994 995 996 998`
    .trim()
    .split(/\s+/),
);

export const phoneCountries = [
  { code: "NI", name: "Nicaragua", callingCode: "505" },
  { code: "HN", name: "Honduras", callingCode: "504" },
  { code: "MX", name: "México", callingCode: "52" },
  { code: "CO", name: "Colombia", callingCode: "57" },
  { code: "CR", name: "Costa Rica", callingCode: "506" },
  { code: "SV", name: "El Salvador", callingCode: "503" },
  { code: "GT", name: "Guatemala", callingCode: "502" },
  { code: "PA", name: "Panamá", callingCode: "507" },
  { code: "BZ", name: "Belice", callingCode: "501" },
  { code: "DO", name: "República Dominicana", callingCode: "1" },
  { code: "ES", name: "España", callingCode: "34" },
  { code: "AR", name: "Argentina", callingCode: "54" },
  { code: "BO", name: "Bolivia", callingCode: "591" },
  { code: "BR", name: "Brasil", callingCode: "55" },
  { code: "CL", name: "Chile", callingCode: "56" },
  { code: "EC", name: "Ecuador", callingCode: "593" },
  { code: "PY", name: "Paraguay", callingCode: "595" },
  { code: "PE", name: "Perú", callingCode: "51" },
  { code: "UY", name: "Uruguay", callingCode: "598" },
  { code: "VE", name: "Venezuela", callingCode: "58" },
  { code: "US", name: "Estados Unidos", callingCode: "1" },
  { code: "CA", name: "Canadá", callingCode: "1" },
  { code: "GB", name: "Reino Unido", callingCode: "44" },
  { code: "FR", name: "Francia", callingCode: "33" },
  { code: "DE", name: "Alemania", callingCode: "49" },
  { code: "IT", name: "Italia", callingCode: "39" },
  { code: "PT", name: "Portugal", callingCode: "351" },
  { code: "IN", name: "India", callingCode: "91" },
  { code: "JP", name: "Japón", callingCode: "81" },
  { code: "AU", name: "Australia", callingCode: "61" },
] as const;

/** Keeps E.164 numbers with a currently allocated international calling code. */
export function normalizePhone(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 15) return null;
  if (![1, 2, 3].some((length) => callingCodes.has(digits.slice(0, length)))) return null;
  return digits;
}

/** Accounts are keyed by phone; auth needs an email so we derive one. */
export function phoneToEmail(phone: string): string {
  return `${phone}@phone.chatline.app`;
}

export function formatPhone(phone: string): string {
  return `+${phone}`;
}
