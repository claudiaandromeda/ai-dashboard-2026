import ClubNav from "@/components/club/ClubNav";

export const metadata = {
  title: "EmotivX — Club Portal",
  description: "Club administration portal for EmotivX platform.",
};

export default function ClubLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <ClubNav />
      <div className="mx-auto max-w-6xl px-6 py-8">{children}</div>
    </>
  );
}
