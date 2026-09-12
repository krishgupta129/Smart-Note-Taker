import Sidebar from "@/components/dashboard/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-[#f9f9f9]">
      <Sidebar />
      <main className="ml-72 min-h-screen flex-1 flex justify-center pt-10 pb-10">
        {children}
      </main>
    </div>
  );
}