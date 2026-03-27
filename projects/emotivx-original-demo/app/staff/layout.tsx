import StaffNav from "@/components/staff/StaffNav";

export const metadata = {
  title: "EmotivX — Staff Dashboard",
  description: "Staff administration panel for EmotivX platform.",
};

export default function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <StaffNav />
      <div className="mx-auto max-w-6xl px-6 py-8">{children}</div>
    </>
  );
}
