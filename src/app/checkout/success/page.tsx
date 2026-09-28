import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import Link from "next/link";
import OrderStatusPoller from "@/components/order-status-poller";

export const dynamic = "force-dynamic";

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ order_id?: string }>;
}) {
  const { order_id } = await searchParams;

  return (
    <>
      <Navbar />
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {order_id ? (
            <OrderStatusPoller orderId={order_id} />
          ) : (
            <div className="rounded-xl border border-gray-200 bg-white p-6 text-center">
              <p className="text-brand-muted">No order reference found.</p>
              <Link href="/events" className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-brand-blue px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark">
                Back to Events
              </Link>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
