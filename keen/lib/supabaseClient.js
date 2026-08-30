"use client";
import { createBrowserClient } from "@supabase/ssr";

let client = null;

// Created lazily so a build without env vars present doesn't fail at import time.
export function sb() {
  if (!client) {
    client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
  }
  return client;
}
