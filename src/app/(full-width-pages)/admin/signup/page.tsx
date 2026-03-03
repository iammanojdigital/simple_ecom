import SignUpForm from "@/components/auth/SignUpForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Sign Up",
  description: "Admin registration page",
};

export default function AdminSignUpPage() {
  return <SignUpForm />;
}

