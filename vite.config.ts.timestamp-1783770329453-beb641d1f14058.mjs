// vite.config.ts
import { defineConfig } from "vite";
import { fresh } from "@fresh/plugin-vite";
import tailwindcss from "@tailwindcss/vite";
var vite_config_default = defineConfig({
  plugins: [fresh(), tailwindcss()],
  resolve: {
    alias: {
      "npm:preact@^10.29.1": "preact",
      "npm:preact@^10.29.1/hooks": "preact/hooks",
      "npm:preact@^10.27.2": "preact",
      "npm:preact@^10.27.2/hooks": "preact/hooks",
      "npm:@preact/signals@^2.9.0": "@preact/signals",
      "npm:@preact/signals@^2.5.0": "@preact/signals",
      "npm:@preact/signals@^2.5.1": "@preact/signals",
      "npm:@preact/signals@^2.2.1": "@preact/signals",
      "npm:preact-render-to-string@^6.6.3": "preact-render-to-string",
      "npm:/preact@^10.29.1": "preact",
      "npm:/preact@^10.29.1/hooks": "preact/hooks",
      "npm:/preact@^10.27.2": "preact",
      "npm:/preact@^10.27.2/hooks": "preact/hooks",
      "npm:/@preact/signals@^2.9.0": "@preact/signals",
      "npm:/@preact/signals@^2.5.0": "@preact/signals",
      "npm:/@preact/signals@^2.5.1": "@preact/signals",
      "npm:/@preact/signals@^2.2.1": "@preact/signals",
      "npm:/preact-render-to-string@^6.6.3": "preact-render-to-string"
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlUm9vdCI6ICJmaWxlOi8vL2FwcC9hcHBsZXQvIiwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvYXBwL2FwcGxldFwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiL2FwcC9hcHBsZXQvdml0ZS5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL2FwcC9hcHBsZXQvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tIFwidml0ZVwiO1xuaW1wb3J0IHsgZnJlc2ggfSBmcm9tIFwiQGZyZXNoL3BsdWdpbi12aXRlXCI7XG5pbXBvcnQgdGFpbHdpbmRjc3MgZnJvbSBcIkB0YWlsd2luZGNzcy92aXRlXCI7XG5cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XG4gIHBsdWdpbnM6IFtmcmVzaCgpLCB0YWlsd2luZGNzcygpXSxcbiAgcmVzb2x2ZToge1xuICAgIGFsaWFzOiB7XG4gICAgICBcIm5wbTpwcmVhY3RAXjEwLjI5LjFcIjogXCJwcmVhY3RcIixcbiAgICAgIFwibnBtOnByZWFjdEBeMTAuMjkuMS9ob29rc1wiOiBcInByZWFjdC9ob29rc1wiLFxuICAgICAgXCJucG06cHJlYWN0QF4xMC4yNy4yXCI6IFwicHJlYWN0XCIsXG4gICAgICBcIm5wbTpwcmVhY3RAXjEwLjI3LjIvaG9va3NcIjogXCJwcmVhY3QvaG9va3NcIixcbiAgICAgIFwibnBtOkBwcmVhY3Qvc2lnbmFsc0BeMi45LjBcIjogXCJAcHJlYWN0L3NpZ25hbHNcIixcbiAgICAgIFwibnBtOkBwcmVhY3Qvc2lnbmFsc0BeMi41LjBcIjogXCJAcHJlYWN0L3NpZ25hbHNcIixcbiAgICAgIFwibnBtOkBwcmVhY3Qvc2lnbmFsc0BeMi41LjFcIjogXCJAcHJlYWN0L3NpZ25hbHNcIixcbiAgICAgIFwibnBtOkBwcmVhY3Qvc2lnbmFsc0BeMi4yLjFcIjogXCJAcHJlYWN0L3NpZ25hbHNcIixcbiAgICAgIFwibnBtOnByZWFjdC1yZW5kZXItdG8tc3RyaW5nQF42LjYuM1wiOiBcInByZWFjdC1yZW5kZXItdG8tc3RyaW5nXCIsXG4gICAgICBcIm5wbTovcHJlYWN0QF4xMC4yOS4xXCI6IFwicHJlYWN0XCIsXG4gICAgICBcIm5wbTovcHJlYWN0QF4xMC4yOS4xL2hvb2tzXCI6IFwicHJlYWN0L2hvb2tzXCIsXG4gICAgICBcIm5wbTovcHJlYWN0QF4xMC4yNy4yXCI6IFwicHJlYWN0XCIsXG4gICAgICBcIm5wbTovcHJlYWN0QF4xMC4yNy4yL2hvb2tzXCI6IFwicHJlYWN0L2hvb2tzXCIsXG4gICAgICBcIm5wbTovQHByZWFjdC9zaWduYWxzQF4yLjkuMFwiOiBcIkBwcmVhY3Qvc2lnbmFsc1wiLFxuICAgICAgXCJucG06L0BwcmVhY3Qvc2lnbmFsc0BeMi41LjBcIjogXCJAcHJlYWN0L3NpZ25hbHNcIixcbiAgICAgIFwibnBtOi9AcHJlYWN0L3NpZ25hbHNAXjIuNS4xXCI6IFwiQHByZWFjdC9zaWduYWxzXCIsXG4gICAgICBcIm5wbTovQHByZWFjdC9zaWduYWxzQF4yLjIuMVwiOiBcIkBwcmVhY3Qvc2lnbmFsc1wiLFxuICAgICAgXCJucG06L3ByZWFjdC1yZW5kZXItdG8tc3RyaW5nQF42LjYuM1wiOiBcInByZWFjdC1yZW5kZXItdG8tc3RyaW5nXCIsXG4gICAgfSxcbiAgfSxcbn0pO1xuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUFtTixTQUFTLG9CQUFvQjtBQUNoUCxTQUFTLGFBQWE7QUFDdEIsT0FBTyxpQkFBaUI7QUFFeEIsSUFBTyxzQkFBUSxhQUFhO0FBQUEsRUFDMUIsU0FBUyxDQUFDLE1BQU0sR0FBRyxZQUFZLENBQUM7QUFBQSxFQUNoQyxTQUFTO0FBQUEsSUFDUCxPQUFPO0FBQUEsTUFDTCx1QkFBdUI7QUFBQSxNQUN2Qiw2QkFBNkI7QUFBQSxNQUM3Qix1QkFBdUI7QUFBQSxNQUN2Qiw2QkFBNkI7QUFBQSxNQUM3Qiw4QkFBOEI7QUFBQSxNQUM5Qiw4QkFBOEI7QUFBQSxNQUM5Qiw4QkFBOEI7QUFBQSxNQUM5Qiw4QkFBOEI7QUFBQSxNQUM5QixzQ0FBc0M7QUFBQSxNQUN0Qyx3QkFBd0I7QUFBQSxNQUN4Qiw4QkFBOEI7QUFBQSxNQUM5Qix3QkFBd0I7QUFBQSxNQUN4Qiw4QkFBOEI7QUFBQSxNQUM5QiwrQkFBK0I7QUFBQSxNQUMvQiwrQkFBK0I7QUFBQSxNQUMvQiwrQkFBK0I7QUFBQSxNQUMvQiwrQkFBK0I7QUFBQSxNQUMvQix1Q0FBdUM7QUFBQSxJQUN6QztBQUFBLEVBQ0Y7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
