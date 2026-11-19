import { Head, Partial } from "fresh/runtime";
import { define, STORE_NAME } from "../../lib/utils.ts";
import PosTerminal from "../../islands/PosTerminal.tsx";

export default define.page(function PosPage(_props) {
  return (
    <>
      <Head>
        <title>Web POS • {STORE_NAME}</title>
        <meta
          name="description"
          content="Workshop & Retail Point of Sale Terminal"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="view-transition" content="same-origin" />
      </Head>
      <Partial name="pos-main">
        <div class="min-h-screen bg-[#121214] text-white flex flex-col w-full">
          <PosTerminal />
        </div>
      </Partial>
    </>
  );
});
