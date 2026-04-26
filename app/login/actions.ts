"use server";

import { redirect } from "next/navigation";
import { checkPassword } from "@/src/lib/check-password";
import { getSession } from "@/src/lib/session";

export async function loginAction(formData: FormData) {
  const submitted = formData.get("password")?.toString() ?? "";
  const expected = process.env.STAFF_PASSWORD ?? "";

  if (!checkPassword(submitted, expected)) {
    redirect("/login?error=1");
  }

  const session = await getSession();
  session.authenticated = true;
  await session.save();
  redirect("/dashboard");
}
