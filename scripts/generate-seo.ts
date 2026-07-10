import { getProducts } from "../lib/data.ts";

const origin = "https://urbandevicecare.co.uk";
const staticRoutes = [
  "/",
  "/about/our-story",
  "/about/careers",
  "/about/contact",
  "/services/repairs",
  "/services/guides",
  "/services/trade-in",
  "/services/financing",
  "/legal/terms",
  "/legal/privacy",
  "/legal/cookies",
  "/shop/iphone",
  "/shop/ipad",
  "/shop/mac",
  "/shop/watch",
  "/news",
];

async function generate() {
  console.log("[SEO Generator] Generating sitemap.xml and robots.txt...");

  let products: any[] = [];
  try {
    products = await getProducts();
  } catch (e) {
    console.error(
      "[SEO Generator] Failed to fetch products (is the Medusa backend running?). Using empty product list.",
    );
  }

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${
    staticRoutes
      .map(
        (route) => `
  <url>
    <loc>${origin}${route}</loc>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>`,
      )
      .join("")
  }
  ${
    products
      .map(
        (product) => `
  <url>
    <loc>${origin}/product/${product.handle}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>`,
      )
      .join("")
  }
</urlset>`;

  const robots = `User-agent: *
Allow: /

Sitemap: ${origin}/sitemap.xml
`;

  try {
    await Deno.mkdir("./static", { recursive: true });
    await Deno.writeTextFile("./static/sitemap.xml", sitemap.trim());
    await Deno.writeTextFile("./static/robots.txt", robots.trim());
    console.log(
      "[SEO Generator] Successfully wrote static/sitemap.xml and static/robots.txt!",
    );
  } catch (err) {
    console.error("[SEO Generator] Error writing files:", err);
  }

  // Deno exit explicitly in case any hanging promises from SDK
  Deno.exit(0);
}

generate();
