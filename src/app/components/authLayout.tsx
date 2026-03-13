"use client";
import Image from "next/image";
import { PropsWithChildren } from "react";


export default function AuthLayout({ children }: PropsWithChildren) {
  return (
    <div className="grid h-dvh grid-cols-1 md:grid-cols-[1fr_1fr]">
      {/* Lado esquerdo (banner) */}
      <div className="relative hidden md:block bg-cyco-light">
        <div className="absolute inset-0 bg-gradient-to-b from-cyco-light to-white" />
        <Image alt="Banner" src="/Banner.png" fill></Image>
      </div>


      {/* Lado direito (form) */}
      <div className="flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
