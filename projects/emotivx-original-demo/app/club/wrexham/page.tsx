// 🚧 Club-facing portal (what Wrexham staff see when they log in)
// Redirect to staff dashboard for now
import { redirect } from "next/navigation";
export default function WrexhamClubPage() {
  redirect("/staff/dashboard");
}
