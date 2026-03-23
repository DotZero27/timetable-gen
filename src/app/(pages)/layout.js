import { NavBar } from "@/components/layout/NavBar";

export default function PagesLayout({ children }) {
  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </>
  );
}
