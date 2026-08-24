import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import HomeClient from "./components/HomeClient";

export default async function Home() {
  if (!(await isAuthenticated())) {
    redirect("/signin");
  }
  return <HomeClient />;
}
