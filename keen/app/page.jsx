"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { sb } from "../lib/supabaseClient";

export default function Home() {
  const router = useRouter();
  useEffect(() => {
    (async () => {
      const { data: { session } } = await sb().auth.getSession();
      if (!session) return router.replace("/login");
      const { data: profile } = await supabase
        .from("profiles").select("role").eq("id", session.user.id).single();
      if (profile?.role === "admin") router.replace("/teacher");
      else if (profile?.role === "student" || profile?.role === "parent") router.replace("/me");
      else router.replace("/pending");
    })();
  }, [router]);
  return null;
}
