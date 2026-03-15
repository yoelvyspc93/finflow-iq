import { ScrollViewStyleReset } from "expo-router/html";
import type { ReactNode } from "react";

export default function Html({ children }: { children: ReactNode }) {
  return (
    <html
      lang="es"
      style={{
        backgroundColor: "#0F1223",
        height: "100%",
        width: "100%",
        overflowX: "hidden",
      }}
    >
      <head>
        <meta charSet="utf-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
        <meta name="theme-color" content="#0F1223" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="FinFlow IQ" />
        <link rel="manifest" href="./manifest.json" />
        <link rel="apple-touch-icon" href="./apple-touch-icon.png" />
        <title>FinFlow IQ</title>
        <meta name="description" content="FinFlow IQ es una app de finanzas personales que te ayuda a controlar tu dinero." />
        <style>{`
          html, body, #root {
            width: 100%;
            min-height: 100%;
          }

          html, body {
            overflow-x: hidden;
          }

          body {
            overscroll-behavior-x: none;
          }

          #root {
            display: flex;
          }
        `}</style>
        <ScrollViewStyleReset />
      </head>
      <body
        style={{
          backgroundColor: "#0F1223",
          margin: 0,
          minHeight: "100%",
          width: "100%",
          overflowX: "hidden",
        }}
      >
        {children}
      </body>
    </html>
  );
}
