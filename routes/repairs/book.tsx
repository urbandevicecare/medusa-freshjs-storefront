import { Head, Partial } from "fresh/runtime";
import BookRepairIsland from "./(_islands)/BookRepairIsland.tsx";
import RepairHistorySidebarIsland from "./(_islands)/RepairHistorySidebarIsland.tsx";
import { define, STORE_NAME } from "../../lib/utils.ts";
import { page } from "fresh";

export const handler = define.handlers({
  GET(ctx) {
    const isLoggedIn = Boolean((ctx.state as any).isLoggedIn);
    if (!isLoggedIn) {
      return new Response(null, {
        status: 302,
        headers: { Location: "/account/login?redirect=/repairs/book" },
      });
    }
    return page({});
  },
});

export default define.page(function BookRepairRoute(props) {
  return (
    <>
      <Head>
        <title>Book a Repair | {STORE_NAME}</title>
        <meta
          name="description"
          content="Initiate a device for repair and get a pickup."
        />
        <meta property="og:title" content={`Book a Repair | ${STORE_NAME}`} />
        <meta
          property="og:description"
          content="Initiate a device for repair and get a pickup."
        />
        <meta name="view-transition" content="same-origin" />
      </Head>
      <Partial name="repair-content">
        <div class="route-container max-w-7xl mx-auto px-4 md:px-8 py-16 md:py-24">
          <div class="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20">
            {/* Left Col: Form */}
            <div class="lg:col-span-8">
              <div class="mb-12 border-b border-black pb-8">
                <h1 class="text-5xl md:text-7xl font-[Oswald] uppercase tracking-tighter leading-none text-slate-900 mb-6">
                  Book a Repair
                </h1>
                <p class="text-xl font-serif italic text-slate-500 max-w-2xl">
                  Provide your device details and we'll get it fixed as soon as
                  possible.
                </p>
              </div>
              <BookRepairIsland />
            </div>

            {/* Right Col: Drawer / Sidebar */}
            <div class="lg:col-span-4 border-t lg:border-t-0 lg:border-l border-slate-200 pt-12 lg:pt-0 lg:pl-12">
              <div class="sticky top-24">
                <h3 class="text-sm font-bold uppercase tracking-widest text-slate-900 mb-8 border-b border-slate-200 pb-4">
                  Your Repair History
                </h3>
                <RepairHistorySidebarIsland />
              </div>
            </div>
          </div>
        </div>
      </Partial>
    </>
  );
});
