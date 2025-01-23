"use client";
import { useState, useEffect } from "react";
import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  const [isClient, setIsClient] = useState(false);

  // useEffect(() => {
  //   setIsClient(true); // Set to true when client-side is ready
  // }, []);
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
