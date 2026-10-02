import { define, STORE_NAME } from "../../lib/utils.ts";
import { Head, Partial } from "fresh/runtime";
import TrackRepairIsland from "./(_islands)/TrackRepairIsland.tsx";
import { page } from "fresh";

export const handler = define.handlers({
  async GET(ctx) {
    const backendUrl = Deno.env.get("MEDUSA_BACKEND_URL")!;
    const publishableKey = Deno.env.get("MEDUSA_PUBLISHABLE_KEY") || "";
    let paystackPublicKey = Deno.env.get("PAYSTACK_PUBLIC_KEY") || "";

    // Fetch settings from backend to get dynamic Paystack key
    try {
      const res = await fetch(`${backendUrl}/store/repairs/settings`, {
        headers: {
          "x-publishable-api-key": publishableKey,
        },
      });
      if (res.ok) {
        const data = await res.json();
        if (
          data.settings?.paystack_enabled && data.settings?.paystack_public_key
        ) {
          paystackPublicKey = data.settings.paystack_public_key;
        }
      }
    } catch (e) {
      console.error("Failed to fetch repair settings from backend:", e);
    }

    const isLoggedIn = Boolean((ctx.state as any).isLoggedIn);

    return page({ backendUrl, publishableKey, paystackPublicKey, isLoggedIn });
  },
});

export default define.page(function TrackRepairRoute(props) {
  const { backendUrl, publishableKey, paystackPublicKey, isLoggedIn } =
    props.data;
  const token = props.url.searchParams.get("token") || "";
  const ticket = props.url.searchParams.get("ticket") ||
    props.url.searchParams.get("serial") || "";
  const action = props.url.searchParams.get("action") || "";

  console.debug(
    `[TrackRepairRoute] Rendered with backendUrl: ${backendUrl}, isLoggedIn: ${isLoggedIn}`,
  );

  return (
    <>
      <Head>
        <title>Track Your Repair | {STORE_NAME}</title>
        <meta
          name="description"
          content="Track your device repair ticket status."
        />
        <meta
          property="og:title"
          content={`Track Your Repair | ${STORE_NAME}`}
        />
        <meta
          property="og:description"
          content="Track your device repair ticket status."
        />
        <meta name="view-transition" content="same-origin" />
        <script src="https://js.paystack.co/v1/inline.js"></script>
      </Head>
      <Partial name="repair-content">
        <div class="route-container">
          <div>
            <TrackRepairIsland
              backendUrl={backendUrl}
              initialToken={token}
              initialTicket={ticket}
              initialAction={action}
              publishableApiKey={publishableKey}
              paystackPublicKey={paystackPublicKey}
              isLoggedIn={isLoggedIn}
            />
          </div>
        </div>
      </Partial>
    </>
  );
});
