"use client";

import { useEffect, useState } from "react";
import { CheckCircle, XCircle, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default function VerifyEmailPage() {
  // Get token from URL without useSearchParams
  const [token, setToken] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("token");
    setToken(t);
  }, []);

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Invalid verification link. Please check your email for the correct link.");
      return;
    }

    const verifyEmail = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/verify-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ token }),
        });

        const data = await response.json();

        if (data.success) {
          setStatus("success");
          setMessage(data.message || "Email verified successfully! You can now login.");
        } else {
          setStatus("error");
          setMessage(data.message || "Failed to verify email. The link may have expired.");
        }
      } catch {
        setStatus("error");
        setMessage("Something went wrong. Please try again later.");
      }
    };

    verifyEmail();
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-cream via-white to-sage/10 py-12 px-4">
      <Card className="w-full max-w-md rounded-2xl border-sand/30 shadow-xl">
        <CardContent className="pt-8 pb-8 text-center">
          {status === "loading" && (
            <>
              <div className="w-20 h-20 bg-sage/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Loader2 className="h-10 w-10 text-sage animate-spin" />
              </div>
              <h1 className="text-2xl font-display font-bold text-forest mb-2">
                Verifying Your Email
              </h1>
              <p className="text-sage">Please wait while we verify your email address...</p>
            </>
          )}

          {status === "success" && (
            <>
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>
              <h1 className="text-2xl font-display font-bold text-forest mb-2">Email Verified!</h1>
              <p className="text-sage mb-6">{message}</p>
              <Link href="/login">
                <Button className="w-full rounded-xl bg-gradient-to-r from-forest to-forest-light hover:shadow-lg">
                  <Mail className="h-4 w-4 mr-2" />
                  Go to Login
                </Button>
              </Link>
            </>
          )}

          {status === "error" && (
            <>
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <XCircle className="h-10 w-10 text-red-600" />
              </div>
              <h1 className="text-2xl font-display font-bold text-forest mb-2">
                Verification Failed
              </h1>
              <p className="text-sage mb-6">{message}</p>
              <div className="space-y-3">
                <Link href="/register">
                  <Button variant="outline" className="w-full rounded-xl">
                    Register Again
                  </Button>
                </Link>
                <Link href="/login">
                  <Button className="w-full rounded-xl bg-gradient-to-r from-forest to-forest-light">
                    Go to Login
                  </Button>
                </Link>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
