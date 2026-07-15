// Real eSIM activation strings use the LPA format the phone's camera expects.
// Kept in a plain (non-"use client") module so both server and client
// components can call it.
export function esimLpaString(token: string): string {
  return `LPA:1$smdp.konek.app$${token}`;
}
