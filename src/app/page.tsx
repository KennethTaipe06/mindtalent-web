"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated, getUser } from "@/lib/auth";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }

    const user = getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    switch (user.role) {
      case "SUPER_ADMIN":
      case "ADMIN":
        router.push("/admin");
        break;
      case "EXAMINER":
        router.push("/examiner");
        break;
      case "CANDIDATE":
        router.push("/candidate");
        break;
      case "AUDITOR":
        router.push("/auditor");
        break;
      default:
        router.push("/login");
    }
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  );
}
