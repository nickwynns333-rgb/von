import DashboardLayout from "@/components/DashboardLayout";
import PageHeader, { type PageHeaderProps } from "@/components/PageHeader";

interface PageShellProps extends PageHeaderProps {
  children: React.ReactNode;
  noPadding?: boolean;
  maxWidth?: string;
}

/**
 * Standard page wrapper: DashboardLayout + blue gradient PageHeader + white content area.
 * Use this for every back-office page to keep the look consistent.
 */
export default function PageShell({
  children,
  noPadding = false,
  maxWidth = "max-w-7xl",
  ...headerProps
}: PageShellProps) {
  return (
    <DashboardLayout>
      <div className="min-h-full flex flex-col bg-[#F5F7FA]">
        <PageHeader {...headerProps} />
        <div className={`flex-1 ${noPadding ? "" : `${maxWidth} mx-auto w-full px-6 py-6`}`}>
          {children}
        </div>
      </div>
    </DashboardLayout>
  );
}
